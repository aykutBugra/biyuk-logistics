import { Prisma, PrismaClient } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import {
  type PublicEntityId,
  publicEntityWhere,
} from "../../../common/public-ids/public-entity-id";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

type PrismaExecutor = Prisma.TransactionClient | PrismaClient;
type EntityIdSelector = PublicEntityId | number;

export type OfferThreadParticipantSide = "customer" | "carrier";

const offerThreadMessageAttachmentSelect = {
  id: true,
  publicId: true,
  storageKey: true,
  thumbnailStorageKey: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  sortOrder: true,
  originalFileName: true,
  createdAt: true,
} satisfies Prisma.OfferThreadMessageAttachmentSelect;

const offerThreadMessageSelect = {
  id: true,
  publicId: true,
  type: true,
  text: true,
  teklifFiyati: true,
  systemEventCode: true,
  createdAt: true,
  senderUserId: true,
  sender: {
    select: {
      publicId: true,
      ad: true,
      soyad: true,
      kullaniciAdi: true,
      profilFotografiStorageKey: true,
    },
  },
  attachments: {
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: offerThreadMessageAttachmentSelect,
  },
} satisfies Prisma.OfferThreadMessageSelect;

type OfferThreadMessageQuery = Prisma.OfferThreadMessageGetPayload<{
  select: typeof offerThreadMessageSelect;
}>;

export type OfferThreadMessageAttachmentRecord = {
  id: number;
  publicId: string;
  storageKey: string;
  thumbnailStorageKey: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  sortOrder: number;
  originalFileName: string;
  createdAt: Date;
};

export type OfferThreadMessageRecord = {
  id: number;
  publicId: string;
  type: string;
  text: string | null;
  teklifFiyati: number | null;
  systemEventCode: string | null;
  createdAt: Date;
  senderUserId: number | null;
  senderUserPublicId: string | null;
  senderName: string | null;
  senderUsername: string | null;
  senderProfileImageStorageKey: string | null;
  attachments: OfferThreadMessageAttachmentRecord[];
};

export type OfferThreadSummaryRecord = {
  id: number;
  publicId: string;
  offerId: number;
  offerPublicId: string;
  requestId: number;
  requestPublicId: string;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  customerId: number;
  customerPublicId: string;
  customerName: string;
  customerUsername: string;
  customerProfileImageStorageKey: string | null;
  carrierId: number;
  carrierPublicId: string;
  carrierName: string;
  carrierUsername: string;
  carrierProfileImageStorageKey: string | null;
  fiyat: number;
  durum: string;
  closedAt: Date | null;
  customerLastReadMessageId: number | null;
  carrierLastReadMessageId: number | null;
  lastMessage: OfferThreadMessageRecord | null;
};

export type OfferThreadDetailRecord = OfferThreadSummaryRecord & {
  durumTuru: string;
  durumAdi: string;
  requestDeletedAt: Date | null;
  requestStatusTuru: string;
  requestStatusAdi: string;
  shipment: OfferThreadShipmentRecord | null;
  messages: OfferThreadMessageRecord[];
};

export type OfferThreadWritableContextRecord = {
  threadId: number;
  threadPublicId: string;
  offerId: number;
  offerPublicId: string;
  requestId: number;
  requestPublicId: string;
  customerId: number;
  carrierId: number;
  customerLastReadMessageId: number | null;
  carrierLastReadMessageId: number | null;
  closedAt: Date | null;
  fiyat: number;
  durumTuru: string;
  durumAdi: string;
  requestDeletedAt: Date | null;
  requestStatusTuru: string;
  requestStatusAdi: string;
  shipment: OfferThreadShipmentRecord | null;
};

export type OfferThreadIdentityRecord = {
  threadId: number;
  threadPublicId: string;
  offerId: number;
  offerPublicId: string;
  customerId: number;
  carrierId: number;
};

export type OfferThreadShipmentRecord = {
  id: number;
  publicId: string;
  durumTuru: string;
  durumAdi: string;
  olusturmaTarihi: Date;
  baslangicTarihi: Date | null;
  teslimBildirimTarihi: Date | null;
  teslimTarihi: Date | null;
};

