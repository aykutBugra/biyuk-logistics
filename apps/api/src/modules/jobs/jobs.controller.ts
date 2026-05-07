import {
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
import { JobAudienceQueryDto } from "./dto/job-audience-query.dto";
import { JobDetailResponseDto } from "./dto/job-detail-response.dto";
import { JobListItemResponseDto } from "./dto/job-list-item-response.dto";
import { JobsService } from "./jobs.service";

@Controller("jobs")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get("my")
  getMine(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: JobAudienceQueryDto
  ): Promise<JobListItemResponseDto[]> {
    return this.jobsService.getMine(currentUser, query);
  }

  @Get(":jobId")
  getById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("jobId", ParseIntPipe) jobId: number,
    @Query() query: JobAudienceQueryDto
  ): Promise<JobDetailResponseDto> {
    return this.jobsService.getById(currentUser, jobId, query);
  }

  @Post(":jobId/start")
  @HttpCode(HttpStatus.OK)
  @Roles(ROLE_NAMES.NAKLIYECI)
  startById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("jobId", ParseIntPipe) jobId: number
  ): Promise<JobDetailResponseDto> {
    return this.jobsService.startById(currentUser, jobId);
  }

  @Post(":jobId/complete")
  @HttpCode(HttpStatus.OK)
  @Roles(ROLE_NAMES.NAKLIYECI)
  completeById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("jobId", ParseIntPipe) jobId: number
  ): Promise<JobDetailResponseDto> {
    return this.jobsService.completeById(currentUser, jobId);
  }
}
