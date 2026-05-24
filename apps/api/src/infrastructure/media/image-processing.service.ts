import sharp from "sharp";
import { Injectable } from "@nestjs/common";
import { AppErrorCode, AppErrors } from "../../common/errors";


//yüklenen görselin işlendiği dosya ve bu işlemin sonucunda 
//döndürülecek veri yapıları tanımlanır.
//buffer çünkü görsel verisi ikili formatta gelir ve işlenir.
export type ProcessedRequestImage = {
  detail: {
    buffer: Buffer;
    width: number;
    height: number;
    mimeType: "image/webp";
  };
  thumbnail: {
    buffer: Buffer;
    width: number;
    height: number;
    mimeType: "image/webp";
  };
};

export type ProcessedSingleImage = {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: "image/webp";
};

@Injectable()
export class ImageProcessingService {
  async processRequestImage(inputBuffer: Buffer): Promise<ProcessedRequestImage> {
    try {

      //sharp kütüphanesi ile görsel işleme yapılır. İlk olarak görsel döndürülmeden önce normalize edilir.
      //rotate ile görselin EXIF verilerine göre döndürülmesi sağlanır. toColorspace("srgb") ile renk uzayı sRGB'ye dönüştürülür.
      const normalizedBuffer = await sharp(inputBuffer, { failOn: "none" })
        .rotate()
        .toColorspace("srgb")
        .toBuffer();

      const detailBuffer = await sharp(normalizedBuffer)
        .resize({
          width: 1280,
          height: 1280,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality: 84,
        })
        .toBuffer();

      const detailMetadata = await sharp(detailBuffer).metadata();

      const thumbnailBuffer = await sharp(normalizedBuffer)
        .resize({
          width: 400,
          height: 300,
          fit: "cover",
          position: "attention",
          withoutEnlargement: false,
        })
        .webp({
          quality: 80,
        })
        .toBuffer();

      const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

      return {
        detail: {
          buffer: detailBuffer,
          width: detailMetadata.width ?? 0,
          height: detailMetadata.height ?? 0,
          mimeType: "image/webp",
        },
        thumbnail: {
          buffer: thumbnailBuffer,
          width: thumbnailMetadata.width ?? 0,
          height: thumbnailMetadata.height ?? 0,
          mimeType: "image/webp",
        },
      };
    } catch (err) {
      const sharpMessage = err instanceof Error ? err.message : String(err);
      console.error("[ImageProcessingService] Sharp error:", sharpMessage);
      throw AppErrors.badRequest(
        AppErrorCode.MEDIA_IMAGE_PROCESS_FAILED,
        `Gorsel islenemedi: ${sharpMessage}`
      );
    }
  }

  async processProfileImage(inputBuffer: Buffer): Promise<ProcessedSingleImage> {
    try {
      const normalizedBuffer = await this.normalizeImageBuffer(inputBuffer);
      const buffer = await sharp(normalizedBuffer)
        .resize({
          width: 512,
          height: 512,
          fit: "cover",
          position: "attention",
          withoutEnlargement: false,
        })
        .webp({ quality: 84 })
        .toBuffer();
      const metadata = await sharp(buffer).metadata();

      return {
        buffer,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        mimeType: "image/webp",
      };
    } catch (err) {
      const sharpMessage = err instanceof Error ? err.message : String(err);
      console.error("[ImageProcessingService] Sharp error:", sharpMessage);
      throw AppErrors.badRequest(
        AppErrorCode.MEDIA_IMAGE_PROCESS_FAILED,
        `Gorsel islenemedi: ${sharpMessage}`
      );
    }
  }

  async processVehicleImage(inputBuffer: Buffer): Promise<ProcessedSingleImage> {
    try {
      const normalizedBuffer = await this.normalizeImageBuffer(inputBuffer);
      const buffer = await sharp(normalizedBuffer)
        .resize({
          width: 1280,
          height: 960,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 84 })
        .toBuffer();
      const metadata = await sharp(buffer).metadata();

      return {
        buffer,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        mimeType: "image/webp",
      };
    } catch (err) {
      const sharpMessage = err instanceof Error ? err.message : String(err);
      console.error("[ImageProcessingService] Sharp error:", sharpMessage);
      throw AppErrors.badRequest(
        AppErrorCode.MEDIA_IMAGE_PROCESS_FAILED,
        `Gorsel islenemedi: ${sharpMessage}`
      );
    }
  }

  private normalizeImageBuffer(inputBuffer: Buffer): Promise<Buffer> {
    return sharp(inputBuffer, { failOn: "none" })
      .rotate()
      .toColorspace("srgb")
      .toBuffer();
  }
}
