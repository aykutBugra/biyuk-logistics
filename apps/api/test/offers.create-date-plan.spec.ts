import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import { MediaStorageService } from "../src/infrastructure/media/media-storage.service";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { CarrierRoutesService } from "../src/modules/carrier-routes/carrier-routes.service";
import { NotificationsPublisher } from "../src/modules/notifications/notifications.publisher";
import { OfferThreadsService } from "../src/modules/offer-threads/offer-threads.service";
import { OffersService } from "../src/modules/offers/offers.service";
import { OpenRequestRouteAwareEvaluator } from "../src/modules/offers/open-request-route-aware-evaluator.service";
import { OffersRepository } from "../src/modules/offers/repositories/offers.repository";
import { VehicleCapacityService } from "../src/modules/vehicle-capacity/vehicle-capacity.service";

describe("OffersService.create planned dates", () => {
  const currentUser = {
    id: 22,
    publicId: "550e8400-e29b-41d4-a716-446655440022",
    mail: "carrier@example.com",
    kullaniciAdi: "carrier",
    roles: [ROLE_NAMES.NAKLIYECI],
  };
  const requestPublicEntityId = {
    kind: "uuid",
    value: "550e8400-e29b-41d4-a716-446655440501",
  } as const;
  const vehiclePublicId = "550e8400-e29b-41d4-a716-446655440901";
  const tx = { kind: "offers-create-tx" };

  let service: OffersService;
  let offersRepositoryMock: {
    findOfferCreateContextByRequestId: jest.Mock;
    findActiveVehicleByIdAndOwnerId: jest.Mock;
    carrierHasExistingOfferForRequest: jest.Mock;
    findStatusIdByTypeAndName: jest.Mock;
    create: jest.Mock;
  };
  let notificationsPublisherMock: {
    publishIncomingOffer: jest.Mock;
  };
  let offerThreadsServiceMock: {
    bootstrapThreadForOffer: jest.Mock;
  };
  let prismaServiceMock: {
    client: {
      $transaction: jest.Mock;
    };
  };

  beforeEach(async () => {
    offersRepositoryMock = {
      findOfferCreateContextByRequestId: jest.fn().mockResolvedValue({
        id: 501,
        publicId: requestPublicEntityId.value,
        musteriId: 10,
        silmeTarihi: null,
        durumTuru: "ISTEK",
        durumAdi: "OLUSTURULDU",
        hasNakliye: false,
      }),
      findActiveVehicleByIdAndOwnerId: jest.fn().mockResolvedValue({
        id: 901,
        publicId: vehiclePublicId,
        plaka: "34ABC34",
      }),
      carrierHasExistingOfferForRequest: jest.fn().mockResolvedValue(false),
      findStatusIdByTypeAndName: jest.fn().mockResolvedValue(1),
      create: jest.fn(),
    };
    notificationsPublisherMock = {
      publishIncomingOffer: jest.fn().mockResolvedValue(undefined),
    };
    offerThreadsServiceMock = {
      bootstrapThreadForOffer: jest.fn().mockResolvedValue(undefined),
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
          useValue: {},
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

  it("rejects new offers without a planned pickup date", async () => {
    await expect(
      service.create(currentUser, requestPublicEntityId, {
        aracId: vehiclePublicId,
        fiyat: 12500,
        tahminiTeslimTarihi: "2026-06-14",
      } as never)
    ).rejects.toThrow(
      new BadRequestException(
        "Planlanan alim ve tahmini teslim tarihleri YYYY-MM-DD formatinda olmalidir."
      )
    );

    expect(offersRepositoryMock.create).not.toHaveBeenCalled();
  });

  it("rejects invalid date-only values", async () => {
    await expect(
      service.create(currentUser, requestPublicEntityId, {
        aracId: vehiclePublicId,
        fiyat: 12500,
        planlananAlimTarihi: "2026-02-31",
      })
    ).rejects.toThrow(
      new BadRequestException(
        "Planlanan alim ve tahmini teslim tarihleri YYYY-MM-DD formatinda olmalidir."
      )
    );

    expect(offersRepositoryMock.create).not.toHaveBeenCalled();
  });

  it("rejects estimated delivery before planned pickup", async () => {
    await expect(
      service.create(currentUser, requestPublicEntityId, {
        aracId: vehiclePublicId,
        fiyat: 12500,
        planlananAlimTarihi: "2026-06-12",
        tahminiTeslimTarihi: "2026-06-11",
      })
    ).rejects.toThrow(
      new BadRequestException(
        "Tahmini teslim tarihi planlanan alim tarihinden once olamaz."
      )
    );

    expect(offersRepositoryMock.create).not.toHaveBeenCalled();
  });

  it("persists planned dates as date-only UTC values", async () => {
    offersRepositoryMock.create.mockResolvedValue({
      id: 77,
      publicId: "550e8400-e29b-41d4-a716-446655440077",
      requestId: 501,
      requestPublicId: requestPublicEntityId.value,
      baslangicSehri: "Istanbul",
      varisSehri: "Ankara",
      aracId: 901,
      aracPublicId: vehiclePublicId,
      aracPlaka: "34ABC34",
      fiyat: 12500,
      not: null,
      planlananAlimTarihi: new Date("2026-06-12T00:00:00.000Z"),
      tahminiTeslimTarihi: new Date("2026-06-14T00:00:00.000Z"),
      durumAdi: "OLUSTURULDU",
    });

    const response = await service.create(currentUser, requestPublicEntityId, {
      aracId: vehiclePublicId,
      fiyat: 12500,
      planlananAlimTarihi: "2026-06-12",
      tahminiTeslimTarihi: "2026-06-14",
    });

    expect(offersRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        planlananAlimTarihi: new Date("2026-06-12T00:00:00.000Z"),
        tahminiTeslimTarihi: new Date("2026-06-14T00:00:00.000Z"),
      }),
      tx
    );
    expect(response).toEqual(
      expect.objectContaining({
        planlananAlimTarihi: "2026-06-12",
        tahminiTeslimTarihi: "2026-06-14",
      })
    );
  });
});
