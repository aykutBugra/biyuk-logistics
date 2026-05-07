import { Injectable } from "@nestjs/common";
import type {
  ShapeBasedVolumeCalculationResult,
  VolumeAnalysisConfidence,
  VolumeAnalysisItem,
  VolumeAnalysisPlacementRisk,
  VolumeAnalysisResult,
  VolumeAnalysisShapeType,
  VolumeAnalysisSizeClass,
  VolumeAnalysisSpaceProfile,
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

const SPACE_PROFILE_BASE_BANDS: Record<
  VolumeAnalysisSpaceProfile,
  Record<VolumeAnalysisSizeClass, VolumeBand>
> = {
  compact: {
    small: { min: 0.03, max: 0.12 },
    medium: { min: 0.12, max: 0.4 },
    large: { min: 0.4, max: 0.9 },
    huge: { min: 0.9, max: 1.8 },
  },
  tall: {
    small: { min: 0.2, max: 0.5 },
    medium: { min: 0.5, max: 1.2 },
    large: { min: 1.2, max: 2.2 },
    huge: { min: 2.2, max: 4 },
  },
  wide: {
    small: { min: 0.15, max: 0.4 },
    medium: { min: 0.4, max: 1 },
    large: { min: 1, max: 2.2 },
    huge: { min: 2.2, max: 4.5 },
  },
  bulky: {
    small: { min: 0.2, max: 0.5 },
    medium: { min: 0.5, max: 1.3 },
    large: { min: 1.3, max: 2.8 },
    huge: { min: 2.8, max: 5 },
  },
  long: {
    small: { min: 0.1, max: 0.3 },
    medium: { min: 0.3, max: 0.8 },
    large: { min: 0.8, max: 1.8 },
    huge: { min: 1.8, max: 3.5 },
  },
  mixed: {
    small: { min: 0.1, max: 0.4 },
    medium: { min: 0.4, max: 1.1 },
    large: { min: 1.1, max: 2.5 },
    huge: { min: 2.5, max: 5 },
  },
};

const PALLET_FLOOR_BANDS: Record<VolumeAnalysisSizeClass, VolumeBand> = {
  small: { min: 0.3, max: 0.6 },
  medium: { min: 0.6, max: 1.2 },
  large: { min: 1, max: 2 },
  huge: { min: 1.5, max: 3 },
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

@Injectable()
export class ShapeBasedVolumeCalculatorService {
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
    const warnings: string[] = [];
    const numericOverrideBand = this.resolveNumericOverrideBand(item);

    if (numericOverrideBand) {
      const overrideWarnings = this.buildNumericOverrideWarnings(item);
      const overrideState = this.applyConfidenceWidth(
        this.toState(numericOverrideBand),
        item.confidence
      );
      const finalBand = this.toBand(overrideState);

      warnings.push(...overrideWarnings);

      return {
        minHacimM3: roundVolume(finalBand.min),
        maxHacimM3: roundVolume(finalBand.max),
        recommendedHacimM3: roundVolume(overrideState.recommended),
        warnings,
      };
    }

    const effectiveItem = this.applySemanticFallbacks(item, warnings);
    let state = this.toState(
      SPACE_PROFILE_BASE_BANDS[effectiveItem.spaceProfile][effectiveItem.sizeClass]
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
    let nextState = state;

    if (item.loadType === "koli" && !["compact", "mixed"].includes(item.spaceProfile)) {
      warnings.push(
        `"${item.label}" koli olarak yorumlandi ancak tasima profili alisilmadik gorundu; konservatif hacim korundu.`
      );
    }

    if (item.loadType === "paletli") {
      const palletFloor = PALLET_FLOOR_BANDS[item.sizeClass];
      const flooredBand = this.applyPalletFloor(this.toBand(nextState), palletFloor);
      nextState = this.toState(flooredBand);
    }

    if (
      item.loadType === "beyaz_esya" &&
      !["tall", "bulky"].includes(item.spaceProfile)
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
      !["wide", "tall", "bulky"].includes(item.spaceProfile)
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
      !["long", "mixed", "bulky"].includes(item.spaceProfile)
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

  private applyPalletFloor(baseBand: VolumeBand, floorBand: VolumeBand): VolumeBand {
    return {
      min: Math.max(baseBand.min, floorBand.min),
      max: Math.max(baseBand.max, floorBand.max),
    };
  }

  private applySemanticFallbacks(
    item: VolumeAnalysisItem,
    warnings: string[]
  ): VolumeAnalysisItem {
    const normalizedLabel = normalizeVolumeLabel(item.label);
    const nextItem = { ...item };

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

    return nextItem;
  }

  private applyShapeTypeModifiers(
    state: VolumeState,
    shapeType: VolumeAnalysisShapeType,
    warnings: string[]
  ): VolumeState {
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

  private buildNumericOverrideWarnings(item: VolumeAnalysisItem): string[] {
    const warnings: string[] = [];

    if (item.disassemblable) {
      warnings.push("Parcali tasima ile efektif hacim azalabilir.");
    }

    if (item.fragile) {
      warnings.push("Hassas urun nedeniyle istifleme sinirli olabilir.");
    }

    if (item.placementRisk === "medium") {
      warnings.push(
        `"${item.label}" icin yerlestirme dikkati gerekse de fallback override bandi korundu.`
      );
    }

    if (item.placementRisk === "high") {
      warnings.push(
        `"${item.label}" icin yerlestirme riski yuksek olsa da fallback override bandi korundu.`
      );
    }

    if (
      item.stackable &&
      (item.fragile || item.placementRisk === "medium" || item.placementRisk === "high")
    ) {
      warnings.push(
        `"${item.label}" icin istifleme bilgisi override hacim bandini degistirmedi.`
      );
    }

    return warnings;
  }

  private resolveEffectiveStackable(item: VolumeAnalysisItem): boolean {
    if (item.loadType === "koli" && !item.fragile) {
      return true;
    }

    return item.stackable;
  }

  private resolveBackendConfidence(
    analysis: VolumeAnalysisResult
  ): VolumeAnalysisConfidence {
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
        (item) => item.spaceProfile === "mixed" || item.shapeType === "unknown"
      )
    ) {
      return lowerAnalysisConfidence(lowestItemConfidence, "medium");
    }

    return lowestItemConfidence;
  }

  private resolveNumericOverrideBand(item: VolumeAnalysisItem): VolumeBand | null {
    const normalizedLabel = normalizeVolumeLabel(item.label);

    if (normalizedLabel.includes("buzdolabi")) {
      return { min: 0.55, max: 0.85 };
    }

    if (
      normalizedLabel.includes("camasir makinesi") ||
      normalizedLabel.includes("bulasik makinesi") ||
      normalizedLabel.includes("kurutma makinesi")
    ) {
      return { min: 0.3, max: 0.4 };
    }

    if (normalizedLabel.includes("l koltuk")) {
      return { min: 2, max: 3.2 };
    }

    if (
      normalizedLabel.includes("3lu koltuk") ||
      normalizedLabel.includes("uclu koltuk")
    ) {
      return { min: 1.4, max: 2 };
    }

    return null;
  }

  private toBand(state: VolumeState): VolumeBand {
    return {
      min: Math.max(0.01, state.recommended - state.halfWidth),
      max: Math.max(state.recommended + state.halfWidth, state.recommended),
    };
  }

  private toState(band: VolumeBand): VolumeState {
    return {
      recommended: (band.min + band.max) / 2,
      halfWidth: (band.max - band.min) / 2,
    };
  }
}
