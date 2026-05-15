import {
  ConflictException,
  Injectable,
  ForbiddenException,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ROLE_NAMES } from "../../common/constants/role-names";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { MediaStorageService } from "../../infrastructure/media/media-storage.service";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { NotificationsPublisher } from "../notifications/notifications.publisher";
import { CreateCounterOfferDto } from "./dto/create-counter-offer.dto";
import { CreateOfferThreadMessageDto } from "./dto/create-offer-thread-message.dto";
import { MarkOfferThreadReadResponseDto } from "./dto/mark-offer-thread-read-response.dto";
import {
  type OfferThreadContextSide,
  OfferThreadContextQueryDto,
} from "./dto/offer-thread-context-query.dto";
import { OfferThreadDetailResponseDto } from "./dto/offer-thread-detail-response.dto";
import { OfferThreadMessageResponseDto } from "./dto/offer-thread-message-response.dto";
import { OfferThreadSummaryResponseDto } from "./dto/offer-thread-summary-response.dto";
import {
  type CreateOfferThreadInput,
  type OfferThreadDetailRecord,
  type OfferThreadMessageRecord,
  type OfferThreadParticipantSide,
  type OfferThreadSummaryRecord,
  type OfferThreadWritableContextRecord,
  OfferThreadsRepository,
} from "./repositories/offer-threads.repository";

const OPEN_OFFER_STATUS = {
  durumTuru: "TEKLIF",
  durumAdi: "OLUSTURULDU",
} as const;

const OPEN_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "OLUSTURULDU",
} as const;

const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
});

@Injectable()
export class OfferThreadsService {
  constructor(
    private readonly offerThreadsRepository: OfferThreadsRepository,
    private readonly notificationsPublisher: NotificationsPublisher,
    private readonly prisma: PrismaService,
    @Optional() private readonly mediaStorageService?: MediaStorageService
  ) {}

  // Kullanıcının dahil olduğu thread özetlerini toplar. Liste response'u son mesaj,
  // okunmamış sayısı ve güncel fiyat gibi inbox ekranının ihtiyaç duyduğu veriyi üretir.
  async getMine(
    currentUser: AuthenticatedUser,
    query: OfferThreadContextQueryDto
  ): Promise<OfferThreadSummaryResponseDto[]> {
    const requestedSide = this.resolveRequestedSide(currentUser, query.as);
    const records = await this.offerThreadsRepository.findMyThreadSummaries(
      currentUser.id
    );
    const visibleRecords = records.filter((record) => {
      if (this.hasSameParticipants(record)) {
        return false;
      }

      if (!requestedSide) {
        return true;
      }

      return this.resolveParticipantSide(currentUser.id, record) === requestedSide;
    });

    const responses = await Promise.all(
      visibleRecords.map(async (record) =>
        this.toThreadSummaryResponse(record, currentUser.id)
      )
    );

    responses.sort((left, right) => {
      const leftTime = left.lastMessageAt
        ? new Date(left.lastMessageAt).getTime()
        : 0;
      const rightTime = right.lastMessageAt
        ? new Date(right.lastMessageAt).getTime()
        : 0;

      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      return right.offerId - left.offerId;
    });

    return responses;
  }

  // Tek bir offer thread'ini detaylı olarak döndürür. Bu akış polling/fetch tabanlı
  // çalışır; ekran açıldığında tüm message stream yeniden okunur.
  async getByOfferId(
    currentUser: AuthenticatedUser,
    offerId: number
  ): Promise<OfferThreadDetailResponseDto> {
    const record = await this.offerThreadsRepository.findThreadDetailByOfferIdForUser(
      offerId,
      currentUser.id
    );

    if (!record) {
      throw new NotFoundException("Konusma bulunamadi.");
    }

    this.assertDistinctParticipants(record);

    return this.toThreadDetailResponse(record, currentUser.id);
  }

  // Serbest metin mesajı yalnızca thread halen yazılabilir durumdaysa üretir ve
  // karşı tarafa notification yollar.
  async createTextMessage(
    currentUser: AuthenticatedUser,
    offerId: number,
    input: CreateOfferThreadMessageDto
  ): Promise<OfferThreadMessageResponseDto> {
    const { context, message, recipientUserId } =
      await this.writeMessageInTransaction(currentUser.id, offerId, async (tx, writable) => {
        const senderSide = this.resolveParticipantSide(currentUser.id, writable);
        const message = await this.offerThreadsRepository.createTextMessage(
          {
            threadId: writable.threadId,
            senderUserId: currentUser.id,
            senderSide,
            text: input.mesaj.trim(),
          },
          tx
        );

        return {
          message,
          senderSide,
        };
      });

    await this.notificationsPublisher.publishThreadMessage({
      recipientUserId,
      messageId: message.id,
      offerId,
      requestId: context.requestId,
      actorUserId: currentUser.id,
    });

    return this.toMessageResponse(message, currentUser.id);
  }

