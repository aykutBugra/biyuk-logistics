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
import type { PublicEntityId } from "../../common/public-ids/public-entity-id";
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

//yeni oluşturulan her taşıma isteği başlangıçta şu durumda açılır:ISTEK / OLUSTURULDU
const INITIAL_TRANSPORT_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "OLUSTURULDU",
} as const;

const PENDING_DELIVERY_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "TESLIM_BEKLIYOR",
} as const;

//Bir isteğe en fazla 10 görsel yüklenebilir. Sadece JPEG, PNG, WEBP kabul ediliyor.
const REQUEST_IMAGE_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_REQUEST_IMAGE_COUNT = 10;

//transportrequestroutefields, taşıma isteği oluşturulurken veya güncellenirken
//sağlanan başlangıç ve varış konum bilgilerini
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
    //service bagimliliklari
    private readonly transportRequestsRepository: TransportRequestsRepository,
    private readonly locationsService: LocationsService,
    private readonly mediaStorageService: MediaStorageService,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly prisma: PrismaService
  ) {}

  //Önce kullanıcının müşteri rolü var mı kontrol edilir.
  async create(
    currentUser: AuthenticatedUser,
    createTransportRequestDto: CreateTransportRequestDto
  ): Promise<TransportRequestDetailResponseDto> {
    //Sonra başlangıç status id bulunur:ISTEK / OLUSTURULDU
    //Ama DB’de durumTuru, durumAdi değil durumId tutulduğu için önce id çözülür.
    this.assertCustomerRole(currentUser);

    const initialStatusId = await this.requireInitialStatusId();

    //Bu da başlangıç ve varış konumlarını işler. Mesela Google place id gelir, sistem
    //onu gerçek şehir, ilçe, koordinat, rota mesafesi ve süre bilgisine çevirir.
    const routeFields = await this.resolveRouteFields(
      createTransportRequestDto.baslangicKonum,
      createTransportRequestDto.varisKonum
    );

    //kayit oluşturulur. müşteri id, rota bilgileri, yük bilgileri ve durum id'si kaydedilir.
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

  //Giriş yapan müşterinin kendi taşıma isteklerini listeler.
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

  //Tek bir istegi sadece sahibi olan musteri okuyabilir. Detay response'unda
  //varsa bagli nakliye ozeti ve gorseller de doner.
  async getMineById(
    currentUser: AuthenticatedUser,
    id: PublicEntityId
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const transportRequest = await this.transportRequestsRepository.findByIdAndCustomerId(
      id,
      currentUser.id
    );

    if (!transportRequest) {
      
      throw new BadRequestException("Tasima istegi bulunamadi.");
    }

    return this.toDetailResponse(transportRequest, currentUser);
  }


  //Bir taşıma isteği sadece şu durumdaysa güncellenebilir:
  //nakliye oluşmamış olacak
  //durum ISTEK / OLUSTURULDU olacak
  async updateById(
    currentUser: AuthenticatedUser,
    id: PublicEntityId,
    updateTransportRequestDto: UpdateTransportRequestDto
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const existingTransportRequest =
      await this.transportRequestsRepository.findByIdAndCustomerId(
        id,
        currentUser.id
      );

    if (!existingTransportRequest) {
      throw new NotFoundException("Tasima istegi bulunamadi.");
    }

    if (!this.isTransportRequestMutable(existingTransportRequest)) {
      throw new ConflictException(
        "Tasima istegi artık degistirilemez."
      );
    }


    //Eğer kullanıcı başlangıç veya varış konumunu değiştirdiyse rota yeniden hesaplanır.
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
      throw new NotFoundException("Tasima istegi bulunamadi.");
    }

    return this.toDetailResponse(transportRequest, currentUser);
  }



  //Silme için de aynı kural var.
  async deleteById(
    currentUser: AuthenticatedUser,
    id: PublicEntityId
  ): Promise<void> {
    this.assertCustomerRole(currentUser);

    const existingTransportRequest =
      await this.transportRequestsRepository.findByIdAndCustomerId(
        id,
        currentUser.id
      );

    if (!existingTransportRequest) {
      throw new NotFoundException("Tasima istegi bulunamadi.");
    }

    if (!this.isTransportRequestMutable(existingTransportRequest)) {
      throw new ConflictException(
        "Tasima istegi artık silinemez."
      );
    }

    //wasDeleted true dönerse silme başarılı, false dönerse silme başarısız
    //(örneğin id yanlış veya zaten silinmiş olabilir) demektir.
    const wasDeleted =
      await this.transportRequestsRepository.softDeleteByIdAndCustomerId(
        id,
        currentUser.id
      );

    if (!wasDeleted) {
      throw new NotFoundException("Tasima istegi bulunamadi.");
    }
  }



  //Tasima istegine gorsel yukler. Dosyalar once validate edilir, sonra detail ve
  //thumbnail olarak storage'a yazilir; DB yazimi basarisiz olursa storage temizlenir.
  async uploadImages(
    currentUser: AuthenticatedUser,
    requestId: PublicEntityId,
    body: UploadTransportRequestImagesBodyDto,
    files: Express.Multer.File[] | undefined
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const transportRequest = await this.transportRequestsRepository.findByIdAndCustomerId(
      requestId,
      currentUser.id
    );

    if (!transportRequest) {
      throw new NotFoundException("Tasima istegi bulunamadi.");
    }

    if (!this.isTransportRequestMutable(transportRequest)) {
      throw new ConflictException(
        "Tasima istegi artık degistirilemez."
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
        const storageKey = `request-images/${transportRequest.publicId}/${imageId}.webp`;
        const thumbnailStorageKey = `request-images/${transportRequest.publicId}/${imageId}-thumb.webp`;

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
            transportRequest.id,
            tx
          );

        if (shouldAssignNewPrimary) {
          await this.transportRequestsRepository.clearActivePrimaryByRequestId(
            transportRequest.id,
            tx
          );
        }

        const createInputs: CreateTransportRequestImageRecordInput[] =
          preparedUploads.map((upload, index) => ({
            requestId: transportRequest.id,
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



  //Istek icindeki ana gorseli degistirir. Islem transaction icinde yapilir ki
  //ayni anda birden fazla primary gorsel kalmasin.
  async setPrimaryImage(
    currentUser: AuthenticatedUser,
    requestId: PublicEntityId,
    imageId: PublicEntityId
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

    const targetImage = transportRequest.images.find((image) =>
      this.matchesPublicEntityId(image, imageId)
    );

    if (!targetImage) {
      throw new NotFoundException("Transport request image not found.");
    }

    await this.prisma.client.$transaction(async (tx) => {
      await this.transportRequestsRepository.clearActivePrimaryByRequestId(
        transportRequest.id,
        tx
      );

      const wasUpdated =
        await this.transportRequestsRepository.setPrimaryImageByIdAndRequestId(
          imageId,
          transportRequest.id,
          tx
        );

      if (!wasUpdated) {
        throw new NotFoundException("Transport request image not found.");
      }
    });

    return this.getMineById(currentUser, requestId);
  }

  //Gorseli soft delete eder. Eger silinen gorsel primary ise kalanlardan ilkini
  //fallback primary olarak secer ve storage dosyalarini best-effort siler.
  async deleteImage(
    currentUser: AuthenticatedUser,
    requestId: PublicEntityId,
    imageId: PublicEntityId
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

    const targetImage = transportRequest.images.find((image) =>
      this.matchesPublicEntityId(image, imageId)
    );

    if (!targetImage) {
      throw new NotFoundException("Transport request image not found.");
    }

    const fallbackPrimaryImage =
      targetImage.isPrimary
        ? transportRequest.images
            .filter((image) => image.id !== targetImage.id)
            .sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)[0] ??
          null
        : null;

    await this.prisma.client.$transaction(async (tx) => {
      const wasDeleted =
        await this.transportRequestsRepository.softDeleteImageByIdAndRequestId(
          imageId,
          transportRequest.id,
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
            transportRequest.id,
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

  //Yeni istek olustururken kullanilacak ISTEK/OLUSTURULDU durumunun DB id'sini bulur.
  //Eksikse bu kullanici hatasi degil sistem seed/config hatasidir.
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
    //Istek sadece henuz nakliyeye donusmemis ve hala OLUSTURULDU durumundaysa
    //duzenlenebilir, silinebilir veya gorsel yonetimi yapilabilir.
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
    //Liste kartinda primary gorsel varsa ozet url ile doner, yoksa gorsel alanlari
    //bos birakilir.
    const primaryImage = this.resolvePrimaryImage(transportRequest.images);

    return {
      id: transportRequest.publicId,
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
    //Detay response'u liste alanlarina ek olarak provider/placeId, koordinatlar,
    //bagli nakliye ozeti ve tum gorsel listesini tasir.
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
      primaryImageId: primaryImage?.publicId ?? null,
    };
  }

  private toJobSummaryResponse(
    job: StoredTransportRequestJobRecord | null,
    currentUserId: number
  ): TransportRequestJobSummaryResponseDto | null {
    //Istek artik nakliyeye donustuyse musteri ekranina nakliye ozeti ve puanlama
    //baglami eklenir.
    if (!job) {
      return null;
    }

    return {
      id: job.publicId,
      carrierId: job.carrierPublicId,
      carrierName: job.carrierName,
      carrierUsername: job.carrierUsername,
      aracId: job.aracPublicId,
      aracPlaka: job.aracPlaka,
      anlasilanFiyat: job.anlasilanFiyat,
      durum: job.durumAdi,
      olusturmaTarihi: job.olusturmaTarihi,
      baslangicTarihi: job.baslangicTarihi,
      teslimBildirimTarihi: job.teslimBildirimTarihi,
      teslimTarihi: job.teslimTarihi,
      canConfirmDelivery:
        job.durumTuru.trim().toUpperCase() ===
          PENDING_DELIVERY_JOB_STATUS.durumTuru &&
        job.durumAdi.trim().toUpperCase() ===
          PENDING_DELIVERY_JOB_STATUS.durumAdi,
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
      id: image.publicId,
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

  private matchesPublicEntityId(
    record: { id: number; publicId: string },
    id: PublicEntityId
  ): boolean {
    return id.kind === "legacy" ? record.id === id.value : record.publicId === id.value;
  }

  private shouldRecalculateRoute(
    transportRequest: StoredTransportRequestRecord,
    updateTransportRequestDto: UpdateTransportRequestDto
  ): boolean {
    //Sadece provider/placeId degistiyse route tekrar hesaplanir; yuk bilgisi degisikligi
    //gereksiz konum servisi cagrisi yapmaz.
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
    //Kullanici secimini provider placeId'den canonical konuma cevirir, sonra ayni
    //provider ile gercek rota mesafesi ve suresini hesaplar.
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
    //Route degismediyse DB'deki mevcut route snapshot'i aynen kullanilir.
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
