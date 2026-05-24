export const VOLUME_ANALYSIS_LOAD_TYPES = [
  "genel_yuk",
  "paletli",
  "koli",
  "mobilya",
  "beyaz_esya",
  "insaat_malzemesi",
  "diger",
] as const;

export const VOLUME_ANALYSIS_SHAPE_TYPES = [
  "box",
  "flat",
  "cylinder",
  "irregular",
  "bundle",
  "unknown",
] as const;

export const VOLUME_ANALYSIS_SIZE_CLASSES = [
  "small",
  "medium",
  "large",
  "huge",
] as const;

export const VOLUME_ANALYSIS_VOLUME_PROFILES = [
  "box_crate",
  "pallet_load",
  "desk_table",
  "chair",
  "sofa",
  "shelf_bookcase",
  "cabinet_wardrobe",
  "bed_mattress",
  "appliance",
  "long_material",
  "bag_sack",
  "room_load",
  "household_load",
  "mixed_unknown",
] as const;

export const VOLUME_ANALYSIS_SPACE_PROFILES = [
  "compact",
  "tall",
  "wide",
  "bulky",
  "long",
  "mixed",
] as const;

export const VOLUME_ANALYSIS_PLACEMENT_RISKS = [
  "low",
  "medium",
  "high",
] as const;

export const VOLUME_ANALYSIS_CONFIDENCES = [
  "low",
  "medium",
  "high",
] as const;

export const VOLUME_ESTIMATE_CONFIDENCE_LEVELS = [
  "DUSUK",
  "ORTA",
  "YUKSEK",
] as const;

export type VolumeAnalysisLoadType =
  (typeof VOLUME_ANALYSIS_LOAD_TYPES)[number];
export type VolumeAnalysisShapeType =
  (typeof VOLUME_ANALYSIS_SHAPE_TYPES)[number];
export type VolumeAnalysisSizeClass =
  (typeof VOLUME_ANALYSIS_SIZE_CLASSES)[number];
export type VolumeAnalysisVolumeProfile =
  (typeof VOLUME_ANALYSIS_VOLUME_PROFILES)[number];
export type VolumeAnalysisSpaceProfile =
  (typeof VOLUME_ANALYSIS_SPACE_PROFILES)[number];
export type VolumeAnalysisPlacementRisk =
  (typeof VOLUME_ANALYSIS_PLACEMENT_RISKS)[number];
export type VolumeAnalysisConfidence =
  (typeof VOLUME_ANALYSIS_CONFIDENCES)[number];
export type VolumeEstimateConfidenceLevel =
  (typeof VOLUME_ESTIMATE_CONFIDENCE_LEVELS)[number];


  // VolumeAnalysisItem, VolumeAnalysisResult, ShapeBasedVolumeCalculationResult 
  // tipleri, hacim tahmini surecinde kullanilan ara veri yapilarini tanimlar; 
  // VolumeAnalysisItem, tek bir tespit edilen nesne veya nesne grubunu temsil ederken, 
  // VolumeAnalysisResult, tum analiz sonucunu ve genel guven seviyesini icerir; 
  // ShapeBasedVolumeCalculationResult ise sekil tabanli hesaplama sonucunu ve ilgili bilgileri tutar
export type VolumeAnalysisItem = {
  label: string;
  loadType: VolumeAnalysisLoadType;
  shapeType: VolumeAnalysisShapeType;
  sizeClass: VolumeAnalysisSizeClass;
  volumeProfile: VolumeAnalysisVolumeProfile;
  estimatedCount: number;
  stackable: boolean;
  confidence: VolumeAnalysisConfidence;
  fragile: boolean;
  disassemblable: boolean;
  spaceProfile: VolumeAnalysisSpaceProfile;
  placementRisk: VolumeAnalysisPlacementRisk;
  notes: string;
};

export type VolumeAnalysisResult = {
  items: VolumeAnalysisItem[];
  overallConfidence: VolumeAnalysisConfidence;
  warnings: string[];
  mergeConflictDetected?: boolean;
};

export type ShapeBasedVolumeCalculationResult = {
  backendConfidence: VolumeAnalysisConfidence;
  cautionNotes: string[];
  detectedItems: string[];
  items: VolumeAnalysisItem[];
  maxHacimM3: number;
  minHacimM3: number;
  recommendedHacimM3: number;
  summary: string;
};
