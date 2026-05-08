import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ROLE_NAMES } from "../../common/constants/role-names";
import { RequestImageResponseDto } from "../../common/dto/request-image-response.dto";
import { RequestImageSummaryResponseDto } from "../../common/dto/request-image-summary-response.dto";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { MediaStorageService } from "../../infrastructure/media/media-storage.service";
import { ImageProcessingService } from "../../infrastructure/media/image-processing.service";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { buildRatingContext } from "../ratings/rating-context.helpers";
import { LocationsService } from "../locations/locations.service";
import { CreateTransportRequestDto } from "./dto/create-transport-request.dto";
import { TransportRequestDetailResponseDto } from "./dto/transport-request-detail-response.dto";
import { TransportRequestJobSummaryResponseDto } from "./dto/transport-request-job-summary-response.dto";
import { TransportRequestListItemResponseDto } from "./dto/transport-request-list-item-response.dto";
import { UpdateTransportRequestDto } from "./dto/update-transport-request.dto";
import { UploadTransportRequestImagesBodyDto } from "./dto/upload-transport-request-images-body.dto";
import {
  type CreateTransportRequestImageRecordInput,
  type StoredTransportRequestImageRecord,
  type StoredTransportRequestJobRecord,
  type StoredTransportRequestRecord,
  TransportRequestsRepository,
} from "./repositories/transport-requests.repository";

const INITIAL_TRANSPORT_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "OLUSTURULDU",
} as const;

const REQUEST_IMAGE_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_REQUEST_IMAGE_COUNT = 10;

type TransportRequestRouteFields = {
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  baslangicProvider: string | null;
  varisProvider: string | null;
  baslangicPlaceId: string | null;
  varisPlaceId: string | null;
  normalizeBaslangicSehir: string | null;
  normalizeVarisSehir: string | null;
  normalizeBaslangicIlce: string | null;
  normalizeVarisIlce: string | null;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  rotaMesafeMetre: number | null;
  rotaSureSaniye: number | null;
};

type PreparedRequestImageUpload = {
  storageKey: string;
  thumbnailStorageKey: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  originalFileName: string;
};

@Injectable()
export class TransportRequestsService {
  constructor(
    private readonly transportRequestsRepository: TransportRequestsRepository,
    private readonly locationsService: LocationsService,
    private readonly mediaStorageService: MediaStorageService,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly prisma: PrismaService
  ) {}

  async create(
    currentUser: AuthenticatedUser,
    createTransportRequestDto: CreateTransportRequestDto
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const initialStatusId = await this.requireInitialStatusId();
    const routeFields = await this.resolveRouteFields(
      createTransportRequestDto.baslangicKonum,
      createTransportRequestDto.varisKonum
    );

    const transportRequest = await this.transportRequestsRepository.create({
      musteriId: currentUser.id,
      ...routeFields,
      tekTasimaIstiyor: createTransportRequestDto.tekTasimaIstiyor,
      agirlikKg: createTransportRequestDto.agirlikKg,
      hacimM3: createTransportRequestDto.hacimM3,
      yukTipi: createTransportRequestDto.yukTipi,
      tasimaTarihi: createTransportRequestDto.tasimaTarihi,
      yukDetay: createTransportRequestDto.yukDetay,
      durumId: initialStatusId,
    });

    return this.toDetailResponse(transportRequest, currentUser);
  }

  async getMine(
    currentUser: AuthenticatedUser
  ): Promise<TransportRequestListItemResponseDto[]> {
    this.assertCustomerRole(currentUser);

    const transportRequests = await this.transportRequestsRepository.findManyByCustomerId(
      currentUser.id
    );

    return transportRequests.map((transportRequest) =>
      this.toListItemResponse(transportRequest)
    );
  }

  async getMineById(
    currentUser: AuthenticatedUser,
    id: number
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const transportRequest = await this.transportRequestsRepository.findByIdAndCustomerId(
      id,
      currentUser.id
    );

    if (!transportRequest) {
      throw new NotFoundException("Transport request not found.");
    }

    return this.toDetailResponse(transportRequest, currentUser);
  }

