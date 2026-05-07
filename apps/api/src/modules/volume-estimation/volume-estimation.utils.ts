import type {
  VolumeAnalysisConfidence,
  VolumeEstimateConfidenceLevel,
} from "./volume-estimation.types";

const ANALYSIS_CONFIDENCE_RANK: Record<VolumeAnalysisConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const ANALYSIS_TO_PUBLIC_CONFIDENCE: Record<
  VolumeAnalysisConfidence,
  VolumeEstimateConfidenceLevel
> = {
  low: "DUSUK",
  medium: "ORTA",
  high: "YUKSEK",
};

export function compareAnalysisConfidence(
  left: VolumeAnalysisConfidence,
  right: VolumeAnalysisConfidence
): number {
  return ANALYSIS_CONFIDENCE_RANK[left] - ANALYSIS_CONFIDENCE_RANK[right];
}

export function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();

    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    deduped.push(trimmed);
  }

  return deduped;
}

export function lowerAnalysisConfidence(
  left: VolumeAnalysisConfidence,
  right: VolumeAnalysisConfidence
): VolumeAnalysisConfidence {
  return compareAnalysisConfidence(left, right) <= 0 ? left : right;
}

export function normalizeVolumeLabel(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/\u0131/g, "i")
    .replace(/\u00e7/g, "c")
    .replace(/\u011f/g, "g")
    .replace(/\u00f6/g, "o")
    .replace(/\u015f/g, "s")
    .replace(/\u00fc/g, "u")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function roundVolume(value: number): number {
  return Number(value.toFixed(2));
}

export function toPublicConfidenceLevel(
  confidence: VolumeAnalysisConfidence
): VolumeEstimateConfidenceLevel {
  return ANALYSIS_TO_PUBLIC_CONFIDENCE[confidence];
}