export type CreateOfferThreadInput = {
  offerId: number;
  requestId: number;
  customerId: number;
  carrierId: number;
  teklifFiyati: number;
};

export type CreateOfferThreadTextMessageInput = {
  threadId: number;
  senderUserId: number;
  senderSide: OfferThreadParticipantSide;
  text: string;
};

export type CreateOfferThreadImageMessageAttachmentInput = {
  storageKey: string;
  thumbnailStorageKey: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  sortOrder: number;
  originalFileName: string;
};

export type CreateOfferThreadImageMessageInput = {
  threadId: number;
  senderUserId: number;
  senderSide: OfferThreadParticipantSide;
  text: string | null;
  attachments: CreateOfferThreadImageMessageAttachmentInput[];
};

export type CreateOfferThreadCounterOfferInput = {
  threadId: number;
  offerId: number;
  senderUserId: number;
  senderSide: OfferThreadParticipantSide;
  fiyat: number;
  text: string | null;
};

export type CloseOfferThreadInput = {
  threadId: number;
  customerId: number;
  carrierId: number;
  actorUserId: number | null;
  systemEventCode: string;
  teklifFiyati?: number | null;
  text?: string | null;
};

function formatFullName(ad: string, soyad: string): string {
  return `${ad} ${soyad}`.trim();
}

