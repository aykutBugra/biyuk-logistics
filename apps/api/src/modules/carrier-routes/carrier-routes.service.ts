import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ROLE_NAMES } from "../../common/constants/role-names";
import type { PublicEntityId } from "../../common/public-ids/public-entity-id";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { LocationsService } from "../locations/locations.service";
import { CarrierRouteDetailResponseDto } from "./dto/carrier-route-detail-response.dto";
import { CarrierRouteListItemResponseDto } from "./dto/carrier-route-list-item-response.dto";
import { CreateCarrierRouteDto } from "./dto/create-carrier-route.dto";
import { UpdateCarrierRouteDto } from "./dto/update-carrier-route.dto";
import {
  CarrierRoutesRepository,
  type StoredCarrierRouteRecord,
} from "./repositories/carrier-routes.repository";

type CarrierRouteLocationFields = {
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
};

@Injectable()
export class CarrierRoutesService {
  constructor(
    private readonly carrierRoutesRepository: CarrierRoutesRepository,
    private readonly locationsService: LocationsService
  ) {}

  // Yeni route olustururken canonical konumlari ve ana rota metriklerini ayni
  // anda uretir; bu snapshot sonradan sapma hesabinin referansi olur.
  async create(
    currentUser: AuthenticatedUser,
    createCarrierRouteDto: CreateCarrierRouteDto
  ): Promise<CarrierRouteDetailResponseDto> {
    this.assertCarrierRole(currentUser);

    const locationFields = await this.resolveRouteFields(
      createCarrierRouteDto.baslangicKonum,
      createCarrierRouteDto.varisKonum
    );

    const carrierRoute = await this.carrierRoutesRepository.create({
      nakliyeciId: currentUser.id,
      ...locationFields,
      planlananTarih: createCarrierRouteDto.planlananTarih,
      maksimumSapmaKm: createCarrierRouteDto.maksimumSapmaKm ?? null,
    });

    return this.toDetailResponse(carrierRoute);
  }

  async getMine(
    currentUser: AuthenticatedUser
  ): Promise<CarrierRouteListItemResponseDto[]> {
    this.assertCarrierRole(currentUser);

    const carrierRoutes = await this.carrierRoutesRepository.findManyByCarrierId(
      currentUser.id
    );

    return carrierRoutes.map((carrierRoute) =>
      this.toListItemResponse(carrierRoute)
    );
  }

  // Acik istekler tarafindaki route filtresi, secili route'un koordinat ve ana
  // rota metriklerini detail response uzerinden okuyarak calisir.
  async getMineById(
    currentUser: AuthenticatedUser,
    id: PublicEntityId
  ): Promise<CarrierRouteDetailResponseDto> {
    this.assertCarrierRole(currentUser);

    const carrierRoute = await this.carrierRoutesRepository.findByIdAndCarrierId(
      id,
      currentUser.id
    );

    if (!carrierRoute) {
      throw new NotFoundException("Carrier route not found.");
    }

    return this.toDetailResponse(carrierRoute);
  }

  // Baslangic veya varis secimi degistiginde ana rota snapshot'ini yeniden uretir;
  // ayni route korunuyorsa mevcut metrikleri oldugu gibi tasir.
  async updateById(
    currentUser: AuthenticatedUser,
    id: PublicEntityId,
    updateCarrierRouteDto: UpdateCarrierRouteDto
  ): Promise<CarrierRouteDetailResponseDto> {
    this.assertCarrierRole(currentUser);

    const existingCarrierRoute =
      await this.carrierRoutesRepository.findByIdAndCarrierId(id, currentUser.id);

    if (!existingCarrierRoute) {
      throw new NotFoundException("Carrier route not found.");
    }

    const locationFields = this.shouldRecalculateRoute(
      existingCarrierRoute,
      updateCarrierRouteDto
    )
      ? await this.resolveRouteFields(
          updateCarrierRouteDto.baslangicKonum,
          updateCarrierRouteDto.varisKonum
        )
      : this.getStoredRouteFields(existingCarrierRoute);

    const carrierRoute = await this.carrierRoutesRepository.updateByIdAndCarrierId(
      id,
      currentUser.id,
      {
        ...locationFields,
        planlananTarih: updateCarrierRouteDto.planlananTarih,
        maksimumSapmaKm:
          updateCarrierRouteDto.maksimumSapmaKm === undefined
            ? existingCarrierRoute.maksimumSapmaKm
            : (updateCarrierRouteDto.maksimumSapmaKm ?? null),
      }
    );

    if (!carrierRoute) {
      throw new NotFoundException("Carrier route not found.");
    }

    return this.toDetailResponse(carrierRoute);
  }

