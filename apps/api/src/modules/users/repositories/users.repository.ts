import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import type { DashboardIntroRole } from "../../../common/types/dashboard-intro-role.type";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

const COMPLETED_SHIPMENT_STATUS = {
  durumTuru: "NAKLIYE",
  durumAdi: "TAMAMLANDI",
} as const;

const OPEN_OFFER_STATUS = {
  durumTuru: "TEKLIF",
  durumAdi: "OLUSTURULDU",
} as const;

const ACCEPTED_OFFER_STATUS = {
  durumTuru: "TEKLIF",
  durumAdi: "KABUL_EDILDI",
} as const;

const AGREED_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "ANLASILDI",
} as const;

const authUserSelect = {
  id: true,
  ad: true,
  soyad: true,
  mail: true,
  kullaniciAdi: true,
  telefonNumarasi: true,
  customerIntroDismissedAt: true,
  carrierIntroDismissedAt: true,
  sifreHash: true,
  roller: {
    select: {
      rol: {
        select: {
          rolAd: true,
        },
      },
    },
  },
} satisfies Prisma.KullaniciSelect;

const userProfileSelect = {
  id: true,
  ad: true,
  soyad: true,
  mail: true,
  kullaniciAdi: true,
  telefonNumarasi: true,
  customerIntroDismissedAt: true,
  carrierIntroDismissedAt: true,
  sifreHash: false,
  roller: {
    select: {
      rol: {
        select: {
          rolAd: true,
        },
      },
    },
  },
} satisfies Prisma.KullaniciSelect;

