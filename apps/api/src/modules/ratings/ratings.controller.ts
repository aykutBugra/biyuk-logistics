import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ROLE_NAMES } from "../../common/constants/role-names";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CreateRatingDto } from "./dto/create-rating.dto";
import { MyRatingSummaryResponseDto } from "./dto/my-rating-summary-response.dto";
import { RatingListItemResponseDto } from "./dto/rating-list-item-response.dto";
import { SubmittedRatingResponseDto } from "./dto/submitted-rating-response.dto";
import { RatingsService } from "./ratings.service";

@Controller("ratings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post("jobs/:jobId")
  @HttpCode(HttpStatus.CREATED)
  createForJob(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("jobId", ParseIntPipe) jobId: number,
    @Body() createRatingDto: CreateRatingDto
  ): Promise<SubmittedRatingResponseDto> {
    return this.ratingsService.createForJob(currentUser, jobId, createRatingDto);
  }

  @Get("my/given")
  getMyGiven(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<RatingListItemResponseDto[]> {
    return this.ratingsService.getMyGiven(currentUser);
  }

  @Get("my/received")
  getMyReceived(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<RatingListItemResponseDto[]> {
    return this.ratingsService.getMyReceived(currentUser);
  }

  @Get("my/summary")
  getMySummary(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<MyRatingSummaryResponseDto> {
    return this.ratingsService.getMySummary(currentUser);
  }
}
