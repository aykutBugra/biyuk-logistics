import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppErrorCode, AppErrors } from "../../common/errors";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- sharp is a callable CommonJS export in this Nest build.
import sharp = require("sharp");
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { EstimateVolumeBodyDto } from "./dto/estimate-volume-body.dto";
import { EstimateVolumeResponseDto } from "./dto/estimate-volume-response.dto";
import type { VolumeEstimationPort } from "./volume-estimation.port";
import { VOLUME_ESTIMATION_PROVIDER } from "./volume-estimation.tokens";
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

//AI analizindeki risk ve sekil degerlerini karsilastirirken daha konservatif olani
//secmek icin siralama tablolaridir.
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
    @Inject(VOLUME_ESTIMATION_PROVIDER)
    private readonly volumeEstimationProvider: VolumeEstimationPort,
    private readonly shapeBasedVolumeCalculatorService: ShapeBasedVolumeCalculatorService
  ) {}


  //Bu metod tüm akışı yönetiyor.
  async estimateVolume(
    currentUser: AuthenticatedUser,
    body: EstimateVolumeBodyDto,
    files: UploadedImageFile[] | undefined
  ): Promise<EstimateVolumeResponseDto> {
    //Hacim tahmini akisi: gorseller validate edilir, normalize edilir, kullanici limiti
    //kontrol edilir, AI analizi alinir ve sonuc sekil tabanli hesaplayiciya verilir.
    const safeFiles = files ?? [];

    this.assertValidUploadedImages(safeFiles);

    const normalizedImages = await Promise.all(
      safeFiles.map((file) => this.normalizeImage(file))
    );

    this.assertTotalNormalizedSize(normalizedImages);
    this.rateLimitService.assertWithinLimit(currentUser.id);

    //Bu aşamada OpenAI’ye gidiliyor.
    //Önemli: OpenAI’dan direkt m3 istemiyoruz.
    //OpenAI’dan istenen şey:
    //Fotoğraflardaki yükleri sınıflandır.
    const analysis = await this.volumeEstimationProvider.analyzeShipment({
      description: body.description,
      images: normalizedImages,
      yukTipi: body.yukTipi,
    });
    const mergedAnalysis = this.mergeAnalysisItems(analysis);

    if (mergedAnalysis.items.length === 0) {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
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


  //assertValidUploadedImages fonksiyonu, kullanici tarafindan yuklenen gorselleri
  // dosya boyutu, gorsel sayisi ve format acisindan kontrol eder; herhangi bir 
  // gorsel gecersizse uygun bir hata mesaji ile BadRequestException firlatir
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
      throw AppErrors.badRequest(AppErrorCode.VOLUME_IMAGES_REQUIRED, "En az bir gorsel yuklemelisin.");
    }

    if (files.length > maxImages) {
      throw AppErrors.badRequest(
        AppErrorCode.VOLUME_VALIDATION,
        `En fazla ${maxImages} gorsel yukleyebilirsin.`
      );
    }

    const totalSizeBytes = files.reduce(
      (total, file) => total + file.size,
      0
    );

    if (totalSizeBytes > maxTotalSizeBytes) {
      throw AppErrors.badRequest(
        AppErrorCode.VOLUME_VALIDATION,
        "Toplam gorsel boyutu izin verilen siniri asiyor."
      );
    }

    for (const file of files) {
      if (!ACCEPTED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        throw AppErrors.badRequest(
          AppErrorCode.VOLUME_VALIDATION,
          "Sadece JPG, PNG veya WEBP gorseller kabul edilir."
        );
      }

      if (file.size > maxFileSizeBytes) {
        throw AppErrors.badRequest(
          AppErrorCode.VOLUME_VALIDATION,
          "Her bir gorsel en fazla 5 MB olabilir."
        );
      }
    }
  }

//normalizeImage fonksiyonu, yuklenen her bir gorseli isleyerek AI analizine uygun hale getirir;
//gorsel, maksimum boyutlara gore yeniden boyutlandiktan sonra JPEG formatina cevrilir; 
//islem sirasinda herhangi bir hata olusursa uygun bir mesajla BadRequestException firlatir
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
        //base64 yapma sebebi AI servislerine gorsel gonderirken genellikle data
        //  URL formatinin kullanilmasi;
        //bu format, gorsel verisini metin olarak temsil eder ve gorsel 
        // hakkinda ek bilgi (orijinal dosya adi gibi) eklemeye de imkan tanir
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

      throw AppErrors.badRequest(
        AppErrorCode.VOLUME_VALIDATION,
        "Yuklenen gorsel okunamadi veya islenemedi. Lutfen baska bir JPG, PNG veya WEBP dosyasi dene."
      );
    }
  }

  private assertTotalNormalizedSize(
    normalizedImages: NormalizedVolumeEstimationImage[]
  ) {
    //Sharp isleminden sonra da toplam boyut kontrol edilir; normalize edilen gorseller
    //AI servisine gidecegi icin ikinci bir guvenlik siniri vardir.
    const maxTotalSizeBytes =
      this.configService.get<number>("ai.volumeEstimationMaxTotalSizeBytes") ??
      12 * 1024 * 1024;
    const totalSizeBytes = normalizedImages.reduce(
      (total, image) => total + image.sizeBytes,
      0
    );

    if (totalSizeBytes > maxTotalSizeBytes) {
      throw AppErrors.badRequest(
        AppErrorCode.VOLUME_VALIDATION,
        "Gorseller normalize edildikten sonra izin verilen toplam boyutu asti."
      );
    }
  }


  //mergeAnalysisItems fonksiyonu, AI'nin benzer kalemleri farkli sekilde tanimlamasi durumunda
  // bu kalemleri birlestirerek daha tutarlı ve kullanisli bir analiz sonucu olusturur; 
  // benzer kalemler, normalleştirilmis label, yuk tipi, boyut sinifi ve alan profiline gore gruplandiktan sonra
  // her grup icin tahmini adet, stacklenebilirlik, hassasiyet, parcali tasima durumu, yerlestirme riski ve sekil yorumu gibi
  // ozellikler konservatif bir sekilde birlestirilir; herhangi bir belirsizlik durumunda uygun mesajlar uretir
  private mergeAnalysisItems(
    analysis: VolumeAnalysisResult
  ): VolumeAnalysisResult {
    //AI ayni esyayi farkli acilardan birden fazla kalem gibi dondurebilir.
    //Benzer kalemler tek kayitta birlestirilir ve celiskiler uyariya cevrilir.
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
        item.volumeProfile,
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
    //Iki analiz ayni kalem icin farkli risk verdiyse yuksek risk korunur.
    return PLACEMENT_RISK_RANK[left] >= PLACEMENT_RISK_RANK[right] ? left : right;
  }

  private selectMoreConservativeShapeType(
    left: VolumeAnalysisShapeType,
    right: VolumeAnalysisShapeType
  ): VolumeAnalysisShapeType {
    //Sekil yorumunda belirsizlik varsa daha konservatif siradaki shapeType tercih edilir.
    return SHAPE_TYPE_RANK[left] >= SHAPE_TYPE_RANK[right] ? left : right;
  }
}
