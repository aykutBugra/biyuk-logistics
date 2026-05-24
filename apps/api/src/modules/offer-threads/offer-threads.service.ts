import { Inject, Injectable } from "@nestjs/common";
import { AppErrorCode, AppErrors } from "../../common/errors";
import { Prisma } from "@prisma/client";
import { ROLE_NAMES } from "../../common/constants/role-names";
import type { PublicEntityId } from "../../common/public-ids/public-entity-id";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { formatDateOnlyFromDate } from "../../common/utils/date-only";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import {
  MAX_THREAD_IMAGE_COUNT,
  OfferThreadMediaService,
} from "./offer-thread-media.service";
import type { NotificationPublisherPort } from "../notifications/notification-publisher.port";
import { NOTIFICATION_PUBLISHER } from "../notifications/notification-publisher.token";
import { CreateCounterOfferDto } from "./dto/create-counter-offer.dto";
import { CreateOfferThreadImageMessageDto } from "./dto/create-offer-thread-image-message.dto";
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
  type OfferThreadIdentityRecord,
  type OfferThreadMessageRecord,
  type OfferThreadParticipantSide,
  type OfferThreadShipmentRecord,
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

const AGREED_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "ANLASILDI",
} as const;

const ACCEPTED_OFFER_STATUS = {
  durumTuru: "TEKLIF",
  durumAdi: "KABUL_EDILDI",
} as const;

const STARTED_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "BASLATILDI",
} as const;

const PENDING_DELIVERY_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "TESLIM_BEKLIYOR",
} as const;

