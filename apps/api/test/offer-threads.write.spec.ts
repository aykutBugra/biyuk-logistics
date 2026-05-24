import { ConflictException, InternalServerErrorException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Test } from "@nestjs/testing";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { NOTIFICATION_PUBLISHER } from "../src/modules/notifications/notification-publisher.token";
import { OfferThreadMediaService } from "../src/modules/offer-threads/offer-thread-media.service";
import { OfferThreadsService } from "../src/modules/offer-threads/offer-threads.service";
import {
  type OfferThreadMessageRecord,
  type OfferThreadWritableContextRecord,
  OfferThreadsRepository,
} from "../src/modules/offer-threads/repositories/offer-threads.repository";

describe("OfferThreadsService write paths", () => {
  const currentUser = {
    id: 10,
    publicId: "550e8400-e29b-41d4-a716-446655440010",
    mail: "customer@example.com",
    kullaniciAdi: "customer",
    roles: [ROLE_NAMES.MUSTERI],
  };

  const writableContext: OfferThreadWritableContextRecord = {
    threadId: 41,
    threadPublicId: "550e8400-e29b-41d4-a716-446655440041",
    offerId: 77,
    offerPublicId: "550e8400-e29b-41d4-a716-446655440077",
    requestId: 501,
    requestPublicId: "550e8400-e29b-41d4-a716-446655440501",
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
    planlananAlimTarihi: new Date("2026-06-12T00:00:00.000Z"),
    tahminiTeslimTarihi: new Date("2026-06-14T00:00:00.000Z"),
    shipment: null,
  };

  const message: OfferThreadMessageRecord = {
    id: 9001,
    publicId: "550e8400-e29b-41d4-a716-446655449001",
    type: "COUNTER_OFFER",
    text: "Yeni fiyat",
    teklifFiyati: 12345,
    systemEventCode: null,
    createdAt: new Date("2026-05-04T10:00:00.000Z"),
    senderUserId: currentUser.id,
    senderUserPublicId: currentUser.publicId,
    senderName: "Customer User",
    senderUsername: currentUser.kullaniciAdi,
    senderProfileImageStorageKey: null,
    attachments: [],
  };
  const offerPublicEntityId = {
    kind: "uuid",
    value: writableContext.offerPublicId,
  } as const;

  const tx = { kind: "thread-tx" } as unknown as Prisma.TransactionClient;

  let service: OfferThreadsService;
  let offerThreadsRepositoryMock: {
    findWritableThreadContextByOfferIdForUser: jest.Mock;
    findAcceptedThreadIdentityByRequestId: jest.Mock;
    createCounterOfferMessage: jest.Mock;
    createTextMessage: jest.Mock;
    appendSystemEvent: jest.Mock;
    appendSystemEventAndClose: jest.Mock;
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
      findAcceptedThreadIdentityByRequestId: jest.fn(),
      createCounterOfferMessage: jest.fn(),
      createTextMessage: jest.fn(),
      appendSystemEvent: jest.fn().mockResolvedValue(undefined),
      appendSystemEventAndClose: jest.fn().mockResolvedValue(undefined),
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
          provide: NOTIFICATION_PUBLISHER,
          useValue: notificationsPublisherMock,
        },
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: OfferThreadMediaService,
          useValue: {
            prepareImageAttachments: jest.fn(),
            rollbackStorageKeys: jest.fn(),
            toPublicUrl: jest.fn(),
            toOptionalPublicUrl: jest.fn(),
          },
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

    const response = await service.createCounterOffer(currentUser, offerPublicEntityId, {
      fiyat: 12345,
      mesaj: "Yeni fiyat",
    });

    expect(
      offerThreadsRepositoryMock.findWritableThreadContextByOfferIdForUser
    ).toHaveBeenCalledWith(offerPublicEntityId, currentUser.id, tx);
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
      messageId: message.publicId,
      offerId: writableContext.offerPublicId,
      requestId: writableContext.requestPublicId,
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
      service.createCounterOffer(currentUser, offerPublicEntityId, {
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
      publicId: "550e8400-e29b-41d4-a716-446655449002",
      type: "TEXT",
      text: "Merhaba",
      teklifFiyati: null,
    };

    offerThreadsRepositoryMock.findWritableThreadContextByOfferIdForUser.mockResolvedValue(
      writableContext
    );
    offerThreadsRepositoryMock.createTextMessage.mockResolvedValue(textMessage);

    await service.createTextMessage(currentUser, offerPublicEntityId, {
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
      messageId: textMessage.publicId,
      offerId: writableContext.offerPublicId,
      requestId: writableContext.requestPublicId,
      actorUserId: currentUser.id,
    });
  });

  it("rejects same-user participants before any thread write happens", async () => {
    offerThreadsRepositoryMock.findWritableThreadContextByOfferIdForUser.mockResolvedValue({
      ...writableContext,
      carrierId: currentUser.id,
    });

    await expect(
      service.createTextMessage(currentUser, offerPublicEntityId, {
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

  it("appends pending delivery events without closing the winning thread", async () => {
    offerThreadsRepositoryMock.findAcceptedThreadIdentityByRequestId.mockResolvedValue({
      threadId: writableContext.threadId,
      threadPublicId: writableContext.threadPublicId,
      offerId: writableContext.offerId,
      offerPublicId: writableContext.offerPublicId,
      customerId: writableContext.customerId,
      carrierId: writableContext.carrierId,
    });

    await service.appendShipmentSystemEventByRequestId(
      writableContext.requestId,
      writableContext.carrierId,
      "DELIVERY_PENDING_CONFIRMATION",
      tx
    );

    expect(
      offerThreadsRepositoryMock.findAcceptedThreadIdentityByRequestId
    ).toHaveBeenCalledWith(writableContext.requestId, tx);
    expect(offerThreadsRepositoryMock.appendSystemEvent).toHaveBeenCalledWith(
      {
        threadId: writableContext.threadId,
        customerId: writableContext.customerId,
        carrierId: writableContext.carrierId,
        actorUserId: writableContext.carrierId,
        systemEventCode: "DELIVERY_PENDING_CONFIRMATION",
      },
      tx
    );
    expect(offerThreadsRepositoryMock.appendSystemEventAndClose).not.toHaveBeenCalled();
  });

  it("blocks generic delivery-confirmed appends so thread closure stays centralized", async () => {
    await expect(
      service.appendShipmentSystemEventByRequestId(
        writableContext.requestId,
        writableContext.customerId,
        "DELIVERY_CONFIRMED",
        tx
      )
    ).rejects.toThrow(
      new InternalServerErrorException(
        "Delivery confirmation must close the winning thread via appendDeliveryConfirmedAndCloseByRequestId."
      )
    );

    expect(
      offerThreadsRepositoryMock.findAcceptedThreadIdentityByRequestId
    ).not.toHaveBeenCalled();
    expect(offerThreadsRepositoryMock.appendSystemEvent).not.toHaveBeenCalled();
    expect(offerThreadsRepositoryMock.appendSystemEventAndClose).not.toHaveBeenCalled();
  });

  it("closes the winning thread only through customer delivery confirmation", async () => {
    offerThreadsRepositoryMock.findAcceptedThreadIdentityByRequestId.mockResolvedValue({
      threadId: writableContext.threadId,
      threadPublicId: writableContext.threadPublicId,
      offerId: writableContext.offerId,
      offerPublicId: writableContext.offerPublicId,
      customerId: writableContext.customerId,
      carrierId: writableContext.carrierId,
    });

    await service.appendDeliveryConfirmedAndCloseByRequestId(
      writableContext.requestId,
      writableContext.customerId,
      tx
    );

    expect(offerThreadsRepositoryMock.appendSystemEventAndClose).toHaveBeenCalledWith(
      {
        threadId: writableContext.threadId,
        customerId: writableContext.customerId,
        carrierId: writableContext.carrierId,
        actorUserId: writableContext.customerId,
        systemEventCode: "DELIVERY_CONFIRMED",
      },
      tx
    );
    expect(offerThreadsRepositoryMock.appendSystemEvent).not.toHaveBeenCalled();
  });
});
