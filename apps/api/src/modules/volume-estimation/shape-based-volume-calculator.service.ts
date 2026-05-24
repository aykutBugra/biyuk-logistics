import { Injectable } from "@nestjs/common";
import type {
  ShapeBasedVolumeCalculationResult,
  VolumeAnalysisConfidence,
  VolumeAnalysisItem,
  VolumeAnalysisPlacementRisk,
  VolumeAnalysisResult,
  VolumeAnalysisShapeType,
  VolumeAnalysisSizeClass,
  VolumeAnalysisVolumeProfile,
} from "./volume-estimation.types";
import {
  dedupeStrings,
  lowerAnalysisConfidence,
  normalizeVolumeLabel,
  roundVolume,
} from "./volume-estimation.utils";

type VolumeBand = {
  max: number;
  min: number;
};

type VolumeState = {
  halfWidth: number;
  recommended: number;
};

type ItemEstimate = {
  maxHacimM3: number;
  minHacimM3: number;
  recommendedHacimM3: number;
  warnings: string[];
};

const FIXED_CAUTION_NOTES = [
  "Bu sonuc gorsel yorum ve tasima kurallarina dayali tahmindir.",
  "Tek gorsel kesin fiziksel olcu vermez.",
  "Ikinci bir aci veya kisa aciklama dogrulugu artirabilir.",
] as const;


//AI'nin volumeProfile + sizeClass yorumunu m3 araligina baglayan temel tablo.
//Bu tablo kesin olcu degil, lojistik tahmin bandi olarak kullanilir.
const VOLUME_PROFILE_BANDS: Record<
  VolumeAnalysisVolumeProfile,
  Record<VolumeAnalysisSizeClass, VolumeBand>
> = {
  box_crate: {
    small: { min: 0.02, max: 0.06 },
    medium: { min: 0.06, max: 0.15 },
    large: { min: 0.15, max: 0.35 },
    huge: { min: 0.35, max: 0.7 },
  },
  pallet_load: {
    small: { min: 0.35, max: 0.7 },
    medium: { min: 0.7, max: 1.2 },
    large: { min: 1.2, max: 2 },
    huge: { min: 2, max: 3.2 },
  },
  desk_table: {
    small: { min: 0.15, max: 0.3 },
    medium: { min: 0.3, max: 0.55 },
    large: { min: 0.45, max: 0.8 },
    huge: { min: 0.8, max: 1.4 },
  },
  chair: {
    small: { min: 0.05, max: 0.12 },
    medium: { min: 0.12, max: 0.25 },
    large: { min: 0.25, max: 0.45 },
    huge: { min: 0.45, max: 0.75 },
  },
  sofa: {
    small: { min: 0.55, max: 0.9 },
    medium: { min: 0.8, max: 1.3 },
    large: { min: 1.4, max: 2 },
    huge: { min: 2, max: 3.2 },
  },
  shelf_bookcase: {
    small: { min: 0.12, max: 0.3 },
    medium: { min: 0.25, max: 0.55 },
    large: { min: 0.45, max: 0.8 },
    huge: { min: 0.8, max: 1.4 },
  },
  cabinet_wardrobe: {
    small: { min: 0.3, max: 0.65 },
    medium: { min: 0.6, max: 1.1 },
    large: { min: 1, max: 1.8 },
    huge: { min: 1.8, max: 3 },
  },
  bed_mattress: {
    small: { min: 0.35, max: 0.7 },
    medium: { min: 0.6, max: 1.1 },
    large: { min: 0.9, max: 1.7 },
    huge: { min: 1.4, max: 2.4 },
  },
  appliance: {
    small: { min: 0.12, max: 0.25 },
    medium: { min: 0.3, max: 0.4 },
    large: { min: 0.55, max: 0.85 },
    huge: { min: 0.85, max: 1.4 },
  },
  long_material: {
    small: { min: 0.05, max: 0.15 },
    medium: { min: 0.15, max: 0.35 },
    large: { min: 0.35, max: 0.8 },
    huge: { min: 0.8, max: 1.6 },
  },
  bag_sack: {
    small: { min: 0.03, max: 0.08 },
    medium: { min: 0.08, max: 0.18 },
    large: { min: 0.18, max: 0.35 },
    huge: { min: 0.35, max: 0.7 },
  },
  room_load: {
    small: { min: 2, max: 4 },
    medium: { min: 4, max: 8 },
    large: { min: 8, max: 14 },
    huge: { min: 14, max: 24 },
  },
  household_load: {
    small: { min: 8, max: 16 },
    medium: { min: 16, max: 30 },
    large: { min: 30, max: 50 },
    huge: { min: 50, max: 80 },
  },
  mixed_unknown: {
    small: { min: 0.2, max: 0.5 },
    medium: { min: 0.5, max: 1.2 },
    large: { min: 1.2, max: 2.5 },
    huge: { min: 2.5, max: 5 },
  },
};