  async deleteById(
    currentUser: AuthenticatedUser,
    id: PublicEntityId
  ): Promise<void> {
    this.assertCarrierRole(currentUser);

    const wasDeleted = await this.carrierRoutesRepository.softDeleteByIdAndCarrierId(
      id,
      currentUser.id
    );

    if (!wasDeleted) {
      throw new NotFoundException("Carrier route not found.");
    }
  }

  private assertCarrierRole(currentUser: AuthenticatedUser) {
    if (currentUser.roles.includes(ROLE_NAMES.NAKLIYECI)) {
      return;
    }

    throw new ForbiddenException("Only carriers can manage routes.");
  }

  // Liste kartlari icin yeterli olan ozet route alanlarini response'a map eder.
  private toListItemResponse(
    carrierRoute: StoredCarrierRouteRecord
  ): CarrierRouteListItemResponseDto {
    return {
      id: carrierRoute.publicId,
      baslangicSehri: carrierRoute.baslangicSehri,
      varisSehri: carrierRoute.varisSehri,
      baslangicKonumMetni: carrierRoute.baslangicKonumMetni,
      varisKonumMetni: carrierRoute.varisKonumMetni,
      rotaMesafeMetre: carrierRoute.rotaMesafeMetre,
      rotaSureSaniye: carrierRoute.rotaSureSaniye,
      planlananTarih: carrierRoute.planlananTarih,
      maksimumSapmaKm: carrierRoute.maksimumSapmaKm,
      olusturmaTarihi: carrierRoute.olusturmaTarihi,
    };
  }

  // Detail response, route filtre zincirinin kullandigi provider, placeId ve
  // koordinat alanlarini da aciga cikarir.
  private toDetailResponse(
    carrierRoute: StoredCarrierRouteRecord
  ): CarrierRouteDetailResponseDto {
    return {
      ...this.toListItemResponse(carrierRoute),
      baslangicProvider: carrierRoute.baslangicProvider,
      varisProvider: carrierRoute.varisProvider,
      baslangicPlaceId: carrierRoute.baslangicPlaceId,
      varisPlaceId: carrierRoute.varisPlaceId,
      normalizeBaslangicSehir: carrierRoute.normalizeBaslangicSehir,
      normalizeVarisSehir: carrierRoute.normalizeVarisSehir,
      normalizeBaslangicIlce: carrierRoute.normalizeBaslangicIlce,
      normalizeVarisIlce: carrierRoute.normalizeVarisIlce,
      baslangicEnlem: carrierRoute.baslangicEnlem,
      baslangicBoylam: carrierRoute.baslangicBoylam,
      varisEnlem: carrierRoute.varisEnlem,
      varisBoylam: carrierRoute.varisBoylam,
    };
  }

  // Route noktalarindan biri degisti mi diye bakarak ana rota metriklerinin
  // yeniden hesaplanip hesaplanmayacagina karar verir.
  private shouldRecalculateRoute(
    carrierRoute: StoredCarrierRouteRecord,
    updateCarrierRouteDto: UpdateCarrierRouteDto
  ): boolean {
    return (
      this.hasLocationSelectionChanged(
        carrierRoute.baslangicProvider,
        carrierRoute.baslangicPlaceId,
        updateCarrierRouteDto.baslangicKonum.provider,
        updateCarrierRouteDto.baslangicKonum.placeId
      ) ||
      this.hasLocationSelectionChanged(
        carrierRoute.varisProvider,
        carrierRoute.varisPlaceId,
        updateCarrierRouteDto.varisKonum.provider,
        updateCarrierRouteDto.varisKonum.placeId
      )
    );
  }

