import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { NotificationsPublisher } from "../src/modules/notifications/notifications.publisher";
import { JobsRepository } from "../src/modules/jobs/repositories/jobs.repository";
import { JobsService } from "../src/modules/jobs/jobs.service";
import { VehicleCapacityService } from "../src/modules/vehicle-capacity/vehicle-capacity.service";

describe("JobsService read context", () => {
  const dualRoleUser = {
    id: 10,
    publicId: "550e8400-e29b-41d4-a716-446655440010",
    mail: "dual@example.com",
    kullaniciAdi: "dual",
    roles: [ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI],
  };

  const customerJob = {
    id: 501,
    publicId: "550e8400-e29b-41d4-a716-446655440501",
    requestId: 700,
    requestPublicId: "550e8400-e29b-41d4-a716-446655440700",
    baslangicSehri: "Istanbul",
    varisSehri: "Ankara",
    anlasilanFiyat: 9500,
    aracPlaka: "34ABC34",
    durumAdi: "OLUSTURULDU",
    olusturmaTarihi: new Date("2026-05-01T08:00:00.000Z"),
    baslangicTarihi: null,
    teslimBildirimTarihi: null,
    teslimTarihi: null,
    counterpartyId: 22,
    counterpartyPublicId: "550e8400-e29b-41d4-a716-446655440022",
    counterpartyName: "Carrier User",
    counterpartyUsername: "carrier",
  };

  let service: JobsService;
  let jobsRepositoryMock: {
    findManyByCarrierId: jest.Mock;
    findManyByCustomerId: jest.Mock;
  };

  beforeEach(async () => {
    jobsRepositoryMock = {
      findManyByCarrierId: jest.fn().mockResolvedValue([]),
      findManyByCustomerId: jest.fn().mockResolvedValue([customerJob]),
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
          useValue: {},
        },
        {
          provide: VehicleCapacityService,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: { client: {} },
        },
      ],
    }).compile();

    service = moduleRef.get(JobsService);
  });

  it("requires explicit audience for dual-role job reads", async () => {
    await expect(service.getMine(dualRoleUser, {})).rejects.toThrow(
      new ConflictException(
        "cift rolleri olan kullanıcılar, iş okuma işlemleri için ?as=customer veya ?as=carrier parametresini belirtmek zorundadır."
      )
    );
  });

  it("uses the requested customer audience instead of carrier-first fallback", async () => {
    const response = await service.getMine(dualRoleUser, { as: "customer" });

    expect(jobsRepositoryMock.findManyByCarrierId).not.toHaveBeenCalled();
    expect(jobsRepositoryMock.findManyByCustomerId).toHaveBeenCalledWith(
      dualRoleUser.id
    );
    expect(response).toEqual([
      expect.objectContaining({
        id: customerJob.publicId,
        participantSide: "customer",
      }),
    ]);
  });
});