const SHAPE_TYPE_RECOMMENDED_MULTIPLIERS: Record<
  VolumeAnalysisShapeType,
  number
> = {
  box: 1,
  flat: 0.95,
  cylinder: 1,
  bundle: 1.05,
  irregular: 1.1,
  unknown: 1.08,
};

const SHAPE_TYPE_WIDTH_MULTIPLIERS: Record<VolumeAnalysisShapeType, number> = {
  box: 1,
  flat: 0.95,
  cylinder: 1.05,
  bundle: 1.03,
  irregular: 1.1,
  unknown: 1.12,
};

const CONFIDENCE_WIDTH_MULTIPLIERS: Record<VolumeAnalysisConfidence, number> = {
  high: 0.9,
  medium: 1,
  low: 1.35,
};

const PLACEMENT_RISK_RANK: Record<VolumeAnalysisPlacementRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
};



//shapeBasedVolumeCalculatorService, AI analiz sonucunu kullanarak sekil tabanli bir hacim tahmini yapar;
//AI analizindeki her bir kalem icin, sekil, boyut sinifi, alan profili, 
// stacklenebilirlik, hassasiyet, parcali tasima durumu, yerlestirme riski
//  ve yuk tipi gibi ozelliklere gore uygun modifikasyonlar ve bias'lar
// uygulayarak kalem bazinda bir hacim tahmini yapar;
@Injectable()
export class ShapeBasedVolumeCalculatorService {
  //AI analizindeki her kalem icin hacim bandi hesaplar, adetle carpar ve toplam
  //onerilen/min/max hacim sonucunu uretir.
  calculate(
    analysis: VolumeAnalysisResult
  ): ShapeBasedVolumeCalculationResult {
    const calculationWarnings: string[] = [...analysis.warnings];
    let recommendedHacimM3 = 0;
    let minHacimM3 = 0;
    let maxHacimM3 = 0;

    for (const item of analysis.items) {
      const itemEstimate = this.calculateItem(item);

      calculationWarnings.push(...itemEstimate.warnings);
      recommendedHacimM3 += itemEstimate.recommendedHacimM3 * item.estimatedCount;
      minHacimM3 += itemEstimate.minHacimM3 * item.estimatedCount;
      maxHacimM3 += itemEstimate.maxHacimM3 * item.estimatedCount;
    }

    const cautionNotes = dedupeStrings([
      ...FIXED_CAUTION_NOTES,
      ...calculationWarnings,
    ]);

    return {
      items: analysis.items,
      recommendedHacimM3: roundVolume(recommendedHacimM3),
      minHacimM3: roundVolume(minHacimM3),
      maxHacimM3: roundVolume(maxHacimM3),
      detectedItems: analysis.items.map((item) => item.label),
      cautionNotes,
      backendConfidence: this.resolveBackendConfidence(analysis),
      summary: this.buildSummary(
        analysis.items.length,
        recommendedHacimM3,
        minHacimM3,
        maxHacimM3
      ),
    };
  }

  private applyConfidenceWidth(
    state: VolumeState,
    confidence: VolumeAnalysisConfidence
  ): VolumeState {
    //AI guveni dustukce aralik genisletilir; recommended deger ayni kalir.
    return {
      ...state,
      halfWidth: state.halfWidth * CONFIDENCE_WIDTH_MULTIPLIERS[confidence],
    };
  }