  async updateById(
    currentUser: AuthenticatedUser,
    id: number,
    updateTransportRequestDto: UpdateTransportRequestDto
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const existingTransportRequest =
      await this.transportRequestsRepository.findByIdAndCustomerId(
        id,
        currentUser.id
      );

    if (!existingTransportRequest) {
      throw new NotFoundException("Transport request not found.");
    }

    if (!this.isTransportRequestMutable(existingTransportRequest)) {
      throw new ConflictException(
        "Transport request can no longer be modified."
      );
    }

    const routeFields = this.shouldRecalculateRoute(
      existingTransportRequest,
      updateTransportRequestDto
    )
      ? await this.resolveRouteFields(
          updateTransportRequestDto.baslangicKonum,
          updateTransportRequestDto.varisKonum
        )
      : this.getStoredRouteFields(existingTransportRequest);

    const transportRequest =
      await this.transportRequestsRepository.updateByIdAndCustomerId(
        id,
        currentUser.id,
        {
          ...routeFields,
          tekTasimaIstiyor: updateTransportRequestDto.tekTasimaIstiyor,
          agirlikKg: updateTransportRequestDto.agirlikKg,
          hacimM3: updateTransportRequestDto.hacimM3,
          yukTipi: updateTransportRequestDto.yukTipi,
          tasimaTarihi: updateTransportRequestDto.tasimaTarihi,
          yukDetay: updateTransportRequestDto.yukDetay,
        }
      );

    if (!transportRequest) {
      throw new NotFoundException("Transport request not found.");
    }

    return this.toDetailResponse(transportRequest, currentUser);
  }

  async deleteById(
    currentUser: AuthenticatedUser,
    id: number
  ): Promise<void> {
    this.assertCustomerRole(currentUser);

    const existingTransportRequest =
      await this.transportRequestsRepository.findByIdAndCustomerId(
        id,
        currentUser.id
      );

    if (!existingTransportRequest) {
      throw new NotFoundException("Transport request not found.");
    }

    if (!this.isTransportRequestMutable(existingTransportRequest)) {
      throw new ConflictException(
        "Transport request can no longer be deleted."
      );
    }

    const wasDeleted =
      await this.transportRequestsRepository.softDeleteByIdAndCustomerId(
        id,
        currentUser.id
      );

    if (!wasDeleted) {
      throw new NotFoundException("Transport request not found.");
    }
  }

