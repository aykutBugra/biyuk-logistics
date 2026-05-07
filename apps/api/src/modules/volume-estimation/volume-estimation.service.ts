import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- sharp is a callable CommonJS export in this Nest build.
import sharp = require("sharp");
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { EstimateVolumeBodyDto } from "./dto/estimate-volume-body.dto";
import { EstimateVolumeResponseDto } from "./dto/estimate-volume-response.dto";
import { OpenAiVolumeEstimationService } from "./openai-volume-estimation.service";
import { ShapeBasedVolumeCalculatorService } from "./shape-based-volume-calculator.service";
import type {
  VolumeAnalysisItem,
  VolumeAnalysisPlacementRisk,
  VolumeAnalysisResult,
  VolumeAnalysisShapeType,
} from "./volume-estimation.types";
import {
  dedupeStrings,
  lowerAnalysisConfidence,
  normalizeVolumeLabel,
  toPublicConfidenceLevel,
} from "./volume-estimation.utils";
import { VolumeEstimationRateLimitService } from "./volume-estimation-rate-limit.service";

const ACCEPTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const PLACEMENT_RISK_RANK: Record<VolumeAnalysisPlacementRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const SHAPE_TYPE_RANK: Record<VolumeAnalysisShapeType, number> = {
  box: 0,
  flat: 1,
  cylinder: 2,
  bundle: 3,
  irregular: 4,
  unknown: 5,
};

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

type NormalizedVolumeEstimationImage = {
  dataUrl: string;
  sizeBytes: number;
  sourceName: string;
};

@Injectable()
export class VolumeEstimationService {
  private readonly logger = new Logger(VolumeEstimationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly rateLimitService: VolumeEstimationRateLimitService,
    private readonly openAiVolumeEstimationService: OpenAiVolumeEstimationService,
    private readonly shapeBasedVolumeCalculatorService: ShapeBasedVolumeCalculatorService
  ) {}

  async estimateVolume(
    currentUser: AuthenticatedUser,
    body: EstimateVolumeBodyDto,
    files: UploadedImageFile[] | undefined
  ): Promise<EstimateVolumeResponseDto> {
    const safeFiles = files ?? [];

    this.assertValidUploadedImages(safeFiles);

    const normalizedImages = await Promise.all(
      safeFiles.map((file) => this.normalizeImage(file))
    );

    this.assertTotalNormalizedSize(normalizedImages);
    this.rateLimitService.assertWithinLimit(currentUser.id);

    const analysis = await this.openAiVolumeEstimationService.analyzeShipment({
      description: body.description,
      images: normalizedImages,
      yukTipi: body.yukTipi,
    });
    const mergedAnalysis = this.mergeAnalysisItems(analysis);

    if (mergedAnalysis.items.length === 0) {
      throw new ServiceUnavailableException(
        "AI hacim tahmini gecerli bir yuk analizi dondurmedi."
      );
    }

    const calculatedEstimate =
      this.shapeBasedVolumeCalculatorService.calculate(mergedAnalysis);
    const confidenceLevel = toPublicConfidenceLevel(
      lowerAnalysisConfidence(
        mergedAnalysis.overallConfidence,
        calculatedEstimate.backendConfidence
      )
    );

    return {
      recommendedHacimM3: calculatedEstimate.recommendedHacimM3,
      minHacimM3: calculatedEstimate.minHacimM3,
      maxHacimM3: calculatedEstimate.maxHacimM3,
      confidenceLevel,
      summary: calculatedEstimate.summary,
      detectedItems: calculatedEstimate.detectedItems,
      cautionNotes: calculatedEstimate.cautionNotes,
      items: calculatedEstimate.items,
    };
  }