  // Counter offer, hem message stream'e fiyat adımı ekler hem de teklifin güncel
  // özet fiyatını değiştirir. İlk teklif fiyatı ise stream'deki OFFER_CREATED event'inde korunur.
  async createCounterOffer(
    currentUser: AuthenticatedUser,
    offerId: number,
    input: CreateCounterOfferDto
  ): Promise<OfferThreadMessageResponseDto> {
    const { context, message, recipientUserId } =
      await this.writeMessageInTransaction(currentUser.id, offerId, async (tx, writable) => {
        const senderSide = this.resolveParticipantSide(currentUser.id, writable);
        const message = await this.offerThreadsRepository.createCounterOfferMessage(
          {
            threadId: writable.threadId,
            offerId,
            senderUserId: currentUser.id,
            senderSide,
            fiyat: input.fiyat,
            text: input.mesaj?.trim() ?? null,
          },
          tx
        );

        return {
          message,
          senderSide,
        };
      });

    await this.notificationsPublisher.publishCounterOffer({
      recipientUserId,
      messageId: message.id,
      offerId,
      requestId: context.requestId,
      fiyat: input.fiyat,
      actorUserId: currentUser.id,
    });

    return this.toMessageResponse(message, currentUser.id);
  }

  // Thread açıldığında son mesaja kadar okundu pointer'ını ilerletir. Gerçek zamanlı
  // read receipt yerine sade bir last-read modeli kullanılır.
  async markRead(
    currentUser: AuthenticatedUser,
    offerId: number
  ): Promise<MarkOfferThreadReadResponseDto> {
    const record = await this.offerThreadsRepository.findThreadDetailByOfferIdForUser(
      offerId,
      currentUser.id
    );

    if (!record) {
      throw new NotFoundException("Konusma bulunamadi.");
    }

    this.assertDistinctParticipants(record);

    const participantSide = this.resolveParticipantSide(currentUser.id, record);
    const lastMessageId = record.messages.length
      ? record.messages[record.messages.length - 1].id
      : null;

    await this.offerThreadsRepository.markThreadAsRead(
      record.id,
      participantSide,
      lastMessageId
    );

    return {
      lastReadMessageId: lastMessageId,
      unreadCount: 0,
    };
  }

  // Yeni offer oluştuğunda konuşma thread'ini ve ilk sistem olayını hazırlar. Böylece
  // her teklifin daha en baştan tekil bir pazarlık kanalı olur.
  async bootstrapThreadForOffer(
    input: CreateOfferThreadInput,
    executor?: Prisma.TransactionClient
  ): Promise<void> {
    if (input.customerId === input.carrierId) {
      throw new ConflictException(
        "Offer thread creation is blocked because the customer and carrier resolve to the same user."
      );
    }

    await this.offerThreadsRepository.createThreadWithInitialOfferEvent(
      input,
      executor
    );
  }

  // Teklif kabul edildiğinde kazanan thread'e kabul system event'i yazar ve thread'i
  // read-only kapatır.
  async closeAcceptedOfferThread(
    offerId: number,
    actorUserId: number,
    executor?: Prisma.TransactionClient
  ): Promise<void> {
    const identity = await this.requireThreadIdentity(offerId, executor);

    await this.offerThreadsRepository.appendSystemEventAndClose(
      {
        threadId: identity.threadId,
        customerId: identity.customerId,
        carrierId: identity.carrierId,
        actorUserId,
        systemEventCode: "OFFER_ACCEPTED",
      },
      executor
    );
  }

  // Teklif müşteri tarafından açıkça reddedildiğinde ilgili thread'e red event'i yazar
  // ve konuşmayı kapatır.
  async closeRejectedOfferThread(
    offerId: number,
    actorUserId: number,
    executor?: Prisma.TransactionClient
  ): Promise<void> {
    const identity = await this.requireThreadIdentity(offerId, executor);

    await this.offerThreadsRepository.appendSystemEventAndClose(
      {
        threadId: identity.threadId,
        customerId: identity.customerId,
        carrierId: identity.carrierId,
        actorUserId,
        systemEventCode: "OFFER_REJECTED",
      },
      executor
    );
  }

