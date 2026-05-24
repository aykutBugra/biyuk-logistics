import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import { MediaStorageService } from "../src/infrastructure/media/media-storage.service";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { CarrierRoutesService } from "../src/modules/carrier-routes/carrier-routes.service";
import { NOTIFICATION_PUBLISHER } from "../src/modules/notifications/notification-publisher.token";
import { OfferThreadsService } from "../src/modules/offer-threads/offer-threads.service";
import { OffersService } from "../src/modules/offers/offers.service";
import { OpenRequestRouteAwareEvaluator } from "../src/modules/offers/open-request-route-aware-evaluator.service";
import {
  type AcceptOfferResult,
  type OfferDecisionContextRecord,
  OffersRepository,
} from "../src/modules/offers/repositories/offers.repository";
import { VehicleCapacityService } from "../src/modules/vehicle-capacity/vehicle-capacity.service";

describe("OffersService.acceptById", () => {
  const currentUser = {
    id: 10,
    publicId: "550e8400-e29b-41d4-a716-446655440010",
    mail: "customer@example.com",
    kullaniciAdi: "customer",
    roles: [ROLE_NAMES.MUSTERI],
  };

  const offerContext: OfferDecisionContextRecord = {
    offerId: 77,
    offerPublicId: "550e8400-e29b-41d4-a716-446655440077",
    requestId: 501,
    requestPublicId: "550e8400-e29b-41d4-a716-446655440501",
    customerId: currentUser.id,
    carrierId: 22,
    offerStatusTuru: "TEKLIF",
    offerStatusAdi: "OLUSTURULDU",
    requestStatusTuru: "ISTEK",
    requestStatusAdi: "OLUSTURULDU",
    requestDeletedAt: null,
    hasShipment: false,
    aracId: 901,
    aracPlaka: "34ABC34",
    aracDeletedAt: null,
    aracOwnerId: 22,
    fiyat: 12500,
    planlananAlimTarihi: new Date("2026-06-12T00:00:00.000Z"),
    tahminiTeslimTarihi: new Date("2026-06-14T00:00:00.000Z"),
  };

  const acceptance: Extract<AcceptOfferResult, { ok: true }> = {
    ok: true,
    jobId: 303,
    jobPublicId: "550e8400-e29b-41d4-a716-446655440303",
    reservationSnapshot: {
      vehicleId: 901,
      shipmentId: 303,
      requestId: 501,
      offerId: 77,
      reservedAgirlikKg: 1200,
      reservedHacimM3: 12,
      isDedicated: false,
    },
    rejectedSiblingOffers: [
      {
        offerId: 78,
        offerPublicId: "550e8400-e29b-41d4-a716-446655440078",
        carrierId: 33,
      },
    ],
  };
  const offerPublicEntityId = {
    kind: "uuid",
    value: offerContext.offerPublicId,
  } as const;

  const tx = { kind: "offers-tx" };

  let service: OffersService;
  let offersRepositoryMock: {
    findOfferDecisionContextById: jest.Mock;
    findStatusIdByTypeAndName: jest.Mock;
    acceptOfferInTransaction: jest.Mock;
  };
  let notificationsPublisherMock: {
    publishOfferAccepted: jest.Mock;
    publishOfferRejected: jest.Mock;
  };
  let offerThreadsServiceMock: {
    appendAcceptedOfferThread: jest.Mock;
    closeRequestUnavailableThreads: jest.Mock;
    getLastPriceActorSide: jest.Mock;
  };
  let vehicleCapacityServiceMock: {
    createReservationForShipment: jest.Mock;
  };
  let prismaServiceMock: {
    client: {
      $transaction: jest.Mock;
    };
  };

  beforeEach(async () => {
    offersRepositoryMock = {
      findOfferDecisionContextById: jest.fn().mockResolvedValue(offerContext),
      findStatusIdByTypeAndName: jest
        .fn()
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(6),
      acceptOfferInTransaction: jest.fn(),
    };
    notificationsPublisherMock = {
      publishOfferAccepted: jest.fn().mockResolvedValue(undefined),
      publishOfferRejected: jest.fn().mockResolvedValue(undefined),
    };
    offerThreadsServiceMock = {
      appendAcceptedOfferThread: jest.fn().mockResolvedValue(undefined),
      closeRequestUnavailableThreads: jest.fn().mockResolvedValue(undefined),
      getLastPriceActorSide: jest.fn().mockResolvedValue("carrier"),
    };
    vehicleCapacityServiceMock = {
      createReservationForShipment: jest.fn().mockResolvedValue(undefined),
    };
    prismaServiceMock = {
      client: {
        $transaction: jest.fn(
          async (callback: (executor: object) => Promise<unknown>) => callback(tx)
        ),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OffersService,
        {
          provide: OffersRepository,
          useValue: offersRepositoryMock,
        },
        {
          provide: NOTIFICATION_PUBLISHER,
          useValue: notificationsPublisherMock,
        },
        {
          provide: CarrierRoutesService,
          useValue: {},
        },
        {
          provide: OpenRequestRouteAwareEvaluator,
          useValue: {},
        },
        {
          provide: OfferThreadsService,
          useValue: offerThreadsServiceMock,
        },
        {
          provide: VehicleCapacityService,
          useValue: vehicleCapacityServiceMock,
        },
        {
          provide: MediaStorageService,
          useValue: {
            saveFile: jest.fn(),
            deleteFile: jest.fn(),
            toPublicUrl: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get(OffersService);
  });

  it("commits the acceptance flow only when every mutation succeeds", async () => {
    offersRepositoryMock.acceptOfferInTransaction.mockResolvedValue(acceptance);

    await service.acceptById(currentUser, offerPublicEntityId);

    expect(offersRepositoryMock.acceptOfferInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        offerId: offerContext.offerId,
        requestId: offerContext.requestId,
        carrierId: offerContext.carrierId,
        planlananAlimTarihi: offerContext.planlananAlimTarihi,
        tahminiTeslimTarihi: offerContext.tahminiTeslimTarihi,
      })
    );
    expect(offerThreadsServiceMock.appendAcceptedOfferThread).toHaveBeenCalledWith(
      offerContext.offerId,
      currentUser.id,
      tx
    );
    expect(offerThreadsServiceMock.closeRequestUnavailableThreads).toHaveBeenCalledWith(
      [acceptance.rejectedSiblingOffers[0].offerId],
      currentUser.id,
      tx
    );
    expect(vehicleCapacityServiceMock.createReservationForShipment).toHaveBeenCalledWith(
      acceptance.reservationSnapshot,
      tx
    );
    expect(notificationsPublisherMock.publishOfferAccepted).toHaveBeenCalledWith({
      carrierId: offerContext.carrierId,
      offerId: offerContext.offerPublicId,
      requestId: offerContext.requestPublicId,
      jobId: acceptance.jobPublicId,
      actorUserId: currentUser.id,
    });
    expect(notificationsPublisherMock.publishOfferRejected).toHaveBeenCalledWith({
      carrierId: acceptance.rejectedSiblingOffers[0].carrierId,
      offerId: acceptance.rejectedSiblingOffers[0].offerPublicId,
      requestId: offerContext.requestPublicId,
      actorUserId: currentUser.id,
    });
  });

  it("throws inside the transaction callback and skips follow-up work when invariants fail", async () => {
    offersRepositoryMock.acceptOfferInTransaction.mockResolvedValue({
      ok: false,
      reason: "request_not_open",
    } satisfies AcceptOfferResult);

    await expect(service.acceptById(currentUser, offerPublicEntityId)).rejects.toThrow(
      new ConflictException("Offer can no longer be accepted.")
    );

    expect(offerThreadsServiceMock.appendAcceptedOfferThread).not.toHaveBeenCalled();
    expect(offerThreadsServiceMock.closeRequestUnavailableThreads).not.toHaveBeenCalled();
    expect(vehicleCapacityServiceMock.createReservationForShipment).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishOfferAccepted).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishOfferRejected).not.toHaveBeenCalled();
  });

  it("rejects self-dealing offer decisions before any acceptance mutation runs", async () => {
    offersRepositoryMock.findOfferDecisionContextById.mockResolvedValueOnce({
      ...offerContext,
      carrierId: currentUser.id,
    });

    await expect(service.acceptById(currentUser, offerPublicEntityId)).rejects.toThrow(
      new ConflictException(
        "Offer decisions are blocked because the transport request owner and offer carrier resolve to the same user."
      )
    );

    expect(offersRepositoryMock.acceptOfferInTransaction).not.toHaveBeenCalled();
    expect(offerThreadsServiceMock.appendAcceptedOfferThread).not.toHaveBeenCalled();
    expect(vehicleCapacityServiceMock.createReservationForShipment).not.toHaveBeenCalled();
  });

  it("allows accepting a legacy offer without structured planned dates", async () => {
    const legacyOfferContext = {
      ...offerContext,
      planlananAlimTarihi: null,
      tahminiTeslimTarihi: null,
    };
    offersRepositoryMock.findOfferDecisionContextById.mockResolvedValueOnce(
      legacyOfferContext
    );
    offersRepositoryMock.acceptOfferInTransaction.mockResolvedValue(acceptance);

    await service.acceptById(currentUser, offerPublicEntityId);

    expect(offersRepositoryMock.acceptOfferInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        offerId: legacyOfferContext.offerId,
        planlananAlimTarihi: null,
        tahminiTeslimTarihi: null,
      })
    );
  });
});