const COMPLETED_JOB_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "TAMAMLANDI",
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
    @Inject(NOTIFICATION_PUBLISHER)
    private readonly notificationsPublisher: NotificationPublisherPort,
    private readonly prisma: PrismaService,
    private readonly offerThreadMediaService: OfferThreadMediaService
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

      return right.id.localeCompare(left.id);
    });

    return responses;
  }

  // Tek bir offer thread'ini detaylı olarak döndürür. Bu akış polling/fetch tabanlı
  // çalışır; ekran açıldığında tüm message stream yeniden okunur.
  async getByOfferId(
    currentUser: AuthenticatedUser,
    offerId: PublicEntityId
  ): Promise<OfferThreadDetailResponseDto> {
    const record = await this.offerThreadsRepository.findThreadDetailByOfferIdForUser(
      offerId,
      currentUser.id
    );

    if (!record) {
      throw AppErrors.notFound(AppErrorCode.THREAD_NOT_FOUND, "Konusma bulunamadi.");
    }

    this.assertDistinctParticipants(record);

    return this.toThreadDetailResponse(record, currentUser.id);
  }

  // Serbest metin mesajı yalnızca thread halen yazılabilir durumdaysa üretir ve
  // karşı tarafa notification yollar.
  async createTextMessage(
    currentUser: AuthenticatedUser,
    offerId: PublicEntityId,
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
      messageId: message.publicId,
      offerId: context.offerPublicId,
      requestId: context.requestPublicId,
      actorUserId: currentUser.id,
    });

    return this.toMessageResponse(message, currentUser.id);
  }

  // Counter offer, hem message stream'e fiyat adımı ekler hem de teklifin güncel
  // özet fiyatını değiştirir. İlk teklif fiyatı ise stream'deki OFFER_CREATED event'inde korunur.
  async createImageMessage(
    currentUser: AuthenticatedUser,
    offerId: PublicEntityId,
    input: CreateOfferThreadImageMessageDto,
    files: Express.Multer.File[] | undefined
  ): Promise<OfferThreadMessageResponseDto> {
    const uploadedFiles = files ?? [];
    const text = input.mesaj?.trim() ?? null;

    if (uploadedFiles.length === 0 && !text) {
      throw AppErrors.badRequest(
        AppErrorCode.THREAD_MESSAGE_REQUIRED,
        "Mesaj veya en az bir gorsel gondermelisin."
      );
    }

    if (uploadedFiles.length > MAX_THREAD_IMAGE_COUNT) {
      throw AppErrors.badRequest(
        AppErrorCode.THREAD_VALIDATION,
        `Bir mesajda en fazla ${MAX_THREAD_IMAGE_COUNT} gorsel gonderilebilir.`
      );
    }

    const writableContext = await this.requireWritableContext(
      currentUser.id,
      offerId
    );

    let persistedStorageKeys: string[] = [];

    try {
      const prepared = await this.offerThreadMediaService.prepareImageAttachments(
        uploadedFiles,
        writableContext.offerPublicId
      );
      persistedStorageKeys = prepared.persistedStorageKeys;

      const { context, message, recipientUserId } =
        await this.writeMessageInTransaction(currentUser.id, offerId, async (tx, writable) => {
          const senderSide = this.resolveParticipantSide(currentUser.id, writable);
          const message = await this.offerThreadsRepository.createImageMessage(
            {
              threadId: writable.threadId,
              senderUserId: currentUser.id,
              senderSide,
              text,
              attachments: prepared.attachments,
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
        messageId: message.publicId,
        offerId: context.offerPublicId,
        requestId: context.requestPublicId,
        actorUserId: currentUser.id,
      });

      return this.toMessageResponse(message, currentUser.id);
    } catch (error) {
      await this.offerThreadMediaService.rollbackStorageKeys(persistedStorageKeys);
      throw error;
    }
  }

  async createCounterOffer(
    currentUser: AuthenticatedUser,
    offerId: PublicEntityId,
    input: CreateCounterOfferDto
  ): Promise<OfferThreadMessageResponseDto> {
    const { context, message, recipientUserId } =
      await this.writeMessageInTransaction(
        currentUser.id,
        offerId,
        async (tx, writable) => {
          const senderSide = this.resolveParticipantSide(currentUser.id, writable);
          const message = await this.offerThreadsRepository.createCounterOfferMessage(
            {
              threadId: writable.threadId,
              offerId: writable.offerId,
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
        },
        "negotiation"
      );

    await this.notificationsPublisher.publishCounterOffer({
      recipientUserId,
      messageId: message.publicId,
      offerId: context.offerPublicId,
      requestId: context.requestPublicId,
      fiyat: input.fiyat,
      actorUserId: currentUser.id,
    });

    return this.toMessageResponse(message, currentUser.id);
  }

  // Thread açıldığında son mesaja kadar okundu pointer'ını ilerletir. Gerçek zamanlı
  // read receipt yerine sade bir last-read modeli kullanılır.
  async markRead(
    currentUser: AuthenticatedUser,
    offerId: PublicEntityId
  ): Promise<MarkOfferThreadReadResponseDto> {
    const record = await this.offerThreadsRepository.findThreadDetailByOfferIdForUser(
      offerId,
      currentUser.id
    );

    if (!record) {
      throw AppErrors.notFound(AppErrorCode.THREAD_NOT_FOUND, "Konusma bulunamadi.");
    }

    this.assertDistinctParticipants(record);

    const participantSide = this.resolveParticipantSide(currentUser.id, record);
    const lastMessageId = record.messages.length
      ? record.messages[record.messages.length - 1].id
      : null;
    const lastMessagePublicId = record.messages.length
      ? record.messages[record.messages.length - 1].publicId
      : null;

    await this.offerThreadsRepository.markThreadAsRead(
      record.id,
      participantSide,
      lastMessageId
    );

    return {
      lastReadMessageId: lastMessagePublicId,
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
      throw AppErrors.conflict(
        AppErrorCode.THREAD_CONFLICT,
        "Offer thread creation is blocked because the customer and carrier resolve to the same user."
      );
    }

    await this.offerThreadsRepository.createThreadWithInitialOfferEvent(
      input,
      executor
    );
  }

  // Teklif kabul edildiğinde kazanan thread'e kabul system event'i yazar ama
  // nakliye tamamlanana kadar konusmayi acik tutar.
  async appendAcceptedOfferThread(
    offerId: number,
    actorUserId: number,
    executor?: Prisma.TransactionClient
  ): Promise<void> {
    const identity = await this.requireThreadIdentity(offerId, executor);

    await this.offerThreadsRepository.appendSystemEvent(
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
  async appendShipmentSystemEventByRequestId(
    requestId: number,
    actorUserId: number,
    systemEventCode: string,
    executor?: Prisma.TransactionClient
  ): Promise<void> {
    if (systemEventCode === "DELIVERY_CONFIRMED") {
      throw AppErrors.internal(
        AppErrorCode.THREAD_INTERNAL,
        "Delivery confirmation must close the winning thread via appendDeliveryConfirmedAndCloseByRequestId."
      );
    }

    const identity = await this.requireAcceptedThreadIdentityByRequestId(
      requestId,
      executor
    );

    await this.offerThreadsRepository.appendSystemEvent(
      {
        threadId: identity.threadId,
        customerId: identity.customerId,
        carrierId: identity.carrierId,
        actorUserId,
        systemEventCode,
      },
      executor
    );
  }

  async appendDeliveryConfirmedAndCloseByRequestId(
    requestId: number,
    actorUserId: number,
    executor?: Prisma.TransactionClient
  ): Promise<void> {
    const identity = await this.requireAcceptedThreadIdentityByRequestId(
      requestId,
      executor
    );

    await this.offerThreadsRepository.appendSystemEventAndClose(
      {
        threadId: identity.threadId,
        customerId: identity.customerId,
        carrierId: identity.carrierId,
        actorUserId,
        systemEventCode: "DELIVERY_CONFIRMED",
      },
      executor
    );
  }

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
      id: record.publicId,
      offerId: record.offerPublicId,
      requestId: record.requestPublicId,
      participantSide,
      baslangicSehri: record.baslangicSehri,
      varisSehri: record.varisSehri,
      baslangicKonumMetni: record.baslangicKonumMetni,
      varisKonumMetni: record.varisKonumMetni,
      karsiTarafId:
        participantSide === "customer"
          ? record.carrierPublicId
          : record.customerPublicId,
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
      planlananAlimTarihi: formatDateOnlyFromDate(record.planlananAlimTarihi),
      tahminiTeslimTarihi: formatDateOnlyFromDate(record.tahminiTeslimTarihi),
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
    const canSendMessage = this.isMessageWritable(record);
    const canNegotiate = this.isNegotiationWritable(record);
    const isCustomer = participantSide === "customer";
    const lastPriceActorSide = this.resolveLastPriceActorSide(record);
    const canDecide = canNegotiate && participantSide !== lastPriceActorSide;

    return {
      id: record.publicId,
      offerId: record.offerPublicId,
      requestId: record.requestPublicId,
      participantSide,
      baslangicSehri: record.baslangicSehri,
      varisSehri: record.varisSehri,
      baslangicKonumMetni: record.baslangicKonumMetni,
      varisKonumMetni: record.varisKonumMetni,
      karsiTarafId: isCustomer ? record.carrierPublicId : record.customerPublicId,
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
      planlananAlimTarihi: formatDateOnlyFromDate(record.planlananAlimTarihi),
      tahminiTeslimTarihi: formatDateOnlyFromDate(record.tahminiTeslimTarihi),
      durum: record.durum,
      isClosed: record.closedAt !== null,
      closedAt: record.closedAt,
      hasUnread: unreadCount > 0,
      unreadCount,
      canSendMessage,
      canSendCounterOffer: canNegotiate,
      canAcceptOffer: canDecide,
      canRejectOffer: canDecide,
      canMarkDelivered:
        participantSide === "carrier" &&
        this.isShipmentInStatus(record.shipment, STARTED_JOB_STATUS),
      canConfirmDelivery:
        participantSide === "customer" &&
        this.isShipmentInStatus(record.shipment, PENDING_DELIVERY_JOB_STATUS),
      lastPriceActorSide,
      shipment: record.shipment
        ? this.toShipmentResponse(record.shipment)
        : null,
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
      id: message.publicId,
      type: message.type,
      text: message.text,
      teklifFiyati: message.teklifFiyati,
      systemEventCode: message.systemEventCode,
      createdAt: message.createdAt,
      senderUserId: message.senderUserPublicId,
      senderName: message.senderName,
      senderUsername: message.senderUsername,
      senderProfileImageUrl: this.toOptionalPublicUrl(
        message.senderProfileImageStorageKey
      ),
      isMine: message.senderUserId === currentUserId,
      attachments: message.attachments.map((attachment) => ({
        id: attachment.publicId,
        url: this.offerThreadMediaService.toPublicUrl(attachment.storageKey),
        thumbnailUrl: this.offerThreadMediaService.toPublicUrl(attachment.thumbnailStorageKey),
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        width: attachment.width,
        height: attachment.height,
        originalFileName: attachment.originalFileName,
        createdAt: attachment.createdAt,
      })),
    };
  }

  // Thread listesinde uzun message gövdesi yerine kısa bir satır göstermek için
  // message tipine göre özet metin üretir.
  private toOptionalPublicUrl(storageKey: string | null): string | undefined {
    return this.offerThreadMediaService.toOptionalPublicUrl(storageKey);
  }

  private toLastMessageSummary(message: OfferThreadMessageRecord | null): string | null {
    if (!message) {
      return null;
    }

    switch (message.type) {
      case "TEXT":
        return message.text ?? (message.attachments.length > 0 ? "Fotograf gonderildi." : null);
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
      case "SHIPMENT_STARTED":
        return "Nakliye basladi.";
      case "DELIVERY_PENDING_CONFIRMATION":
        return "Nakliyeci teslimati bildirdi. Musteri onayi bekleniyor.";
      case "DELIVERY_CONFIRMED":
        return "Teslimat musteri tarafindan onaylandi.";
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
    offerId: PublicEntityId,
    mode: "message" | "negotiation" = "message",
    executor?: Prisma.TransactionClient
  ): Promise<OfferThreadWritableContextRecord> {
    const context =
      await this.offerThreadsRepository.findWritableThreadContextByOfferIdForUser(
        offerId,
        userId,
        executor
      );

    if (!context) {
      throw AppErrors.notFound(AppErrorCode.THREAD_NOT_FOUND, "Konusma bulunamadi.");
    }

    this.assertDistinctParticipants(context);

    const isWritable =
      mode === "negotiation"
        ? this.isNegotiationWritable(context)
        : this.isMessageWritable(context);

    if (!isWritable) {
      throw AppErrors.conflict(AppErrorCode.THREAD_CLOSED, "Bu konusma yazmaya kapali.");
    }

    return context;
  }

  private async writeMessageInTransaction(
    currentUserId: number,
    offerId: PublicEntityId,
    write: (
      tx: Prisma.TransactionClient,
      context: OfferThreadWritableContextRecord
    ) => Promise<{
      message: OfferThreadMessageRecord;
      senderSide: OfferThreadParticipantSide;
    }>,
    mode: "message" | "negotiation" = "message"
  ): Promise<{
    context: OfferThreadWritableContextRecord;
    message: OfferThreadMessageRecord;
    recipientUserId: number;
  }> {
    return this.prisma.client.$transaction(
      async (tx) => {
        const context = await this.requireWritableContext(
          currentUserId,
          offerId,
          mode,
          tx
        );
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
      throw AppErrors.notFound(AppErrorCode.THREAD_NOT_FOUND, "Konusma bulunamadi.");
    }

    this.assertDistinctParticipants(identity);

    return identity;
  }

  // Kullanıcının thread içindeki tarafını çözer. Bu bilgi unread pointer, notification
  // hedefi ve yazma yetkisi hesaplarında kullanılır.
  private async requireAcceptedThreadIdentityByRequestId(
    requestId: number,
    executor?: Prisma.TransactionClient
  ): Promise<OfferThreadIdentityRecord> {
    const identity =
      await this.offerThreadsRepository.findAcceptedThreadIdentityByRequestId(
        requestId,
        executor
      );

    if (!identity) {
      throw AppErrors.notFound(AppErrorCode.THREAD_NOT_FOUND, "Konusma bulunamadi.");
    }

    this.assertDistinctParticipants(identity);

    return identity;
  }

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

    throw AppErrors.notFound(AppErrorCode.THREAD_NOT_FOUND, "Konusma bulunamadi.");
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
      throw AppErrors.forbidden(
        AppErrorCode.THREAD_FORBIDDEN,
        "Customer thread context is not available for the current user."
      );
    }

    if (
      requestedSide === "carrier" &&
      !currentUser.roles.includes(ROLE_NAMES.NAKLIYECI)
    ) {
      throw AppErrors.forbidden(
        AppErrorCode.THREAD_FORBIDDEN,
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

    throw AppErrors.conflict(
      AppErrorCode.THREAD_CONFLICT,
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
  private isNegotiationWritable(
    record: Pick<
      OfferThreadWritableContextRecord | OfferThreadDetailRecord,
      | "closedAt"
      | "requestDeletedAt"
      | "requestStatusTuru"
      | "requestStatusAdi"
      | "durumTuru"
      | "durumAdi"
      | "shipment"
    >
  ): boolean {
    return (
      record.closedAt === null &&
      record.requestDeletedAt === null &&
      record.shipment === null &&
      record.requestStatusTuru.trim().toUpperCase() ===
        OPEN_REQUEST_STATUS.durumTuru &&
      record.requestStatusAdi.trim().toUpperCase() ===
        OPEN_REQUEST_STATUS.durumAdi &&
      record.durumTuru.trim().toUpperCase() === OPEN_OFFER_STATUS.durumTuru &&
      record.durumAdi.trim().toUpperCase() === OPEN_OFFER_STATUS.durumAdi
    );
  }

  private isMessageWritable(
    record: Pick<
      OfferThreadWritableContextRecord | OfferThreadDetailRecord,
      | "closedAt"
      | "requestDeletedAt"
      | "requestStatusTuru"
      | "requestStatusAdi"
      | "durumTuru"
      | "durumAdi"
      | "shipment"
    >
  ): boolean {
    if (this.isNegotiationWritable(record)) {
      return true;
    }

    return (
      record.closedAt === null &&
      record.requestDeletedAt === null &&
      record.shipment !== null &&
      record.requestStatusTuru.trim().toUpperCase() ===
        AGREED_REQUEST_STATUS.durumTuru &&
      record.requestStatusAdi.trim().toUpperCase() ===
        AGREED_REQUEST_STATUS.durumAdi &&
      record.durumTuru.trim().toUpperCase() === ACCEPTED_OFFER_STATUS.durumTuru &&
      record.durumAdi.trim().toUpperCase() === ACCEPTED_OFFER_STATUS.durumAdi &&
      !this.isShipmentInStatus(record.shipment, COMPLETED_JOB_STATUS)
    );
  }

  private isShipmentInStatus(
    shipment: OfferThreadShipmentRecord | null,
    expected: { durumTuru: string; durumAdi: string }
  ): boolean {
    return (
      shipment !== null &&
      shipment.durumTuru.trim().toUpperCase() === expected.durumTuru &&
      shipment.durumAdi.trim().toUpperCase() === expected.durumAdi
    );
  }

  private toShipmentResponse(shipment: OfferThreadShipmentRecord) {
    return {
      id: shipment.publicId,
      durum: shipment.durumAdi,
      olusturmaTarihi: shipment.olusturmaTarihi,
      baslangicTarihi: shipment.baslangicTarihi,
      teslimBildirimTarihi: shipment.teslimBildirimTarihi,
      teslimTarihi: shipment.teslimTarihi,
      planlananAlimTarihi: formatDateOnlyFromDate(shipment.planlananAlimTarihi),
      tahminiTeslimTarihi: formatDateOnlyFromDate(shipment.tahminiTeslimTarihi),
    };
  }

}
