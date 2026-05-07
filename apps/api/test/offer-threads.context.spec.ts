import { Test } from "@nestjs/testing";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { NotificationsPublisher } from "../src/modules/notifications/notifications.publisher";
import { OfferThreadsService } from "../src/modules/offer-threads/offer-threads.service";
import { OfferThreadsRepository } from "../src/modules/offer-threads/repositories/offer-threads.repository";

describe("OfferThreadsService role context", () => {
  const dualRoleUser = {
    id: 10,
    mail: "dual@example.com",
    kullaniciAdi: "dual",
    roles: [ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI],
  };

  let service: OfferThreadsService;
  let offerThreadsRepositoryMock: {
    findMyThreadSummaries: jest.Mock;
    countUnreadMessages: jest.Mock;
  };

  beforeEach(async () => {
    offerThreadsRepositoryMock = {
      findMyThreadSummaries: jest.fn().mockResolvedValue([
        {
          id: 1,
          offerId: 101,
          requestId: 501,
          baslangicSehri: "Istanbul",
          varisSehri: "Ankara",
          baslangicKonumMetni: "Kadikoy",
          varisKonumMetni: "Cankaya",
          customerId: dualRoleUser.id,
          customerName: "Dual User",
          customerUsername: "dual",
          carrierId: 22,
          carrierName: "Carrier User",
          carrierUsername: "carrier",
          fiyat: 12000,
          durum: "OLUSTURULDU",
          closedAt: null,
          customerLastReadMessageId: null,
          carrierLastReadMessageId: null,
          lastMessage: null,
        },
        {
          id: 2,
          offerId: 102,
          requestId: 502,
          baslangicSehri: "Izmir",
          varisSehri: "Bursa",
          baslangicKonumMetni: "Bornova",
          varisKonumMetni: "Nilufer",
          customerId: 33,
          customerName: "Customer User",
          customerUsername: "customer",
          carrierId: dualRoleUser.id,
          carrierName: "Dual User",
          carrierUsername: "dual",
          fiyat: 13000,
          durum: "OLUSTURULDU",
          closedAt: null,
          customerLastReadMessageId: null,
          carrierLastReadMessageId: null,
          lastMessage: null,
        },
      ]),
      countUnreadMessages: jest.fn().mockResolvedValue(0),
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
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: { client: {} },
        },
      ],
    }).compile();

    service = moduleRef.get(OfferThreadsService);
  });

  it("filters thread inbox by the requested participant side for dual-role users", async () => {
    const response = await service.getMine(dualRoleUser, { as: "customer" });

    expect(response).toHaveLength(1);
    expect(response[0]).toEqual(
      expect.objectContaining({
        offerId: 101,
        participantSide: "customer",
      })
    );
  });
});
