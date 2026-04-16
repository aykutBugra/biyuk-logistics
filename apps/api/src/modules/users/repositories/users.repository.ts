import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";


//gerçek db bağlantısı
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";


//listeleme için seçilen alan
const authUserSelect = {
  id: true,
  ad: true,
  soyad: true,
  mail: true,
  kullaniciAdi: true,
  telefonNumarasi: true,
  sifreHash: true,  //login doğrulaması için gerekli
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

//listeleme için seçilen alanlar . sifreHash'i içermiyor çünkü profile response'da şifre 
//hash'ine ihtiyaç yok.
const userProfileSelect = {
  id: true,
  ad: true,
  soyad: true,
  mail: true,
  kullaniciAdi: true,
  telefonNumarasi: true,
  sifreHash: false, //profile response'unda şifre hash'ine ihtiyaç yok, bu yüzden false.
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

//Prisma sorgularından dönen ham kullanıcı verisi.
//Şifre hash'i içerir ve roller roleName olarak gelir.
type StoredAuthUserQuery = Prisma.KullaniciGetPayload<{ select: typeof authUserSelect }>;
type StoredProfileUserQuery = Prisma.KullaniciGetPayload<{ select: typeof userProfileSelect }>;

//user repository'sinin uyguladığı interface. Kullanıcı verilerine erişmek için gerekli tüm yöntemleri tanımlar.
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
//StoredUserRecord'dan şifre hash'ini çıkarıyoruz çünkü profile response'unda şifre hash'ine ihtiyaç yok.
export type CreateStoredUserInput = {
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  sifreHash: string;
  roleId: number;
};

//injectable olarak işaretliyoruz ki NestJS bu sınıfı dependency injection ile yönetebilsin.
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}
//


//
  async findActiveByIdentifier(identifier: string): Promise<StoredUserRecord | null> {
    const user = await this.prisma.client.kullanici.findFirst({ //findFirst çağrılıyor . DB ye istek(promise) atılıyor.
                                                                //user veri değil . DB den veri gelene kadar beklemesi gerekiyor. 
      where: {                                                  //burada await sonuç gelmeden aşağı geçme diyor .
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
  //login için tek kullanıcı getirme sorgusu. Silinmemiş kullanıcıyı mail veya kullanıcı adı ile getiriyor.
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
  //kullanıcı adı ile kullanıcı var mı yok mu sorgusu. Kullanıcı adı benzersiz olduğu için sadece true false dönüyor.
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
  //kullanıcı oluşturma sorgusu. Kullanıcıyı oluşturduktan sonra role ataması yapıyor. 
  //Transaction kullanarak iki işlemi tek seferde yapıyoruz.
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

//ana listeleme sorgusu. Silinmemiş tüm kullanıcıları getiriyor.

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

  //profile için tek kullanıcı getirme sorgusu. Silinmemiş kullanıcıyı id ile getiriyor.
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
  const users = await this.prisma.client.kullanici.findMany({  //prisma ile DB ye sorgu atıyoruz.findmany birden fazla kayıt döndüreceği için kullanıyoruz.
    where: {        //filtreleme koşulları
      silmeTarihi: null,
    },
    select: userProfileSelect,  //db den sadece ihtiyacımız olan alanları seçiyoruz. gereksiz veri çekmemiş oluyoruz.
    orderBy: {
      id: "asc",
    },
  });

  return users.map((user) => this.mapStoredProfile(user));//her kullanıcıyı tek tek dolaş ve her user ı dönüştür
  }




  /*
  async findAllActiveProfiles(ad?: string): Promise<StoredUserProfileRecord[]> {
  const users = await this.prisma.client.kullanici.findMany({
    where: {
      // Soft delete edilmemiş kullanıcıları getiriyoruz.
      silmeTarihi: null,

      // Eğer ?ad=... geldiyse sadece o ada sahip kullanıcıyı filtreliyoruz.
      ...(ad
        ? {
            ad: {
              equals: ad,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    },
    select: userProfileSelect,
    orderBy: {
      id: "asc",
    },
  });

  // Prisma sonucunu uygulamanın kullandığı profile record formatına çeviriyoruz.
  return users.map((user) => this.mapStoredProfile(user));
}
*/
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
