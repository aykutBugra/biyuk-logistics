import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { ROLE_NAMES } from "../../common/constants/role-names";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import {
  type PublicEntityId,
  PublicEntityIdPipe,
} from "../../common/public-ids/public-entity-id";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { VehicleDetailResponseDto } from "./dto/vehicle-detail-response.dto";
import { VehicleListItemResponseDto } from "./dto/vehicle-list-item-response.dto";
import { VehiclesService } from "./vehicles.service";

const MAX_VEHICLE_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

//vehicles controller, nakliyecinin kendi araclarini yonettigi endpointleri toplar.
//Tum endpointler NAKLIYECI rolu ister.
@Controller("vehicles")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_NAMES.NAKLIYECI)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  //Nakliyeciye yeni arac ekler. Marka/model kutuphanesi ve plaka benzersizligi
  //service/repository tarafinda ele alinir.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createVehicleDto: CreateVehicleDto
  ): Promise<VehicleDetailResponseDto> {
    return this.vehiclesService.create(currentUser, createVehicleDto);
  }

  //Nakliyecinin aktif araclarini kapasite ozetleriyle birlikte listeler.
  @Get("my")
  getMine(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<VehicleListItemResponseDto[]> {
    return this.vehiclesService.getMine(currentUser);
  }

  //Tek bir araci sadece sahibi olan nakliyeci okuyabilir.
  @Get(":id")
  getMineById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", PublicEntityIdPipe) id: PublicEntityId
  ): Promise<VehicleDetailResponseDto> {
    return this.vehiclesService.getMineById(currentUser, id);
  }

  //Arac aktif bir nakliyeye atanmis degilse soft delete edilir.
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", PublicEntityIdPipe) id: PublicEntityId
  ): Promise<void> {
    await this.vehiclesService.deleteById(currentUser, id);
  }

  //Arac bilgilerini gunceller. Plaka degisirse benzersizlik hatasi Conflict'e cevrilir.
  @Put(":id")
  updateById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", PublicEntityIdPipe) id: PublicEntityId,
    @Body() updateVehicleDto: UpdateVehicleDto
  ): Promise<VehicleDetailResponseDto> {
    return this.vehiclesService.updateById(currentUser, id, updateVehicleDto);
  }

  //Arac fotografini multipart olarak alir; gorsel service tarafinda islenip storage'a yazilir.
  @Post(":id/image")
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor("image", {
      storage: memoryStorage(),
      limits: {
        files: 1,
        fileSize: MAX_VEHICLE_IMAGE_FILE_SIZE_BYTES,
      },
    })
  )
  updateImage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", PublicEntityIdPipe) id: PublicEntityId,
    @UploadedFile() file: Express.Multer.File | undefined
  ): Promise<VehicleDetailResponseDto> {
    return this.vehiclesService.updateImage(currentUser, id, file);
  }

  //Arac fotografini kaldirir ve kayittaki storage key'i null yapar.
  @Delete(":id/image")
  @HttpCode(HttpStatus.OK)
  deleteImage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", PublicEntityIdPipe) id: PublicEntityId
  ): Promise<VehicleDetailResponseDto> {
    return this.vehiclesService.deleteImage(currentUser, id);
  }
}
