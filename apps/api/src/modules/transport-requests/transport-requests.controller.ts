import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
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
import { UploadTransportRequestImagesBodyDto } from "./dto/upload-transport-request-images-body.dto";
import { TransportRequestsService } from "./transport-requests.service";

const MAX_REQUEST_IMAGE_COUNT = 10;
const MAX_REQUEST_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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

  @Post(":id/images")
  @UseInterceptors(
    FilesInterceptor("images", MAX_REQUEST_IMAGE_COUNT, {
      storage: memoryStorage(),
      limits: {
        files: MAX_REQUEST_IMAGE_COUNT,
        fileSize: MAX_REQUEST_IMAGE_FILE_SIZE_BYTES,
      },
    })
  )
  uploadImages(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UploadTransportRequestImagesBodyDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined
  ): Promise<TransportRequestDetailResponseDto> {
    return this.transportRequestsService.uploadImages(currentUser, id, body, files);
  }

  @Patch(":id/images/:imageId/primary")
  setPrimaryImage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number,
    @Param("imageId", ParseIntPipe) imageId: number
  ): Promise<TransportRequestDetailResponseDto> {
    return this.transportRequestsService.setPrimaryImage(
      currentUser,
      id,
      imageId
    );
  }

  @Delete(":id/images/:imageId")
  deleteImage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id", ParseIntPipe) id: number,
    @Param("imageId", ParseIntPipe) imageId: number
  ): Promise<TransportRequestDetailResponseDto> {
    return this.transportRequestsService.deleteImage(currentUser, id, imageId);
  }
}