  async uploadImages(
    currentUser: AuthenticatedUser,
    requestId: number,
    body: UploadTransportRequestImagesBodyDto,
    files: Express.Multer.File[] | undefined
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const transportRequest = await this.transportRequestsRepository.findByIdAndCustomerId(
      requestId,
      currentUser.id
    );

    if (!transportRequest) {
      throw new NotFoundException("Transport request not found.");
    }

    if (!this.isTransportRequestMutable(transportRequest)) {
      throw new ConflictException(
        "Transport request can no longer be modified."
      );
    }

    const uploadedFiles = files ?? [];

    if (uploadedFiles.length === 0) {
      throw new BadRequestException("En az bir gorsel yuklemelisin.");
    }

    if (
      typeof body.primaryIndex === "number" &&
      body.primaryIndex >= uploadedFiles.length
    ) {
      throw new BadRequestException("Gecersiz ana gorsel secimi.");
    }

    if (transportRequest.imageCount + uploadedFiles.length > MAX_REQUEST_IMAGE_COUNT) {
      throw new BadRequestException(
        `Bir istek icin en fazla ${MAX_REQUEST_IMAGE_COUNT} gorsel yuklenebilir.`
      );
    }

    const persistedStorageKeys: string[] = [];
    const preparedUploads: PreparedRequestImageUpload[] = [];

    try {
      for (const file of uploadedFiles) {
        console.log("[uploadImages] file:", file.originalname, "mimetype:", file.mimetype, "size:", file.size, "bufferLength:", file.buffer?.length);
        if (!file.buffer || file.buffer.length === 0) {
          throw new BadRequestException("Dosya icerigi okunamadi.");
        }
        this.assertValidRequestImageFile(file);

        const processedImage = await this.imageProcessingService.processRequestImage(
          file.buffer
        );
        const imageId = randomUUID();
        const storageKey = `request-images/${requestId}/${imageId}.webp`;
        const thumbnailStorageKey = `request-images/${requestId}/${imageId}-thumb.webp`;

        await this.mediaStorageService.saveFile({
          storageKey,
          buffer: processedImage.detail.buffer,
          contentType: processedImage.detail.mimeType,
        });
        persistedStorageKeys.push(storageKey);

        await this.mediaStorageService.saveFile({
          storageKey: thumbnailStorageKey,
          buffer: processedImage.thumbnail.buffer,
          contentType: processedImage.thumbnail.mimeType,
        });
        persistedStorageKeys.push(thumbnailStorageKey);

        preparedUploads.push({
          storageKey,
          thumbnailStorageKey,
          mimeType: processedImage.detail.mimeType,
          sizeBytes: file.size,
          width: processedImage.detail.width,
          height: processedImage.detail.height,
          originalFileName: file.originalname,
        });
      }

      const shouldAssignNewPrimary =
        typeof body.primaryIndex === "number" || transportRequest.imageCount === 0;
      const primaryUploadIndex =
        typeof body.primaryIndex === "number" ? body.primaryIndex : 0;

      await this.prisma.client.$transaction(async (tx) => {
        const nextSortOrder =
          await this.transportRequestsRepository.findNextImageSortOrder(
            requestId,
            tx
          );

        if (shouldAssignNewPrimary) {
          await this.transportRequestsRepository.clearActivePrimaryByRequestId(
            requestId,
            tx
          );
        }

        const createInputs: CreateTransportRequestImageRecordInput[] =
          preparedUploads.map((upload, index) => ({
            requestId,
            storageKey: upload.storageKey,
            thumbnailStorageKey: upload.thumbnailStorageKey,
            mimeType: upload.mimeType,
            sizeBytes: upload.sizeBytes,
            width: upload.width,
            height: upload.height,
            sortOrder: nextSortOrder + index,
            isPrimary:
              shouldAssignNewPrimary && index === primaryUploadIndex,
            originalFileName: upload.originalFileName,
          }));

        await this.transportRequestsRepository.createImages(createInputs, tx);
      });
    } catch (error) {
      await Promise.allSettled(
        persistedStorageKeys.map((storageKey) =>
          this.mediaStorageService.deleteFile(storageKey)
        )
      );
      throw error;
    }

    return this.getMineById(currentUser, requestId);
  }

  async setPrimaryImage(
    currentUser: AuthenticatedUser,
    requestId: number,
    imageId: number
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const transportRequest = await this.transportRequestsRepository.findByIdAndCustomerId(
      requestId,
      currentUser.id
    );

    if (!transportRequest) {
      throw new NotFoundException("Transport request not found.");
    }

    if (!this.isTransportRequestMutable(transportRequest)) {
      throw new ConflictException(
        "Transport request can no longer be modified."
      );
    }

    const targetImage = transportRequest.images.find((image) => image.id === imageId);

    if (!targetImage) {
      throw new NotFoundException("Transport request image not found.");
    }

    await this.prisma.client.$transaction(async (tx) => {
      await this.transportRequestsRepository.clearActivePrimaryByRequestId(
        requestId,
        tx
      );

      const wasUpdated =
        await this.transportRequestsRepository.setPrimaryImageByIdAndRequestId(
          imageId,
          requestId,
          tx
        );

      if (!wasUpdated) {
        throw new NotFoundException("Transport request image not found.");
      }
    });

    return this.getMineById(currentUser, requestId);
  }

  async deleteImage(
    currentUser: AuthenticatedUser,
    requestId: number,
    imageId: number
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const transportRequest = await this.transportRequestsRepository.findByIdAndCustomerId(
      requestId,
      currentUser.id
    );

    if (!transportRequest) {
      throw new NotFoundException("Transport request not found.");
    }

    if (!this.isTransportRequestMutable(transportRequest)) {
      throw new ConflictException(
        "Transport request can no longer be modified."
      );
    }

    const targetImage = transportRequest.images.find((image) => image.id === imageId);

    if (!targetImage) {
      throw new NotFoundException("Transport request image not found.");
    }

    const fallbackPrimaryImage =
      targetImage.isPrimary
        ? transportRequest.images
            .filter((image) => image.id !== imageId)
            .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)[0] ??
          null
        : null;

