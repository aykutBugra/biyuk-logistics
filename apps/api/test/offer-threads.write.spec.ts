import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Test } from "@nestjs/testing";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { NotificationsPublisher } from "../src/modules/notifications/notifications.publisher";
import { OfferThreadsService } from "../src/modules/offer-threads/offer-threads.service";
import {
  type OfferThreadMessageRecord,
  type OfferThreadWritableContextRecord,
  OfferThreadsRepository,
} from "../src/modules/offer-threads/repositories/offer-threads.repository";

describe("OfferThreadsService write paths", () => {
  const currentUser = {
    id: 10,
    mail: "customer@example.com",
    kullaniciAdi: "customer",
    roles: [ROLE_NAMES.MUSTERI],
  };

  const writableContext: OfferThreadWritableContextRecord = {
    threadId: 41,
    offerId: 77,
    requestId: 501,
    customerId: currentUser.id,
    carrierId: 22,
    customerLastReadMessageId: null,
    carrierLastReadMessageId: null,
    closedAt: null,
    fiyat: 12000,
    durumTuru: "TEKLIF",
    durumAdi: "OLUSTURULDU",
    requestDeletedAt: null,
    requestStatusTuru: "ISTEK",
    requestStatusAdi: "OLUSTURULDU",
    hasShipment: false,
  };

  const message: OfferThreadMessageRecord = {
    id: 9001,
    type: "COUNTER_OFFER",
    text: "Yeni fiyat",
    teklifFiyati: 12345,
    systemEventCode: null,
    createdAt: new Date("2026-05-04T10:00:00.000Z"),
    senderUserId: currentUser.id,
    senderName: "Customer User",
    senderUsername: currentUser.kullaniciAdi,
  };

  const tx = { kind: "thread-tx" };

  let service: OfferThreadsService;
  let offerThreadsRepositoryMock: {
    findWritableThreadContextByOfferIdForUser: jest.Mock;
    createCounterOfferMessage: jest.Mock;
    createTextMessage: jest.Mock;
  };
  let notificationsPublisherMock: {
    publishCounterOffer: jest.Mock;
    publishThreadMessage: jest.Mock;
  };
  let prismaServiceMock: {
    client: {
      $transaction: jest.Mock;
    };
  };

  beforeEach(async () => {
    offerThreadsRepositoryMock = {
      findWritableThreadContextByOfferIdForUser: jest.fn(),
      createCounterOfferMessage: jest.fn(),
      createTextMessage: jest.fn(),
    };
    notificationsPublisherMock = {
      publishCounterOffer: jest.fn().mockResolvedValue(undefined),
      publishThreadMessage: jest.fn().mockResolvedValue(undefined),
    };
    prismaServiceMock = {
      client: {
        $transaction: jest.fn(
          async (
            callback: (executor: object) => Promise<unknown>,
            options?: { isolationLevel?: Prisma.TransactionIsolationLevel }
          ) => {
            expect(options).toEqual({
              isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            });

            return callback(tx);
          }
        ),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OfferThreadsService,
        {
          provide: OfferThreadsRepository,
          useValue: offerThreadsRepositoryMock,
        },
        {
          provide: NotificationsPublisher,
          useValue: notificationsPublisherMock,
        },
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get(OfferThreadsService);
  });

  it("writes counter offers inside a serializable transaction before publishing", async () => {
    offerThreadsRepositoryMock.findWritableThreadContextByOfferIdForUser.mockResolvedValue(
      writableContext
    );
    offerThreadsRepositoryMock.createCounterOfferMessage.mockResolvedValue(message);

    const response = await service.createCounterOffer(currentUser, writableContext.offerId, {
      fiyat: 12345,
      mesaj: "Yeni fiyat",
    });

    expect(
      offerThreadsRepositoryMock.findWritableThreadContextByOfferIdForUser
    ).toHaveBeenCalledWith(writableContext.offerId, currentUser.id, tx);
    expect(offerThreadsRepositoryMock.createCounterOfferMessage).toHaveBeenCalledWith(
      {
        threadId: writableContext.threadId,
        offerId: writableContext.offerId,
        senderUserId: currentUser.id,
        senderSide: "customer",
        fiyat: 12345,
        text: "Yeni fiyat",
      },
      tx
    );
    expect(notificationsPublisherMock.publishCounterOffer).toHaveBeenCalledWith({
      recipientUserId: writableContext.carrierId,
      messageId: message.id,
      offerId: writableContext.offerId,
      requestId: writableContext.requestId,
      fiyat: 12345,
      actorUserId: currentUser.id,
    });
    expect(response.isMine).toBe(true);
  });

  it("rejects non-writable counter offers before any partial write or publish", async () => {
    offerThreadsRepositoryMock.findWritableThreadContextByOfferIdForUser.mockResolvedValue({
      ...writableContext,
      closedAt: new Date("2026-05-04T10:15:00.000Z"),
    });

    await expect(
      service.createCounterOffer(currentUser, writableContext.offerId, {
        fiyat: 9999,
        mesaj: "Kapanmis thread",
      })
    ).rejects.toThrow(new ConflictException("Bu konusma yazmaya kapali."));

    expect(offerThreadsRepositoryMock.createCounterOfferMessage).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishCounterOffer).not.toHaveBeenCalled();
  });

  it("uses the same transactional guard for plain text messages", async () => {
    const textMessage: OfferThreadMessageRecord = {
      ...message,
      id: 9002,
      type: "TEXT",
      text: "Merhaba",
      teklifFiyati: null,
    };

    offerThreadsRepositoryMock.findWritableThreadContextByOfferIdForUser.mockResolvedValue(
      writableContext
    );
    offerThreadsRepositoryMock.createTextMessage.mockResolvedValue(textMessage);

    await service.createTextMessage(currentUser, writableContext.offerId, {
      mesaj: "Merhaba",
    });

    expect(offerThreadsRepositoryMock.createTextMessage).toHaveBeenCalledWith(
      {
        threadId: writableContext.threadId,
        senderUserId: currentUser.id,
        senderSide: "customer",
        text: "Merhaba",
      },
      tx
    );
    expect(notificationsPublisherMock.publishThreadMessage).toHaveBeenCalledWith({
      recipientUserId: writableContext.carrierId,
      messageId: textMessage.id,
      offerId: writableContext.offerId,
      requestId: writableContext.requestId,
      actorUserId: currentUser.id,
    });
  });

  it("rejects same-user participants before any thread write happens", async () => {
    offerThreadsRepositoryMock.findWritableThreadContextByOfferIdForUser.mockResolvedValue({
      ...writableContext,
      carrierId: currentUser.id,
    });

    await expect(
      service.createTextMessage(currentUser, writableContext.offerId, {
        mesaj: "Self thread",
      })
    ).rejects.toThrow(
      new ConflictException(
        "Offer thread actions are blocked because the customer and carrier resolve to the same user."
      )
    );

    expect(offerThreadsRepositoryMock.createTextMessage).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishThreadMessage).not.toHaveBeenCalled();
  });
});
