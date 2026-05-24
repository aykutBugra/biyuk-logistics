import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
import {
  type PublicEntityId,
  PublicEntityIdPipe,
} from "../../common/public-ids/public-entity-id";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CreateCounterOfferDto } from "./dto/create-counter-offer.dto";
import { CreateOfferThreadImageMessageDto } from "./dto/create-offer-thread-image-message.dto";
import { CreateOfferThreadMessageDto } from "./dto/create-offer-thread-message.dto";
import { MarkOfferThreadReadResponseDto } from "./dto/mark-offer-thread-read-response.dto";
import { OfferThreadContextQueryDto } from "./dto/offer-thread-context-query.dto";
import { OfferThreadDetailResponseDto } from "./dto/offer-thread-detail-response.dto";
import { OfferThreadMessageResponseDto } from "./dto/offer-thread-message-response.dto";
import { OfferThreadSummaryResponseDto } from "./dto/offer-thread-summary-response.dto";
import { OfferThreadsService } from "./offer-threads.service";

const MAX_THREAD_IMAGE_COUNT = 4;
const MAX_THREAD_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

@Controller("offer-threads")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI)
export class OfferThreadsController {
  constructor(private readonly offerThreadsService: OfferThreadsService) {}

  // Kullanıcının tarafı olduğu tüm offer thread'lerini listeler. Bu ekran gerçek
  // zamanlı bir inbox değildir; liste her açılışta veya yenilemede API'den çekilir.
  @Get("my")
  getMine(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: OfferThreadContextQueryDto
  ): Promise<OfferThreadSummaryResponseDto[]> {
    return this.offerThreadsService.getMine(currentUser, query);
  }

  // Belirli bir offer'ın konuşma detayını döndürür. Thread bağlamı request değil
  // offer olduğu için aynı request'teki farklı taşıyıcı konuşmaları karışmaz.
  @Get("offers/:offerId")
  getByOfferId(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("offerId", PublicEntityIdPipe) offerId: PublicEntityId
  ): Promise<OfferThreadDetailResponseDto> {
    return this.offerThreadsService.getByOfferId(currentUser, offerId);
  }

  // Thread içine normal serbest metin mesajı yazar. Mesaj akışı websocket ile
  // canlı itilmez; yazma sonrası ekran yeniden fetch edilerek güncel durum alınır.
  @Post("offers/:offerId/messages")
  @HttpCode(HttpStatus.CREATED)
  createTextMessage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("offerId", PublicEntityIdPipe) offerId: PublicEntityId,
    @Body() input: CreateOfferThreadMessageDto
  ): Promise<OfferThreadMessageResponseDto> {
    return this.offerThreadsService.createTextMessage(currentUser, offerId, input);
  }

  // Yeni bir fiyat önerisini counter offer mesajı olarak akışa yazar ve aynı anda
  // offer'ın güncel fiyat özetini de değiştirir.
  @Post("offers/:offerId/image-messages")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor("images", MAX_THREAD_IMAGE_COUNT, {
      storage: memoryStorage(),
      limits: {
        files: MAX_THREAD_IMAGE_COUNT,
        fileSize: MAX_THREAD_IMAGE_FILE_SIZE_BYTES,
      },
    })
  )
  createImageMessage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("offerId", PublicEntityIdPipe) offerId: PublicEntityId,
    @Body() input: CreateOfferThreadImageMessageDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined
  ): Promise<OfferThreadMessageResponseDto> {
    return this.offerThreadsService.createImageMessage(
      currentUser,
      offerId,
      input,
      files
    );
  }

  @Post("offers/:offerId/counter-offers")
  @HttpCode(HttpStatus.CREATED)
  createCounterOffer(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("offerId", PublicEntityIdPipe) offerId: PublicEntityId,
    @Body() input: CreateCounterOfferDto
  ): Promise<OfferThreadMessageResponseDto> {
    return this.offerThreadsService.createCounterOffer(currentUser, offerId, input);
  }

  // Thread açıldığında son mesaja kadar okundu işareti koyar. Bu model mesaj bazlı
  // read receipt yerine participant bazlı son-okunan pointer mantığı kullanır.
  @Post("offers/:offerId/read")
  @HttpCode(HttpStatus.OK)
  markRead(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("offerId", PublicEntityIdPipe) offerId: PublicEntityId
  ): Promise<MarkOfferThreadReadResponseDto> {
    return this.offerThreadsService.markRead(currentUser, offerId);
  }
}
