import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import {
  type PublicEntityId,
  publicEntityWhere,
} from "../../../common/public-ids/public-entity-id";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

const carrierRouteSelect = {
  id: true,
  publicId: true,
  baslangicSehri: true,
  varisSehri: true,
  baslangicKonumMetni: true,
  varisKonumMetni: true,
  baslangicProvider: true,
  varisProvider: true,
  baslangicPlaceId: true,
  varisPlaceId: true,
  normalizeBaslangicSehir: true,
  normalizeVarisSehir: true,
  normalizeBaslangicIlce: true,
  normalizeVarisIlce: true,
  baslangicEnlem: true,
  baslangicBoylam: true,
  varisEnlem: true,
  varisBoylam: true,
  rotaMesafeMetre: true,
  rotaSureSaniye: true,
  planlananTarih: true,
  maksimumSapmaKm: true,
  olusturmaTarihi: true,
} satisfies Prisma.CarrierRouteSelect;

//Carrier route liste ve detay ekranlari icin ayni route snapshot alanlari okunur.
type StoredCarrierRouteQuery = Prisma.CarrierRouteGetPayload<{
  select: typeof carrierRouteSelect;
}>;

export type CreateCarrierRouteRecordInput = {
  nakliyeciId: number;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  baslangicProvider: string | null;
  varisProvider: string | null;
  baslangicPlaceId: string | null;
  varisPlaceId: string | null;
  normalizeBaslangicSehir: string | null;
  normalizeVarisSehir: string | null;
  normalizeBaslangicIlce: string | null;
  normalizeVarisIlce: string | null;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  rotaMesafeMetre: number | null;
  rotaSureSaniye: number | null;
  planlananTarih: string;
  maksimumSapmaKm: number | null;
};

export type UpdateCarrierRouteRecordInput = Omit<
  CreateCarrierRouteRecordInput,
  "nakliyeciId"
>;

export type StoredCarrierRouteRecord = {
  id: number;
  publicId: string;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  baslangicProvider: string | null;
  varisProvider: string | null;
  baslangicPlaceId: string | null;
  varisPlaceId: string | null;
  normalizeBaslangicSehir: string | null;
  normalizeVarisSehir: string | null;
  normalizeBaslangicIlce: string | null;
  normalizeVarisIlce: string | null;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  rotaMesafeMetre: number | null;
  rotaSureSaniye: number | null;
  planlananTarih: string;
  maksimumSapmaKm: number | null;
  olusturmaTarihi: Date;
};

@Injectable()
export class CarrierRoutesRepository {
  constructor(private readonly prisma: PrismaService) {}

  //Nakliyecinin route tanimini canonical konum ve rota metrikleriyle kaydeder.
  async create(
    input: CreateCarrierRouteRecordInput
  ): Promise<StoredCarrierRouteRecord> {
    const carrierRoute = await this.prisma.client.carrierRoute.create({
      data: {
        nakliyeciId: input.nakliyeciId,
        baslangicSehri: input.baslangicSehri,
        varisSehri: input.varisSehri,
        baslangicKonumMetni: input.baslangicKonumMetni,
        varisKonumMetni: input.varisKonumMetni,
        baslangicProvider: input.baslangicProvider,
        varisProvider: input.varisProvider,
        baslangicPlaceId: input.baslangicPlaceId,
        varisPlaceId: input.varisPlaceId,
        normalizeBaslangicSehir: input.normalizeBaslangicSehir,
        normalizeVarisSehir: input.normalizeVarisSehir,
        normalizeBaslangicIlce: input.normalizeBaslangicIlce,
        normalizeVarisIlce: input.normalizeVarisIlce,
        baslangicEnlem: new Prisma.Decimal(input.baslangicEnlem),
        baslangicBoylam: new Prisma.Decimal(input.baslangicBoylam),
        varisEnlem: new Prisma.Decimal(input.varisEnlem),
        varisBoylam: new Prisma.Decimal(input.varisBoylam),
        rotaMesafeMetre: input.rotaMesafeMetre,
        rotaSureSaniye: input.rotaSureSaniye,
        planlananTarih: input.planlananTarih,
        maksimumSapmaKm:
          input.maksimumSapmaKm === null
            ? null
            : new Prisma.Decimal(input.maksimumSapmaKm),
      },
      select: carrierRouteSelect,
    });

    return this.mapStoredCarrierRoute(carrierRoute);
  }

  async findManyByCarrierId(
    nakliyeciId: number
  ): Promise<StoredCarrierRouteRecord[]> {
    //Nakliyecinin silinmemis route'lari planlanan tarihe gore listelenir.
    const carrierRoutes = await this.prisma.client.carrierRoute.findMany({
      where: {
        nakliyeciId,
        silmeTarihi: null,
      },
      orderBy: [{ planlananTarih: "asc" }, { id: "desc" }],
      select: carrierRouteSelect,
    });

    return carrierRoutes.map((carrierRoute) =>
      this.mapStoredCarrierRoute(carrierRoute)
    );
  }

