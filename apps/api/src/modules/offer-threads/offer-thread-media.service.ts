import { Injectable, Optional } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AppErrorCode, AppErrors } from "../../common/errors";
import { ImageProcessingService } from "../../infrastructure/media/image-processing.service";
import { MediaStorageService } from "../../infrastructure/media/media-storage.service";
import type { CreateOfferThreadImageMessageAttachmentInput } from "./repositories/offer-threads.repository";

const THREAD_IMAGE_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const MAX_THREAD_IMAGE_COUNT = 4;

export type PreparedThreadImageAttachments = {
  attachments: CreateOfferThreadImageMessageAttachmentInput[];
  persistedStorageKeys: string[];
};

@Injectable()
export class OfferThreadMediaService {
  constructor(
    @Optional() private readonly imageProcessingService?: ImageProcessingService,
    @Optional() private readonly mediaStorageService?: MediaStorageService
  ) {}

  assertValidThreadImageFile(file: Express.Multer.File): void {
    if (!THREAD_IMAGE_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw AppErrors.badRequest(
        AppErrorCode.THREAD_VALIDATION,
        "Yalnizca JPEG, PNG veya WEBP gorseller yuklenebilir."
      );
    }
  }

  async prepareImageAttachments(
    files: Express.Multer.File[],
    offerPublicId: string
  ): Promise<PreparedThreadImageAttachments> {
    const mediaStorageService = this.requireMediaStorageService();
    const imageProcessingService = this.requireImageProcessingService();
    const persistedStorageKeys: string[] = [];
    const attachments: CreateOfferThreadImageMessageAttachmentInput[] = [];

    for (const [index, file] of files.entries()) {
      this.assertValidThreadImageFile(file);

      if (!file.buffer || file.buffer.length === 0) {
        throw AppErrors.badRequest(AppErrorCode.THREAD_FILE_UNREADABLE, "Dosya icerigi okunamadi.");
      }

      const processedImage = await imageProcessingService.processRequestImage(file.buffer);
      const imageId = randomUUID();
      const storageKey = `offer-thread-images/${offerPublicId}/${imageId}.webp`;
      const thumbnailStorageKey = `offer-thread-images/${offerPublicId}/${imageId}-thumb.webp`;

      await mediaStorageService.saveFile({
        storageKey,
        buffer: processedImage.detail.buffer,
        contentType: processedImage.detail.mimeType,
      });
      persistedStorageKeys.push(storageKey);

      await mediaStorageService.saveFile({
        storageKey: thumbnailStorageKey,
        buffer: processedImage.thumbnail.buffer,
        contentType: processedImage.thumbnail.mimeType,
      });
      persistedStorageKeys.push(thumbnailStorageKey);

      attachments.push({
        storageKey,
        thumbnailStorageKey,
        mimeType: processedImage.detail.mimeType,
        sizeBytes: file.size,
        width: processedImage.detail.width,
        height: processedImage.detail.height,
        sortOrder: index,
        originalFileName: file.originalname,
      });
    }

    return {
      attachments,
      persistedStorageKeys,
    };
  }

  async rollbackStorageKeys(storageKeys: string[]): Promise<void> {
    if (storageKeys.length === 0 || !this.mediaStorageService) {
      return;
    }

    await Promise.allSettled(
      storageKeys.map((storageKey) => this.mediaStorageService!.deleteFile(storageKey))
    );
  }

  toPublicUrl(storageKey: string): string {
    return this.requireMediaStorageService().toPublicUrl(storageKey);
  }

  toOptionalPublicUrl(storageKey: string | null): string | undefined {
    return storageKey && this.mediaStorageService
      ? this.mediaStorageService.toPublicUrl(storageKey)
      : undefined;
  }

  private requireMediaStorageService(): MediaStorageService {
    if (this.mediaStorageService) {
      return this.mediaStorageService;
    }

    throw AppErrors.internal(
      AppErrorCode.THREAD_MEDIA_NOT_CONFIGURED,
      "Media storage service is not configured."
    );
  }

  private requireImageProcessingService(): ImageProcessingService {
    if (this.imageProcessingService) {
      return this.imageProcessingService;
    }

    throw AppErrors.internal(
      AppErrorCode.THREAD_MEDIA_NOT_CONFIGURED,
      "Image processing service is not configured."
    );
  }
}
