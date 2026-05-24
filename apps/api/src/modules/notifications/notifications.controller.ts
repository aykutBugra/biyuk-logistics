import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { MarkAllNotificationsAsReadResponseDto } from "./dto/mark-all-notifications-as-read-response.dto";
import { MarkNotificationAsReadResponseDto } from "./dto/mark-notification-as-read-response.dto";
import { NotificationListItemResponseDto } from "./dto/notification-list-item-response.dto";
import { UnreadNotificationCountResponseDto } from "./dto/unread-notification-count-response.dto";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI, ROLE_NAMES.ADMIN)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  //Giris yapan kullanicinin bildirimlerini getirir. Liste once okunmamis,
  //sonra okunmus bildirimleri gosterecek sekilde repository tarafinda hazirlanir.
  @Get("my")
  getMine(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<NotificationListItemResponseDto[]> {
    return this.notificationsService.getMine(currentUser);
  }

  //Navbar/badge gibi alanlar icin okunmamis bildirim sayisini dondurur.
  @Get("my/unread-count")
  getUnreadCount(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<UnreadNotificationCountResponseDto> {
    return this.notificationsService.getUnreadCount(currentUser);
  }

  //Tek bir bildirimi okundu isaretler. Bildirim currentUser'a ait degilse bulunamaz.
  @Post(":notificationId/read")
  @HttpCode(HttpStatus.OK)
  markAsRead(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("notificationId", PublicEntityIdPipe) notificationId: PublicEntityId
  ): Promise<MarkNotificationAsReadResponseDto> {
    return this.notificationsService.markAsRead(currentUser, notificationId);
  }

  //Kullanicinin tum okunmamis bildirimlerini tek seferde okundu yapar.
  @Post("my/read-all")
  @HttpCode(HttpStatus.OK)
  markAllAsRead(
    @CurrentUser() currentUser: AuthenticatedUser
  ): Promise<MarkAllNotificationsAsReadResponseDto> {
    return this.notificationsService.markAllAsRead(currentUser);
  }
}