const accountDeletionSnapshotSelect = {
  id: true,
  nakliyeler: {
    where: {
      NOT: {
        durum: {
          durumTuru: {
            equals: COMPLETED_SHIPMENT_STATUS.durumTuru,
            mode: Prisma.QueryMode.insensitive,
          },
          durumAdi: {
            equals: COMPLETED_SHIPMENT_STATUS.durumAdi,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      },
    },
    select: {
      id: true,
    },
    take: 1,
  },
  istekler: {
    where: {
      OR: [
        {
          nakliye: {
            is: {
              NOT: {
                durum: {
                  durumTuru: {
                    equals: COMPLETED_SHIPMENT_STATUS.durumTuru,
                    mode: Prisma.QueryMode.insensitive,
                  },
                  durumAdi: {
                    equals: COMPLETED_SHIPMENT_STATUS.durumAdi,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            },
          },
        },
        {
          durum: {
            durumTuru: {
              equals: AGREED_REQUEST_STATUS.durumTuru,
              mode: Prisma.QueryMode.insensitive,
            },
            durumAdi: {
              equals: AGREED_REQUEST_STATUS.durumAdi,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          OR: [
            {
              nakliye: {
                is: null,
              },
            },
            {
              nakliye: {
                is: {
                  NOT: {
                    durum: {
                      durumTuru: {
                        equals: COMPLETED_SHIPMENT_STATUS.durumTuru,
                        mode: Prisma.QueryMode.insensitive,
                      },
                      durumAdi: {
                        equals: COMPLETED_SHIPMENT_STATUS.durumAdi,
                        mode: Prisma.QueryMode.insensitive,
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      durum: {
        select: {
          durumTuru: true,
          durumAdi: true,
        },
      },
      nakliye: {
        select: {
          id: true,
          durum: {
            select: {
              durumTuru: true,
              durumAdi: true,
            },
          },
        },
      },
    },
    take: 1,
  },
  teklifler: {
    where: {
      OR: [
        {
          durum: {
            durumTuru: {
              equals: OPEN_OFFER_STATUS.durumTuru,
              mode: Prisma.QueryMode.insensitive,
            },
            durumAdi: {
              equals: OPEN_OFFER_STATUS.durumAdi,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          istek: {
            silmeTarihi: null,
          },
        },
        {
          durum: {
            durumTuru: {
              equals: ACCEPTED_OFFER_STATUS.durumTuru,
              mode: Prisma.QueryMode.insensitive,
            },
            durumAdi: {
              equals: ACCEPTED_OFFER_STATUS.durumAdi,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          OR: [
            {
              istek: {
                nakliye: {
                  is: null,
                },
              },
            },
            {
              istek: {
                nakliye: {
                  is: {
                    NOT: {
                      durum: {
                        durumTuru: {
                          equals: COMPLETED_SHIPMENT_STATUS.durumTuru,
                          mode: Prisma.QueryMode.insensitive,
                        },
                        durumAdi: {
                          equals: COMPLETED_SHIPMENT_STATUS.durumAdi,
                          mode: Prisma.QueryMode.insensitive,
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      durum: {
        select: {
          durumTuru: true,
          durumAdi: true,
        },
      },
      istek: {
        select: {
          silmeTarihi: true,
          nakliye: {
            select: {
              id: true,
              durum: {
                select: {
                  durumTuru: true,
                  durumAdi: true,
                },
              },
            },
          },
        },
      },
    },
    take: 1,
  },
} satisfies Prisma.KullaniciSelect;

type StoredAuthUserQuery = Prisma.KullaniciGetPayload<{ select: typeof authUserSelect }>;
type StoredProfileUserQuery = Prisma.KullaniciGetPayload<{ select: typeof userProfileSelect }>;
type StoredAccountDeletionSnapshotQuery = Prisma.KullaniciGetPayload<{
  select: typeof accountDeletionSnapshotSelect;
}>;

export type StoredUserRecord = {
  id: number;
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  customerIntroDismissedAt: Date | null;
  carrierIntroDismissedAt: Date | null;
  sifreHash: string;
  roleNames: string[];
};

export type StoredUserProfileRecord = Omit<StoredUserRecord, "sifreHash">;

export type CreateStoredUserInput = {
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  sifreHash: string;
  roleId: number;
};

export type DeleteStoredUserAccountBlockReason =
  | "NOT_FOUND"
  | "ACTIVE_CARRIER_SHIPMENT"
  | "ACTIVE_CUSTOMER_SHIPMENT"
  | "OPEN_CARRIER_OFFER"
  | "STALE_ACCEPTED_OFFER"
  | "STALE_AGREED_REQUEST";

export type DeleteStoredUserAccountResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: DeleteStoredUserAccountBlockReason;
    };

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByIdentifier(identifier: string): Promise<StoredUserRecord | null> {
    const user = await this.prisma.client.kullanici.findFirst({
      where: {
        silmeTarihi: null,
        OR: [
          {
            mail: {
              equals: identifier,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            kullaniciAdi: {
              equals: identifier,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      },
      select: authUserSelect,
    });

    return user ? this.mapStoredUser(user) : null;
  }

  async existsByMail(mail: string): Promise<boolean> {
    const user = await this.prisma.client.kullanici.findFirst({
      where: {
        mail: {
          equals: mail,
          mode: Prisma.QueryMode.insensitive,
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(user);
  }

  async existsByUsername(kullaniciAdi: string): Promise<boolean> {
    const user = await this.prisma.client.kullanici.findFirst({
      where: {
        kullaniciAdi: {
          equals: kullaniciAdi,
          mode: Prisma.QueryMode.insensitive,
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(user);
  }

  async createWithRole(input: CreateStoredUserInput): Promise<StoredUserRecord> {
    return this.prisma.client.$transaction((tx) =>
      this.createWithRoleInTransaction(tx, input)
    );
  }

  async createWithRoleInTransaction(
    tx: Prisma.TransactionClient,
    input: CreateStoredUserInput
  ): Promise<StoredUserRecord> {
    const createdUser = await tx.kullanici.create({
      data: {
        ad: input.ad,
        soyad: input.soyad,
        mail: input.mail,
        kullaniciAdi: input.kullaniciAdi,
        telefonNumarasi: input.telefonNumarasi,
        sifreHash: input.sifreHash,
      },
      select: {
        id: true,
      },
    });

    await tx.kullaniciRol.create({
      data: {
        kullaniciId: createdUser.id,
        rolId: input.roleId,
      },
    });

    const user = await tx.kullanici.findUniqueOrThrow({
      where: {
        id: createdUser.id,
      },
      select: authUserSelect,
    });

    return this.mapStoredUser(user);
  }

  async findActiveById(id: number): Promise<StoredUserRecord | null> {
    const user = await this.prisma.client.kullanici.findFirst({
      where: {
        id,
        silmeTarihi: null,
      },
      select: authUserSelect,
    });

    return user ? this.mapStoredUser(user) : null;
  }

  async findProfileById(id: number): Promise<StoredUserProfileRecord | null> {
    const user = await this.prisma.client.kullanici.findFirst({
      where: {
        id,
        silmeTarihi: null,
      },
      select: userProfileSelect,
    });

    return user ? this.mapStoredProfile(user) : null;
  }

  async dismissDashboardIntroById(
    userId: number,
    role: DashboardIntroRole
  ): Promise<StoredUserProfileRecord | null> {
    const user = await this.prisma.client.kullanici.findFirst({
      where: {
        id: userId,
        silmeTarihi: null,
      },
      select: {
        id: true,
        customerIntroDismissedAt: true,
        carrierIntroDismissedAt: true,
      },
    });

    if (!user) {
      return null;
    }

    const timestampField =
      role === "carrier" ? "carrierIntroDismissedAt" : "customerIntroDismissedAt";

    if (user[timestampField] !== null) {
      return this.findProfileById(userId);
    }

    const updatedUser = await this.prisma.client.kullanici.update({
      where: {
        id: userId,
      },
      data: {
        [timestampField]: new Date(),
      },
      select: userProfileSelect,
    });

    return this.mapStoredProfile(updatedUser);
  }

  async findAllActiveProfiles(): Promise<StoredUserProfileRecord[]> {
    const users = await this.prisma.client.kullanici.findMany({
      where: {
        silmeTarihi: null,
      },
      select: userProfileSelect,
      orderBy: {
        id: "asc",
      },
    });

    return users.map((user) => this.mapStoredProfile(user));
  }

  async deleteAccountById(userId: number): Promise<DeleteStoredUserAccountResult> {
    return this.prisma.client.$transaction(async (tx) => {
      const deletionSnapshot = await tx.kullanici.findFirst({
        where: {
          id: userId,
          silmeTarihi: null,
        },
        select: accountDeletionSnapshotSelect,
      });

      if (!deletionSnapshot) {
        return {
          ok: false,
          reason: "NOT_FOUND",
        };
      }

      const blockReason = this.resolveDeleteBlockReason(deletionSnapshot);

      if (blockReason) {
        return {
          ok: false,
          reason: blockReason,
        };
      }

      const deletedAt = new Date();
      const anonymizedSuffix = `deleted-${deletionSnapshot.id}-${deletedAt.getTime()}`;

      await tx.arac.updateMany({
        where: {
          sahipId: deletionSnapshot.id,
          silmeTarihi: null,
        },
        data: {
          silmeTarihi: deletedAt,
        },
      });

      await tx.carrierRoute.updateMany({
        where: {
          nakliyeciId: deletionSnapshot.id,
          silmeTarihi: null,
        },
        data: {
          silmeTarihi: deletedAt,
        },
      });

      await tx.istek.updateMany({
        where: {
          musteriId: deletionSnapshot.id,
          silmeTarihi: null,
        },
        data: {
          silmeTarihi: deletedAt,
        },
      });

      const deletedUser = await tx.kullanici.updateMany({
        where: {
          id: deletionSnapshot.id,
          silmeTarihi: null,
        },
        data: {
          silmeTarihi: deletedAt,
          mail: `${anonymizedSuffix}@deleted.local`,
          kullaniciAdi: anonymizedSuffix,
          telefonNumarasi: null,
        },
      });

      if (deletedUser.count === 0) {
        return {
          ok: false,
          reason: "NOT_FOUND",
        };
      }

      return {
        ok: true,
      };
    });
  }

  private resolveDeleteBlockReason(
    snapshot: StoredAccountDeletionSnapshotQuery
  ): DeleteStoredUserAccountBlockReason | null {
    if (snapshot.nakliyeler.length > 0) {
      return "ACTIVE_CARRIER_SHIPMENT";
    }

    const blockingRequest = snapshot.istekler[0] ?? null;

    if (blockingRequest?.nakliye) {
      return "ACTIVE_CUSTOMER_SHIPMENT";
    }

    if (blockingRequest) {
      return "STALE_AGREED_REQUEST";
    }

    const blockingOffer = snapshot.teklifler[0] ?? null;

    if (!blockingOffer) {
      return null;
    }

    const isOpenOffer =
      blockingOffer.durum.durumTuru.trim().toUpperCase() ===
        OPEN_OFFER_STATUS.durumTuru &&
      blockingOffer.durum.durumAdi.trim().toUpperCase() ===
        OPEN_OFFER_STATUS.durumAdi;

    return isOpenOffer ? "OPEN_CARRIER_OFFER" : "STALE_ACCEPTED_OFFER";
  }

  private mapStoredUser(user: StoredAuthUserQuery): StoredUserRecord {
    return {
      id: user.id,
      ad: user.ad,
      soyad: user.soyad,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      telefonNumarasi: user.telefonNumarasi,
      customerIntroDismissedAt: user.customerIntroDismissedAt,
      carrierIntroDismissedAt: user.carrierIntroDismissedAt,
      sifreHash: user.sifreHash,
      roleNames: user.roller.map((role) => role.rol.rolAd),
    };
  }

  private mapStoredProfile(user: StoredProfileUserQuery): StoredUserProfileRecord {
    return {
      id: user.id,
      ad: user.ad,
      soyad: user.soyad,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      telefonNumarasi: user.telefonNumarasi,
      customerIntroDismissedAt: user.customerIntroDismissedAt,
      carrierIntroDismissedAt: user.carrierIntroDismissedAt,
      roleNames: user.roller.map((role) => role.rol.rolAd),
    };
  }
}