  private assertValidUploadedImages(files: UploadedImageFile[]) {
    const maxImages =
      this.configService.get<number>("ai.volumeEstimationMaxImages") ?? 3;
    const maxFileSizeBytes =
      this.configService.get<number>("ai.volumeEstimationMaxFileSizeBytes") ??
      5 * 1024 * 1024;
    const maxTotalSizeBytes =
      this.configService.get<number>("ai.volumeEstimationMaxTotalSizeBytes") ??
      12 * 1024 * 1024;

    if (files.length === 0) {
      throw new BadRequestException("En az bir gorsel yuklemelisin.");
    }

    if (files.length > maxImages) {
      throw new BadRequestException(
        `En fazla ${maxImages} gorsel yukleyebilirsin.`
      );
    }

    const totalSizeBytes = files.reduce(
      (total, file) => total + file.size,
      0
    );

    if (totalSizeBytes > maxTotalSizeBytes) {
      throw new BadRequestException(
        "Toplam gorsel boyutu izin verilen siniri asiyor."
      );
    }

    for (const file of files) {
      if (!ACCEPTED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(
          "Sadece JPG, PNG veya WEBP gorseller kabul edilir."
        );
      }

      if (file.size > maxFileSizeBytes) {
        throw new BadRequestException(
          "Her bir gorsel en fazla 5 MB olabilir."
        );
      }
    }
  }

