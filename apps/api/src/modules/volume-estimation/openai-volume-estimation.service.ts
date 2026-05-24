import { Injectable, Logger } from "@nestjs/common";
import { AppErrorCode, AppErrors, AppServiceUnavailableException } from "../../common/errors";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import type {
  VolumeAnalysisConfidence,
  VolumeAnalysisItem,
  VolumeAnalysisLoadType,
  VolumeAnalysisPlacementRisk,
  VolumeAnalysisResult,
  VolumeAnalysisShapeType,
  VolumeAnalysisSizeClass,
  VolumeAnalysisSpaceProfile,
  VolumeAnalysisVolumeProfile,
} from "./volume-estimation.types";
import type { VolumeEstimationPort } from "./volume-estimation.port";
import {
  VOLUME_ANALYSIS_CONFIDENCES,
  VOLUME_ANALYSIS_LOAD_TYPES,
  VOLUME_ANALYSIS_PLACEMENT_RISKS,
  VOLUME_ANALYSIS_SHAPE_TYPES,
  VOLUME_ANALYSIS_SIZE_CLASSES,
  VOLUME_ANALYSIS_SPACE_PROFILES,
  VOLUME_ANALYSIS_VOLUME_PROFILES,
} from "./volume-estimation.types";

type NormalizedVolumeEstimationImage = {
  dataUrl: string;
  sourceName: string;
};

type EstimateVolumeInput = {
  description?: string;
  images: NormalizedVolumeEstimationImage[];
  yukTipi?: string;
};

type ParsedAnalysis = {
  items: unknown;
  overallConfidence: unknown;
  warnings: unknown;
};

const REQUEST_TO_ANALYSIS_LOAD_TYPE: Record<string, VolumeAnalysisLoadType> = {
  GENEL: "genel_yuk",
  PALETLI: "paletli",
  KOLI: "koli",
  MOBILYA: "mobilya",
  BEYAZ_ESYA: "beyaz_esya",
  INSAAT_MALZEMESI: "insaat_malzemesi",
  DIGER: "diger",
};

@Injectable()
export class OpenAiVolumeEstimationService implements VolumeEstimationPort {
  private readonly logger = new Logger(OpenAiVolumeEstimationService.name);

  constructor(private readonly configService: ConfigService) {}

  async analyzeShipment(
    input: EstimateVolumeInput
  ): Promise<VolumeAnalysisResult> {
    //OpenAI servisinden sadece yapilandirilmis analiz JSON'u istenir.
    //Gercek m3 degerini AI degil, sonraki shape-based calculator hesaplar.
    const apiKey = this.configService.get<string>("ai.openAiApiKey")?.trim() ?? "";

    if (apiKey.length === 0) {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini su anda kullanilamiyor."
      );
    }