  // Aynı request altında başka bir offer kabul edilirse rakip açık thread'lerin hepsini
  // request artık müsait değil mantığıyla kapatır.
  async closeRequestUnavailableThreads(
    offerIds: number[],
    actorUserId: number,
    executor?: Prisma.TransactionClient
  ): Promise<void> {
    for (const offerId of offerIds) {
      const identity = await this.requireThreadIdentity(offerId, executor);

      await this.offerThreadsRepository.appendSystemEventAndClose(
        {
          threadId: identity.threadId,
          customerId: identity.customerId,
          carrierId: identity.carrierId,
          actorUserId,
          systemEventCode: "THREAD_CLOSED_REQUEST_UNAVAILABLE",
        },
        executor
      );
    }
  }

  // Thread listesinde görünen satırı oluşturur; karşı taraf bilgisi, unread durumu ve
  // son mesaj özeti burada hesaplanır.
  private async toThreadSummaryResponse(
    record: OfferThreadSummaryRecord,
    currentUserId: number
  ): Promise<OfferThreadSummaryResponseDto> {
    const participantSide = this.resolveParticipantSide(currentUserId, record);
    const unreadCount = await this.offerThreadsRepository.countUnreadMessages(
      record.id,
      currentUserId,
      participantSide === "customer"
        ? record.customerLastReadMessageId
        : record.carrierLastReadMessageId
    );

    return {
      id: record.id,
      offerId: record.offerId,
      requestId: record.requestId,
      participantSide,
      baslangicSehri: record.baslangicSehri,
      varisSehri: record.varisSehri,
      baslangicKonumMetni: record.baslangicKonumMetni,
      varisKonumMetni: record.varisKonumMetni,
      karsiTarafId:
        participantSide === "customer" ? record.carrierId : record.customerId,
      karsiTarafAdSoyad:
        participantSide === "customer"
          ? record.carrierName
          : record.customerName,
      karsiTarafKullaniciAdi:
        participantSide === "customer"
          ? record.carrierUsername
          : record.customerUsername,
      karsiTarafProfileImageUrl: this.toOptionalPublicUrl(
        participantSide === "customer"
          ? record.carrierProfileImageStorageKey
          : record.customerProfileImageStorageKey
      ),
      fiyat: record.fiyat,
      durum: record.durum,
      isClosed: record.closedAt !== null,
      closedAt: record.closedAt,
      hasUnread: unreadCount > 0,
      unreadCount,
      lastMessageSummary: this.toLastMessageSummary(record.lastMessage),
      lastMessageAt: record.lastMessage?.createdAt ?? null,
    };
  }

  // Thread detay response'u, UI'ın yazma yetkisi ve kabul/red butonlarını tek payload
  // üzerinden açabilmesi için gerekli capability alanlarını da üretir.
  private async toThreadDetailResponse(
    record: OfferThreadDetailRecord,
    currentUserId: number
  ): Promise<OfferThreadDetailResponseDto> {
    const participantSide = this.resolveParticipantSide(currentUserId, record);
    const unreadCount = await this.offerThreadsRepository.countUnreadMessages(
      record.id,
      currentUserId,
      participantSide === "customer"
        ? record.customerLastReadMessageId
        : record.carrierLastReadMessageId
    );
    const isWritable = this.isThreadWritable(record);
    const isCustomer = participantSide === "customer";
    const lastPriceActorSide = this.resolveLastPriceActorSide(record);
    const canDecide = isWritable && participantSide !== lastPriceActorSide;

    return {
      id: record.id,
      offerId: record.offerId,
      requestId: record.requestId,
      participantSide,
      baslangicSehri: record.baslangicSehri,
      varisSehri: record.varisSehri,
      baslangicKonumMetni: record.baslangicKonumMetni,
      varisKonumMetni: record.varisKonumMetni,
      karsiTarafId: isCustomer ? record.carrierId : record.customerId,
      karsiTarafAdSoyad: isCustomer ? record.carrierName : record.customerName,
      karsiTarafKullaniciAdi: isCustomer
        ? record.carrierUsername
        : record.customerUsername,
      karsiTarafProfileImageUrl: this.toOptionalPublicUrl(
        isCustomer
          ? record.carrierProfileImageStorageKey
          : record.customerProfileImageStorageKey
      ),
      fiyat: record.fiyat,
      durum: record.durum,
      isClosed: record.closedAt !== null,
      closedAt: record.closedAt,
      hasUnread: unreadCount > 0,
      unreadCount,
      canSendMessage: isWritable,
      canSendCounterOffer: isWritable,
      canAcceptOffer: canDecide,
      canRejectOffer: canDecide,
      lastPriceActorSide,
      messages: record.messages.map((message) =>
        this.toMessageResponse(message, currentUserId)
      ),
    };
  }

