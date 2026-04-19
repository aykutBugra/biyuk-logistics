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
  UseGuards,
} from "@nestjs/common";
import { ROLE_NAMES } from "../../common/constants/role-names";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CreateTransportRequestDto } from "./dto/create-transport-request.dto";
import { UpdateTransportRequestDto } from "./dto/update-transport-request.dto";
import { TransportRequestDetailResponseDto } from "./dto/transport-request-detail-response.dto";
import { TransportRequestListItemResponseDto } from "./dto/transport-request-list-item-response.dto";
import { TransportRequestsService } from "./transport-requests.service";

@Controller("transport-requests")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_NAMES.MUSTERI)
export class TransportRequestsController {
  constructor(
    private readonly transportRequestsService: TransportRequestsService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createTransportRequestDto: CreateTransportRequestDto
  ): Promise<TransportRequestDetailResponseDto> {
    return this.transportRequestsService.create(currentUser, createTransportRequestDto);
  }

  @Get("my")
  getMine(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<TransportRequestListItemResponseDto[]> {
    return this.transportRequestsService.getMine(currentUser);
  }

  @Get(":id")
  getMineById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number
  ): Promise<TransportRequestDetailResponseDto> {
    return this.transportRequestsService.getMineById(currentUser, id);
  }

  @Put(":id")
  updateById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() updateTransportRequestDto: UpdateTransportRequestDto
  ): Promise<TransportRequestDetailResponseDto> {
    return this.transportRequestsService.updateById(
      currentUser,
      id,
      updateTransportRequestDto
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number
  ): Promise<void> {
    await this.transportRequestsService.deleteById(currentUser, id);
  }
}
