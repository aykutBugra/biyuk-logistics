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
  UseGuards,
} from "@nestjs/common";
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
import { CarrierRoutesService } from "./carrier-routes.service";
import { CarrierRouteDetailResponseDto } from "./dto/carrier-route-detail-response.dto";
import { CarrierRouteListItemResponseDto } from "./dto/carrier-route-list-item-response.dto";
import { CreateCarrierRouteDto } from "./dto/create-carrier-route.dto";
import { UpdateCarrierRouteDto } from "./dto/update-carrier-route.dto";

@Controller("carrier-routes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_NAMES.NAKLIYECI)
export class CarrierRoutesController {
  constructor(private readonly carrierRoutesService: CarrierRoutesService) {}

  //Nakliyeci kendi calisacagi baslangic-varis rotasini olusturur.
  //Canonical konum ve route metrikleri service tarafinda hesaplanir.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createCarrierRouteDto: CreateCarrierRouteDto
  ): Promise<CarrierRouteDetailResponseDto> {
    return this.carrierRoutesService.create(currentUser, createCarrierRouteDto);
  }

  //Nakliyecinin aktif rota/hat tanimlarini listeler.
  @Get("my")
  getMine(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<CarrierRouteListItemResponseDto[]> {
    return this.carrierRoutesService.getMine(currentUser);
  }

  //Secili rota detayini sadece rota sahibi nakliyeci okuyabilir.
  @Get("my/:id")
  getMineById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", PublicEntityIdPipe) id: PublicEntityId
  ): Promise<CarrierRouteDetailResponseDto> {
    return this.carrierRoutesService.getMineById(currentUser, id);
  }

  //Rota bilgilerini gunceller. Baslangic veya varis degisirse route snapshot'i yenilenir.
  @Put("my/:id")
  updateById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", PublicEntityIdPipe) id: PublicEntityId,
    @Body() updateCarrierRouteDto: UpdateCarrierRouteDto
  ): Promise<CarrierRouteDetailResponseDto> {
    return this.carrierRoutesService.updateById(
      currentUser,
      id,
      updateCarrierRouteDto
    );
  }

  //Rota hard delete edilmez; sahiplik kontroluyle soft delete edilir.
  @Delete("my/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", PublicEntityIdPipe) id: PublicEntityId
  ): Promise<void> {
    await this.carrierRoutesService.deleteById(currentUser, id);
  }
}