  private async normalizeImage(
    file: UploadedImageFile
  ): Promise<NormalizedVolumeEstimationImage> {
    const maxImageDimensionPx =
      this.configService.get<number>("ai.volumeEstimationMaxImageDimensionPx") ??
      1600;
    const jpegQuality =
      this.configService.get<number>("ai.volumeEstimationJpegQuality") ?? 82;

    try {
      const normalizedImage = await sharp(file.buffer, { failOnError: false })
        .rotate()
        .resize({
          width: maxImageDimensionPx,
          height: maxImageDimensionPx,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: jpegQuality,
          mozjpeg: true,
        })
        .toBuffer();

      return {
        dataUrl: `data:image/jpeg;base64,${normalizedImage.toString("base64")}`,
        sizeBytes: normalizedImage.length,
        sourceName: file.originalname,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown image processing error";

      this.logger.warn(
        `Image normalization failed for ${file.originalname}: ${message}`
      );

      throw new BadRequestException(
        "Yuklenen gorsel okunamadi veya islenemedi. Lutfen baska bir JPG, PNG veya WEBP dosyasi dene."
      );
    }
  }

  private assertTotalNormalizedSize(
    normalizedImages: NormalizedVolumeEstimationImage[]
  ) {
    const maxTotalSizeBytes =
      this.configService.get<number>("ai.volumeEstimationMaxTotalSizeBytes") ??
      12 * 1024 * 1024;
    const totalSizeBytes = normalizedImages.reduce(
      (total, image) => total + image.sizeBytes,
      0
    );

    if (totalSizeBytes > maxTotalSizeBytes) {
      throw new BadRequestException(
        "Gorseller normalize edildikten sonra izin verilen toplam boyutu asti."
      );
    }
  }

  private mergeAnalysisItems(
    analysis: VolumeAnalysisResult
  ): VolumeAnalysisResult {
    const groupedItems = new Map<
      string,
      {
        disassemblableConflict: boolean;
        fragileConflict: boolean;
        item: VolumeAnalysisItem;
        mergedEntries: number;
        notes: Set<string>;
        placementRiskConflict: boolean;
        shapeTypeConflict: boolean;
      }
    >();
    const mergeWarnings: string[] = [];
    let mergeConflictDetected = false;

    for (const item of analysis.items) {
      const normalizedKey = [
        normalizeVolumeLabel(item.label),
        item.loadType,
        item.sizeClass,
        item.spaceProfile,
      ].join("|");
      const trimmedNotes = item.notes.trim();
      const existingGroup = groupedItems.get(normalizedKey);

      if (!existingGroup) {
        groupedItems.set(normalizedKey, {
          item: {
            ...item,
            notes: trimmedNotes,
          },
          shapeTypeConflict: false,
          placementRiskConflict: false,
          fragileConflict: false,
          disassemblableConflict: false,
          mergedEntries: 1,
          notes: trimmedNotes.length > 0 ? new Set([trimmedNotes]) : new Set(),
        });
        continue;
      }

      existingGroup.mergedEntries += 1;
      const previousShapeType = existingGroup.item.shapeType;
      const previousPlacementRisk = existingGroup.item.placementRisk;
      const previousFragile = existingGroup.item.fragile;
      const previousDisassemblable = existingGroup.item.disassemblable;

      existingGroup.item.estimatedCount = Math.max(
        existingGroup.item.estimatedCount,
        item.estimatedCount
      );
      existingGroup.item.stackable =
        existingGroup.item.stackable && item.stackable;
      existingGroup.item.confidence = lowerAnalysisConfidence(
        existingGroup.item.confidence,
        item.confidence
      );
      existingGroup.item.fragile =
        existingGroup.item.fragile || item.fragile;
      existingGroup.item.disassemblable =
        existingGroup.item.disassemblable && item.disassemblable;
      existingGroup.item.placementRisk = this.selectHigherPlacementRisk(
        existingGroup.item.placementRisk,
        item.placementRisk
      );
      existingGroup.item.shapeType = this.selectMoreConservativeShapeType(
        existingGroup.item.shapeType,
        item.shapeType
      );

      if (previousShapeType !== item.shapeType) {
        existingGroup.shapeTypeConflict = true;
      }

      if (previousPlacementRisk !== item.placementRisk) {
        existingGroup.placementRiskConflict = true;
      }

      if (previousFragile !== item.fragile) {
        existingGroup.fragileConflict = true;
      }

      if (previousDisassemblable !== item.disassemblable) {
        existingGroup.disassemblableConflict = true;
      }

      if (trimmedNotes.length > 0) {
        existingGroup.notes.add(trimmedNotes);
      }
    }

    const mergedItems = Array.from(groupedItems.values()).map((group) => {
      if (group.mergedEntries > 1) {
        mergeWarnings.push(
          `Benzer kalemler tek kayitta birlestirildi: ${group.item.label}.`
        );
      }

      if (group.shapeTypeConflict) {
        mergeWarnings.push(
          `Benzer kalemlerde sekil yorumu farkli oldugu icin konservatif shapeType kullanildi: ${group.item.label}.`
        );
        mergeConflictDetected = true;
      }

      if (group.placementRiskConflict) {
        mergeWarnings.push(
          `Benzer kalemlerde yerlestirme riski farkli goruldugu icin yuksek risk korundu: ${group.item.label}.`
        );
        mergeConflictDetected = true;
      }

      if (group.fragileConflict) {
        mergeWarnings.push(
          `Benzer kalemlerde hassasiyet yorumu farkli oldugu icin hassas kabul edildi: ${group.item.label}.`
        );
        mergeConflictDetected = true;
      }

      if (group.disassemblableConflict) {
        mergeWarnings.push(
          `Benzer kalemlerde parcali tasima yorumu farkli oldugu icin konservatif sonuc kullanildi: ${group.item.label}.`
        );
        mergeConflictDetected = true;
      }

      return {
        ...group.item,
        notes: Array.from(group.notes).join("; "),
      };
    });

    return {
      items: mergedItems,
      overallConfidence: analysis.overallConfidence,
      warnings: dedupeStrings([...analysis.warnings, ...mergeWarnings]),
      mergeConflictDetected,
    };
  }

  private selectHigherPlacementRisk(
    left: VolumeAnalysisPlacementRisk,
    right: VolumeAnalysisPlacementRisk
  ): VolumeAnalysisPlacementRisk {
    return PLACEMENT_RISK_RANK[left] >= PLACEMENT_RISK_RANK[right] ? left : right;
  }

  private selectMoreConservativeShapeType(
    left: VolumeAnalysisShapeType,
    right: VolumeAnalysisShapeType
  ): VolumeAnalysisShapeType {
    return SHAPE_TYPE_RANK[left] >= SHAPE_TYPE_RANK[right] ? left : right;
  }
}