  // Veri tabanındaki mesaj kaydını frontend'in tek bir stream içinde render edeceği
  // normalize response formatına çevirir.
  private toMessageResponse(
    message: OfferThreadMessageRecord,
    currentUserId: number
  ): OfferThreadMessageResponseDto {
    return {
      id: message.id,
      type: message.type,
      text: message.text,
      teklifFiyati: message.teklifFiyati,
      systemEventCode: message.systemEventCode,
      createdAt: message.createdAt,
      senderUserId: message.senderUserId,
      senderName: message.senderName,
      senderUsername: message.senderUsername,
      senderProfileImageUrl: this.toOptionalPublicUrl(
        message.senderProfileImageStorageKey
      ),
      isMine: message.senderUserId === currentUserId,
    };
  }

  // Thread listesinde uzun message gövdesi yerine kısa bir satır göstermek için
  // message tipine göre özet metin üretir.
  private toOptionalPublicUrl(storageKey: string | null): string | undefined {
    return storageKey && this.mediaStorageService
      ? this.mediaStorageService.toPublicUrl(storageKey)
      : undefined;
  }

  private toLastMessageSummary(message: OfferThreadMessageRecord | null): string | null {
    if (!message) {
      return null;
    }

    switch (message.type) {
      case "TEXT":
        return message.text;
      case "COUNTER_OFFER":
        return `Karsi teklif: ${currencyFormatter.format(
          message.teklifFiyati ?? 0
        )}`;
      case "SYSTEM_EVENT":
        return this.getSystemEventCopy(message.systemEventCode, message.teklifFiyati);
      default:
        return message.text ?? null;
    }
  }

  // System event kodlarını kullanıcıya okunabilir sabit metne dönüştürür. Özellikle
  // ilk teklif, kabul/red ve request kapandı olayları burada görünür hale gelir.
  private getSystemEventCopy(
    systemEventCode: string | null,
    teklifFiyati: number | null
  ): string {
    switch (systemEventCode) {
      case "OFFER_CREATED":
        return `Teklif olusturuldu: ${currencyFormatter.format(
          teklifFiyati ?? 0
        )}`;
      case "OFFER_ACCEPTED":
        return "Teklif kabul edildi.";
      case "OFFER_REJECTED":
        return "Teklif reddedildi.";
      case "THREAD_CLOSED_REQUEST_UNAVAILABLE":
        return "Bu istek baska bir teklifle anlasildigi icin konusma kapatildi.";
      default:
        return "Sistem olayi";
    }
  }

  // Yazma aksiyonlarından önce thread'in hem kullanıcıya ait hem de halen açık
  // pazarlık durumunda olduğunu doğrular.
  private async requireWritableContext(
    userId: number,
    offerId: number,
    executor?: Prisma.TransactionClient
  ): Promise<OfferThreadWritableContextRecord> {
    const context =
      await this.offerThreadsRepository.findWritableThreadContextByOfferIdForUser(
        offerId,
        userId,
        executor
      );

    if (!context) {
      throw new NotFoundException("Konusma bulunamadi.");
    }

    this.assertDistinctParticipants(context);

    if (!this.isThreadWritable(context)) {
      throw new ConflictException("Bu konusma yazmaya kapali.");
    }

    return context;
  }

