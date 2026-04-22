import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ROLE_NAMES } from "../../common/constants/role-names";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CreateTransportRequestDto } from "./dto/create-transport-request.dto";
import { UpdateTransportRequestDto } from "./dto/update-transport-request.dto";
import { TransportRequestDetailResponseDto } from "./dto/transport-request-detail-response.dto";
import { TransportRequestJobSummaryResponseDto } from "./dto/transport-request-job-summary-response.dto";
import { TransportRequestListItemResponseDto } from "./dto/transport-request-list-item-response.dto";
import {
  type StoredTransportRequestJobRecord,
  type StoredTransportRequestRecord,
  TransportRequestsRepository,
} from "./repositories/transport-requests.repository";
import { buildRatingContext } from "../ratings/rating-context.helpers";
import { LocationsService } from "../locations/locations.service";

const INITIAL_TRANSPORT_REQUEST_STATUS = {
  durumTuru: "ISTEK",
  durumAdi: "OLUSTURULDU",
} as const;

type TransportRequestRouteFields = {
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
export class TransportRequestsService {
  constructor(
    private readonly transportRequestsRepository: TransportRequestsRepository,
    private readonly locationsService: LocationsService
  ) {}

  async create(
    currentUser: AuthenticatedUser,
    createTransportRequestDto: CreateTransportRequestDto
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const initialStatusId = await this.requireInitialStatusId();








    const routeFields = await this.resolveRouteFields(  //canonaical location bilgilerini alma ve rota 
      createTransportRequestDto.baslangicKonum,         //metriklerini hesaplama işlemi
      createTransportRequestDto.varisKonum
    );

    const transportRequest = await this.transportRequestsRepository.create({
      musteriId: currentUser.id,
      ...routeFields,   //hesaplanan alanları repository create inputuna yayar
      tekTasimaIstiyor: createTransportRequestDto.tekTasimaIstiyor,
      agirlikKg: createTransportRequestDto.agirlikKg,
      hacimM3: createTransportRequestDto.hacimM3,
      yukTipi: createTransportRequestDto.yukTipi,
      tasimaTarihi: createTransportRequestDto.tasimaTarihi,
      yukDetay: createTransportRequestDto.yukDetay,
      durumId: initialStatusId,
    });











    return this.toDetailResponse(transportRequest, currentUser);
  }

  async getMine(
    currentUser: AuthenticatedUser
  ): Promise<TransportRequestListItemResponseDto[]> {
    this.assertCustomerRole(currentUser);

    const transportRequests = await this.transportRequestsRepository.findManyByCustomerId(
      currentUser.id
    );

    return transportRequests.map((transportRequest) =>
      this.toListItemResponse(transportRequest)
    );
  }

  async getMineById(
    currentUser: AuthenticatedUser,
    id: number
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const transportRequest = await this.transportRequestsRepository.findByIdAndCustomerId(
      id,
      currentUser.id
    );

    if (!transportRequest) {
      throw new NotFoundException("Transport request not found.");
    }

    return this.toDetailResponse(transportRequest, currentUser);
  }

  async updateById(
    currentUser: AuthenticatedUser,
    id: number,
    updateTransportRequestDto: UpdateTransportRequestDto
  ): Promise<TransportRequestDetailResponseDto> {
    this.assertCustomerRole(currentUser);

    const existingTransportRequest =
      await this.transportRequestsRepository.findByIdAndCustomerId(
        id,
        currentUser.id
      );

    if (!existingTransportRequest) {
      throw new NotFoundException("Transport request not found.");
    }

    if (!this.isTransportRequestMutable(existingTransportRequest)) {
      throw new ConflictException(
        "Transport request can no longer be modified."
      );
    }




    //shouldrecalculateRoute işlevi, başlangıç veya varış konumlarında 
    //değişiklik olup olmadığını kontrol eder ve rota metriklerinin 
    //yeniden hesaplanması gerekip gerekmediğine karar verir.
    const routeFields = this.shouldRecalculateRoute(
      existingTransportRequest,
      updateTransportRequestDto
    )
      ? await this.resolveRouteFields(  //konum değiştiyse route yeniden hesaplar
          updateTransportRequestDto.baslangicKonum,
          updateTransportRequestDto.varisKonum
        )
        //konum değişmediyse mevcut rota alanlarını korur
      : this.getStoredRouteFields(existingTransportRequest);





    const transportRequest =
      await this.transportRequestsRepository.updateByIdAndCustomerId(
        id,
        currentUser.id,
        {
          ...routeFields,
          tekTasimaIstiyor: updateTransportRequestDto.tekTasimaIstiyor,
          agirlikKg: updateTransportRequestDto.agirlikKg,
          hacimM3: updateTransportRequestDto.hacimM3,
          yukTipi: updateTransportRequestDto.yukTipi,
          tasimaTarihi: updateTransportRequestDto.tasimaTarihi,
          yukDetay: updateTransportRequestDto.yukDetay,
        }
      );

    if (!transportRequest) {
      throw new NotFoundException("Transport request not found.");
    }

    return this.toDetailResponse(transportRequest, currentUser);
  }

  async deleteById(
    currentUser: AuthenticatedUser,
    id: number
  ): Promise<void> {
    this.assertCustomerRole(currentUser);

    const existingTransportRequest =
      await this.transportRequestsRepository.findByIdAndCustomerId(
        id,
        currentUser.id
      );

    if (!existingTransportRequest) {
      throw new NotFoundException("Transport request not found.");
    }

    if (!this.isTransportRequestMutable(existingTransportRequest)) {
      throw new ConflictException(
        "Transport request can no longer be deleted."
      );
    }

    const wasDeleted =
      await this.transportRequestsRepository.softDeleteByIdAndCustomerId(
        id,
        currentUser.id
      );

    if (!wasDeleted) {
      throw new NotFoundException("Transport request not found.");
    }
  }

  private async requireInitialStatusId(): Promise<number> {
    const initialStatusId =
      await this.transportRequestsRepository.findStatusIdByTypeAndName(
        INITIAL_TRANSPORT_REQUEST_STATUS.durumTuru,
        INITIAL_TRANSPORT_REQUEST_STATUS.durumAdi
      );

    if (initialStatusId !== null) {
      return initialStatusId;
    }

    throw new InternalServerErrorException(
      `Transport request initial status is not configured: ${INITIAL_TRANSPORT_REQUEST_STATUS.durumTuru}/${INITIAL_TRANSPORT_REQUEST_STATUS.durumAdi}.`
    );
  }

  private isTransportRequestMutable(
    transportRequest: StoredTransportRequestRecord
  ): boolean {
    return (
      transportRequest.nakliye === null &&
      transportRequest.durumTuru.trim().toUpperCase() ===
        INITIAL_TRANSPORT_REQUEST_STATUS.durumTuru &&
      transportRequest.durumAdi.trim().toUpperCase() ===
        INITIAL_TRANSPORT_REQUEST_STATUS.durumAdi
    );
  }

  private assertCustomerRole(currentUser: AuthenticatedUser) {
    if (currentUser.roles.includes(ROLE_NAMES.MUSTERI)) {
      return;
    }

    throw new ForbiddenException("Only customers can manage transport requests.");
  }

  private toListItemResponse(
    transportRequest: StoredTransportRequestRecord
  ): TransportRequestListItemResponseDto {
    return {
      id: transportRequest.id,
      baslangicSehri: transportRequest.baslangicSehri,
      varisSehri: transportRequest.varisSehri,
      baslangicKonumMetni: transportRequest.baslangicKonumMetni,
      varisKonumMetni: transportRequest.varisKonumMetni,
      rotaMesafeMetre: transportRequest.rotaMesafeMetre,
      rotaSureSaniye: transportRequest.rotaSureSaniye,
      tekTasimaIstiyor: transportRequest.tekTasimaIstiyor,
      agirlikKg: transportRequest.agirlikKg,
      hacimM3: transportRequest.hacimM3,
      yukTipi: transportRequest.yukTipi,
      tasimaTarihi: transportRequest.tasimaTarihi,
      yukDetay: transportRequest.yukDetay,
      olusturmaTarihi: transportRequest.olusturmaTarihi,
      durum: transportRequest.durumAdi,
    };
  }

  private toDetailResponse(
    transportRequest: StoredTransportRequestRecord,
    currentUser: AuthenticatedUser
  ): TransportRequestDetailResponseDto {
    return {
      ...this.toListItemResponse(transportRequest),
      baslangicProvider: transportRequest.baslangicProvider,
      varisProvider: transportRequest.varisProvider,
      baslangicPlaceId: transportRequest.baslangicPlaceId,
      varisPlaceId: transportRequest.varisPlaceId,
      normalizeBaslangicSehir: transportRequest.normalizeBaslangicSehir,
      normalizeVarisSehir: transportRequest.normalizeVarisSehir,
      normalizeBaslangicIlce: transportRequest.normalizeBaslangicIlce,
      normalizeVarisIlce: transportRequest.normalizeVarisIlce,
      baslangicEnlem: transportRequest.baslangicEnlem,
      baslangicBoylam: transportRequest.baslangicBoylam,
      varisEnlem: transportRequest.varisEnlem,
      varisBoylam: transportRequest.varisBoylam,
      nakliye: this.toJobSummaryResponse(transportRequest.nakliye, currentUser.id),
    };
  }

  private toJobSummaryResponse(
    job: StoredTransportRequestJobRecord | null,
    currentUserId: number
  ): TransportRequestJobSummaryResponseDto | null {
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      carrierId: job.carrierId,
      carrierName: job.carrierName,
      carrierUsername: job.carrierUsername,
      aracId: job.aracId,
      aracPlaka: job.aracPlaka,
      anlasilanFiyat: job.anlasilanFiyat,
      durum: job.durumAdi,
      olusturmaTarihi: job.olusturmaTarihi,
      baslangicTarihi: job.baslangicTarihi,
      teslimTarihi: job.teslimTarihi,
      ratingContext: buildRatingContext({
        ratings: job.ratings,
        currentUserId,
        carrierId: job.carrierId,
        customerId: currentUserId,
        durumTuru: job.durumTuru,
        durumAdi: job.durumAdi,
      }),
    };
  }








  //shouldRecalculateRoute provider ve placeId alanlarını karşılaştırarak 
  //başlangıç veya varış konumlarında değişiklik olup olmadığını kontrol 
  //eder.
  private shouldRecalculateRoute(
    transportRequest: StoredTransportRequestRecord,
    updateTransportRequestDto: UpdateTransportRequestDto
  ): boolean {
    return (
      this.hasLocationSelectionChanged(
        transportRequest.baslangicProvider,
        transportRequest.baslangicPlaceId,
        updateTransportRequestDto.baslangicKonum.provider,
        updateTransportRequestDto.baslangicKonum.placeId
      ) ||
      this.hasLocationSelectionChanged(
        transportRequest.varisProvider,
        transportRequest.varisPlaceId,
        updateTransportRequestDto.varisKonum.provider,
        updateTransportRequestDto.varisKonum.placeId
      )
    );
  }







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









  //resolveRouteFields işlevi, verilen başlangıç ve varış konumlarına 
  //göre canonical location bilgilerini alır ve rota metriklerini hesaplar.
  private async resolveRouteFields(
    baslangicKonum: CreateTransportRequestDto["baslangicKonum"],
    varisKonum: CreateTransportRequestDto["varisKonum"]
  ): Promise<TransportRequestRouteFields> {
    const [resolvedBaslangicKonum, resolvedVarisKonum] = await Promise.all([
      this.locationsService.resolveCanonicalLocation(   //placeId'ye karşılık gelen canonical location bilgisini alma
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
        "Transport request locations must resolve with the same route provider."
      );
    }

    //iki canonical nokta arası gerçek yol mesafesini alır ve tahmini sürüş süresini 
    //saniye cinsinden hesaplar.
    const routeMetrics = await this.locationsService.getRouteMetrics( 
      resolvedBaslangicKonum.provider,
      {
        lat: resolvedBaslangicKonum.lat,
        lng: resolvedBaslangicKonum.lng,
      },
      {
        lat: resolvedVarisKonum.lat,
        lng: resolvedVarisKonum.lng,
      }
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
      rotaMesafeMetre: routeMetrics.distanceMeters,   //metre cinsinden sonucu döndürür
      rotaSureSaniye: routeMetrics.durationSeconds,   //saniye cinsinden sonucu döndürür
    };
  }



















  private getStoredRouteFields(
    transportRequest: StoredTransportRequestRecord
  ): TransportRequestRouteFields {
    return {
      baslangicSehri: transportRequest.baslangicSehri,
      varisSehri: transportRequest.varisSehri,
      baslangicKonumMetni: transportRequest.baslangicKonumMetni,
      varisKonumMetni: transportRequest.varisKonumMetni,
      baslangicProvider: transportRequest.baslangicProvider,
      varisProvider: transportRequest.varisProvider,
      baslangicPlaceId: transportRequest.baslangicPlaceId,
      varisPlaceId: transportRequest.varisPlaceId,
      normalizeBaslangicSehir: transportRequest.normalizeBaslangicSehir,
      normalizeVarisSehir: transportRequest.normalizeVarisSehir,
      normalizeBaslangicIlce: transportRequest.normalizeBaslangicIlce,
      normalizeVarisIlce: transportRequest.normalizeVarisIlce,
      baslangicEnlem: transportRequest.baslangicEnlem,
      baslangicBoylam: transportRequest.baslangicBoylam,
      varisEnlem: transportRequest.varisEnlem,
      varisBoylam: transportRequest.varisBoylam,
      rotaMesafeMetre: transportRequest.rotaMesafeMetre,
      rotaSureSaniye: transportRequest.rotaSureSaniye,
    };
  }
}
