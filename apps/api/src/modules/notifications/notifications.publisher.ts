import { BildirimTipi } from "@prisma/client";
import { Injectable, Logger } from "@nestjs/common";
import type {
  NotificationPublisherPort,
  NotificationRouteContext,
} from "./notification-publisher.port";
import { NotificationsRepository } from "./repositories/notifications.repository";

//Publisher, is akisi servislerinin bildirim detaylarini bilmeden tek tip bildirim
//kaydi olusturmasini saglar.
@Injectable()
export class NotificationsPublisher implements NotificationPublisherPort {
  private readonly logger = new Logger(NotificationsPublisher.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository
  ) {}

  // Yeni offer geldiğinde müşteri tarafında request detayına dönen klasik teklif
  // bildirimi üretir.
  async publishIncomingOffer(input: {
    customerId: number;
    offerId: string;
    requestId: string;
    actorUserId?: number;
    route: NotificationRouteContext;
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
    offerId: string;
    requestId: string;
    jobId: string;
    actorUserId?: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.carrierId,
      actorUserId: input.actorUserId,
      tip: "TEKLIF_KABUL_EDILDI",
      baslik: "Teklifin kabul edildi",
      mesaj: "Teklifin kabul edildi ve nakliye kaydi olusturuldu.",
      hedefUrl: `/dashboard/nakliyelerim/${input.jobId}`,
      olayAnahtari: `TEKLIF_KABUL_EDILDI:${input.offerId}`,
    });
  }

  // Teklif reddedildiğinde veya request başka offer ile kapandığında taşıyıcıyı ilgili
  // konuşma ekranına geri getiren bildirim üretir.
  async publishOfferRejected(input: {
    carrierId: number;
    offerId: string;
    requestId: string;
    actorUserId?: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.carrierId,
      actorUserId: input.actorUserId,
      tip: "TEKLIF_REDDEDILDI",
      baslik: "Teklifin reddedildi",
      mesaj: "Teklifin reddedildi.",
      hedefUrl: `/dashboard/konusmalar/teklif/${input.offerId}`,
      olayAnahtari: `TEKLIF_REDDEDILDI:${input.offerId}`,
    });
  }

  // Normal mesajlar gerçek zamanlı socket ile itilmez; bu bildirim kullanıcıyı thread'e
  // geri çağıran asenkron işaret görevini görür.
  async publishThreadMessage(input: {
    recipientUserId: number;
    messageId: string;
    offerId: string;
    requestId: string;
    actorUserId?: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.recipientUserId,
      actorUserId: input.actorUserId,
      tip: "MESAJ_GELDI",
      baslik: "Yeni mesaj geldi",
      mesaj: "Yeni bir teklif mesaji aldin.",
      hedefUrl: `/dashboard/konusmalar/teklif/${input.offerId}`,
      olayAnahtari: `MESAJ_GELDI:${input.messageId}`,
    });
  }

  // Counter offer için ayrı bildirim tipi kullanılır; böylece kullanıcı yeni mesaj ile
  // fiyat revizyonunu bildirim düzeyinde de ayırt edebilir.
  async publishCounterOffer(input: {
    recipientUserId: number;
    messageId: string;
    offerId: string;
    requestId: string;
    fiyat: number;
    actorUserId?: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.recipientUserId,
      actorUserId: input.actorUserId,
      tip: "KARSI_TEKLIF_GELDI",
      baslik: "Karsi teklif geldi",
      mesaj: `Yeni fiyat: ${input.fiyat.toFixed(2)} TL.`,
      hedefUrl: `/dashboard/konusmalar/teklif/${input.offerId}`,
      olayAnahtari: `KARSI_TEKLIF_GELDI:${input.messageId}`,
    });
  }

  //Nakliye basladiginda musteriyi kendi istek detayina yonlendirir.
  async publishJobStarted(input: {
    customerId: number;
    jobId: string;
    requestId: string;
    actorUserId?: number;
    route: NotificationRouteContext;
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

  //Nakliye tamamlandiginda musteriyi bilgilendirir.
  async publishJobCompleted(input: {
    customerId: number;
    jobId: string;
    requestId: string;
    actorUserId?: number;
    route: NotificationRouteContext;
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

  async publishDeliveryConfirmationRequested(input: {
    customerId: number;
    jobId: string;
    requestId: string;
    actorUserId?: number;
    route: NotificationRouteContext;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.customerId,
      actorUserId: input.actorUserId,
      tip: "TESLIM_ONAYI_BEKLIYOR",
      baslik: "Teslimat onayi bekleniyor",
      mesaj: `${this.formatRoute(input.route)} icin nakliyeci teslimati bildirdi.`,
      hedefUrl: `/dashboard/isteklerim/${input.requestId}`,
      olayAnahtari: `TESLIM_ONAYI_BEKLIYOR:${input.jobId}`,
    });
  }

  async publishJobCompletedForCarrier(input: {
    carrierId: number;
    jobId: string;
    requestId: string;
    actorUserId?: number;
    route: NotificationRouteContext;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.carrierId,
      actorUserId: input.actorUserId,
      tip: "IS_TAMAMLANDI",
      baslik: "Teslimat onaylandi",
      mesaj: `${this.formatRoute(input.route)} icin teslimat musteri tarafindan onaylandi.`,
      hedefUrl: `/dashboard/nakliyelerim/${input.jobId}`,
      olayAnahtari: `IS_TAMAMLANDI_CARRIER:${input.jobId}`,
    });
  }

  //Kullanici puan aldiginda puanlarim ekranina yonlenen bildirim uretir.
  async publishRatingReceived(input: {
    ratedUserId: number;
    ratingId: string;
    jobId: string;
    puanDegeri: number;
    actorUserId?: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.ratedUserId,
      actorUserId: input.actorUserId,
      tip: "RATING_ALDIN",
      baslik: "Yeni puan aldin",
      mesaj: `${input.puanDegeri}/5 puan aldin.`,
      hedefUrl: "/dashboard/puanlarim",
      olayAnahtari: `RATING_ALDIN:${input.ratingId}`,
    });
  }

  //Nakliye tamamlaninca nakliyeciye musteri puanlamasi bekledigini hatirlatir.
  async publishRatingPending(input: {
    userId: number;
    jobId: string;
    actorUserId?: number;
  }): Promise<void> {
    await this.publish({
      kullaniciId: input.userId,
      actorUserId: input.actorUserId,
      tip: "RATING_BEKLIYOR",
      baslik: "Musteriyi puanlaman bekleniyor",
      mesaj: "Tamamlanan nakliye icin musteri deneyimini degerlendirebilirsin.",
      hedefUrl: `/dashboard/nakliyelerim/${input.jobId}`,
      olayAnahtari: `RATING_BEKLIYOR:${input.jobId}:${input.userId}`,
    });
  }

  // Tüm notification tipleri aynı repository kapısından yazılır. Hata durumunda iş
  // akışını patlatmak yerine log atıp ana işlemi ayakta tutar.
  private async publish(input: {
    kullaniciId: number;
    actorUserId?: number;
    tip: BildirimTipi;
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
  private formatRoute(route: NotificationRouteContext): string {
    return `${route.baslangicSehri} -> ${route.varisSehri}`;
  }
}