    const client = new OpenAI({ apiKey });
    const controller = new AbortController();
    const timeoutMs =
      this.configService.get<number>("ai.volumeEstimationTimeoutMs") ?? 20000;
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await client.responses.create(
        {
          model:
            this.configService.get<string>("ai.volumeEstimationModel") ??
            "gpt-4.1",
          store: false,
          instructions: [
            "Sen bir lojistik gorsel analiz asistanisin.",
            "Kesin fiziksel olcu veya m3 degeri uretme.",
            "Yalnizca verilen JSON schema ile yapilandirilmis yuk analizi dondur.",
            "Tum gorselleri tek sevkiyat olarak ele al.",
            "Ayni esyanin farkli acilarini iki kez sayma.",
            "Gorselde hic izi olmayan yeni esya uydurma.",
            "Label kesin degilse genel tasima tanimi kullan.",
            "Her kalemi once volumeProfile ile tasima arketipine yerlestir.",
            "sizeClass'i gorsel yukseklige gore degil, aracta kaplayacagi tahmini tasima hacmine gore sec.",
            "Oda veya ev gibi karisik gorsellerde tek tek kucuk dekorlari saymak yerine room_load veya household_load kullan.",
            "Kasa, koli, meyve kasasi gibi tekrar eden yuklerde box_crate ve estimatedCount kullan.",
            "spaceProfile icin urunun tasima davranisina odaklan: compact, tall, wide, bulky, long, mixed.",
            "Belirsizlik, eksik aci, gorunmeyen yuzey veya adet suphelerini warnings alaninda Turkce belirt.",
            "notes alanlarini kisa Turkce yaz; not gerekmiyorsa bos string kullan.",
          ].join(" "),
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: this.buildPrompt(input),
                },
                ...input.images.map((image) => ({
                  type: "input_image" as const,
                  image_url: image.dataUrl,
                  detail: "high" as const,
                })),
              ],
            },
          ],
          max_output_tokens: 1200,
          text: {
            format: { //json zorunlu hale getirmek icin schema kullaniyoruz; 
                      // AI'nin gecerli bir JSON uretmesini saglamak icin dogrudan
                      // "json" formatini kullanmak bazen yetersiz kalabiliyor
              type: "json_schema",
              name: "volume_analysis",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["items", "overallConfidence", "warnings"],
                properties: {
                  items: {
                    type: "array",
                    minItems: 1,
                    maxItems: 20,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: [
                        "label",
                        "loadType",
                        "shapeType",
                        "sizeClass",
                        "volumeProfile",
                        "estimatedCount",
                        "stackable",
                        "confidence",
                        "fragile",
                        "disassemblable",
                        "spaceProfile",
                        "placementRisk",
                        "notes",
                      ],
                      properties: {
                        label: {
                          type: "string",
                          minLength: 1,
                          maxLength: 120,
                        },
                        loadType: {
                          type: "string",
                          enum: [...VOLUME_ANALYSIS_LOAD_TYPES],
                        },
                        shapeType: {
                          type: "string",
                          enum: [...VOLUME_ANALYSIS_SHAPE_TYPES],
                        },
                        sizeClass: {
                          type: "string",
                          enum: [...VOLUME_ANALYSIS_SIZE_CLASSES],
                        },
                        volumeProfile: {
                          type: "string",
                          enum: [...VOLUME_ANALYSIS_VOLUME_PROFILES],
                        },
                        estimatedCount: {
                          type: "integer",
                          minimum: 1,
                          maximum: 100,
                        },
                        stackable: {
                          type: "boolean",
                        },
                        confidence: {
                          type: "string",
                          enum: [...VOLUME_ANALYSIS_CONFIDENCES],
                        },
                        fragile: {
                          type: "boolean",
                        },
                        disassemblable: {
                          type: "boolean",
                        },
                        spaceProfile: {
                          type: "string",
                          enum: [...VOLUME_ANALYSIS_SPACE_PROFILES],
                        },
                        placementRisk: {
                          type: "string",
                          enum: [...VOLUME_ANALYSIS_PLACEMENT_RISKS],
                        },
                        notes: {
                          type: "string",
                          maxLength: 220,
                        },
                      },
                    },
                  },
                  overallConfidence: {
                    type: "string",
                    enum: [...VOLUME_ANALYSIS_CONFIDENCES],
                  },
                  warnings: {
                    type: "array",
                    items: {
                      type: "string",
                      minLength: 1,
                      maxLength: 220,
                    },
                    maxItems: 20,
                  },
                },
              },
            },
          },
        },
        {
          signal: controller.signal,
        }
      );
      const responseText = response.output_text?.trim();

      if (!responseText) {
        throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
          "AI hacim tahmini gecerli bir sonuc dondurmedi."
        );
      }

      return this.parseResponse(responseText);
    } catch (error) {
      if (error instanceof AppServiceUnavailableException) {
        throw error;
      }

      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : null;
      const message =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Unknown OpenAI error";

      this.logger.error(`Volume estimation request failed: ${message}`, {
        status,
      });

      if (status === 401 || status === 403) {
        throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
          "AI servis yetkilendirmesi gecersiz veya erisime kapali."
        );
      }

      if (status === 429) {
        throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
          "AI servis limiti asildi. Lutfen daha sonra tekrar dene."
        );
      }

      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini su anda tamamlanamadi. Lutfen tekrar dene."
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  private buildPrompt(input: EstimateVolumeInput): string {
    //Prompt, kullanici aciklamasi ve yukTipi bilgisini sadece destek sinyali olarak verir;
    //gorselde olmayan esya uydurulmamasini ozellikle zorlar.
    const mappedCargoType = input.yukTipi
      ? REQUEST_TO_ANALYSIS_LOAD_TYPE[input.yukTipi]
      : undefined;
    const cargoType = input.yukTipi
      ? mappedCargoType
        ? `Kullanicinin sectigi yukTipi destek sinyali: ${input.yukTipi} -> olasi loadType ${mappedCargoType}.`
        : `Kullanicinin sectigi yukTipi destek sinyali: ${input.yukTipi}.`
      : "Kullanicidan yukTipi sinyali yok.";
    const description = input.description
      ? `Kullanicinin ek aciklamasi: ${input.description}. Aciklamayi sayi veya tur belirsizligini netlestirmek icin kullanabilirsin ama gorselde hic izi olmayan yeni esya uydurma.`
      : "Kullanicidan ek aciklama yok.";
    const imageList = input.images
      .map((image, index) => `${index + 1}. gorsel: ${image.sourceName}`)
      .join(" ");

    return [
      "Tek sevkiyat icin yapilandirilmis yuk analizi uret.",
      cargoType,
      description,
      `Gorseller: ${imageList}.`,
      "Ayni esyanin farkli acilari olabilir; cift sayim yapma.",
      "Yalnizca schema alanlarini doldur.",
      "Her item icin label, loadType, shapeType, sizeClass, volumeProfile, estimatedCount, stackable, confidence, fragile, disassemblable, spaceProfile, placementRisk ve notes ver.",
      "volumeProfile secenekleri: box_crate, pallet_load, desk_table, chair, sofa, shelf_bookcase, cabinet_wardrobe, bed_mattress, appliance, long_material, bag_sack, room_load, household_load, mixed_unknown.",
      "Masa ve kitaplik gibi dar/duz urunleri sadece uzun veya genis gorundugu icin large/huge yapma; aracta kaplayacagi efektif hacmi dusun.",
      "Gercek fiziksel olcu uydurma ve m3 uretme.",
      "overallConfidence genel analizin guvenini gostersin.",
      "warnings alanina Turkce belirsizlik uyarilari yaz.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  //parseResponse fonksiyonu, AI servisinden gelen metin cevabini beklenen 
  // VolumeAnalysisResult yapisina donusturur;
  //cevabin gecerli bir JSON olup olmadigini, beklenen alanlari icerip icermedigini
  //  ve her bir alani dogru tipte mi dondurdugunu kontrol eder; 
  // herhangi bir sorun tespit edilirse uygun bir mesajla 
  // ServiceUnavailableException firlatir
  private parseResponse(responseText: string): VolumeAnalysisResult {
    let parsedResponse: ParsedAnalysis;

    try {
      parsedResponse = JSON.parse(responseText) as ParsedAnalysis;
    } catch {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini gecerli bir JSON cevabi uretmedi."
      );
    }

    const items = this.parseItems(parsedResponse.items);

    if (items.length === 0) {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini gecerli bir yuk analizi dondurmedi."
      );
    }

    return {
      items,
      overallConfidence: this.parseConfidence(parsedResponse.overallConfidence),
      warnings: this.parseStringArray(parsedResponse.warnings, 20),
    };
  }

  private parseBoolean(value: unknown): boolean {
    //AI cevabi schema'li olsa da runtime'da tip kontrolu tekrar yapilir.
    if (typeof value !== "boolean") {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini gecerli bir alan tipi dondurmedi."
      );
    }

    return value;
  }

  private parseConfidence(value: unknown): VolumeAnalysisConfidence {
    if (typeof value !== "string") {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini guven seviyesi uretmedi."
      );
    }

    const normalizedValue = value.trim().toLowerCase();

    if (
      normalizedValue === "low" ||
      normalizedValue === "medium" ||
      normalizedValue === "high"
    ) {
      return normalizedValue;
    }

    throw AppErrors.serviceUnavailable(
      AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
      "AI hacim tahmini gecerli bir guven seviyesi uretmedi."
    );
  }

  private parseEstimatedCount(value: unknown): number {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      !Number.isFinite(value) ||
      value < 1
    ) {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini gecerli bir adet bilgisi dondurmedi."
      );
    }

    return value;
  }

  private parseItems(value: unknown): VolumeAnalysisItem[] {
    //items alani yoksa veya array degilse hesaplayiciya gecmek guvenli degildir.
    if (!Array.isArray(value)) {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini urun listesi dondurmedi."
      );
    }

    return value.map((item, index) => this.parseItem(item, index));
  }

  private parseItem(value: unknown, index: number): VolumeAnalysisItem {
    //Her item tek tek normalize edilir; hatali alan varsa genel ServiceUnavailableException doner.
    if (typeof value !== "object" || value === null) {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        `AI hacim tahmini ${index + 1}. urun icin gecerli bir nesne dondurmedi.`
      );
    }

    const candidate = value as Record<string, unknown>;

    return {
      label: this.parseRequiredText(candidate.label, 120),
      loadType: this.parseLoadType(candidate.loadType),
      shapeType: this.parseShapeType(candidate.shapeType),
      sizeClass: this.parseSizeClass(candidate.sizeClass),
      volumeProfile: this.parseVolumeProfile(candidate.volumeProfile),
      estimatedCount: this.parseEstimatedCount(candidate.estimatedCount),
      stackable: this.parseBoolean(candidate.stackable),
      confidence: this.parseConfidence(candidate.confidence),
      fragile: this.parseBoolean(candidate.fragile),
      disassemblable: this.parseBoolean(candidate.disassemblable),
      spaceProfile: this.parseSpaceProfile(candidate.spaceProfile),
      placementRisk: this.parsePlacementRisk(candidate.placementRisk),
      notes: this.parseOptionalText(candidate.notes, 220),
    };
  }

  private parseLoadType(value: unknown): VolumeAnalysisLoadType {
    if (typeof value !== "string") {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini gecerli bir loadType dondurmedi."
      );
    }

    const normalizedValue = value.trim().toLowerCase();

    if (
      normalizedValue === "genel_yuk" ||
      normalizedValue === "paletli" ||
      normalizedValue === "koli" ||
      normalizedValue === "mobilya" ||
      normalizedValue === "beyaz_esya" ||
      normalizedValue === "insaat_malzemesi" ||
      normalizedValue === "diger"
    ) {
      return normalizedValue;
    }

    throw AppErrors.serviceUnavailable(
      AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
      "AI hacim tahmini gecerli bir loadType dondurmedi."
    );
  }

  private parseOptionalText(value: unknown, maxLength: number): string {
    if (typeof value !== "string") {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini gecerli bir not alani dondurmedi."
      );
    }

    return value.trim().slice(0, maxLength);
  }

  private parseRequiredText(value: unknown, maxLength: number): string {
    if (typeof value !== "string") {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini gecerli bir metin alani dondurmedi."
      );
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini bos bir metin alani dondurdu."
      );
    }

    return trimmed.slice(0, maxLength);
  }

  private parseShapeType(value: unknown): VolumeAnalysisShapeType {
    if (typeof value !== "string") {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini gecerli bir shapeType dondurmedi."
      );
    }

    const normalizedValue = value.trim().toLowerCase();

    if (
      normalizedValue === "box" ||
      normalizedValue === "flat" ||
      normalizedValue === "cylinder" ||
      normalizedValue === "irregular" ||
      normalizedValue === "bundle" ||
      normalizedValue === "unknown"
    ) {
      return normalizedValue;
    }

    throw AppErrors.serviceUnavailable(
      AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
      "AI hacim tahmini gecerli bir shapeType dondurmedi."
    );
  }

  private parsePlacementRisk(value: unknown): VolumeAnalysisPlacementRisk {
    if (typeof value !== "string") {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini gecerli bir placementRisk dondurmedi."
      );
    }

    const normalizedValue = value.trim().toLowerCase();

    if (
      normalizedValue === "low" ||
      normalizedValue === "medium" ||
      normalizedValue === "high"
    ) {
      return normalizedValue;
    }

    throw AppErrors.serviceUnavailable(
      AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
      "AI hacim tahmini gecerli bir placementRisk dondurmedi."
    );
  }

  private parseSizeClass(value: unknown): VolumeAnalysisSizeClass {
    if (typeof value !== "string") {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini gecerli bir sizeClass dondurmedi."
      );
    }

    const normalizedValue = value.trim().toLowerCase();

    if (
      normalizedValue === "small" ||
      normalizedValue === "medium" ||
      normalizedValue === "large" ||
      normalizedValue === "huge"
    ) {
      return normalizedValue;
    }

    throw AppErrors.serviceUnavailable(
      AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
      "AI hacim tahmini gecerli bir sizeClass dondurmedi."
    );
  }

  private parseSpaceProfile(value: unknown): VolumeAnalysisSpaceProfile {
    if (typeof value !== "string") {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini gecerli bir spaceProfile dondurmedi."
      );
    }

    const normalizedValue = value.trim().toLowerCase();

    if (
      normalizedValue === "compact" ||
      normalizedValue === "tall" ||
      normalizedValue === "wide" ||
      normalizedValue === "bulky" ||
      normalizedValue === "long" ||
      normalizedValue === "mixed"
    ) {
      return normalizedValue;
    }

    throw AppErrors.serviceUnavailable(
      AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
      "AI hacim tahmini gecerli bir spaceProfile dondurmedi."
    );
  }

  private parseVolumeProfile(value: unknown): VolumeAnalysisVolumeProfile {
    if (typeof value !== "string") {
      throw AppErrors.serviceUnavailable(
        AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
        "AI hacim tahmini gecerli bir volumeProfile dondurmedi."
      );
    }

    const normalizedValue = value.trim().toLowerCase();

    if (
      normalizedValue === "box_crate" ||
      normalizedValue === "pallet_load" ||
      normalizedValue === "desk_table" ||
      normalizedValue === "chair" ||
      normalizedValue === "sofa" ||
      normalizedValue === "shelf_bookcase" ||
      normalizedValue === "cabinet_wardrobe" ||
      normalizedValue === "bed_mattress" ||
      normalizedValue === "appliance" ||
      normalizedValue === "long_material" ||
      normalizedValue === "bag_sack" ||
      normalizedValue === "room_load" ||
      normalizedValue === "household_load" ||
      normalizedValue === "mixed_unknown"
    ) {
      return normalizedValue;
    }

    throw AppErrors.serviceUnavailable(
      AppErrorCode.VOLUME_SERVICE_UNAVAILABLE,
      "AI hacim tahmini gecerli bir volumeProfile dondurmedi."
    );
  }

  private parseStringArray(value: unknown, maxItems: number): string[] {
    //warnings alani bozuk gelse bile tahmin tamamen iptal edilmez; gecerli stringler ayiklanir.
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, maxItems);
  }
}
