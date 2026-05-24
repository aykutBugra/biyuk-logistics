import { Injectable, NotFoundException } from "@nestjs/common";
import type { PublicEntityId } from "../../common/public-ids/public-entity-id";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { MarkAllNotificationsAsReadResponseDto } from "./dto/mark-all-notifications-as-read-response.dto";
import { MarkNotificationAsReadResponseDto } from "./dto/mark-notification-as-read-response.dto";
import { NotificationListItemResponseDto } from "./dto/notification-list-item-response.dto";
import { UnreadNotificationCountResponseDto } from "./dto/unread-notification-count-response.dto";
import {
  NotificationsRepository,
  type StoredNotificationRecord,
} from "./repositories/notifications.repository";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository
  ) {}

  //Kullanicinin bildirim listesini repository'den alir ve frontend response formatina cevirir.
  async getMine(
    currentUser: AuthenticatedUser
  ): Promise<NotificationListItemResponseDto[]> {
    const notifications = await this.notificationsRepository.findManyByUserId(
      currentUser.id
    );

    return notifications.map((notification) =>
      this.toNotificationListItemResponse(notification)
    );
  }

  async getUnreadCount(
    currentUser: AuthenticatedUser
  ): Promise<UnreadNotificationCountResponseDto> {
    //Okunmamis sayisi ayrica doner; bu bilgi liste cekmeden badge gostermek icin kullanilir.
    const unreadCount = await this.notificationsRepository.countUnreadByUserId(
      currentUser.id
    );

    return {
      unreadCount,
    };
  }

  async markAsRead(
    currentUser: AuthenticatedUser,
    notificationId: PublicEntityId
  ): Promise<MarkNotificationAsReadResponseDto> {
    //Bildirim sadece sahibi tarafindan okundu isaretlenebilir.
    const notification = await this.notificationsRepository.markAsReadByIdAndUserId(
      notificationId,
      currentUser.id
    );

    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }

    return this.toNotificationListItemResponse(notification);
  }

  async markAllAsRead(
    currentUser: AuthenticatedUser
  ): Promise<MarkAllNotificationsAsReadResponseDto> {
    //Toplu okuma isleminde kac bildirimin guncellendigi response'ta doner.
    const updatedCount = await this.notificationsRepository.markAllAsReadByUserId(
      currentUser.id
    );

    return {
      updatedCount,
    };
  }

  private toNotificationListItemResponse(
    notification: StoredNotificationRecord
  ): NotificationListItemResponseDto {
    //DB'deki okunmaTarihi alanindan frontend'in direkt kullanacagi isRead bilgisi uretilir.
    return {
      id: notification.publicId,
      tip: notification.tip,
      baslik: notification.baslik,
      mesaj: notification.mesaj,
      hedefUrl: notification.hedefUrl,
      isRead: notification.okunmaTarihi !== null,
      okunmaTarihi: notification.okunmaTarihi,
      olusturmaTarihi: notification.olusturmaTarihi,
    };
  }
}
