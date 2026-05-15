import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ROLE_NAMES } from "../../common/constants/role-names";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CreateOfferDto } from "./dto/create-offer.dto";
import { IncomingOfferListItemResponseDto } from "./dto/incoming-offer-list-item-response.dto";
import { MyIncomingOfferListItemResponseDto } from "./dto/my-incoming-offer-list-item-response.dto";
import { MyOfferListItemResponseDto } from "./dto/my-offer-list-item-response.dto";
import { OfferResponseDto } from "./dto/offer-response.dto";
import { OpenRequestDetailResponseDto } from "./dto/open-request-detail-response.dto";
import { OpenRequestDetailQueryDto } from "./dto/open-request-detail-query.dto";
import { OpenRequestListItemResponseDto } from "./dto/open-request-list-item-response.dto";
import { OpenRequestQueryDto } from "./dto/open-request-query.dto";
import { OffersService } from "./offers.service";

@Controller("offers")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get("open-requests")
  @Roles(ROLE_NAMES.NAKLIYECI)
  getOpenRequests(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: OpenRequestQueryDto
  ): Promise<OpenRequestListItemResponseDto[]> {
    return this.offersService.getOpenRequests(currentUser, query);
  }

  @Get("open-requests/:requestId")
  @Roles(ROLE_NAMES.NAKLIYECI)
  getOpenRequestById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("requestId", ParseIntPipe) requestId: number,
    @Query() query: OpenRequestDetailQueryDto
  ): Promise<OpenRequestDetailResponseDto> {
    return this.offersService.getOpenRequestById(currentUser, requestId, query);
  }

  @Post("requests/:requestId")
  @HttpCode(HttpStatus.CREATED)
  @Roles(ROLE_NAMES.NAKLIYECI)
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("requestId", ParseIntPipe) requestId: number,
    @Body() createOfferDto: CreateOfferDto
  ): Promise<OfferResponseDto> {
    return this.offersService.create(currentUser, requestId, createOfferDto);
  }

  @Post(":offerId/accept")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI)
  async acceptById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("offerId", ParseIntPipe) offerId: number
  ): Promise<void> {
    await this.offersService.acceptById(currentUser, offerId);
  }

  @Post(":offerId/reject")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI)
  async rejectById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("offerId", ParseIntPipe) offerId: number
  ): Promise<void> {
    await this.offersService.rejectById(currentUser, offerId);
  }

  @Get("my")
  @Roles(ROLE_NAMES.NAKLIYECI)
  getMine(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<MyOfferListItemResponseDto[]> {
    return this.offersService.getMine(currentUser);
  }

  @Get("incoming/my")
  @Roles(ROLE_NAMES.MUSTERI)
  getMyIncoming(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<MyIncomingOfferListItemResponseDto[]> {
    return this.offersService.getMyIncoming(currentUser);
  }

  @Get("requests/:requestId/incoming")
  @Roles(ROLE_NAMES.MUSTERI)
  getIncomingForRequest(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("requestId", ParseIntPipe) requestId: number
  ): Promise<IncomingOfferListItemResponseDto[]> {
    return this.offersService.getIncomingForRequest(currentUser, requestId);
  }
}
