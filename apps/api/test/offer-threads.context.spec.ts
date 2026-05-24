import { Test } from "@nestjs/testing";
import { ROLE_NAMES } from "../src/common/constants/role-names";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { NOTIFICATION_PUBLISHER } from "../src/modules/notifications/notification-publisher.token";
import { OfferThreadMediaService } from "../src/modules/offer-threads/offer-thread-media.service";
import { OfferThreadsService } from "../src/modules/offer-threads/offer-threads.service";
import { OfferThreadsRepository } from "../src/modules/offer-threads/repositories/offer-threads.repository";

describe("OfferThreadsService role context", () => {
  const dualRoleUser = {
    id: 10,
    publicId: "550e8400-e29b-41d4-a716-446655440010",
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
          publicId: "550e8400-e29b-41d4-a716-446655440001",
          offerId: 101,
          offerPublicId: "550e8400-e29b-41d4-a716-446655440101",
          requestId: 501,
          requestPublicId: "550e8400-e29b-41d4-a716-446655440501",
          baslangicSehri: "Istanbul",
          varisSehri: "Ankara",
          baslangicKonumMetni: "Kadikoy",
          varisKonumMetni: "Cankaya",
          customerId: dualRoleUser.id,
          customerPublicId: dualRoleUser.publicId,
          customerName: "Dual User",
          customerUsername: "dual",
          customerProfileImageStorageKey: null,
          carrierId: 22,
          carrierPublicId: "550e8400-e29b-41d4-a716-446655440022",
          carrierName: "Carrier User",
          carrierUsername: "carrier",
          carrierProfileImageStorageKey: null,
          fiyat: 12000,
          durum: "OLUSTURULDU",
          planlananAlimTarihi: new Date("2026-06-12T00:00:00.000Z"),
          tahminiTeslimTarihi: new Date("2026-06-14T00:00:00.000Z"),
          closedAt: null,
          customerLastReadMessageId: null,
          carrierLastReadMessageId: null,
          lastMessage: null,
        },
        {
          id: 2,
          publicId: "550e8400-e29b-41d4-a716-446655440002",
          offerId: 102,
          offerPublicId: "550e8400-e29b-41d4-a716-446655440102",
          requestId: 502,
          requestPublicId: "550e8400-e29b-41d4-a716-446655440502",
          baslangicSehri: "Izmir",
          varisSehri: "Bursa",
          baslangicKonumMetni: "Bornova",
          varisKonumMetni: "Nilufer",
          customerId: 33,
          customerPublicId: "550e8400-e29b-41d4-a716-446655440033",
          customerName: "Customer User",
          customerUsername: "customer",
          customerProfileImageStorageKey: null,
          carrierId: dualRoleUser.id,
          carrierPublicId: dualRoleUser.publicId,
          carrierName: "Dual User",
          carrierUsername: "dual",
          carrierProfileImageStorageKey: null,
          fiyat: 13000,
          durum: "OLUSTURULDU",
          planlananAlimTarihi: new Date("2026-06-15T00:00:00.000Z"),
          tahminiTeslimTarihi: null,
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
          provide: NOTIFICATION_PUBLISHER,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: { client: {} },
        },
        {
          provide: OfferThreadMediaService,
          useValue: {
            toOptionalPublicUrl: jest.fn(),
          },
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
        offerId: "550e8400-e29b-41d4-a716-446655440101",
        participantSide: "customer",
      })
    );
  });
});