  // Kayitli route ile yeni secimin ayni provider/placeId kombinasyonunda olup
  // olmadigini kontrol eder; fark varsa route gercekten degismis demektir.
  private hasLocationSelectionChanged(
    currentProvider: string | null,
    currentPlaceId: string | null,
    nextProvider: string,
    nextPlaceId: string
  ): boolean {
    return (
      currentProvider?.trim().toLowerCase() !==
        nextProvider.trim().toLowerCase() ||
      currentPlaceId?.trim() !== nextPlaceId.trim()
    );
  }

  // Route sapma filtresinin baz aldigi ana route snapshot'ini burada uretir:
  // canonical konumlari cozer, provider uyumunu kontrol eder ve gercek yol metrigini alir.
 
 
  private async resolveRouteFields(
    baslangicKonum: CreateCarrierRouteDto["baslangicKonum"],
    varisKonum: CreateCarrierRouteDto["varisKonum"]
  ): Promise<CarrierRouteLocationFields> {
    const [resolvedBaslangicKonum, resolvedVarisKonum] = await Promise.all([
      this.locationsService.resolveCanonicalLocation(
        baslangicKonum.provider,
        baslangicKonum.placeId,
        baslangicKonum.sessionToken
      ),
      this.locationsService.resolveCanonicalLocation(
        varisKonum.provider,
        varisKonum.placeId,
        varisKonum.sessionToken
      ),
    ]);

    if (
      resolvedBaslangicKonum.provider.trim().toLowerCase() !==
      resolvedVarisKonum.provider.trim().toLowerCase()
    ) {
      throw new InternalServerErrorException(
        "Carrier route locations must resolve with the same route provider."
      );
    }

    // Burada bulunan mesafe ve sure kusbakisi degil, secili provider uzerinden
    // hesaplanan gercek yol metrigidir ve evaluator ana rota olarak bunu kullanir.
    const routeMetrics = await this.locationsService.getRouteMetrics(
      resolvedBaslangicKonum.provider,
      {lat: resolvedBaslangicKonum.lat,lng: resolvedBaslangicKonum.lng,},
      {lat: resolvedVarisKonum.lat,lng: resolvedVarisKonum.lng,}
    );

    return {
      baslangicSehri: resolvedBaslangicKonum.sehir,
      varisSehri: resolvedVarisKonum.sehir,
      baslangicKonumMetni: resolvedBaslangicKonum.konumMetni,
      varisKonumMetni: resolvedVarisKonum.konumMetni,
      baslangicProvider: resolvedBaslangicKonum.provider,
      varisProvider: resolvedVarisKonum.provider,
      baslangicPlaceId: resolvedBaslangicKonum.placeId,
      varisPlaceId: resolvedVarisKonum.placeId,
      normalizeBaslangicSehir: resolvedBaslangicKonum.sehir,
      normalizeVarisSehir: resolvedVarisKonum.sehir,
      normalizeBaslangicIlce: resolvedBaslangicKonum.ilce,
      normalizeVarisIlce: resolvedVarisKonum.ilce,
      baslangicEnlem: resolvedBaslangicKonum.lat,
      baslangicBoylam: resolvedBaslangicKonum.lng,
      varisEnlem: resolvedVarisKonum.lat,
      varisBoylam: resolvedVarisKonum.lng,
      rotaMesafeMetre: routeMetrics.distanceMeters,
      rotaSureSaniye: routeMetrics.durationSeconds,
    };
  }

  // Route degismediyse mevcut snapshot alanlarini aynen koruyarak hem gereksiz
  // route cagrilarini onler hem de filtre davranisini sabit tutar.
  private getStoredRouteFields(
    carrierRoute: StoredCarrierRouteRecord
  ): CarrierRouteLocationFields {
    return {
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
      baslangicEnlem: carrierRoute.baslangicEnlem,
      baslangicBoylam: carrierRoute.baslangicBoylam,
      varisEnlem: carrierRoute.varisEnlem,
      varisBoylam: carrierRoute.varisBoylam,
      rotaMesafeMetre: carrierRoute.rotaMesafeMetre,
      rotaSureSaniye: carrierRoute.rotaSureSaniye,
    };
  }
}
