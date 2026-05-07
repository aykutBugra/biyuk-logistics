import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { NotificationsPublisher } from "../src/modules/notifications/notifications.publisher";
import {
  type CompleteJobResult,
  JobsRepository,
  type StoredJobDetailRecord,
} from "../src/modules/jobs/repositories/jobs.repository";
import { JobsService } from "../src/modules/jobs/jobs.service";
import { VehicleCapacityService } from "../src/modules/vehicle-capacity/vehicle-capacity.service";

describe("JobsService.completeById", () => {
  const currentUser = {
    id: 22,
    mail: "carrier@example.com",
    kullaniciAdi: "carrier",
    roles: [ROLE_NAMES.NAKLIYECI],
  };

  const startedJob: StoredJobDetailRecord = {
    id: 303,
    requestId: 501,
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
    yukDetay: "Mobilya",
    anlasilanFiyat: 12500,
    durumTuru: "NAKLIYE",
    durumAdi: "BASLATILDI",
    requestStatusTuru: "ISTEK",
    requestStatusAdi: "ANLASILDI",
    requestDeletedAt: null,
    olusturmaTarihi: new Date("2026-05-01T09:00:00.000Z"),
    baslangicTarihi: new Date("2026-05-02T09:00:00.000Z"),
    teslimTarihi: null,
    carrierId: currentUser.id,
    carrierName: "Carrier Name",
    carrierUsername: currentUser.kullaniciAdi,
    customerId: 10,
    customerName: "Customer Name",
    customerUsername: "customer",
    aracId: 901,
    aracPlaka: "34ABC34",
    aracMarka: "Ford",
    aracModel: "Transit",
    aracDeletedAt: null,
    ratings: [],
  };

  const completedJob: StoredJobDetailRecord = {
    ...startedJob,
    durumAdi: "TAMAMLANDI",
    teslimTarihi: new Date("2026-05-03T18:30:00.000Z"),
  };

  const tx = { kind: "jobs-tx" };

  let service: JobsService;
  let jobsRepositoryMock: {
    findByIdAndCarrierId: jest.Mock;
    findStatusIdByTypeAndName: jest.Mock;
    completeByIdAndCarrierIdInTransaction: jest.Mock;
  };
  let notificationsPublisherMock: {
    publishJobCompleted: jest.Mock;
    publishRatingPending: jest.Mock;
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
        .mockResolvedValueOnce(completedJob),
      findStatusIdByTypeAndName: jest
        .fn()
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4),
      completeByIdAndCarrierIdInTransaction: jest.fn(),
    };
    notificationsPublisherMock = {
      publishJobCompleted: jest.fn().mockResolvedValue(undefined),
      publishRatingPending: jest.fn().mockResolvedValue(undefined),
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

  it("releases reservations and publishes completion only after a successful transaction", async () => {
    jobsRepositoryMock.completeByIdAndCarrierIdInTransaction.mockResolvedValue({
      ok: true,
    } satisfies CompleteJobResult);

    const response = await service.completeById(currentUser, startedJob.id);

    expect(jobsRepositoryMock.completeByIdAndCarrierIdInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        jobId: startedJob.id,
        carrierId: currentUser.id,
        requestId: startedJob.requestId,
      })
    );
    expect(vehicleCapacityServiceMock.releaseReservationByShipmentId).toHaveBeenCalledWith(
      startedJob.id,
      "COMPLETED",
      tx
    );
    expect(notificationsPublisherMock.publishJobCompleted).toHaveBeenCalledWith({
      customerId: completedJob.customerId,
      jobId: completedJob.id,
      requestId: completedJob.requestId,
      actorUserId: currentUser.id,
      route: {
        baslangicSehri: completedJob.baslangicSehri,
        varisSehri: completedJob.varisSehri,
      },
    });
    expect(notificationsPublisherMock.publishRatingPending).toHaveBeenCalledWith({
      userId: completedJob.carrierId,
      jobId: completedJob.id,
      actorUserId: currentUser.id,
    });
    expect(response.durum).toBe("TAMAMLANDI");
    expect(response.canComplete).toBe(false);
  });

  it("fails the transaction before release/publish when request completion is no longer valid", async () => {
    jobsRepositoryMock.completeByIdAndCarrierIdInTransaction.mockResolvedValue({
      ok: false,
      reason: "request_not_agreed",
    } satisfies CompleteJobResult);

    await expect(service.completeById(currentUser, startedJob.id)).rejects.toThrow(
      new ConflictException(
        "Shipment can no longer be completed because the related request is no longer in an agreed state."
      )
    );

    expect(vehicleCapacityServiceMock.releaseReservationByShipmentId).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishJobCompleted).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishRatingPending).not.toHaveBeenCalled();
  });

  it("rejects self-shipment completion before any lifecycle mutation runs", async () => {
    jobsRepositoryMock.findByIdAndCarrierId.mockReset();
    jobsRepositoryMock.findByIdAndCarrierId.mockResolvedValue({
      ...startedJob,
      customerId: currentUser.id,
    });

    await expect(service.completeById(currentUser, startedJob.id)).rejects.toThrow(
      new ConflictException(
        "Shipment lifecycle is blocked because the carrier and customer resolve to the same user."
      )
    );

    expect(jobsRepositoryMock.completeByIdAndCarrierIdInTransaction).not.toHaveBeenCalled();
    expect(vehicleCapacityServiceMock.releaseReservationByShipmentId).not.toHaveBeenCalled();
    expect(notificationsPublisherMock.publishJobCompleted).not.toHaveBeenCalled();
  });
});
