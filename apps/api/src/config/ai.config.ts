import { registerAs } from "@nestjs/config";

const toPositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default registerAs("ai", () => ({
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  volumeEstimationModel: (
    process.env.OPENAI_VOLUME_ESTIMATION_MODEL ?? "gpt-4.1"
  ).trim(),
  volumeEstimationTimeoutMs: toPositiveNumber(
    process.env.OPENAI_VOLUME_ESTIMATION_TIMEOUT_MS,
    20000
  ),
  volumeEstimationMaxImages: Math.floor(
    toPositiveNumber(process.env.OPENAI_VOLUME_ESTIMATION_MAX_IMAGES, 3)
  ),
  volumeEstimationMaxFileSizeBytes:
    toPositiveNumber(process.env.OPENAI_VOLUME_ESTIMATION_MAX_FILE_SIZE_MB, 5) *
    1024 *
    1024,
  volumeEstimationMaxTotalSizeBytes:
    toPositiveNumber(process.env.OPENAI_VOLUME_ESTIMATION_MAX_TOTAL_SIZE_MB, 12) *
    1024 *
    1024,
  volumeEstimationMaxImageDimensionPx: Math.floor(
    toPositiveNumber(
      process.env.OPENAI_VOLUME_ESTIMATION_MAX_IMAGE_DIMENSION_PX,
      1600
    )
  ),
  volumeEstimationJpegQuality: Math.floor(
    toPositiveNumber(process.env.OPENAI_VOLUME_ESTIMATION_JPEG_QUALITY, 82)
  ),
  volumeEstimationShortWindowLimit: Math.floor(
    toPositiveNumber(
      process.env.OPENAI_VOLUME_ESTIMATION_RATE_LIMIT_SHORT,
      3
    )
  ),
  volumeEstimationShortWindowMinutes: Math.floor(
    toPositiveNumber(
      process.env.OPENAI_VOLUME_ESTIMATION_RATE_LIMIT_SHORT_MINUTES,
      10
    )
  ),
  volumeEstimationDailyLimit: Math.floor(
    toPositiveNumber(
      process.env.OPENAI_VOLUME_ESTIMATION_RATE_LIMIT_DAILY,
      20
    )
  ),
}));
