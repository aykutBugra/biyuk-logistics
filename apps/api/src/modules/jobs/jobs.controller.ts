import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
import { JobAudienceQueryDto } from "./dto/job-audience-query.dto";
import { JobDetailResponseDto } from "./dto/job-detail-response.dto";
import { JobListItemResponseDto } from "./dto/job-list-item-response.dto";
import { JobsService } from "./jobs.service";


//jobs=schema prismadaki nakliye modeli 

//tum endpointler login ister 
@Controller("jobs")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  //giris yapan kkullanicinin islerini listeler 
  @Get("my")
  getMine(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: JobAudienceQueryDto
  ): Promise<JobListItemResponseDto[]> {
    return this.jobsService.getMine(currentUser, query);
  }

    //belirli bir nakliye detayini getirir
  @Get(":jobId")
  getById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("jobId", PublicEntityIdPipe) jobId: PublicEntityId,
    @Query() query: JobAudienceQueryDto
  ): Promise<JobDetailResponseDto> {
    return this.jobsService.getById(currentUser, jobId, query);
  }

  //sadece nakliyeci cagirabilir nakliyeyi baslatir
  @Post(":jobId/start")
  @HttpCode(HttpStatus.OK)
  @Roles(ROLE_NAMES.NAKLIYECI)
  startById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("jobId", PublicEntityIdPipe) jobId: PublicEntityId
  ): Promise<JobDetailResponseDto> {
    return this.jobsService.startById(currentUser, jobId);
  }

  //sadece nakliyeci cagirabilir nakliyeyi tamamlar
  @Post(":jobId/complete")
  @HttpCode(HttpStatus.OK)
  @Roles(ROLE_NAMES.NAKLIYECI)
  completeById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("jobId", PublicEntityIdPipe) jobId: PublicEntityId
  ): Promise<JobDetailResponseDto> {
    return this.jobsService.completeById(currentUser, jobId);
  }

  @Post(":jobId/delivered")
  @HttpCode(HttpStatus.OK)
  @Roles(ROLE_NAMES.NAKLIYECI)
  markDeliveredById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("jobId", PublicEntityIdPipe) jobId: PublicEntityId
  ): Promise<JobDetailResponseDto> {
    return this.jobsService.markDeliveredById(currentUser, jobId);
  }

  @Post(":jobId/confirm-delivery")
  @HttpCode(HttpStatus.OK)
  @Roles(ROLE_NAMES.MUSTERI)
  confirmDeliveryById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("jobId", PublicEntityIdPipe) jobId: PublicEntityId
  ): Promise<JobDetailResponseDto> {
    return this.jobsService.confirmDeliveryById(currentUser, jobId);
  }
}
