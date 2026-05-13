import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { RolesGuard } from "../../common/guards/roles.guard";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { VehicleDetailResponseDto } from "./dto/vehicle-detail-response.dto";
import { VehicleListItemResponseDto } from "./dto/vehicle-list-item-response.dto";
import { VehiclesService } from "./vehicles.service";

const MAX_VEHICLE_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

@Controller("vehicles")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_NAMES.NAKLIYECI)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createVehicleDto: CreateVehicleDto
  ): Promise<VehicleDetailResponseDto> {
    return this.vehiclesService.create(currentUser, createVehicleDto);
  }

  @Get("my")
  getMine(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<VehicleListItemResponseDto[]> {
    return this.vehiclesService.getMine(currentUser);
  }

  @Get(":id")
  getMineById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number
  ): Promise<VehicleDetailResponseDto> {
    return this.vehiclesService.getMineById(currentUser, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number
  ): Promise<void> {
    await this.vehiclesService.deleteById(currentUser, id);
  }

  @Put(":id")
  updateById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() updateVehicleDto: UpdateVehicleDto
  ): Promise<VehicleDetailResponseDto> {
    return this.vehiclesService.updateById(currentUser, id, updateVehicleDto);
  }

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
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined
  ): Promise<VehicleDetailResponseDto> {
    return this.vehiclesService.updateImage(currentUser, id, file);
  }

  @Delete(":id/image")
  @HttpCode(HttpStatus.OK)
  deleteImage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number
  ): Promise<VehicleDetailResponseDto> {
    return this.vehiclesService.deleteImage(currentUser, id);
  }
}