  private async writeMessageInTransaction(
    currentUserId: number,
    offerId: number,
    write: (
      tx: Prisma.TransactionClient,
      context: OfferThreadWritableContextRecord
    ) => Promise<{
      message: OfferThreadMessageRecord;
      senderSide: OfferThreadParticipantSide;
    }>
  ): Promise<{
    context: OfferThreadWritableContextRecord;
    message: OfferThreadMessageRecord;
    recipientUserId: number;
  }> {
    return this.prisma.client.$transaction(
      async (tx) => {
        const context = await this.requireWritableContext(currentUserId, offerId, tx);
        const { message, senderSide } = await write(tx, context);

        return {
          context,
          message,
          recipientUserId:
            senderSide === "customer" ? context.carrierId : context.customerId,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  }

  // Offer'tan thread kimliğine ulaşmak için kullanılır; kabul/red gibi lifecycle
  // aksiyonları thread kapanış olayına bağlamak için gerekir.
  private async requireThreadIdentity(
    offerId: number,
    executor?: Prisma.TransactionClient
  ) {
    const identity = await this.offerThreadsRepository.findThreadIdentityByOfferId(
      offerId,
      executor
    );

    if (!identity) {
      throw new NotFoundException("Konusma bulunamadi.");
    }

    this.assertDistinctParticipants(identity);

    return identity;
  }

  // Kullanıcının thread içindeki tarafını çözer. Bu bilgi unread pointer, notification
  // hedefi ve yazma yetkisi hesaplarında kullanılır.
  private resolveParticipantSide(
    userId: number,
    record:
      | OfferThreadSummaryRecord
      | OfferThreadDetailRecord
      | OfferThreadWritableContextRecord
  ): OfferThreadParticipantSide {
    if (record.customerId === userId) {
      return "customer";
    }

    if (record.carrierId === userId) {
      return "carrier";
    }

    throw new NotFoundException("Konusma bulunamadi.");
  }

  private resolveRequestedSide(
    currentUser: AuthenticatedUser,
    requestedSide?: OfferThreadContextSide
  ): OfferThreadContextSide | null {
    if (!requestedSide) {
      return null;
    }

    if (
      requestedSide === "customer" &&
      !currentUser.roles.includes(ROLE_NAMES.MUSTERI)
    ) {
      throw new ForbiddenException(
        "Customer thread context is not available for the current user."
      );
    }

    if (
      requestedSide === "carrier" &&
      !currentUser.roles.includes(ROLE_NAMES.NAKLIYECI)
    ) {
      throw new ForbiddenException(
        "Carrier thread context is not available for the current user."
      );
    }

    return requestedSide;
  }

  private hasSameParticipants(
    record: Pick<
      | OfferThreadSummaryRecord
      | OfferThreadDetailRecord
      | OfferThreadWritableContextRecord
      | { customerId: number; carrierId: number },
      "customerId" | "carrierId"
    >
  ): boolean {
    return record.customerId === record.carrierId;
  }

  private assertDistinctParticipants(
    record: Pick<
      | OfferThreadSummaryRecord
      | OfferThreadDetailRecord
      | OfferThreadWritableContextRecord
      | { customerId: number; carrierId: number },
      "customerId" | "carrierId"
    >
  ) {
    if (!this.hasSameParticipants(record)) {
      return;
    }

    throw new ConflictException(
      "Offer thread actions are blocked because the customer and carrier resolve to the same user."
    );
  }

  // Kabul/red yetkisi kontrolü için offers servisi tarafından çağrılır; son fiyat adımını
  // kimin attığını thread mesajlarından sorgular.
  async getLastPriceActorSide(
    offerId: number,
    executor?: Prisma.TransactionClient
  ): Promise<OfferThreadParticipantSide> {
    return this.offerThreadsRepository.findLastPriceActorSide(offerId, executor);
  }

  // Son fiyat adımını hangi tarafın attığını message stream'den hesaplar. Counter offer
  // yoksa initial offer nakliyeciden gelmiştir; varsa son COUNTER_OFFER göndericisinin tarafı döner.
  private resolveLastPriceActorSide(
    record: OfferThreadDetailRecord
  ): OfferThreadParticipantSide {
    const lastCounterOffer = [...record.messages]
      .reverse()
      .find((msg) => msg.type === "COUNTER_OFFER");

    if (!lastCounterOffer || lastCounterOffer.senderUserId === null) {
      return "carrier";
    }

    return lastCounterOffer.senderUserId === record.customerId
      ? "customer"
      : "carrier";
  }

  // Thread'in yazmaya açık olup olmadığını offer durumu, request durumu, shipment
  // varlığı ve kapatılma tarihi üzerinden tek yerde belirler.
  private isThreadWritable(
    record: Pick<
      OfferThreadWritableContextRecord | OfferThreadDetailRecord,
      | "closedAt"
      | "requestDeletedAt"
      | "requestStatusTuru"
      | "requestStatusAdi"
      | "durumTuru"
      | "durumAdi"
      | "hasShipment"
    >
  ): boolean {
    return (
      record.closedAt === null &&
      record.requestDeletedAt === null &&
      record.hasShipment === false &&
      record.requestStatusTuru.trim().toUpperCase() ===
        OPEN_REQUEST_STATUS.durumTuru &&
      record.requestStatusAdi.trim().toUpperCase() ===
        OPEN_REQUEST_STATUS.durumAdi &&
      record.durumTuru.trim().toUpperCase() === OPEN_OFFER_STATUS.durumTuru &&
      record.durumAdi.trim().toUpperCase() === OPEN_OFFER_STATUS.durumAdi
    );
  }
}