@Injectable()
export class OfferThreadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Kullanıcının dahil olduğu tüm thread'leri inbox benzeri özet görünüm için çeker.
  // Burada sadece liste verisi hazırlanır; yazılabilirlik kararı service katmanında verilir.
  async findMyThreadSummaries(userId: number): Promise<OfferThreadSummaryRecord[]> {
    const threads = await this.prisma.client.offerThread.findMany({
      where: {
        OR: [{ customerId: userId }, { carrierId: userId }],
      },
      select: {
        id: true,
        publicId: true,
        offerId: true,
        requestId: true,
        customerId: true,
        carrierId: true,
        customerLastReadMessageId: true,
        carrierLastReadMessageId: true,
        closedAt: true,
        customer: {
          select: {
            id: true,
            publicId: true,
            ad: true,
            soyad: true,
            kullaniciAdi: true,
            profilFotografiStorageKey: true,
          },
        },
        carrier: {
          select: {
            id: true,
            publicId: true,
            ad: true,
            soyad: true,
            kullaniciAdi: true,
            profilFotografiStorageKey: true,
          },
        },
        offer: {
          select: {
            publicId: true,
            fiyat: true,
            durum: {
              select: {
                durumTuru: true,
                durumAdi: true,
              },
            },
          },
        },
        request: {
          select: {
            publicId: true,
            baslangicSehri: true,
            varisSehri: true,
            baslangicKonumMetni: true,
            varisKonumMetni: true,
          },
        },
        messages: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: offerThreadMessageSelect,
        },
      },
    });

    return threads.map((thread) => ({
      id: thread.id,
      publicId: thread.publicId,
      offerId: thread.offerId,
      offerPublicId: thread.offer.publicId,
      requestId: thread.requestId,
      requestPublicId: thread.request.publicId,
      baslangicSehri: thread.request.baslangicSehri,
      varisSehri: thread.request.varisSehri,
      baslangicKonumMetni: thread.request.baslangicKonumMetni,
      varisKonumMetni: thread.request.varisKonumMetni,
      customerId: thread.customerId,
      customerPublicId: thread.customer.publicId,
      customerName: formatFullName(thread.customer.ad, thread.customer.soyad),
      customerUsername: thread.customer.kullaniciAdi,
      customerProfileImageStorageKey: thread.customer.profilFotografiStorageKey,
      carrierId: thread.carrierId,
      carrierPublicId: thread.carrier.publicId,
      carrierName: formatFullName(thread.carrier.ad, thread.carrier.soyad),
      carrierUsername: thread.carrier.kullaniciAdi,
      carrierProfileImageStorageKey: thread.carrier.profilFotografiStorageKey,
      fiyat: thread.offer.fiyat.toNumber(),
      durum: thread.offer.durum.durumAdi,
      closedAt: thread.closedAt,
      customerLastReadMessageId: thread.customerLastReadMessageId,
      carrierLastReadMessageId: thread.carrierLastReadMessageId,
      lastMessage: thread.messages[0] ? this.mapMessage(thread.messages[0]) : null,
    }));
  }

  // Tek bir offer thread'inin tüm mesaj akışını ve yazılabilirlik için gerekli offer/request
  // bağlamını birlikte okur.
  async findThreadDetailByOfferIdForUser(
    offerId: EntityIdSelector,
    userId: number
  ): Promise<OfferThreadDetailRecord | null> {
    const thread = await this.prisma.client.offerThread.findFirst({
      where: {
        ...this.offerThreadWhereByOfferId(offerId),
        OR: [{ customerId: userId }, { carrierId: userId }],
      },
      select: {
        id: true,
        publicId: true,
        offerId: true,
        requestId: true,
        customerId: true,
        carrierId: true,
        customerLastReadMessageId: true,
        carrierLastReadMessageId: true,
        closedAt: true,
        customer: {
          select: {
            publicId: true,
            ad: true,
            soyad: true,
            kullaniciAdi: true,
            profilFotografiStorageKey: true,
          },
        },
        carrier: {
          select: {
            publicId: true,
            ad: true,
            soyad: true,
            kullaniciAdi: true,
            profilFotografiStorageKey: true,
          },
        },
        offer: {
          select: {
            publicId: true,
            fiyat: true,
            durum: {
              select: {
                durumTuru: true,
                durumAdi: true,
              },
            },
          },
        },
        request: {
          select: {
            publicId: true,
            baslangicSehri: true,
            varisSehri: true,
            baslangicKonumMetni: true,
            varisKonumMetni: true,
            silmeTarihi: true,
            durum: {
              select: {
                durumTuru: true,
                durumAdi: true,
              },
            },
            nakliye: {
              select: {
                id: true,
                publicId: true,
                olusturmaTarihi: true,
                baslangicTarihi: true,
                teslimBildirimTarihi: true,
                teslimTarihi: true,
                durum: {
                  select: {
                    durumTuru: true,
                    durumAdi: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: offerThreadMessageSelect,
        },
      },
    });

    if (!thread) {
      return null;
    }

    return {
      id: thread.id,
      publicId: thread.publicId,
      offerId: thread.offerId,
      offerPublicId: thread.offer.publicId,
      requestId: thread.requestId,
      requestPublicId: thread.request.publicId,
      baslangicSehri: thread.request.baslangicSehri,
      varisSehri: thread.request.varisSehri,
      baslangicKonumMetni: thread.request.baslangicKonumMetni,
      varisKonumMetni: thread.request.varisKonumMetni,
      customerId: thread.customerId,
      customerPublicId: thread.customer.publicId,
      customerName: formatFullName(thread.customer.ad, thread.customer.soyad),
      customerUsername: thread.customer.kullaniciAdi,
      customerProfileImageStorageKey: thread.customer.profilFotografiStorageKey,
      carrierId: thread.carrierId,
      carrierPublicId: thread.carrier.publicId,
      carrierName: formatFullName(thread.carrier.ad, thread.carrier.soyad),
      carrierUsername: thread.carrier.kullaniciAdi,
      carrierProfileImageStorageKey: thread.carrier.profilFotografiStorageKey,
      fiyat: thread.offer.fiyat.toNumber(),
      durumTuru: thread.offer.durum.durumTuru,
      durumAdi: thread.offer.durum.durumAdi,
      durum: thread.offer.durum.durumAdi,
      closedAt: thread.closedAt,
      customerLastReadMessageId: thread.customerLastReadMessageId,
      carrierLastReadMessageId: thread.carrierLastReadMessageId,
      lastMessage:
        thread.messages.length > 0
          ? this.mapMessage(thread.messages[thread.messages.length - 1])
          : null,
      requestDeletedAt: thread.request.silmeTarihi,
      requestStatusTuru: thread.request.durum.durumTuru,
      requestStatusAdi: thread.request.durum.durumAdi,
      shipment: thread.request.nakliye
        ? this.mapShipment(thread.request.nakliye)
        : null,
      messages: thread.messages.map((message) => this.mapMessage(message)),
    };
  }

  // Mesaj veya counter offer yazmadan önce thread'in kullanıcıya ait olup olmadığını ve
  // karar vermek için gerekli durum snapshot'ını döndürür.
  async findWritableThreadContextByOfferIdForUser(
    offerId: EntityIdSelector,
    userId: number,
    executor?: PrismaExecutor
  ): Promise<OfferThreadWritableContextRecord | null> {
    const db = this.getExecutor(executor);
    const thread = await db.offerThread.findFirst({
      where: {
        ...this.offerThreadWhereByOfferId(offerId),
        OR: [{ customerId: userId }, { carrierId: userId }],
      },
      select: {
        id: true,
        publicId: true,
        offerId: true,
        requestId: true,
        customerId: true,
        carrierId: true,
        customerLastReadMessageId: true,
        carrierLastReadMessageId: true,
        closedAt: true,
        offer: {
          select: {
            publicId: true,
            fiyat: true,
            durum: {
              select: {
                durumTuru: true,
                durumAdi: true,
              },
            },
          },
        },
        request: {
          select: {
            publicId: true,
            silmeTarihi: true,
            durum: {
              select: {
                durumTuru: true,
                durumAdi: true,
              },
            },
            nakliye: {
              select: {
                id: true,
                publicId: true,
                olusturmaTarihi: true,
                baslangicTarihi: true,
                teslimBildirimTarihi: true,
                teslimTarihi: true,
                durum: {
                  select: {
                    durumTuru: true,
                    durumAdi: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!thread) {
      return null;
    }

    return {
      threadId: thread.id,
      threadPublicId: thread.publicId,
      offerId: thread.offerId,
      offerPublicId: thread.offer.publicId,
      requestId: thread.requestId,
      requestPublicId: thread.request.publicId,
      customerId: thread.customerId,
      carrierId: thread.carrierId,
      customerLastReadMessageId: thread.customerLastReadMessageId,
      carrierLastReadMessageId: thread.carrierLastReadMessageId,
      closedAt: thread.closedAt,
      fiyat: thread.offer.fiyat.toNumber(),
      durumTuru: thread.offer.durum.durumTuru,
      durumAdi: thread.offer.durum.durumAdi,
      requestDeletedAt: thread.request.silmeTarihi,
      requestStatusTuru: thread.request.durum.durumTuru,
      requestStatusAdi: thread.request.durum.durumAdi,
      shipment: thread.request.nakliye
        ? this.mapShipment(thread.request.nakliye)
        : null,
    };
  }

  // Offer lifecycle servisleri, thread kapanış event'i yazmak için önce offer'tan thread
  // kimliğine bu yardımcıyla ulaşır.
  async findThreadIdentityByOfferId(
    offerId: number,
    executor?: PrismaExecutor
  ): Promise<OfferThreadIdentityRecord | null> {
    const db = this.getExecutor(executor);
    const thread = await db.offerThread.findUnique({
      where: {
        offerId,
      },
      select: {
        id: true,
        publicId: true,
        offerId: true,
        offer: {
          select: {
            publicId: true,
          },
        },
        customerId: true,
        carrierId: true,
      },
    });

    if (!thread) {
      return null;
    }

    return {
      threadId: thread.id,
      threadPublicId: thread.publicId,
      offerId: thread.offerId,
      offerPublicId: thread.offer.publicId,
      customerId: thread.customerId,
      carrierId: thread.carrierId,
    };
  }

  // Son fiyat adımını kimin attığını belirler. Counter offer yoksa initial offer nakliyeciden
  // gelir; varsa son COUNTER_OFFER mesajının göndericisi hangi tarafsa o lastPriceActor'dur.
  async findAcceptedThreadIdentityByRequestId(
    requestId: number,
    executor?: PrismaExecutor
  ): Promise<OfferThreadIdentityRecord | null> {
    const db = this.getExecutor(executor);
    const thread = await db.offerThread.findFirst({
      where: {
        requestId,
        offer: {
          durum: {
            durumTuru: {
              equals: "TEKLIF",
              mode: Prisma.QueryMode.insensitive,
            },
            durumAdi: {
              equals: "KABUL_EDILDI",
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        publicId: true,
        offerId: true,
        offer: {
          select: {
            publicId: true,
          },
        },
        customerId: true,
        carrierId: true,
      },
    });

    if (!thread) {
      return null;
    }

    return {
      threadId: thread.id,
      threadPublicId: thread.publicId,
      offerId: thread.offerId,
      offerPublicId: thread.offer.publicId,
      customerId: thread.customerId,
      carrierId: thread.carrierId,
    };
  }

  async findLastPriceActorSide(
    offerId: number,
    executor?: PrismaExecutor
  ): Promise<OfferThreadParticipantSide> {
    const db = this.getExecutor(executor);

    const thread = await db.offerThread.findUnique({
      where: { offerId },
      select: {
        customerId: true,
        messages: {
          where: { type: "COUNTER_OFFER" },
          orderBy: { id: "desc" },
          take: 1,
          select: { senderUserId: true },
        },
      },
    });

    if (!thread) {
      return "carrier";
    }

    const lastCounterOffer = thread.messages[0];

    if (!lastCounterOffer || lastCounterOffer.senderUserId === null) {
      return "carrier";
    }

    return lastCounterOffer.senderUserId === thread.customerId
      ? "customer"
      : "carrier";
  }

  // Okunmamış sayısı, kullanıcının kendi yazdığı mesajları hariç tutarak last-read
  // pointer'ının sonrasındaki kayıtlar üzerinden hesaplanır.
  async countUnreadMessages(
    threadId: number,
    userId: number,
    lastReadMessageId: number | null
  ): Promise<number> {
    return this.prisma.client.offerThreadMessage.count({
      where: {
        threadId,
        senderUserId: {
          not: userId,
        },
        ...(lastReadMessageId !== null
          ? {
              id: {
                gt: lastReadMessageId,
              },
            }
          : {}),
      },
    });
  }

  // Yeni offer oluştuğunda thread'i ve ilk OFFER_CREATED system event'ini aynı akışta
  // yaratır. İlk fiyat burada audit izi olarak saklanır.
  async createThreadWithInitialOfferEvent(
    input: CreateOfferThreadInput,
    executor?: PrismaExecutor
  ): Promise<void> {
    const db = this.getExecutor(executor);

    const thread = await db.offerThread.create({
      data: {
        offerId: input.offerId,
        requestId: input.requestId,
        customerId: input.customerId,
        carrierId: input.carrierId,
      },
      select: {
        id: true,
      },
    });

    const initialMessage = await db.offerThreadMessage.create({
      data: {
        threadId: thread.id,
        type: "SYSTEM_EVENT",
        teklifFiyati: new Prisma.Decimal(input.teklifFiyati),
        systemEventCode: "OFFER_CREATED",
      },
      select: {
        id: true,
      },
    });

    await db.offerThread.update({
      where: {
        id: thread.id,
      },
      data: {
        carrierLastReadMessageId: initialMessage.id,
      },
    });
  }

  // Normal mesaj yalnızca thread stream'ine eklenir ve gönderen tarafın last-read
  // pointer'ı yeni mesaja çekilir.
  async createTextMessage(
    input: CreateOfferThreadTextMessageInput,
    executor?: PrismaExecutor
  ): Promise<OfferThreadMessageRecord> {
    const db = this.getExecutor(executor);

    const message = await db.offerThreadMessage.create({
      data: {
        threadId: input.threadId,
        senderUserId: input.senderUserId,
        type: "TEXT",
        text: input.text,
      },
      select: offerThreadMessageSelect,
    });

    await this.updateThreadLastReadPointer(
      input.threadId,
      input.senderSide,
      message.id,
      db
    );

    return this.mapMessage(message);
  }

  async createImageMessage(
    input: CreateOfferThreadImageMessageInput,
    executor?: PrismaExecutor
  ): Promise<OfferThreadMessageRecord> {
    const db = this.getExecutor(executor);

    const message = await db.offerThreadMessage.create({
      data: {
        threadId: input.threadId,
        senderUserId: input.senderUserId,
        type: "TEXT",
        text: input.text,
        ...(input.attachments.length > 0
          ? {
              attachments: {
                create: input.attachments.map((attachment) => ({
                  storageKey: attachment.storageKey,
                  thumbnailStorageKey: attachment.thumbnailStorageKey,
                  mimeType: attachment.mimeType,
                  sizeBytes: attachment.sizeBytes,
                  width: attachment.width,
                  height: attachment.height,
                  sortOrder: attachment.sortOrder,
                  originalFileName: attachment.originalFileName,
                })),
              },
            }
          : {}),
      },
      select: offerThreadMessageSelect,
    });

    await this.updateThreadLastReadPointer(
      input.threadId,
      input.senderSide,
      message.id,
      db
    );

    return this.mapMessage(message);
  }

  // Counter offer iki işi birlikte yapar: teklifin güncel fiyatını update eder ve
  // aynı fiyatı stream'e COUNTER_OFFER mesajı olarak yazar.
  async createCounterOfferMessage(
    input: CreateOfferThreadCounterOfferInput,
    executor?: PrismaExecutor
  ): Promise<OfferThreadMessageRecord> {
    const db = this.getExecutor(executor);

    await db.teklif.update({
      where: {
        id: input.offerId,
      },
      data: {
        fiyat: new Prisma.Decimal(input.fiyat),
      },
    });

    const message = await db.offerThreadMessage.create({
      data: {
        threadId: input.threadId,
        senderUserId: input.senderUserId,
        type: "COUNTER_OFFER",
        text: input.text,
        teklifFiyati: new Prisma.Decimal(input.fiyat),
      },
      select: offerThreadMessageSelect,
    });

    await this.updateThreadLastReadPointer(
      input.threadId,
      input.senderSide,
      message.id,
      db
    );

    return this.mapMessage(message);
  }

  async appendSystemEvent(
    input: CloseOfferThreadInput,
    executor?: PrismaExecutor
  ): Promise<void> {
    const db = this.getExecutor(executor);

    const message = await db.offerThreadMessage.create({
      data: {
        threadId: input.threadId,
        type: "SYSTEM_EVENT",
        text: input.text ?? null,
        teklifFiyati:
          typeof input.teklifFiyati === "number"
            ? new Prisma.Decimal(input.teklifFiyati)
            : null,
        systemEventCode: input.systemEventCode,
      },
      select: {
        id: true,
      },
    });

    if (input.actorUserId === input.customerId) {
      await this.markThreadAsRead(input.threadId, "customer", message.id, db);
    }

    if (input.actorUserId === input.carrierId) {
      await this.markThreadAsRead(input.threadId, "carrier", message.id, db);
    }
  }

  // Kabul/red veya request artık müsait değil gibi lifecycle olaylarında system event
  // yazar ve thread'i read-only kapatır.
  async appendSystemEventAndClose(
    input: CloseOfferThreadInput,
    executor?: PrismaExecutor
  ): Promise<void> {
    const db = this.getExecutor(executor);

    const message = await db.offerThreadMessage.create({
      data: {
        threadId: input.threadId,
        type: "SYSTEM_EVENT",
        text: input.text ?? null,
        teklifFiyati:
          typeof input.teklifFiyati === "number"
            ? new Prisma.Decimal(input.teklifFiyati)
            : null,
        systemEventCode: input.systemEventCode,
      },
      select: {
        id: true,
      },
    });

    const threadUpdate: Prisma.OfferThreadUncheckedUpdateInput = {
      closedAt: new Date(),
    };

    if (input.actorUserId === input.customerId) {
      threadUpdate.customerLastReadMessageId = message.id;
    }

    if (input.actorUserId === input.carrierId) {
      threadUpdate.carrierLastReadMessageId = message.id;
    }

    await db.offerThread.update({
      where: {
        id: input.threadId,
      },
      data: threadUpdate,
    });
  }

  // Thread açıldığında veya mesaj gönderildiğinde participant bazlı last-read pointer'ı
  // günceller; ayrı bir message-read tablosu tutulmaz.
  async markThreadAsRead(
    threadId: number,
    participantSide: OfferThreadParticipantSide,
    lastReadMessageId: number | null,
    executor?: PrismaExecutor
  ): Promise<void> {
    const db = this.getExecutor(executor);

    await db.offerThread.update({
      where: {
        id: threadId,
      },
      data:
        participantSide === "customer"
          ? { customerLastReadMessageId: lastReadMessageId }
          : { carrierLastReadMessageId: lastReadMessageId },
    });
  }

  // Gönderen kendi mesajını yazdıktan sonra aynı mesajı otomatik okumuş sayıldığı için
  // last-read pointer güncellemesi bu helper üzerinden yapılır.
  private async updateThreadLastReadPointer(
    threadId: number,
    participantSide: OfferThreadParticipantSide,
    messageId: number,
    executor: PrismaExecutor
  ) {
    await this.markThreadAsRead(threadId, participantSide, messageId, executor);
  }

  // Repository metotlarının transaction içinden veya doğrudan Prisma client ile
  // çalışabilmesi için ortak executor seçimi yapar.
  private getExecutor(executor?: PrismaExecutor): PrismaExecutor {
    return executor ?? this.prisma.client;
  }

  private offerThreadWhereByOfferId(
    offerId: EntityIdSelector
  ): Prisma.OfferThreadWhereInput {
    return typeof offerId === "number"
      ? { offerId }
      : { offer: publicEntityWhere(offerId) };
  }

  // Prisma'dan gelen ham message kaydını servis ve frontend'in kullanacağı yalın
  // thread message formatına dönüştürür.
  private mapMessage(message: OfferThreadMessageQuery): OfferThreadMessageRecord {
    return {
      id: message.id,
      publicId: message.publicId,
      type: message.type,
      text: message.text,
      teklifFiyati: message.teklifFiyati?.toNumber() ?? null,
      systemEventCode: message.systemEventCode,
      createdAt: message.createdAt,
      senderUserId: message.senderUserId,
      senderUserPublicId: message.sender?.publicId ?? null,
      senderName: message.sender
        ? formatFullName(message.sender.ad, message.sender.soyad)
        : null,
      senderUsername: message.sender?.kullaniciAdi ?? null,
      senderProfileImageStorageKey:
        message.sender?.profilFotografiStorageKey ?? null,
      attachments: message.attachments.map((attachment) => ({
        id: attachment.id,
        publicId: attachment.publicId,
        storageKey: attachment.storageKey,
        thumbnailStorageKey: attachment.thumbnailStorageKey,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        width: attachment.width,
        height: attachment.height,
        sortOrder: attachment.sortOrder,
        originalFileName: attachment.originalFileName,
        createdAt: attachment.createdAt,
      })),
    };
  }

  private mapShipment(shipment: {
    id: number;
    publicId: string;
    olusturmaTarihi: Date;
    baslangicTarihi: Date | null;
    teslimBildirimTarihi: Date | null;
    teslimTarihi: Date | null;
    durum: {
      durumTuru: string;
      durumAdi: string;
    };
  }): OfferThreadShipmentRecord {
    return {
      id: shipment.id,
      publicId: shipment.publicId,
      durumTuru: shipment.durum.durumTuru,
      durumAdi: shipment.durum.durumAdi,
      olusturmaTarihi: shipment.olusturmaTarihi,
      baslangicTarihi: shipment.baslangicTarihi,
      teslimBildirimTarihi: shipment.teslimBildirimTarihi,
      teslimTarihi: shipment.teslimTarihi,
    };
  }
}
