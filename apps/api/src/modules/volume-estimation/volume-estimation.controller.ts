import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
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
import { EstimateVolumeBodyDto } from "./dto/estimate-volume-body.dto";
import { EstimateVolumeResponseDto } from "./dto/estimate-volume-response.dto";
import { VolumeEstimationService } from "./volume-estimation.service";

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

const MAX_IMAGE_COUNT = 3;
const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;


//sadece musterilerin erisebilecegi bir endpoint tanimlanir; kullanici 
// gorselleri, aciklamayi ve yuk tipini gondererek hacim tahmini sonucunu
// alabilir
@Controller("volume-estimates")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_NAMES.MUSTERI)
export class VolumeEstimationController {
  constructor(
    private readonly volumeEstimationService: VolumeEstimationService
  ) {}

  //estimateVolume endpoint'i, kullanici tarafindan secilen gorselleri,
  // aciklamayi ve yuk tipini alarak hacim tahmini sonucunu dondurur; 
  // gorseller, multipart/form-data formatinda gonderilir ve dosya boyutu
  // ile gorsel sayisi sinirlandirilir
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor("images", MAX_IMAGE_COUNT, {
      storage: memoryStorage(),
      limits: {
        files: MAX_IMAGE_COUNT,
        fileSize: MAX_IMAGE_FILE_SIZE_BYTES,
      },
    })
  )
  estimateVolume(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: EstimateVolumeBodyDto,
    @UploadedFiles() files: UploadedImageFile[] | undefined
  ): Promise<EstimateVolumeResponseDto> {
    return this.volumeEstimationService.estimateVolume(currentUser, body, files);
  }
}