  private buildSummary(
    itemCount: number,
    recommendedHacimM3: number,
    minHacimM3: number,
    maxHacimM3: number
  ): string {
    return [
      `Tahmini tasima hacmi onerisi ${roundVolume(recommendedHacimM3)} m3.`,
      `Aralik ${roundVolume(minHacimM3)}-${roundVolume(maxHacimM3)} m3.`,
      `Analiz ${itemCount} kalem uzerinden uretildi.`,
    ].join(" ");
  }

  private calculateItem(item: VolumeAnalysisItem): ItemEstimate {
    //Tek kalem icin temel bandi alir, sonra sekil, yuk tipi, istif ve risk
    //modifier'larini sirayla uygular.
    const warnings: string[] = [];
    const effectiveItem = this.applySemanticFallbacks(item, warnings);
    let state = this.toState(
      VOLUME_PROFILE_BANDS[effectiveItem.volumeProfile][effectiveItem.sizeClass]
    );
    const effectiveStackable = this.resolveEffectiveStackable(effectiveItem);

    state = this.applyShapeTypeModifiers(state, effectiveItem.shapeType, warnings);
    state = this.applyLoadTypeBiases(
      state,
      effectiveItem,
      effectiveStackable,
      warnings
    );
    state = this.applyStandardModifiers(
      state,
      effectiveItem,
      effectiveStackable,
      warnings
    );
    state = this.applyConfidenceWidth(state, effectiveItem.confidence);

    const finalBand = this.toBand(state);

    return {
      minHacimM3: roundVolume(finalBand.min),
      maxHacimM3: roundVolume(finalBand.max),
      recommendedHacimM3: roundVolume(state.recommended),
      warnings,
    };
  }

  private applyLoadTypeBiases(
    state: VolumeState,
    item: VolumeAnalysisItem,
    effectiveStackable: boolean,
    warnings: string[]
  ): VolumeState {
    //Kullanicinin yukTipi veya AI loadType yorumu, hacim bandini daha konservatif hale getirebilir.
    let nextState = state;

    if (item.loadType === "koli" && item.volumeProfile !== "box_crate") {
      warnings.push(
        `"${item.label}" koli olarak yorumlandi ancak hacim profili kutu/kasa degil; konservatif hacim korundu.`
      );
    }

    if (item.loadType === "paletli" && item.volumeProfile !== "pallet_load") {
      nextState = {
        ...nextState,
        recommended: nextState.recommended * 1.08,
        halfWidth: nextState.halfWidth * 1.08,
      };
      warnings.push(
        `"${item.label}" paletli yuk olarak secildigi icin hacim araligi konservatif tutuldu.`
      );
    }

    if (
      item.loadType === "beyaz_esya" &&
      item.volumeProfile !== "appliance"
    ) {
      nextState = {
        ...nextState,
        recommended: nextState.recommended * 1.08,
      };
      warnings.push(
        `"${item.label}" beyaz esya olarak yorumlandigi icin tasima hacmi hafif yukari cekildi.`
      );
    }

    if (
      item.loadType === "mobilya" &&
      ![
        "desk_table",
        "chair",
        "sofa",
        "shelf_bookcase",
        "cabinet_wardrobe",
        "bed_mattress",
      ].includes(item.volumeProfile)
    ) {
      nextState = {
        ...nextState,
        recommended: nextState.recommended * 1.08,
      };
      warnings.push(
        `"${item.label}" mobilya olarak yorumlandigi icin tasima hacmi hafif yukari cekildi.`
      );
    }

    if (
      item.loadType === "insaat_malzemesi" &&
      !["long_material", "pallet_load", "mixed_unknown"].includes(
        item.volumeProfile
      )
    ) {
      nextState = {
        ...nextState,
        recommended: nextState.recommended * 1.06,
      };
      warnings.push(
        `"${item.label}" insaat malzemesi olarak yorumlandigi icin tasima hacmi hafif yukari cekildi.`
      );
    }

    if (item.loadType === "diger" && item.confidence !== "high") {
      nextState = {
        ...nextState,
        halfWidth: nextState.halfWidth * 1.1,
      };
    }

    if (item.loadType === "koli" && item.fragile) {
      warnings.push(
        `"${item.label}" hassas gorundugu icin koli istif avantajlari sinirli kabul edildi.`
      );
    }

    return nextState;
  }

