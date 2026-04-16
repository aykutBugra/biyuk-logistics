import {
  ConflictException,
  ForbiddenException, //service seviyesindeki iş kuralı hataları için kullanılır . 
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ROLE_NAMES } from "../../common/constants/role-names"; //rol kontrolü
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";  //create request verisi için kullanılan dto

import { UpdateVehicleDto } from "./dto/update-vehicle.dto";  //update request verisi için kullanılan dto

import { VehicleDetailResponseDto } from "./dto/vehicle-detail-response.dto"; //response shapeleri için kullanılan dto
import { VehicleListItemResponseDto } from "./dto/vehicle-list-item-response.dto";
import {
  type StoredVehicleRecord,   //repo ile konuşmak için
  VehiclesRepository,
} from "./repositories/vehicles.repository";

function normalizeCanonicalText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();   //fazla boşluk kaldırma fonksiyonu.
}

function normalizeVehiclePlate(value: string): string {   //plaka için normalizasyon fonksiyonu. 
  return normalizeCanonicalText(value);                   //hem boşluk hem de büyük harfe çevirlip kontrol edilir . 
}

@Injectable()
export class VehiclesService {
  constructor(private readonly vehiclesRepository: VehiclesRepository) {}

  async create(   //araç ekleme akışı merkezi . 
    currentUser: AuthenticatedUser,
    createVehicleDto: CreateVehicleDto
  ): Promise<VehicleDetailResponseDto> {
    this.assertCarrierRole(currentUser);

    const marka = normalizeCanonicalText(createVehicleDto.marka);
    const model = normalizeCanonicalText(createVehicleDto.model);
    const plaka = normalizeVehiclePlate(createVehicleDto.plaka);
    const aracKutuphaneId = await this.resolveVehicleLibraryId(marka, model); 
    //arac kütüphanesi id sini alma. eğer yoksa oluşturur.
    
    try {
      const vehicle = await this.vehiclesRepository.create({
        sahipId: currentUser.id,
        aracKutuphaneId,
        plaka,
        yil: createVehicleDto.yil,
        kapasite: createVehicleDto.kapasite,
      });

      return this.toDetailResponse(vehicle);
    } catch (error) {
      this.rethrowUniquePlateAsConflict(error);
      throw error;
    }
  }

  async getMine(    //mylist . kullanıcı kendi araçlarını görür.
    currentUser: AuthenticatedUser
  ): Promise<VehicleListItemResponseDto[]> {  //gelen kayıtlar liste DTO suna map edilir.
    this.assertCarrierRole(currentUser);

    const vehicles = await this.vehiclesRepository.findManyByOwnerId(currentUser.id);
    return vehicles.map((vehicle) => this.toListItemResponse(vehicle));
  }

  async getMineById(    //detail metodu . kullanıcı kendi araçlarından birinin detayını görür.
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
    await this.vehiclesRepository.deleteById(id);
  }

  async updateById(
    currentUser: AuthenticatedUser,
    id: number,
    updateVehicleDto: UpdateVehicleDto
  ): Promise<VehicleDetailResponseDto> {
    this.assertCarrierRole(currentUser);
    console.log("Servis Başlangıcı" );
    const existingVehicle = await this.vehiclesRepository.findByIdAndOwnerId(id, currentUser.id);
    console.log("Existing vehicle:", existingVehicle); // Debug log to check the existing vehicle record
    if (!existingVehicle) {
      throw new NotFoundException("Vehicle not found.");
    }

    const marka = normalizeCanonicalText(updateVehicleDto.marka);
    const model = normalizeCanonicalText(updateVehicleDto.model);
    const plaka = normalizeVehiclePlate(updateVehicleDto.plaka);
    const aracKutuphaneId = await this.resolveVehicleLibraryId(marka, model);

    try {
      const updatedVehicle = await this.vehiclesRepository.create({
        sahipId: currentUser.id,
        aracKutuphaneId,
        plaka,
        yil: updateVehicleDto.yil,
        kapasite: updateVehicleDto.kapasite,
      });

      return this.toDetailResponse(updatedVehicle);
    } catch (error) {
      this.rethrowUniquePlateAsConflict(error);
      throw error;
    }
  
  }









  private async resolveVehicleLibraryId(
    marka: string,
    model: string
  ): Promise<number> {
    const existingVehicleLibraryId =
      await this.vehiclesRepository.findVehicleLibraryByBrandAndModel(marka, model);

    if (existingVehicleLibraryId !== null) {
      return existingVehicleLibraryId;
    }

    return this.vehiclesRepository.createVehicleLibrary({ marka, model });
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

    if (targets.includes("plaka")) {
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
      kapasite: vehicle.kapasite,
    };
  }

  private toDetailResponse(
    vehicle: StoredVehicleRecord
  ): VehicleDetailResponseDto {
    return this.toListItemResponse(vehicle);
  }
}
