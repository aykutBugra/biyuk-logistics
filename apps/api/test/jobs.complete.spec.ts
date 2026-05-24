import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { NotificationsPublisher } from "../src/modules/notifications/notifications.publisher";
import {
  type ConfirmDeliveryJobResult,
  JobsRepository,
  type MarkDeliveredJobResult,
  type StoredJobDetailRecord,
} from "../src/modules/jobs/repositories/jobs.repository";
import { JobsService } from "../src/modules/jobs/jobs.service";
import { OfferThreadsService } from "../src/modules/offer-threads/offer-threads.service";
import {
  VEHICLE_CAPACITY_RELEASE_REASONS,
  VehicleCapacityService,
} from "../src/modules/vehicle-capacity/vehicle-capacity.service";

describe("JobsService.markDeliveredById", () => {
  const currentUser = {
    id: 22,
    publicId: "550e8400-e29b-41d4-a716-446655440022",
    mail: "carrier@example.com",
    kullaniciAdi: "carrier",
    roles: [ROLE_NAMES.NAKLIYECI],
  };
  const customerUser = {
    id: 10,
    publicId: "550e8400-e29b-41d4-a716-446655440010",
    mail: "customer@example.com",
    kullaniciAdi: "customer",
    roles: [ROLE_NAMES.MUSTERI],
  };

  const startedJob: StoredJobDetailRecord = {
    id: 303,
    publicId: "550e8400-e29b-41d4-a716-446655440303",
    requestId: 501,
    requestPublicId: "550e8400-e29b-41d4-a716-446655440501",
    baslangicSehri: "Istanbul",
    varisSehri: "Ankara",
    baslangicKonumMetni: "Kadikoy",
    varisKonumMetni: "Cankaya",
    baslangicEnlem: 41.01,
    baslangicBoylam: 29.03,
    varisEnlem: 39.92,
    varisBoylam: 32.85,
    tekTasimaIstiyor: false,
    agirlikKg: 1200,
    hacimM3: 12,
    yukTipi: "GENEL",
    tasimaTarihi: "2026-05-05",
    planlananAlimTarihi: new Date("2026-05-05T00:00:00.000Z"),
    tahminiTeslimTarihi: new Date("2026-05-06T00:00:00.000Z"),
    yukDetay: "Mobilya",
    anlasilanFiyat: 12500,
    durumTuru: "NAKLIYE",
    durumAdi: "BASLATILDI",
    requestStatusTuru: "ISTEK",
    requestStatusAdi: "ANLASILDI",
    requestDeletedAt: null,
    olusturmaTarihi: new Date("2026-05-01T09:00:00.000Z"),
    baslangicTarihi: new Date("2026-05-02T09:00:00.000Z"),
    teslimBildirimTarihi: null,
    teslimTarihi: null,
    carrierId: currentUser.id,
    carrierPublicId: currentUser.publicId,
    carrierName: "Carrier Name",
    carrierUsername: currentUser.kullaniciAdi,
    customerId: 10,
    customerPublicId: customerUser.publicId,
    customerName: "Customer Name",
    customerUsername: "customer",
    aracId: 901,
    aracPublicId: "550e8400-e29b-41d4-a716-446655440901",
    aracPlaka: "34ABC34",
    aracMarka: "Ford",
    aracModel: "Transit",
    aracDeletedAt: null,
    ratings: [],
  };

  const pendingJob: StoredJobDetailRecord = {
    ...startedJob,
    durumAdi: "TESLIM_BEKLIYOR",
    teslimBildirimTarihi: new Date("2026-05-03T18:30:00.000Z"),
  };
  const completedJob: StoredJobDetailRecord = {
    ...pendingJob,
    durumAdi: "TAMAMLANDI",
    teslimTarihi: new Date("2026-05-03T19:10:00.000Z"),
  };
  const jobPublicEntityId = {
    kind: "uuid",
    value: startedJob.publicId,
  } as const;

  const tx = { kind: "jobs-tx" };

  let service: JobsService;
  let jobsRepositoryMock: {
    findByIdAndCarrierId: jest.Mock;
    findByIdAndCustomerId: jest.Mock;
    findStatusIdByTypeAndName: jest.Mock;
    markDeliveredByIdAndCarrierIdInTransaction: jest.Mock;
    confirmDeliveryByIdAndCustomerIdInTransaction: jest.Mock;
  };
  let notificationsPublisherMock: {
    publishDeliveryConfirmationRequested: jest.Mock;
    publishJobCompletedForCarrier: jest.Mock;
    publishRatingPending: jest.Mock;
  };
  let offerThreadsServiceMock: {
    appendShipmentSystemEventByRequestId: jest.Mock;
    appendDeliveryConfirmedAndCloseByRequestId: jest.Mock;
  };
  let vehicleCapacityServiceMock: {
    releaseReservationByShipmentId: jest.Mock;
  };
  let prismaServiceMock: {
    client: {
      $transaction: jest.Mock;
    };
  };

  beforeEach(async () => {
    jobsRepositoryMock = {
      findByIdAndCarrierId: jest
        .fn()
        .mockResolvedValueOnce(startedJob)
        .mockResolvedValueOnce(pendingJob),
      findByIdAndCustomerId: jest.fn(),
      findStatusIdByTypeAndName: jest
        .fn()
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2),
      markDeliveredByIdAndCarrierIdInTransaction: jest.fn(),
      confirmDeliveryByIdAndCustomerIdInTransaction: jest.fn(),
    };
    notificationsPublisherMock = {
      publishDeliveryConfirmationRequested: jest.fn().mockResolvedValue(undefined),
      publishJobCompletedForCarrier: jest.fn().mockResolvedValue(undefined),
      publishRatingPending: jest.fn().mockResolvedValue(undefined),
    };
    offerThreadsServiceMock = {
      appendShipmentSystemEventByRequestId: jest.fn().mockResolvedValue(undefined),
      appendDeliveryConfirmedAndCloseByRequestId: jest.fn().mockResolvedValue(undefined),
    };
    vehicleCapacityServiceMock = {
      releaseReservationByShipmentId: jest.fn().mockResolvedValue(undefined),
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
        JobsService,
        {
          provide: JobsRepository,
          useValue: jobsRepositoryMock,
        },
        {
          provide: NotificationsPublisher,
          useValue: notificationsPublisherMock,
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

    service = moduleRef.get(JobsService);
  });

  it("marks delivery as pending and asks the customer for confirmation", async () => {
    jobsRepositoryMock.markDeliveredByIdAndCarrierIdInTransaction.mockResolvedValue({
      ok: true,
    } satisfies MarkDeliveredJobResult);

    const response = await service.markDeliveredById(currentUser, jobPublicEntityId);

    expect(jobsRepositoryMock.markDeliveredByIdAndCarrierIdInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        jobId: startedJob.id,
        carrierId: currentUser.id,
      })
    );
    expect(vehicleCapacityServiceMock.releaseReservationByShipmentId).not.toHaveBeenCalled();
    expect(offerThreadsServiceMock.appendShipmentSystemEventByRequestId).toHaveBeenCalledWith(
      startedJob.requestId,
      currentUser.id,
      "DELIVERY_PENDING_CONFIRMATION",
      tx
    );
    expect(
      offerThreadsServiceMock.appendDeliveryConfirmedAndCloseByRequestId
    ).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishDeliveryConfirmationRequested).toHaveBeenCalledWith({
      customerId: pendingJob.customerId,
      jobId: pendingJob.publicId,
      requestId: pendingJob.requestPublicId,
      actorUserId: currentUser.id,
      route: {
        baslangicSehri: pendingJob.baslangicSehri,
        varisSehri: pendingJob.varisSehri,
      },
    });
    expect(notificationsPublisherMock.publishRatingPending).not.toHaveBeenCalled();
    expect(response.durum).toBe("TESLIM_BEKLIYOR");
    expect(response.canMarkDelivered).toBe(false);
    expect(response.ratingContext.canRateCounterparty).toBe(false);
  });

  it("fails before notification when the shipment is no longer started", async () => {
    jobsRepositoryMock.markDeliveredByIdAndCarrierIdInTransaction.mockResolvedValue({
      ok: false,
      reason: "job_not_started",
    } satisfies MarkDeliveredJobResult);

    await expect(service.markDeliveredById(currentUser, jobPublicEntityId)).rejects.toThrow(
      new ConflictException("Nakliye teslim bildirimi icin uygun degil.")
    );

    expect(vehicleCapacityServiceMock.releaseReservationByShipmentId).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishDeliveryConfirmationRequested).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishRatingPending).not.toHaveBeenCalled();
  });

  it("rejects self-shipment completion before any lifecycle mutation runs", async () => {
    jobsRepositoryMock.findByIdAndCarrierId.mockReset();
    jobsRepositoryMock.findByIdAndCarrierId.mockResolvedValue({
      ...startedJob,
      customerId: currentUser.id,
    });

    await expect(service.markDeliveredById(currentUser, jobPublicEntityId)).rejects.toThrow(
      ConflictException
    );

    expect(jobsRepositoryMock.markDeliveredByIdAndCarrierIdInTransaction).not.toHaveBeenCalled();
    expect(vehicleCapacityServiceMock.releaseReservationByShipmentId).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishDeliveryConfirmationRequested).not.toHaveBeenCalled();
  });

  it("finalizes delivery only after customer confirmation", async () => {
    jobsRepositoryMock.findByIdAndCustomerId
      .mockResolvedValueOnce(pendingJob)
      .mockResolvedValueOnce(completedJob);
    jobsRepositoryMock.findStatusIdByTypeAndName.mockReset();
    jobsRepositoryMock.findStatusIdByTypeAndName
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5);
    jobsRepositoryMock.confirmDeliveryByIdAndCustomerIdInTransaction.mockResolvedValue({
      ok: true,
    } satisfies ConfirmDeliveryJobResult);

    const response = await service.confirmDeliveryById(customerUser, jobPublicEntityId);

    expect(
      jobsRepositoryMock.confirmDeliveryByIdAndCustomerIdInTransaction
    ).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        jobId: pendingJob.id,
        customerId: customerUser.id,
        requestId: pendingJob.requestId,
      })
    );
    expect(vehicleCapacityServiceMock.releaseReservationByShipmentId).toHaveBeenCalledWith(
      pendingJob.id,
      VEHICLE_CAPACITY_RELEASE_REASONS.COMPLETED,
      tx
    );
    expect(offerThreadsServiceMock.appendDeliveryConfirmedAndCloseByRequestId).toHaveBeenCalledWith(
      pendingJob.requestId,
      customerUser.id,
      tx
    );
    expect(notificationsPublisherMock.publishJobCompletedForCarrier).toHaveBeenCalledWith({
      carrierId: completedJob.carrierId,
      jobId: completedJob.publicId,
      requestId: completedJob.requestPublicId,
      actorUserId: customerUser.id,
      route: {
        baslangicSehri: completedJob.baslangicSehri,
        varisSehri: completedJob.varisSehri,
      },
    });
    expect(notificationsPublisherMock.publishRatingPending).toHaveBeenCalledWith({
      userId: completedJob.carrierId,
      jobId: completedJob.publicId,
      actorUserId: customerUser.id,
    });
    expect(notificationsPublisherMock.publishDeliveryConfirmationRequested).not.toHaveBeenCalled();
    expect(response.durum).toBe("TAMAMLANDI");
    expect(response.canConfirmDelivery).toBe(false);
  });

  it("does not release capacity or close the thread when customer confirmation loses the race", async () => {
    jobsRepositoryMock.findByIdAndCustomerId.mockResolvedValueOnce(pendingJob);
    jobsRepositoryMock.findStatusIdByTypeAndName.mockReset();
    jobsRepositoryMock.findStatusIdByTypeAndName
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(5);
    jobsRepositoryMock.confirmDeliveryByIdAndCustomerIdInTransaction.mockResolvedValue({
      ok: false,
      reason: "job_not_pending_delivery",
    } satisfies ConfirmDeliveryJobResult);

    await expect(service.confirmDeliveryById(customerUser, jobPublicEntityId)).rejects.toThrow(
      new ConflictException("Nakliye teslim onayi icin uygun degil.")
    );

    expect(vehicleCapacityServiceMock.releaseReservationByShipmentId).not.toHaveBeenCalled();
    expect(offerThreadsServiceMock.appendShipmentSystemEventByRequestId).not.toHaveBeenCalled();
    expect(
      offerThreadsServiceMock.appendDeliveryConfirmedAndCloseByRequestId
    ).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishJobCompletedForCarrier).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishRatingPending).not.toHaveBeenCalled();
  });
});