  private applySemanticFallbacks(
    item: VolumeAnalysisItem,
    warnings: string[]
  ): VolumeAnalysisItem {
    //Etiket uzerinden bariz esya turleri yakalanirsa mixed_unknown gibi belirsiz
    //AI yorumlari daha anlamli profile'a cekilir.
    const normalizedLabel = normalizeVolumeLabel(item.label);
    const nextItem = { ...item };
    const inferredProfile = this.inferVolumeProfileFromLabel(normalizedLabel);

    if (
      (normalizedLabel.includes("gardrop") || normalizedLabel.includes("dolap")) &&
      !["tall", "bulky"].includes(nextItem.spaceProfile)
    ) {
      nextItem.spaceProfile = "tall";
      warnings.push(
        `"${item.label}" icin dolap/gardrop fallback'i ile tall tasima profili kullanildi.`
      );
    }

    if (
      (normalizedLabel.includes("gardrop") || normalizedLabel.includes("dolap")) &&
      PLACEMENT_RISK_RANK[nextItem.placementRisk] < PLACEMENT_RISK_RANK.medium
    ) {
      nextItem.placementRisk = "medium";
      warnings.push(
        `"${item.label}" icin yerlestirme riski en az medium kabul edildi.`
      );
    }

    if (inferredProfile && nextItem.volumeProfile === "mixed_unknown") {
      nextItem.volumeProfile = inferredProfile;
      warnings.push(
        `"${item.label}" icin etiket fallback'i ile ${inferredProfile} hacim profili kullanildi.`
      );
    }

    return nextItem;
  }

  private inferVolumeProfileFromLabel(
    normalizedLabel: string
  ): VolumeAnalysisVolumeProfile | null {
    if (
      normalizedLabel.includes("buzdolabi") ||
      normalizedLabel.includes("camasir makinesi") ||
      normalizedLabel.includes("bulasik makinesi") ||
      normalizedLabel.includes("kurutma makinesi")
    ) {
      return "appliance";
    }

    if (
      normalizedLabel.includes("kanepe") ||
      normalizedLabel.includes("koltuk") ||
      normalizedLabel.includes("sofa")
    ) {
      return "sofa";
    }

    if (normalizedLabel.includes("sandalye")) {
      return "chair";
    }

    if (
      normalizedLabel.includes("kitaplik") ||
      normalizedLabel.includes("raf")
    ) {
      return "shelf_bookcase";
    }

    if (
      normalizedLabel.includes("gardrop") ||
      normalizedLabel.includes("dolap")
    ) {
      return "cabinet_wardrobe";
    }

    if (
      normalizedLabel.includes("masa") ||
      normalizedLabel.includes("sehpa") ||
      normalizedLabel.includes("desk") ||
      normalizedLabel.includes("table")
    ) {
      return "desk_table";
    }

    if (
      normalizedLabel.includes("koli") ||
      normalizedLabel.includes("kasa") ||
      normalizedLabel.includes("crate")
    ) {
      return "box_crate";
    }

    if (normalizedLabel.includes("palet")) {
      return "pallet_load";
    }

    if (
      normalizedLabel.includes("yatak") ||
      normalizedLabel.includes("dosek") ||
      normalizedLabel.includes("silte") ||
      normalizedLabel.includes("mattress")
    ) {
      return "bed_mattress";
    }

    if (
      normalizedLabel.includes("boru") ||
      normalizedLabel.includes("profil") ||
      normalizedLabel.includes("kereste")
    ) {
      return "long_material";
    }

    if (
      normalizedLabel.includes("cuval") ||
      normalizedLabel.includes("torba")
    ) {
      return "bag_sack";
    }

    if (normalizedLabel.includes("oda")) {
      return "room_load";
    }

    if (normalizedLabel.includes("ev esyasi")) {
      return "household_load";
    }

    return null;
  }