  async findByIdAndCarrierId(
    id: PublicEntityId,
    nakliyeciId: number
  ): Promise<StoredCarrierRouteRecord | null> {
    //Detay okuma id ve nakliyeciId ile yapilir; baska nakliyecinin rotasi okunamaz.
    const carrierRoute = await this.prisma.client.carrierRoute.findFirst({
      where: {
        ...publicEntityWhere(id),
        nakliyeciId,
        silmeTarihi: null,
      },
      select: carrierRouteSelect,
    });

    return carrierRoute ? this.mapStoredCarrierRoute(carrierRoute) : null;
  }

  async updateByIdAndCarrierId(
    id: PublicEntityId,
    nakliyeciId: number,
    input: UpdateCarrierRouteRecordInput
  ): Promise<StoredCarrierRouteRecord | null> {
    //Guncelleme sahiplik ve soft delete filtresiyle yapilir; sonuc tekrar okunup map edilir.
    const result = await this.prisma.client.carrierRoute.updateMany({
      where: {
        ...publicEntityWhere(id),
        nakliyeciId,
        silmeTarihi: null,
      },
      data: {
        baslangicSehri: input.baslangicSehri,
        varisSehri: input.varisSehri,
        baslangicKonumMetni: input.baslangicKonumMetni,
        varisKonumMetni: input.varisKonumMetni,
        baslangicProvider: input.baslangicProvider,
        varisProvider: input.varisProvider,
        baslangicPlaceId: input.baslangicPlaceId,
        varisPlaceId: input.varisPlaceId,
        normalizeBaslangicSehir: input.normalizeBaslangicSehir,
        normalizeVarisSehir: input.normalizeVarisSehir,
        normalizeBaslangicIlce: input.normalizeBaslangicIlce,
        normalizeVarisIlce: input.normalizeVarisIlce,
        baslangicEnlem: new Prisma.Decimal(input.baslangicEnlem),
        baslangicBoylam: new Prisma.Decimal(input.baslangicBoylam),
        varisEnlem: new Prisma.Decimal(input.varisEnlem),
        varisBoylam: new Prisma.Decimal(input.varisBoylam),
        rotaMesafeMetre: input.rotaMesafeMetre,
        rotaSureSaniye: input.rotaSureSaniye,
        planlananTarih: input.planlananTarih,
        maksimumSapmaKm:
          input.maksimumSapmaKm === null
            ? null
            : new Prisma.Decimal(input.maksimumSapmaKm),
      },
    });

    if (result.count === 0) {
      return null;
    }

    const carrierRoute = await this.prisma.client.carrierRoute.findFirst({
      where: {
        ...publicEntityWhere(id),
        nakliyeciId,
        silmeTarihi: null,
      },
      select: carrierRouteSelect,
    });

    return carrierRoute ? this.mapStoredCarrierRoute(carrierRoute) : null;
  }

  async softDeleteByIdAndCarrierId(
    id: PublicEntityId,
    nakliyeciId: number
  ): Promise<boolean> {
    //Rota kaydi hard delete edilmez; silmeTarihi setlenerek pasife alinir.
    const result = await this.prisma.client.carrierRoute.updateMany({
      where: {
        ...publicEntityWhere(id),
        nakliyeciId,
        silmeTarihi: null,
      },
      data: {
        silmeTarihi: new Date(),
      },
    });

    return result.count > 0;
  }

  private mapStoredCarrierRoute(
    carrierRoute: StoredCarrierRouteQuery
  ): StoredCarrierRouteRecord {
    //Prisma Decimal alanlarini number'a cevirip service'in kullandigi sade route kaydini uretir.
    return {
      id: carrierRoute.id,
      publicId: carrierRoute.publicId,
      baslangicSehri: carrierRoute.baslangicSehri,
      varisSehri: carrierRoute.varisSehri,
      baslangicKonumMetni: carrierRoute.baslangicKonumMetni,
      varisKonumMetni: carrierRoute.varisKonumMetni,
      baslangicProvider: carrierRoute.baslangicProvider,
      varisProvider: carrierRoute.varisProvider,
      baslangicPlaceId: carrierRoute.baslangicPlaceId,
      varisPlaceId: carrierRoute.varisPlaceId,
      normalizeBaslangicSehir: carrierRoute.normalizeBaslangicSehir,
      normalizeVarisSehir: carrierRoute.normalizeVarisSehir,
      normalizeBaslangicIlce: carrierRoute.normalizeBaslangicIlce,
      normalizeVarisIlce: carrierRoute.normalizeVarisIlce,
      baslangicEnlem: carrierRoute.baslangicEnlem.toNumber(),
      baslangicBoylam: carrierRoute.baslangicBoylam.toNumber(),
      varisEnlem: carrierRoute.varisEnlem.toNumber(),
      varisBoylam: carrierRoute.varisBoylam.toNumber(),
      rotaMesafeMetre: carrierRoute.rotaMesafeMetre,
      rotaSureSaniye: carrierRoute.rotaSureSaniye,
      planlananTarih: carrierRoute.planlananTarih,
      maksimumSapmaKm: carrierRoute.maksimumSapmaKm?.toNumber() ?? null,
      olusturmaTarihi: carrierRoute.olusturmaTarihi,
    };
  }
}
