import { Injectable } from "@nestjs/common";
import { AppErrorCode, AppErrors } from "../../common/errors";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ROLE_NAMES } from "../../common/constants/role-names";
import type { PublicEntityId } from "../../common/public-ids/public-entity-id";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { ImageProcessingService } from "../../infrastructure/media/image-processing.service";
import { MediaStorageService } from "../../infrastructure/media/media-storage.service";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import {
  type VehicleCapacitySummary,
  VehicleCapacityService,
} from "../vehicle-capacity/vehicle-capacity.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { VehicleCapacitySummaryResponseDto } from "./dto/vehicle-capacity-summary-response.dto";
import { VehicleDetailResponseDto } from "./dto/vehicle-detail-response.dto";
import { VehicleListItemResponseDto } from "./dto/vehicle-list-item-response.dto";
import {
  type StoredVehicleRecord,
  VehiclesRepository,
} from "./repositories/vehicles.repository";
import {
  isVehiclePlateUniqueConstraintTarget,
  normalizeVehicleDraft,
  resolveVehicleLibraryId,
} from "./vehicle-write.helpers";

const VEHICLE_IMAGE_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_VEHICLE_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class VehiclesService {
  constructor(
    private readonly vehiclesRepository: VehiclesRepository,
    private readonly vehicleCapacityService: VehicleCapacityService,
    private readonly prisma: PrismaService,
    private readonly mediaStorageService: MediaStorageService,
    private readonly imageProcessingService: ImageProcessingService
  ) {}

  //Nakliyeci yeni arac olusturur. DTO normalize edilir, marka/model kutuphane id'si
  //cozulur ve plaka benzersizlik hatalari kullaniciya Conflict olarak doner.
  async create(
    currentUser: AuthenticatedUser,
    createVehicleDto: CreateVehicleDto
  ): Promise<VehicleDetailResponseDto> {
    this.assertCarrierRole(currentUser);

    const normalizedVehicle = normalizeVehicleDraft(createVehicleDto);
    const aracKutuphaneId = await resolveVehicleLibraryId(
      this.prisma.client,
      normalizedVehicle.marka,
      normalizedVehicle.model
    );

    try {
      const vehicle = await this.vehiclesRepository.create({
        sahipId: currentUser.id,
        aracKutuphaneId,
        plaka: normalizedVehicle.plaka,
        yil: normalizedVehicle.yil,
        maksimumAgirlikKg: normalizedVehicle.maksimumAgirlikKg,
        maksimumHacimM3: normalizedVehicle.maksimumHacimM3,
        kasaTipi: normalizedVehicle.kasaTipi,
        uzunlukCm: normalizedVehicle.uzunlukCm,
        genislikCm: normalizedVehicle.genislikCm,
        yukseklikCm: normalizedVehicle.yukseklikCm,
      });

      const capacitySummaries =
        await this.vehicleCapacityService.getCapacitySummaryMapForVehicles([vehicle]);

      return this.toDetailResponse(
        vehicle,
        capacitySummaries.get(vehicle.id) ?? this.createEmptyCapacitySummary(vehicle)
      );
    } catch (error) {
      this.rethrowUniquePlateAsConflict(error);
      throw error;
    }
  }

  async getMine(
    currentUser: AuthenticatedUser
  ): Promise<VehicleListItemResponseDto[]> {
    //Arac listesi kapasite ozetleriyle birlikte doner; aktif rezervasyonlar
    //vehicle-capacity servisinden toplu olarak hesaplanir.
    this.assertCarrierRole(currentUser);

    const vehicles = await this.vehiclesRepository.findManyByOwnerId(currentUser.id);
    const capacitySummaries =
      await this.vehicleCapacityService.getCapacitySummaryMapForVehicles(vehicles);

    return vehicles.map((vehicle) =>
      this.toListItemResponse(
        vehicle,
        capacitySummaries.get(vehicle.id) ?? this.createEmptyCapacitySummary(vehicle)
      )
    );
  }

  async getMineById(
    currentUser: AuthenticatedUser,
    id: PublicEntityId
  ): Promise<VehicleDetailResponseDto> {
    //Tek arac detayinda da sahiplik kontrolu repository sorgusunun where kosulunda yapilir.
    this.assertCarrierRole(currentUser);

    const vehicle = await this.vehiclesRepository.findByIdAndOwnerId(id, currentUser.id);

    if (!vehicle) {
      throw AppErrors.notFound(AppErrorCode.VEHICLE_NOT_FOUND, "Vehicle not found.");
    }

    const capacitySummaries =
      await this.vehicleCapacityService.getCapacitySummaryMapForVehicles([vehicle]);

    return this.toDetailResponse(
      vehicle,
      capacitySummaries.get(vehicle.id) ?? this.createEmptyCapacitySummary(vehicle)
    );
  }

  async deleteById(
    currentUser: AuthenticatedUser,
    id: PublicEntityId
  ): Promise<void> {
    //Aktif veya tamamlanmamis nakliyeye bagli arac silinemez. Silme hard delete degil
    //silmeTarihi setlenen soft delete islemidir.
    this.assertCarrierRole(currentUser);

    const hasActiveShipment =
      await this.vehiclesRepository.hasNonTerminalShipmentByIdAndOwnerId(
        id,
        currentUser.id
      );

    if (hasActiveShipment) {
      throw AppErrors.conflict(
        AppErrorCode.VEHICLE_CONFLICT,
        "Vehicle cannot be deleted while it is assigned to an active shipment."
      );
    }

    const wasDeleted = await this.vehiclesRepository.softDeleteByIdAndOwnerId(
      id,
      currentUser.id
    );

    if (!wasDeleted) {
      throw AppErrors.notFound(AppErrorCode.VEHICLE_NOT_FOUND, "Vehicle not found.");
    }
  }

  async updateById(
    currentUser: AuthenticatedUser,
    id: PublicEntityId,
    updateVehicleDto: UpdateVehicleDto
  ): Promise<VehicleDetailResponseDto> {
    //Arac guncelleme, create ile ayni normalize/kutuphane cozumleme yolunu kullanir.
    this.assertCarrierRole(currentUser);

    const normalizedVehicle = normalizeVehicleDraft(updateVehicleDto);
    const aracKutuphaneId = await resolveVehicleLibraryId(
      this.prisma.client,
      normalizedVehicle.marka,
      normalizedVehicle.model
    );

    try {
      const updatedVehicle = await this.vehiclesRepository.updateByIdAndOwnerId(
        id,
        currentUser.id,
        {
          aracKutuphaneId,
          plaka: normalizedVehicle.plaka,
          yil: normalizedVehicle.yil,
          maksimumAgirlikKg: normalizedVehicle.maksimumAgirlikKg,
          maksimumHacimM3: normalizedVehicle.maksimumHacimM3,
          kasaTipi: normalizedVehicle.kasaTipi,
          uzunlukCm: normalizedVehicle.uzunlukCm,
          genislikCm: normalizedVehicle.genislikCm,
          yukseklikCm: normalizedVehicle.yukseklikCm,
        }
      );

      if (!updatedVehicle) {
        throw AppErrors.notFound(AppErrorCode.VEHICLE_NOT_FOUND, "Vehicle not found.");
      }

      const capacitySummaries =
        await this.vehicleCapacityService.getCapacitySummaryMapForVehicles([
          updatedVehicle,
        ]);

      return this.toDetailResponse(
        updatedVehicle,
        capacitySummaries.get(updatedVehicle.id) ??
          this.createEmptyCapacitySummary(updatedVehicle)
      );
    } catch (error) {
      this.rethrowUniquePlateAsConflict(error);
      throw error;
    }
  }

  async updateImage(
    currentUser: AuthenticatedUser,
    id: PublicEntityId,
    file: Express.Multer.File | undefined
  ): Promise<VehicleDetailResponseDto> {
    //Yeni arac fotografi once storage'a yazilir. DB guncellemesi basarisiz olursa
    //yeni dosya geri silinir; basarili olursa eski fotograf temizlenir.
    this.assertCarrierRole(currentUser);

    if (!file) {
      throw AppErrors.badRequest(AppErrorCode.VEHICLE_PHOTO_REQUIRED, "Arac fotografi secmelisin.");
    }

    this.assertValidVehicleImageFile(file);

    const existingVehicle = await this.vehiclesRepository.findByIdAndOwnerId(
      id,
      currentUser.id
    );

    if (!existingVehicle) {
      throw AppErrors.notFound(AppErrorCode.VEHICLE_NOT_FOUND, "Vehicle not found.");
    }

    const processedImage = await this.imageProcessingService.processVehicleImage(
      file.buffer
    );
    const storageKey = `vehicle-images/${existingVehicle.publicId}/${randomUUID()}.webp`;

    await this.mediaStorageService.saveFile({
      storageKey,
      buffer: processedImage.buffer,
      contentType: processedImage.mimeType,
    });

    try {
      const updatedVehicle =
        await this.vehiclesRepository.updateImageStorageKeyByIdAndOwnerId(
          id,
          currentUser.id,
          storageKey
        );

      if (!updatedVehicle) {
        throw AppErrors.notFound(AppErrorCode.VEHICLE_NOT_FOUND, "Vehicle not found.");
      }

      if (existingVehicle.aracFotografiStorageKey) {
        await this.mediaStorageService.deleteFile(
          existingVehicle.aracFotografiStorageKey
        );
      }

      const capacitySummaries =
        await this.vehicleCapacityService.getCapacitySummaryMapForVehicles([
          updatedVehicle,
        ]);

      return this.toDetailResponse(
        updatedVehicle,
        capacitySummaries.get(updatedVehicle.id) ??
          this.createEmptyCapacitySummary(updatedVehicle)
      );
    } catch (error) {
      await this.mediaStorageService.deleteFile(storageKey);
      throw error;
    }
  }

  async deleteImage(
    currentUser: AuthenticatedUser,
    id: PublicEntityId
  ): Promise<VehicleDetailResponseDto> {
    //Fotograf yoksa arac yine guncel haliyle doner. Fotograf varsa DB key'i null
    //yapilir ve eski storage dosyasi silinir.
    this.assertCarrierRole(currentUser);

    const existingVehicle = await this.vehiclesRepository.findByIdAndOwnerId(
      id,
      currentUser.id
    );

    if (!existingVehicle) {
      throw AppErrors.notFound(AppErrorCode.VEHICLE_NOT_FOUND, "Vehicle not found.");
    }

    if (!existingVehicle.aracFotografiStorageKey) {
      const capacitySummaries =
        await this.vehicleCapacityService.getCapacitySummaryMapForVehicles([
          existingVehicle,
        ]);

      return this.toDetailResponse(
        existingVehicle,
        capacitySummaries.get(existingVehicle.id) ??
          this.createEmptyCapacitySummary(existingVehicle)
      );
    }

    const previousStorageKey = existingVehicle.aracFotografiStorageKey;
    const updatedVehicle =
      await this.vehiclesRepository.updateImageStorageKeyByIdAndOwnerId(
        id,
        currentUser.id,
        null
      );

    if (!updatedVehicle) {
      throw AppErrors.notFound(AppErrorCode.VEHICLE_NOT_FOUND, "Vehicle not found.");
    }

    await this.mediaStorageService.deleteFile(previousStorageKey);

    const capacitySummaries =
      await this.vehicleCapacityService.getCapacitySummaryMapForVehicles([
        updatedVehicle,
      ]);

    return this.toDetailResponse(
      updatedVehicle,
      capacitySummaries.get(updatedVehicle.id) ??
        this.createEmptyCapacitySummary(updatedVehicle)
    );
  }

  private assertCarrierRole(currentUser: AuthenticatedUser) {
    //Arac yonetimi sadece nakliyeci rolundeki kullanicilar icindir.
    if (currentUser.roles.includes(ROLE_NAMES.NAKLIYECI)) {
      return;
    }

    throw AppErrors.forbidden(AppErrorCode.VEHICLE_FORBIDDEN, "Only carriers can manage vehicles.");
  }

  private rethrowUniquePlateAsConflict(error: unknown): never | void {
    //Prisma unique constraint hatasini kullanicinin anlayacagi plaka Conflict mesajina cevirir.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      return;
    }

    const targets = Array.isArray(error.meta?.target)
      ? error.meta.target.map((target) => String(target))
      : [];

    if (isVehiclePlateUniqueConstraintTarget(targets)) {
      throw AppErrors.conflict(AppErrorCode.VEHICLE_CONFLICT, "Vehicle plate is already in use.");
    }

    throw AppErrors.conflict(AppErrorCode.VEHICLE_CONFLICT, "Vehicle identifiers must be unique.");
  }

  private toListItemResponse(
    vehicle: StoredVehicleRecord,
    capacitySummary: VehicleCapacitySummary
  ): VehicleListItemResponseDto {
    //Arac kaydini frontend'in liste/detayda kullanacagi response formatina cevirir.
    //Kapasite ozeti de ayni payload'a eklenir.
    return {
      id: vehicle.publicId,
      plaka: vehicle.plaka,
      marka: vehicle.marka,
      model: vehicle.model,
      yil: vehicle.yil,
      maksimumAgirlikKg: vehicle.maksimumAgirlikKg,
      maksimumHacimM3: vehicle.maksimumHacimM3,
      kasaTipi: vehicle.kasaTipi,
      uzunlukCm: vehicle.uzunlukCm,
      genislikCm: vehicle.genislikCm,
      yukseklikCm: vehicle.yukseklikCm,
      vehicleImageUrl: this.toPublicMediaUrl(vehicle.aracFotografiStorageKey),
      capacitySummary: this.toCapacitySummaryResponse(capacitySummary),
    };
  }

  private toDetailResponse(
    vehicle: StoredVehicleRecord,
    capacitySummary: VehicleCapacitySummary
  ): VehicleDetailResponseDto {
    return this.toListItemResponse(vehicle, capacitySummary);
  }

  private toCapacitySummaryResponse(
    capacitySummary: VehicleCapacitySummary
  ): VehicleCapacitySummaryResponseDto {
    return {
      toplamAgirlikKg: capacitySummary.toplamAgirlikKg,
      toplamHacimM3: capacitySummary.toplamHacimM3,
      rezerveAgirlikKg: capacitySummary.rezerveAgirlikKg,
      rezerveHacimM3: capacitySummary.rezerveHacimM3,
      kalanAgirlikKg: capacitySummary.kalanAgirlikKg,
      kalanHacimM3: capacitySummary.kalanHacimM3,
      aktifRezervasyonSayisi: capacitySummary.aktifRezervasyonSayisi,
      aktifTekTasimaRezervasyonuVar:
        capacitySummary.aktifTekTasimaRezervasyonuVar,
      hesapEksigiVar: capacitySummary.hesapEksigiVar,
    };
  }

  private createEmptyCapacitySummary(
    vehicle: StoredVehicleRecord
  ): VehicleCapacitySummary {
    //Aktif rezervasyon yoksa arac kapasitesi tamamen bos kabul edilir.
    return {
      toplamAgirlikKg: vehicle.maksimumAgirlikKg,
      toplamHacimM3: vehicle.maksimumHacimM3,
      rezerveAgirlikKg: 0,
      rezerveHacimM3: 0,
      kalanAgirlikKg: vehicle.maksimumAgirlikKg,
      kalanHacimM3: vehicle.maksimumHacimM3,
      aktifRezervasyonSayisi: 0,
      aktifTekTasimaRezervasyonuVar: false,
      hesapEksigiVar: vehicle.maksimumHacimM3 === null,
    };
  }

  private assertValidVehicleImageFile(file: Express.Multer.File): void {
    //Arac fotografi icin bos dosya, desteklenmeyen mimetype ve 5 MB ustu dosya engellenir.
    if (!file.buffer || file.buffer.length === 0) {
      throw AppErrors.badRequest(AppErrorCode.VEHICLE_FILE_UNREADABLE, "Dosya icerigi okunamadi.");
    }

    if (!VEHICLE_IMAGE_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw AppErrors.badRequest(
        AppErrorCode.VEHICLE_FILE_INVALID,
        "Yalnizca JPEG, PNG veya WEBP gorseller yuklenebilir."
      );
    }

    if (file.size > MAX_VEHICLE_IMAGE_FILE_SIZE_BYTES) {
      throw AppErrors.badRequest(AppErrorCode.VEHICLE_FILE_TOO_LARGE, "Gorsel boyutu en fazla 5 MB olabilir.");
    }
  }

  private toPublicMediaUrl(storageKey: string | null): string | undefined {
    return storageKey ? this.mediaStorageService.toPublicUrl(storageKey) : undefined;
  }
}
