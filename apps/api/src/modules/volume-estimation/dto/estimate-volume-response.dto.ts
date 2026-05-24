import type {
  VolumeAnalysisConfidence,
  VolumeAnalysisLoadType,
  VolumeAnalysisPlacementRisk,
  VolumeAnalysisShapeType,
  VolumeAnalysisSizeClass,
  VolumeAnalysisSpaceProfile,
  VolumeAnalysisVolumeProfile,
  VolumeEstimateConfidenceLevel,
} from "../volume-estimation.types";

export class EstimateVolumeResponseItemDto {
  label!: string;
  loadType!: VolumeAnalysisLoadType;
  shapeType!: VolumeAnalysisShapeType;
  sizeClass!: VolumeAnalysisSizeClass;
  volumeProfile!: VolumeAnalysisVolumeProfile;
  estimatedCount!: number;
  stackable!: boolean;
  confidence!: VolumeAnalysisConfidence;
  fragile!: boolean;
  disassemblable!: boolean;
  spaceProfile!: VolumeAnalysisSpaceProfile;
  placementRisk!: VolumeAnalysisPlacementRisk;
  notes!: string;
}

export class EstimateVolumeResponseDto {
  recommendedHacimM3!: number;
  minHacimM3!: number;
  maxHacimM3!: number;
  confidenceLevel!: VolumeEstimateConfidenceLevel;
  summary!: string;
  detectedItems!: string[];
  cautionNotes!: string[];
  items!: EstimateVolumeResponseItemDto[];
}
