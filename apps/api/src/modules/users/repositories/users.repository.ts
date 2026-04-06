import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

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

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByIdentifier(identifier: string): Promise<StoredUserRecord | null> {
    const user = await this.prisma.client.kullanici.findFirst({
      where: {
        silmeTarihi: null,
        OR: [{ mail: identifier }, { kullaniciAdi: identifier }],
      },
      select: {
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
      },
    });

    return user ? this.mapStoredUser(user) : null;
  }

  async findActiveById(id: number): Promise<StoredUserRecord | null> {
    const user = await this.prisma.client.kullanici.findFirst({
      where: {
        id,
        silmeTarihi: null,
      },
      select: {
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
      },
    });

    return user ? this.mapStoredUser(user) : null;
  }

  async findProfileById(id: number): Promise<StoredUserProfileRecord | null> {
    const user = await this.prisma.client.kullanici.findFirst({
      where: {
        id,
        silmeTarihi: null,
      },
      select: {
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
      },
    });

    return user
      ? {
          id: user.id,
          ad: user.ad,
          soyad: user.soyad,
          mail: user.mail,
          kullaniciAdi: user.kullaniciAdi,
          telefonNumarasi: user.telefonNumarasi,
          roleNames: user.roller.map((role) => role.rol.rolAd),
        }
      : null;
  }

  private mapStoredUser(user: {
    id: number;
    ad: string;
    soyad: string;
    mail: string;
    kullaniciAdi: string;
    telefonNumarasi: string | null;
    sifreHash: string;
    roller: Array<{ rol: { rolAd: string } }>;
  }): StoredUserRecord {
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
}
