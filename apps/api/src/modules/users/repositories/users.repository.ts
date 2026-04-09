import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

const authUserSelect = {
  id: true,
  ad: true,
  soyad: true,
  mail: true,
  kullaniciAdi: true,
  telefonNumarasi: true,
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

type StoredAuthUserQuery = Prisma.KullaniciGetPayload<{ select: typeof authUserSelect }>;
type StoredProfileUserQuery = Prisma.KullaniciGetPayload<{ select: typeof userProfileSelect }>;

export type StoredUserRecord = {
  id: number;
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
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
    const user = await this.prisma.client.$transaction(async (tx) => {
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

      return tx.kullanici.findUniqueOrThrow({
        where: {
          id: createdUser.id,
        },
        select: authUserSelect,
      });
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

  private mapStoredUser(user: StoredAuthUserQuery): StoredUserRecord {
    return {
      id: user.id,
      ad: user.ad,
      soyad: user.soyad,
      mail: user.mail,
      kullaniciAdi: user.kullaniciAdi,
      telefonNumarasi: user.telefonNumarasi,
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
      roleNames: user.roller.map((role) => role.rol.rolAd),
    };
  }
}