  private applyShapeTypeModifiers(
    state: VolumeState,
    shapeType: VolumeAnalysisShapeType,
    warnings: string[]
  ): VolumeState {
    //Irregular veya unknown gibi sekiller tasimada daha fazla bosluk yaratabilecegi icin
    //recommended ve aralik genisligi modifier alir.
    if (shapeType === "unknown") {
      warnings.push("Sekil yorumu belirsiz olan kalemlerde aralik konservatif genisletildi.");
    }

    return {
      recommended: state.recommended * SHAPE_TYPE_RECOMMENDED_MULTIPLIERS[shapeType],
      halfWidth: state.halfWidth * SHAPE_TYPE_WIDTH_MULTIPLIERS[shapeType],
    };
  }

  private applyStandardModifiers(
    state: VolumeState,
    item: VolumeAnalysisItem,
    effectiveStackable: boolean,
    warnings: string[]
  ): VolumeState {
    //Istiflenebilirlik, parcalanabilirlik, hassasiyet ve yerlestirme riski gibi
    //genel tasima kurallari burada uygulanir.
    let nextState = state;

    if (effectiveStackable && !item.fragile) {
      nextState = {
        recommended: nextState.recommended * 0.96,
        halfWidth: nextState.halfWidth * 0.88,
      };
    }

    if (item.disassemblable) {
      nextState = {
        ...nextState,
        recommended: nextState.recommended * 0.85,
      };
      warnings.push("Parcali tasima ile efektif hacim azalabilir.");
    }

    if (item.fragile) {
      nextState = {
        ...nextState,
        recommended: nextState.recommended * 1.08,
      };
      warnings.push("Hassas urun nedeniyle istifleme sinirli olabilir.");
    }

    if (item.placementRisk === "medium") {
      nextState = {
        ...nextState,
        recommended: nextState.recommended * 1.05,
      };
    }

    if (item.placementRisk === "high") {
      nextState = {
        ...nextState,
        recommended: nextState.recommended * 1.12,
      };
      warnings.push("Yerlestirme riski nedeniyle efektif tasima hacmi artabilir.");
    }

    return nextState;
  }

  private resolveEffectiveStackable(item: VolumeAnalysisItem): boolean {
    //Koli/kasa/cuval gibi yuklerde hassas degilse istiflenebilirlik daha iyimser kabul edilir.
    if (
      (item.loadType === "koli" ||
        item.volumeProfile === "box_crate" ||
        item.volumeProfile === "bag_sack") &&
      !item.fragile
    ) {
      return true;
    }

    return item.stackable;
  }

  private resolveBackendConfidence(
    analysis: VolumeAnalysisResult
  ): VolumeAnalysisConfidence {
    //Backend guveni, en dusuk item guveni ve merge celiskilerine gore dusurulur.
    const lowestItemConfidence = analysis.items.reduce<VolumeAnalysisConfidence>(
      (lowestConfidence, item) =>
        lowerAnalysisConfidence(lowestConfidence, item.confidence),
      "high"
    );

    if (
      lowestItemConfidence === "low" ||
      analysis.mergeConflictDetected === true
    ) {
      return "low";
    }

    if (
      analysis.items.some(
        (item) =>
          item.spaceProfile === "mixed" ||
          item.shapeType === "unknown" ||
          item.volumeProfile === "mixed_unknown"
      )
    ) {
      return lowerAnalysisConfidence(lowestItemConfidence, "medium");
    }

    return lowestItemConfidence;
  }
  private toBand(state: VolumeState): VolumeBand {
    //Recommended + halfWidth modelini min/max bandina cevirir.
    return {
      min: Math.max(0.01, state.recommended - state.halfWidth),
      max: Math.max(state.recommended + state.halfWidth, state.recommended),
    };
  }

  private toState(band: VolumeBand): VolumeState {
    //Tablodaki min/max bandini modifier uygulanabilir internal state'e cevirir.
    return {
      recommended: (band.min + band.max) / 2,
      halfWidth: (band.max - band.min) / 2,
    };
  }
}
