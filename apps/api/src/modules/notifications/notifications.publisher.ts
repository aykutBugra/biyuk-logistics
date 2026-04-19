import { Injectable, Logger } from "@nestjs/common";
import { NotificationsRepository } from "./repositories/notifications.repository";

type RouteContext = {
  baslangicSehri: string;
  varisSehri: string;
};

@Injectable()
export class NotificationsPublisher {
  private readonly logger = new Logger(NotificationsPublisher.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository
  ) {}

  async publishIncomingOffer(input: {
    customerId: number;
    offerId: number;
    requestId: number;
    route: RouteContext;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.customerId,
      tip: "TEKLIF_GELDI",
      baslik: "Yeni teklif geldi",
      mesaj: `${this.formatRoute(input.route)} icin yeni bir teklif geldi.`,
      hedefUrl: `/dashboard/isteklerim/${input.requestId}`,
      olayAnahtari: `TEKLIF_GELDI:${input.offerId}`,
    });
  }

  async publishOfferAccepted(input: {
    carrierId: number;
    offerId: number;
    requestId: number;
    jobId: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.carrierId,
      tip: "TEKLIF_KABUL_EDILDI",
      baslik: "Teklifin kabul edildi",
      mesaj: `Istek #${input.requestId} icin teklifin kabul edildi ve nakliye kaydi olusturuldu.`,
      hedefUrl: `/dashboard/nakliyelerim/${input.jobId}`,
      olayAnahtari: `TEKLIF_KABUL_EDILDI:${input.offerId}`,
    });
  }

  async publishOfferRejected(input: {
    carrierId: number;
    offerId: number;
    requestId: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.carrierId,
      tip: "TEKLIF_REDDEDILDI",
      baslik: "Teklifin reddedildi",
      mesaj: `Istek #${input.requestId} icin teklifin reddedildi.`,
      hedefUrl: "/dashboard/tekliflerim",
      olayAnahtari: `TEKLIF_REDDEDILDI:${input.offerId}`,
    });
  }

  async publishJobStarted(input: {
    customerId: number;
    jobId: number;
    requestId: number;
    route: RouteContext;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.customerId,
      tip: "IS_BASLADI",
      baslik: "Nakliye basladi",
      mesaj: `${this.formatRoute(input.route)} icin nakliye baslatildi.`,
      hedefUrl: `/dashboard/isteklerim/${input.requestId}`,
      olayAnahtari: `IS_BASLADI:${input.jobId}`,
    });
  }

  async publishJobCompleted(input: {
    customerId: number;
    jobId: number;
    requestId: number;
    route: RouteContext;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.customerId,
      tip: "IS_TAMAMLANDI",
      baslik: "Nakliye tamamlandi",
      mesaj: `${this.formatRoute(input.route)} icin nakliye tamamlandi.`,
      hedefUrl: `/dashboard/isteklerim/${input.requestId}`,
      olayAnahtari: `IS_TAMAMLANDI:${input.jobId}`,
    });
  }

  async publishRatingReceived(input: {
    ratedUserId: number;
    ratingId: number;
    jobId: number;
    puanDegeri: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.ratedUserId,
      tip: "RATING_ALDIN",
      baslik: "Yeni puan aldin",
      mesaj: `Nakliye #${input.jobId} icin ${input.puanDegeri}/5 puan aldin.`,
      hedefUrl: "/dashboard/puanlarim",
      olayAnahtari: `RATING_ALDIN:${input.ratingId}`,
    });
  }

  async publishRatingPending(input: {
    userId: number;
    jobId: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.userId,
      tip: "RATING_BEKLIYOR",
      baslik: "Musteriyi puanlaman bekleniyor",
      mesaj: `Tamamlanan nakliye #${input.jobId} icin musteri deneyimini degerlendirebilirsin.`,
      hedefUrl: `/dashboard/nakliyelerim/${input.jobId}`,
      olayAnahtari: `RATING_BEKLIYOR:${input.jobId}:${input.userId}`,
    });
  }

  private async publish(input: {
    kullaniciId: number;
    tip: string;
    baslik: string;
    mesaj: string;
    hedefUrl: string | null;
    olayAnahtari: string;
  }): Promise<void> {
    try {
      await this.notificationsRepository.createIfAbsent({
        kullaniciId: input.kullaniciId,
        tip: input.tip,
        baslik: input.baslik,
        mesaj: input.mesaj,
        hedefUrl: input.hedefUrl,
        olayAnahtari: input.olayAnahtari,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown notification error";

      this.logger.error(
        `Notification publish failed for ${input.tip} (${input.olayAnahtari}): ${message}`
      );
    }
  }

  private formatRoute(route: RouteContext): string {
    return `${route.baslangicSehri} -> ${route.varisSehri}`;
  }
}
