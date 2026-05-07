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

  // Yeni offer geldiğinde müşteri tarafında request detayına dönen klasik teklif
  // bildirimi üretir.
  async publishIncomingOffer(input: {
    customerId: number;
    offerId: number;
    requestId: number;
    actorUserId?: number;
    route: RouteContext;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.customerId,
      actorUserId: input.actorUserId,
      tip: "TEKLIF_GELDI",
      baslik: "Yeni teklif geldi",
      mesaj: `${this.formatRoute(input.route)} icin yeni bir teklif geldi.`,
      hedefUrl: `/dashboard/isteklerim/${input.requestId}`,
      olayAnahtari: `TEKLIF_GELDI:${input.offerId}`,
    });
  }

  // Teklif kabul edildiğinde kazanan nakliyeciyi artık nakliye kaydına yönlendirir.
  async publishOfferAccepted(input: {
    carrierId: number;
    offerId: number;
    requestId: number;
    jobId: number;
    actorUserId?: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.carrierId,
      actorUserId: input.actorUserId,
      tip: "TEKLIF_KABUL_EDILDI",
      baslik: "Teklifin kabul edildi",
      mesaj: `Istek #${input.requestId} icin teklifin kabul edildi ve nakliye kaydi olusturuldu.`,
      hedefUrl: `/dashboard/nakliyelerim/${input.jobId}`,
      olayAnahtari: `TEKLIF_KABUL_EDILDI:${input.offerId}`,
    });
  }

  // Teklif reddedildiğinde veya request başka offer ile kapandığında taşıyıcıyı ilgili
  // konuşma ekranına geri getiren bildirim üretir.
  async publishOfferRejected(input: {
    carrierId: number;
    offerId: number;
    requestId: number;
    actorUserId?: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.carrierId,
      actorUserId: input.actorUserId,
      tip: "TEKLIF_REDDEDILDI",
      baslik: "Teklifin reddedildi",
      mesaj: `Istek #${input.requestId} icin teklifin reddedildi.`,
      hedefUrl: `/dashboard/konusmalar/teklif/${input.offerId}`,
      olayAnahtari: `TEKLIF_REDDEDILDI:${input.offerId}`,
    });
  }

  // Normal mesajlar gerçek zamanlı socket ile itilmez; bu bildirim kullanıcıyı thread'e
  // geri çağıran asenkron işaret görevini görür.
  async publishThreadMessage(input: {
    recipientUserId: number;
    messageId: number;
    offerId: number;
    requestId: number;
    actorUserId?: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.recipientUserId,
      actorUserId: input.actorUserId,
      tip: "MESAJ_GELDI",
      baslik: "Yeni mesaj geldi",
      mesaj: `Istek #${input.requestId} icin yeni bir mesaj aldin.`,
      hedefUrl: `/dashboard/konusmalar/teklif/${input.offerId}`,
      olayAnahtari: `MESAJ_GELDI:${input.messageId}`,
    });
  }

  // Counter offer için ayrı bildirim tipi kullanılır; böylece kullanıcı yeni mesaj ile
  // fiyat revizyonunu bildirim düzeyinde de ayırt edebilir.
  async publishCounterOffer(input: {
    recipientUserId: number;
    messageId: number;
    offerId: number;
    requestId: number;
    fiyat: number;
    actorUserId?: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.recipientUserId,
      actorUserId: input.actorUserId,
      tip: "KARSI_TEKLIF_GELDI",
      baslik: "Karsi teklif geldi",
      mesaj: `Istek #${input.requestId} icin yeni fiyat: ${input.fiyat.toFixed(2)} TL.`,
      hedefUrl: `/dashboard/konusmalar/teklif/${input.offerId}`,
      olayAnahtari: `KARSI_TEKLIF_GELDI:${input.messageId}`,
    });
  }

  async publishJobStarted(input: {
    customerId: number;
    jobId: number;
    requestId: number;
    actorUserId?: number;
    route: RouteContext;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.customerId,
      actorUserId: input.actorUserId,
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
    actorUserId?: number;
    route: RouteContext;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.customerId,
      actorUserId: input.actorUserId,
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
    actorUserId?: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.ratedUserId,
      actorUserId: input.actorUserId,
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
    actorUserId?: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.userId,
      actorUserId: input.actorUserId,
      tip: "RATING_BEKLIYOR",
      baslik: "Musteriyi puanlaman bekleniyor",
      mesaj: `Tamamlanan nakliye #${input.jobId} icin musteri deneyimini degerlendirebilirsin.`,
      hedefUrl: `/dashboard/nakliyelerim/${input.jobId}`,
      olayAnahtari: `RATING_BEKLIYOR:${input.jobId}:${input.userId}`,
    });
  }

  // Tüm notification tipleri aynı repository kapısından yazılır. Hata durumunda iş
  // akışını patlatmak yerine log atıp ana işlemi ayakta tutar.
  private async publish(input: {
    kullaniciId: number;
    actorUserId?: number;
    tip: string;
    baslik: string;
    mesaj: string;
    hedefUrl: string | null;
    olayAnahtari: string;
  }): Promise<void> {
    if (
      typeof input.actorUserId === "number" &&
      input.actorUserId === input.kullaniciId
    ) {
      return;
    }

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

  // Teklif ve nakliye bildirimlerinde rota bilgisini kısa bir başlık metnine indirger.
  private formatRoute(route: RouteContext): string {
    return `${route.baslangicSehri} -> ${route.varisSehri}`;
  }
}