    await this.prisma.client.$transaction(async (tx) => {
      const wasDeleted =
        await this.transportRequestsRepository.softDeleteImageByIdAndRequestId(
          imageId,
          requestId,
          new Date(),
          tx
        );

      if (!wasDeleted) {
        throw new NotFoundException("Transport request image not found.");
      }

      if (fallbackPrimaryImage) {
        const wasUpdated =
          await this.transportRequestsRepository.setPrimaryImageByIdAndRequestId(
            fallbackPrimaryImage.id,
            requestId,
            tx
          );

        if (!wasUpdated) {
          throw new NotFoundException("Transport request image not found.");
        }
      }
    });

    await Promise.allSettled([
      this.mediaStorageService.deleteFile(targetImage.storageKey),
      this.mediaStorageService.deleteFile(targetImage.thumbnailStorageKey),
    ]);

    return this.getMineById(currentUser, requestId);
  }

  private async requireInitialStatusId(): Promise<number> {
    const initialStatusId =
      await this.transportRequestsRepository.findStatusIdByTypeAndName(
        INITIAL_TRANSPORT_REQUEST_STATUS.durumTuru,
        INITIAL_TRANSPORT_REQUEST_STATUS.durumAdi
      );

    if (initialStatusId !== null) {
      return initialStatusId;
    }

    throw new InternalServerErrorException(
      `Transport request initial status is not configured: ${INITIAL_TRANSPORT_REQUEST_STATUS.durumTuru}/${INITIAL_TRANSPORT_REQUEST_STATUS.durumAdi}.`
    );
  }

  private isTransportRequestMutable(
    transportRequest: StoredTransportRequestRecord
  ): boolean {
    return (
      transportRequest.nakliye === null &&
      transportRequest.durumTuru.trim().toUpperCase() ===
        INITIAL_TRANSPORT_REQUEST_STATUS.durumTuru &&
      transportRequest.durumAdi.trim().toUpperCase() ===
        INITIAL_TRANSPORT_REQUEST_STATUS.durumAdi
    );
  }

  private assertCustomerRole(currentUser: AuthenticatedUser) {
    if (currentUser.roles.includes(ROLE_NAMES.MUSTERI)) {
      return;
    }

    throw new ForbiddenException("Only customers can manage transport requests.");
  }

  private assertValidRequestImageFile(file: Express.Multer.File) {
    if (!REQUEST_IMAGE_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        "Yalnizca JPEG, PNG veya WEBP gorseller yuklenebilir."
      );
    }
  }

  private toListItemResponse(
    transportRequest: StoredTransportRequestRecord
  ): TransportRequestListItemResponseDto {
    const primaryImage = this.resolvePrimaryImage(transportRequest.images);

    return {
      id: transportRequest.id,
      baslangicSehri: transportRequest.baslangicSehri,
      varisSehri: transportRequest.varisSehri,
      baslangicKonumMetni: transportRequest.baslangicKonumMetni,
      varisKonumMetni: transportRequest.varisKonumMetni,
      rotaMesafeMetre: transportRequest.rotaMesafeMetre,
      rotaSureSaniye: transportRequest.rotaSureSaniye,
      tekTasimaIstiyor: transportRequest.tekTasimaIstiyor,
      agirlikKg: transportRequest.agirlikKg,
      hacimM3: transportRequest.hacimM3,
      yukTipi: transportRequest.yukTipi,
      tasimaTarihi: transportRequest.tasimaTarihi,
      yukDetay: transportRequest.yukDetay,
      olusturmaTarihi: transportRequest.olusturmaTarihi,
      durum: transportRequest.durumAdi,
      primaryImage: primaryImage
        ? this.toImageSummaryResponse(primaryImage)
        : undefined,
      imageCount: transportRequest.imageCount > 0 ? transportRequest.imageCount : undefined,
    };
  }

  private toDetailResponse(
    transportRequest: StoredTransportRequestRecord,
    currentUser: AuthenticatedUser
  ): TransportRequestDetailResponseDto {
    const primaryImage = this.resolvePrimaryImage(transportRequest.images);

    return {
      ...this.toListItemResponse(transportRequest),
      baslangicProvider: transportRequest.baslangicProvider,
      varisProvider: transportRequest.varisProvider,
      baslangicPlaceId: transportRequest.baslangicPlaceId,
      varisPlaceId: transportRequest.varisPlaceId,
      normalizeBaslangicSehir: transportRequest.normalizeBaslangicSehir,
      normalizeVarisSehir: transportRequest.normalizeVarisSehir,
      normalizeBaslangicIlce: transportRequest.normalizeBaslangicIlce,
      normalizeVarisIlce: transportRequest.normalizeVarisIlce,
      baslangicEnlem: transportRequest.baslangicEnlem,
      baslangicBoylam: transportRequest.baslangicBoylam,
      varisEnlem: transportRequest.varisEnlem,
      varisBoylam: transportRequest.varisBoylam,
      nakliye: this.toJobSummaryResponse(transportRequest.nakliye, currentUser.id),
      images:
        transportRequest.images.length > 0
          ? transportRequest.images.map((image) => this.toImageResponse(image))
          : undefined,
      primaryImageId: primaryImage?.id ?? null,
    };
  }

  private toJobSummaryResponse(
    job: StoredTransportRequestJobRecord | null,
    currentUserId: number
  ): TransportRequestJobSummaryResponseDto | null {
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      carrierId: job.carrierId,
      carrierName: job.carrierName,
      carrierUsername: job.carrierUsername,
      aracId: job.aracId,
      aracPlaka: job.aracPlaka,
      anlasilanFiyat: job.anlasilanFiyat,
      durum: job.durumAdi,
      olusturmaTarihi: job.olusturmaTarihi,
      baslangicTarihi: job.baslangicTarihi,
      teslimTarihi: job.teslimTarihi,
      ratingContext: buildRatingContext({
        ratings: job.ratings,
        currentUserId,
        carrierId: job.carrierId,
        customerId: currentUserId,
        durumTuru: job.durumTuru,
        durumAdi: job.durumAdi,
      }),
    };
  }

  private toImageSummaryResponse(
    image: StoredTransportRequestImageRecord
  ): RequestImageSummaryResponseDto {
    return {
      id: image.id,
      thumbnailUrl: this.mediaStorageService.toPublicUrl(image.thumbnailStorageKey),
      width: image.width,
      height: image.height,
    };
  }

  private toImageResponse(
    image: StoredTransportRequestImageRecord
  ): RequestImageResponseDto {
    return {
      ...this.toImageSummaryResponse(image),
      url: this.mediaStorageService.toPublicUrl(image.storageKey),
      isPrimary: image.isPrimary,
    };
  }

  private resolvePrimaryImage(
    images: StoredTransportRequestImageRecord[]
  ): StoredTransportRequestImageRecord | null {
    return images.find((image) => image.isPrimary) ?? images[0] ?? null;
  }

  private shouldRecalculateRoute(
    transportRequest: StoredTransportRequestRecord,
    updateTransportRequestDto: UpdateTransportRequestDto
  ): boolean {
    return (
      this.hasLocationSelectionChanged(
        transportRequest.baslangicProvider,
        transportRequest.baslangicPlaceId,
        updateTransportRequestDto.baslangicKonum.provider,
        updateTransportRequestDto.baslangicKonum.placeId
      ) ||
      this.hasLocationSelectionChanged(
        transportRequest.varisProvider,
        transportRequest.varisPlaceId,
        updateTransportRequestDto.varisKonum.provider,
        updateTransportRequestDto.varisKonum.placeId
      )
    );
  }

  private hasLocationSelectionChanged(
    currentProvider: string | null,
    currentPlaceId: string | null,
    nextProvider: string,
    nextPlaceId: string
  ): boolean {
    return (
      currentProvider?.trim().toLowerCase() !==
        nextProvider.trim().toLowerCase() ||
      currentPlaceId?.trim() !== nextPlaceId.trim()
    );
  }

  private async resolveRouteFields(
    baslangicKonum: CreateTransportRequestDto["baslangicKonum"],
    varisKonum: CreateTransportRequestDto["varisKonum"]
  ): Promise<TransportRequestRouteFields> {
    const [resolvedBaslangicKonum, resolvedVarisKonum] = await Promise.all([
      this.locationsService.resolveCanonicalLocation(
        baslangicKonum.provider,
        baslangicKonum.placeId,
        baslangicKonum.sessionToken
      ),
      this.locationsService.resolveCanonicalLocation(
        varisKonum.provider,
        varisKonum.placeId,
        varisKonum.sessionToken
      ),
    ]);

    if (
      resolvedBaslangicKonum.provider.trim().toLowerCase() !==
      resolvedVarisKonum.provider.trim().toLowerCase()
    ) {
      throw new InternalServerErrorException(
        "Transport request locations must resolve with the same route provider."
      );
    }

    const routeMetrics = await this.locationsService.getRouteMetrics(
      resolvedBaslangicKonum.provider,
      {
        lat: resolvedBaslangicKonum.lat,
        lng: resolvedBaslangicKonum.lng,
      },
      {
        lat: resolvedVarisKonum.lat,
        lng: resolvedVarisKonum.lng,
      }
    );

    return {
      baslangicSehri: resolvedBaslangicKonum.sehir,
      varisSehri: resolvedVarisKonum.sehir,
      baslangicKonumMetni: resolvedBaslangicKonum.konumMetni,
      varisKonumMetni: resolvedVarisKonum.konumMetni,
      baslangicProvider: resolvedBaslangicKonum.provider,
      varisProvider: resolvedVarisKonum.provider,
      baslangicPlaceId: resolvedBaslangicKonum.placeId,
      varisPlaceId: resolvedVarisKonum.placeId,
      normalizeBaslangicSehir: resolvedBaslangicKonum.sehir,
      normalizeVarisSehir: resolvedVarisKonum.sehir,
      normalizeBaslangicIlce: resolvedBaslangicKonum.ilce,
      normalizeVarisIlce: resolvedVarisKonum.ilce,
      baslangicEnlem: resolvedBaslangicKonum.lat,
      baslangicBoylam: resolvedBaslangicKonum.lng,
      varisEnlem: resolvedVarisKonum.lat,
      varisBoylam: resolvedVarisKonum.lng,
      rotaMesafeMetre: routeMetrics.distanceMeters,
      rotaSureSaniye: routeMetrics.durationSeconds,
    };
  }

  private getStoredRouteFields(
    transportRequest: StoredTransportRequestRecord
  ): TransportRequestRouteFields {
    return {
      baslangicSehri: transportRequest.baslangicSehri,
      varisSehri: transportRequest.varisSehri,
      baslangicKonumMetni: transportRequest.baslangicKonumMetni,
      varisKonumMetni: transportRequest.varisKonumMetni,
      baslangicProvider: transportRequest.baslangicProvider,
      varisProvider: transportRequest.varisProvider,
      baslangicPlaceId: transportRequest.baslangicPlaceId,
      varisPlaceId: transportRequest.varisPlaceId,
      normalizeBaslangicSehir: transportRequest.normalizeBaslangicSehir,
      normalizeVarisSehir: transportRequest.normalizeVarisSehir,
      normalizeBaslangicIlce: transportRequest.normalizeBaslangicIlce,
      normalizeVarisIlce: transportRequest.normalizeVarisIlce,
      baslangicEnlem: transportRequest.baslangicEnlem,
      baslangicBoylam: transportRequest.baslangicBoylam,
      varisEnlem: transportRequest.varisEnlem,
      varisBoylam: transportRequest.varisBoylam,
      rotaMesafeMetre: transportRequest.rotaMesafeMetre,
      rotaSureSaniye: transportRequest.rotaSureSaniye,
    };
  }
}
