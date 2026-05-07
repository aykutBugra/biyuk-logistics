import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { CarrierRoutesService } from "../src/modules/carrier-routes/carrier-routes.service";
import { NotificationsPublisher } from "../src/modules/notifications/notifications.publisher";
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
    mail: "customer@example.com",
    kullaniciAdi: "customer",
    roles: [ROLE_NAMES.MUSTERI],
  };

  const offerContext: OfferDecisionContextRecord = {
    offerId: 77,
    requestId: 501,
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
  };

  const acceptance: Extract<AcceptOfferResult, { ok: true }> = {
    ok: true,
    jobId: 303,
    reservationSnapshot: {
      vehicleId: 901,
      shipmentId: 303,
      requestId: 501,
      offerId: 77,
      reservedAgirlikKg: 1200,
      reservedHacimM3: 12,
      isDedicated: false,
    },
    rejectedSiblingOffers: [{ offerId: 78, carrierId: 33 }],
  };

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
    closeAcceptedOfferThread: jest.Mock;
    closeRequestUnavailableThreads: jest.Mock;
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
      closeAcceptedOfferThread: jest.fn().mockResolvedValue(undefined),
      closeRequestUnavailableThreads: jest.fn().mockResolvedValue(undefined),
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
          provide: NotificationsPublisher,
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
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get(OffersService);
  });

  it("commits the acceptance flow only when every mutation succeeds", async () => {
    offersRepositoryMock.acceptOfferInTransaction.mockResolvedValue(acceptance);

    await service.acceptById(currentUser, offerContext.offerId);

    expect(offersRepositoryMock.acceptOfferInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        offerId: offerContext.offerId,
        requestId: offerContext.requestId,
        carrierId: offerContext.carrierId,
      })
    );
    expect(offerThreadsServiceMock.closeAcceptedOfferThread).toHaveBeenCalledWith(
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
      offerId: offerContext.offerId,
      requestId: offerContext.requestId,
      jobId: acceptance.jobId,
      actorUserId: currentUser.id,
    });
    expect(notificationsPublisherMock.publishOfferRejected).toHaveBeenCalledWith({
      carrierId: acceptance.rejectedSiblingOffers[0].carrierId,
      offerId: acceptance.rejectedSiblingOffers[0].offerId,
      requestId: offerContext.requestId,
      actorUserId: currentUser.id,
    });
  });

  it("throws inside the transaction callback and skips follow-up work when invariants fail", async () => {
    offersRepositoryMock.acceptOfferInTransaction.mockResolvedValue({
      ok: false,
      reason: "request_not_open",
    } satisfies AcceptOfferResult);

    await expect(service.acceptById(currentUser, offerContext.offerId)).rejects.toThrow(
      new ConflictException("Offer can no longer be accepted.")
    );

    expect(offerThreadsServiceMock.closeAcceptedOfferThread).not.toHaveBeenCalled();
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

    await expect(service.acceptById(currentUser, offerContext.offerId)).rejects.toThrow(
      new ConflictException(
        "Offer decisions are blocked because the transport request owner and offer carrier resolve to the same user."
      )
    );

    expect(offersRepositoryMock.acceptOfferInTransaction).not.toHaveBeenCalled();
    expect(offerThreadsServiceMock.closeAcceptedOfferThread).not.toHaveBeenCalled();
    expect(vehicleCapacityServiceMock.createReservationForShipment).not.toHaveBeenCalled();
  });
});
