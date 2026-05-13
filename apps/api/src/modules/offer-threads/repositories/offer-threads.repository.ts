import { Prisma, PrismaClient } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

export type OfferThreadParticipantSide = "customer" | "carrier";

export type OfferThreadMessageRecord = {
  id: number;
  type: string;
  text: string | null;
  teklifFiyati: number | null;
  systemEventCode: string | null;
  createdAt: Date;
  senderUserId: number | null;
  senderName: string | null;
  senderUsername: string | null;
  senderProfileImageStorageKey: string | null;
};

export type OfferThreadSummaryRecord = {
  id: number;
  offerId: number;
  requestId: number;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  customerId: number;
  customerName: string;
  customerUsername: string;
  customerProfileImageStorageKey: string | null;
  carrierId: number;
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
  hasShipment: boolean;
  messages: OfferThreadMessageRecord[];
};

export type OfferThreadWritableContextRecord = {
  threadId: number;
  offerId: number;
  requestId: number;
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
  hasShipment: boolean;
};

export type OfferThreadIdentityRecord = {
  threadId: number;
  offerId: number;
  customerId: number;
  carrierId: number;
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
            ad: true,
            soyad: true,
            kullaniciAdi: true,
            profilFotografiStorageKey: true,
          },
        },
        carrier: {
          select: {
            id: true,
            ad: true,
            soyad: true,
            kullaniciAdi: true,
            profilFotografiStorageKey: true,
          },
        },
        offer: {
          select: {
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
            baslangicSehri: true,
            varisSehri: true,
            baslangicKonumMetni: true,
            varisKonumMetni: true,
          },
        },
        messages: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            id: true,
            type: true,
            text: true,
            teklifFiyati: true,
            systemEventCode: true,
            createdAt: true,
            senderUserId: true,
            sender: {
              select: {
                ad: true,
                soyad: true,
                kullaniciAdi: true,
                profilFotografiStorageKey: true,
              },
            },
          },
        },
      },
    });

    return threads.map((thread) => ({
      id: thread.id,
      offerId: thread.offerId,
      requestId: thread.requestId,
      baslangicSehri: thread.request.baslangicSehri,
      varisSehri: thread.request.varisSehri,
      baslangicKonumMetni: thread.request.baslangicKonumMetni,
      varisKonumMetni: thread.request.varisKonumMetni,
      customerId: thread.customerId,
      customerName: formatFullName(thread.customer.ad, thread.customer.soyad),
      customerUsername: thread.customer.kullaniciAdi,
      customerProfileImageStorageKey: thread.customer.profilFotografiStorageKey,
      carrierId: thread.carrierId,
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
    offerId: number,
    userId: number
  ): Promise<OfferThreadDetailRecord | null> {
    const thread = await this.prisma.client.offerThread.findFirst({
      where: {
        offerId,
        OR: [{ customerId: userId }, { carrierId: userId }],
      },
      select: {
        id: true,
        offerId: true,
        requestId: true,
        customerId: true,
        carrierId: true,
        customerLastReadMessageId: true,
        carrierLastReadMessageId: true,
        closedAt: true,
        customer: {
          select: {
            ad: true,
            soyad: true,
            kullaniciAdi: true,
            profilFotografiStorageKey: true,
          },
        },
        carrier: {
          select: {
            ad: true,
            soyad: true,
            kullaniciAdi: true,
            profilFotografiStorageKey: true,
          },
        },
        offer: {
          select: {
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
              },
            },
          },
        },
        messages: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            type: true,
            text: true,
            teklifFiyati: true,
            systemEventCode: true,
            createdAt: true,
            senderUserId: true,
            sender: {
              select: {
                ad: true,
                soyad: true,
                kullaniciAdi: true,
                profilFotografiStorageKey: true,
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
      id: thread.id,
      offerId: thread.offerId,
      requestId: thread.requestId,
      baslangicSehri: thread.request.baslangicSehri,
      varisSehri: thread.request.varisSehri,
      baslangicKonumMetni: thread.request.baslangicKonumMetni,
      varisKonumMetni: thread.request.varisKonumMetni,
      customerId: thread.customerId,
      customerName: formatFullName(thread.customer.ad, thread.customer.soyad),
      customerUsername: thread.customer.kullaniciAdi,
      customerProfileImageStorageKey: thread.customer.profilFotografiStorageKey,
      carrierId: thread.carrierId,
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
      hasShipment: Boolean(thread.request.nakliye),
      messages: thread.messages.map((message) => this.mapMessage(message)),
    };
  }

  // Mesaj veya counter offer yazmadan önce thread'in kullanıcıya ait olup olmadığını ve
  // karar vermek için gerekli durum snapshot'ını döndürür.
  async findWritableThreadContextByOfferIdForUser(
    offerId: number,
    userId: number,
    executor?: PrismaExecutor
  ): Promise<OfferThreadWritableContextRecord | null> {
    const db = this.getExecutor(executor);
    const thread = await db.offerThread.findFirst({
      where: {
        offerId,
        OR: [{ customerId: userId }, { carrierId: userId }],
      },
      select: {
        id: true,
        offerId: true,
        requestId: true,
        customerId: true,
        carrierId: true,
        customerLastReadMessageId: true,
        carrierLastReadMessageId: true,
        closedAt: true,
        offer: {
          select: {
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
      offerId: thread.offerId,
      requestId: thread.requestId,
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
      hasShipment: Boolean(thread.request.nakliye),
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
        offerId: true,
        customerId: true,
        carrierId: true,
      },
    });

    if (!thread) {
      return null;
    }

    return {
      threadId: thread.id,
      offerId: thread.offerId,
      customerId: thread.customerId,
      carrierId: thread.carrierId,
    };
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
      select: {
        id: true,
        type: true,
        text: true,
        teklifFiyati: true,
        systemEventCode: true,
        createdAt: true,
        senderUserId: true,
        sender: {
          select: {
            ad: true,
            soyad: true,
            kullaniciAdi: true,
            profilFotografiStorageKey: true,
          },
        },
      },
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
      select: {
        id: true,
        type: true,
        text: true,
        teklifFiyati: true,
        systemEventCode: true,
        createdAt: true,
        senderUserId: true,
        sender: {
          select: {
            ad: true,
            soyad: true,
            kullaniciAdi: true,
            profilFotografiStorageKey: true,
          },
        },
      },
    });

    await this.updateThreadLastReadPointer(
      input.threadId,
      input.senderSide,
      message.id,
      db
    );

    return this.mapMessage(message);
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

  // Prisma'dan gelen ham message kaydını servis ve frontend'in kullanacağı yalın
  // thread message formatına dönüştürür.
  private mapMessage(message: {
    id: number;
    type: string;
    text: string | null;
    teklifFiyati: Prisma.Decimal | null;
    systemEventCode: string | null;
    createdAt: Date;
    senderUserId: number | null;
    sender:
      | {
          ad: string;
          soyad: string;
          kullaniciAdi: string;
          profilFotografiStorageKey: string | null;
        }
      | null;
  }): OfferThreadMessageRecord {
    return {
      id: message.id,
      type: message.type,
      text: message.text,
      teklifFiyati: message.teklifFiyati?.toNumber() ?? null,
      systemEventCode: message.systemEventCode,
      createdAt: message.createdAt,
      senderUserId: message.senderUserId,
      senderName: message.sender
        ? formatFullName(message.sender.ad, message.sender.soyad)
        : null,
      senderUsername: message.sender?.kullaniciAdi ?? null,
      senderProfileImageStorageKey:
        message.sender?.profilFotografiStorageKey ?? null,
    };
  }
}
