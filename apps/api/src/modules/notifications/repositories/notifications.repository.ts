import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

const notificationSelect = {
  id: true,
  tip: true,
  baslik: true,
  mesaj: true,
  hedefUrl: true,
  olayAnahtari: true,
  okunmaTarihi: true,
  olusturmaTarihi: true,
} satisfies Prisma.BildirimSelect;

type StoredNotificationQuery = Prisma.BildirimGetPayload<{
  select: typeof notificationSelect;
}>;

export type CreateNotificationRecordInput = {
  kullaniciId: number;
  tip: string;
  baslik: string;
  mesaj: string;
  hedefUrl?: string | null;
  olayAnahtari: string;
};

export type StoredNotificationRecord = {
  id: number;
  tip: string;
  baslik: string;
  mesaj: string;
  hedefUrl: string | null;
  olayAnahtari: string | null;
  okunmaTarihi: Date | null;
  olusturmaTarihi: Date;
};

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIfAbsent(
    input: CreateNotificationRecordInput
  ): Promise<StoredNotificationRecord | null> {
    try {
      const notification = await this.prisma.client.bildirim.create({
        data: {
          kullaniciId: input.kullaniciId,
          tip: input.tip,
          baslik: input.baslik,
          mesaj: input.mesaj,
          hedefUrl: input.hedefUrl ?? null,
          olayAnahtari: input.olayAnahtari,
        },
        select: notificationSelect,
      });

      return this.mapStoredNotification(notification);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return null;
      }

      throw error;
    }
  }

  async findManyByUserId(userId: number, limit = 50): Promise<StoredNotificationRecord[]> {
    const [unreadNotifications, readNotifications] = await Promise.all([
      this.prisma.client.bildirim.findMany({
        where: {
          kullaniciId: userId,
          okunmaTarihi: null,
        },
        orderBy: [{ olusturmaTarihi: "desc" }, { id: "desc" }],
        take: limit,
        select: notificationSelect,
      }),
      this.prisma.client.bildirim.findMany({
        where: {
          kullaniciId: userId,
          NOT: {
            okunmaTarihi: null,
          },
        },
        orderBy: [{ olusturmaTarihi: "desc" }, { id: "desc" }],
        take: limit,
        select: notificationSelect,
      }),
    ]);

    return [...unreadNotifications, ...readNotifications]
      .slice(0, limit)
      .map((notification) => this.mapStoredNotification(notification));
  }

  async countUnreadByUserId(userId: number): Promise<number> {
    return this.prisma.client.bildirim.count({
      where: {
        kullaniciId: userId,
        okunmaTarihi: null,
      },
    });
  }

  async findByIdAndUserId(
    notificationId: number,
    userId: number
  ): Promise<StoredNotificationRecord | null> {
    const notification = await this.prisma.client.bildirim.findFirst({
      where: {
        id: notificationId,
        kullaniciId: userId,
      },
      select: notificationSelect,
    });

    return notification ? this.mapStoredNotification(notification) : null;
  }

  async markAsReadByIdAndUserId(
    notificationId: number,
    userId: number
  ): Promise<StoredNotificationRecord | null> {
    const existingNotification = await this.findByIdAndUserId(notificationId, userId);

    if (!existingNotification) {
      return null;
    }

    if (existingNotification.okunmaTarihi !== null) {
      return existingNotification;
    }

    const notification = await this.prisma.client.bildirim.update({
      where: {
        id: notificationId,
      },
      data: {
        okunmaTarihi: new Date(),
      },
      select: notificationSelect,
    });

    return this.mapStoredNotification(notification);
  }

  async markAllAsReadByUserId(userId: number): Promise<number> {
    const result = await this.prisma.client.bildirim.updateMany({
      where: {
        kullaniciId: userId,
        okunmaTarihi: null,
      },
      data: {
        okunmaTarihi: new Date(),
      },
    });

    return result.count;
  }

  private mapStoredNotification(
    notification: StoredNotificationQuery
  ): StoredNotificationRecord {
    return {
      id: notification.id,
      tip: notification.tip,
      baslik: notification.baslik,
      mesaj: notification.mesaj,
      hedefUrl: notification.hedefUrl,
      olayAnahtari: notification.olayAnahtari,
      okunmaTarihi: notification.okunmaTarihi,
      olusturmaTarihi: notification.olusturmaTarihi,
    };
  }
}
