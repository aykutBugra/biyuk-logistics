import { apiFetch } from "./api-client";

export type VolumeEstimateItem = {
  label: string;
  loadType:
    | "genel_yuk"
    | "paletli"
    | "koli"
    | "mobilya"
    | "beyaz_esya"
    | "insaat_malzemesi"
    | "diger";
  shapeType: "box" | "flat" | "cylinder" | "irregular" | "bundle" | "unknown";
  sizeClass: "small" | "medium" | "large" | "huge";
  estimatedCount: number;
  stackable: boolean;
  confidence: "low" | "medium" | "high";
  fragile: boolean;
  disassemblable: boolean;
  spaceProfile: "compact" | "tall" | "wide" | "bulky" | "long" | "mixed";
  placementRisk: "low" | "medium" | "high";
  notes: string;
};

export type VolumeEstimateResult = {
  recommendedHacimM3: number;
  minHacimM3: number;
  maxHacimM3: number;
  confidenceLevel: "DUSUK" | "ORTA" | "YUKSEK";
  summary: string;
  detectedItems: string[];
  cautionNotes: string[];
  items: VolumeEstimateItem[];
};

export type EstimateVolumeFromImagesInput = {
  accessToken: string;
  description?: string;
  images: File[];
  yukTipi?: string;
};

export function estimateVolumeFromImages({
  accessToken,
  description,
  images,
  yukTipi,
}: EstimateVolumeFromImagesInput) {
  const formData = new FormData();

  for (const image of images) {
    formData.append("images", image, image.name);
  }

  if (description && description.trim().length > 0) {
    formData.append("description", description.trim());
  }

  if (yukTipi && yukTipi.trim().length > 0) {
    formData.append("yukTipi", yukTipi.trim());
  }

  return apiFetch<VolumeEstimateResult>("/volume-estimates", {
    method: "POST",
    accessToken,
    body: formData,
  });
}
