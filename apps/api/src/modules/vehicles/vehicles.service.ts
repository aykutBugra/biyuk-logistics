import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ROLE_NAMES } from "../../common/constants/role-names";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
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

@Injectable()
export class VehiclesService {
  constructor(
    private readonly vehiclesRepository: VehiclesRepository,
    private readonly prisma: PrismaService
  ) {}

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

      return this.toDetailResponse(vehicle);
    } catch (error) {
      this.rethrowUniquePlateAsConflict(error);
      throw error;
    }
  }

  async getMine(
    currentUser: AuthenticatedUser
  ): Promise<VehicleListItemResponseDto[]> {
    this.assertCarrierRole(currentUser);

    const vehicles = await this.vehiclesRepository.findManyByOwnerId(currentUser.id);
    return vehicles.map((vehicle) => this.toListItemResponse(vehicle));
  }

  async getMineById(
    currentUser: AuthenticatedUser,
    id: number
  ): Promise<VehicleDetailResponseDto> {
    this.assertCarrierRole(currentUser);

    const vehicle = await this.vehiclesRepository.findByIdAndOwnerId(id, currentUser.id);

    if (!vehicle) {
      throw new NotFoundException("Vehicle not found.");
    }

    return this.toDetailResponse(vehicle);
  }

  async deleteById(
    currentUser: AuthenticatedUser,
    id: number
  ): Promise<void> {
    this.assertCarrierRole(currentUser);

    const hasActiveShipment =
      await this.vehiclesRepository.hasNonTerminalShipmentByIdAndOwnerId(
        id,
        currentUser.id
      );

    if (hasActiveShipment) {
      throw new ConflictException(
        "Vehicle cannot be deleted while it is assigned to an active shipment."
      );
    }

    const wasDeleted = await this.vehiclesRepository.softDeleteByIdAndOwnerId(
      id,
      currentUser.id
    );

    if (!wasDeleted) {
      throw new NotFoundException("Vehicle not found.");
    }
  }

  async updateById(
    currentUser: AuthenticatedUser,
    id: number,
    updateVehicleDto: UpdateVehicleDto
  ): Promise<VehicleDetailResponseDto> {
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
        throw new NotFoundException("Vehicle not found.");
      }

      return this.toDetailResponse(updatedVehicle);
    } catch (error) {
      this.rethrowUniquePlateAsConflict(error);
      throw error;
    }
  }

  private assertCarrierRole(currentUser: AuthenticatedUser) {
    if (currentUser.roles.includes(ROLE_NAMES.NAKLIYECI)) {
      return;
    }

    throw new ForbiddenException("Only carriers can manage vehicles.");
  }

  private rethrowUniquePlateAsConflict(error: unknown): never | void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      return;
    }

    const targets = Array.isArray(error.meta?.target)
      ? error.meta.target.map((target) => String(target))
      : [];

    if (isVehiclePlateUniqueConstraintTarget(targets)) {
      throw new ConflictException("Vehicle plate is already in use.");
    }

    throw new ConflictException("Vehicle identifiers must be unique.");
  }

  private toListItemResponse(
    vehicle: StoredVehicleRecord
  ): VehicleListItemResponseDto {
    return {
      id: vehicle.id,
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
    };
  }

  private toDetailResponse(
    vehicle: StoredVehicleRecord
  ): VehicleDetailResponseDto {
    return this.toListItemResponse(vehicle);
  }
}
