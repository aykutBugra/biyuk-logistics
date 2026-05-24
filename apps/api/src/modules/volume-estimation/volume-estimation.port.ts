import type { VolumeAnalysisResult } from "./volume-estimation.types";

export type VolumeEstimationImageInput = {
  dataUrl: string;
  sourceName: string;
};

export type VolumeEstimationAnalyzeInput = {
  description?: string;
  images: VolumeEstimationImageInput[];
  yukTipi?: string;
};

export interface VolumeEstimationPort {
  analyzeShipment(input: VolumeEstimationAnalyzeInput): Promise<VolumeAnalysisResult>;
}
