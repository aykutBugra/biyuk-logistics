import { Injectable } from "@nestjs/common";
import { CarrierRouteDetailResponseDto } from "../carrier-routes/dto/carrier-route-detail-response.dto";
import { LocationsService } from "../locations/locations.service";
import { type RoutePoint } from "../locations/location.types";
import {
  type OpenRequestDetailRecord,
  type OpenRequestListItemRecord,
} from "./repositories/offers.repository";

export type OpenRequestRouteCompatibilityResult = {
  carrierRouteId: number;
  extraMesafeMetre: number;
  extraSureSaniye: number;
  uygunlukEtiketi: "UYGUN" | "SINIRDA" | "UYGUN_DEGIL";
};

export type OpenRequestRouteFilterEvaluation =
  | {
      status: "MATCH";
      compatibility: OpenRequestRouteCompatibilityResult;
    }
  | {
      status: "OUTSIDE_ROUTE_FILTER";
    }
  | {
      status: "UNAVAILABLE_DATA";
    }
  | {
      status: "UNAVAILABLE_ROUTE_SERVICE";
    };

type RouteAwareRequestRecord = Pick<
  OpenRequestListItemRecord,
  | "id"
  | "baslangicProvider"
  | "varisProvider"
  | "baslangicEnlem"
  | "baslangicBoylam"
  | "varisEnlem"
  | "varisBoylam"
>;

const DEFAULT_MAX_SAPMA_KM = 20;
const ROUTE_FILTER_PREFILTER_BUFFER_KM = 10;
const ROUTE_AWARE_CONCURRENCY = 4;
const ROUTE_MATCH_GOOD_RATIO = 0.8;
const EARTH_RADIUS_METERS = 6_371_000;

@Injectable()
export class OpenRequestRouteAwareEvaluator {
  constructor(private readonly locationsService: LocationsService) {}

  // Secili carrier route'un filtrede kullanilabilmesi icin koordinat ve ana rota
  // metriklerinin eksiksiz kaydedilmis olup olmadigini kontrol eder.
  isCarrierRouteReady(carrierRoute: CarrierRouteDetailResponseDto): boolean {
    return (
      this.hasValidCoordinatePair(
        carrierRoute.baslangicEnlem,
        carrierRoute.baslangicBoylam
      ) &&
      this.hasValidCoordinatePair(carrierRoute.varisEnlem, carrierRoute.varisBoylam) &&
      this.hasNonNegativeNumber(carrierRoute.rotaMesafeMetre) &&
      this.hasNonNegativeNumber(carrierRoute.rotaSureSaniye)
    );
  }

  // Liste ekraninda gelen tum aday request'leri sabit dusuk concurrency ile
  // tek tek degerlendirir ve sonucunu request id bazli bir map olarak toplar.
  async evaluateMany(
    carrierRoute: CarrierRouteDetailResponseDto,
    requests: OpenRequestListItemRecord[]
  ): Promise<Map<number, OpenRequestRouteFilterEvaluation>> {
    const results = new Map<number, OpenRequestRouteFilterEvaluation>();

    if (requests.length === 0) {
      return results;
    }

    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < requests.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        const request = requests[currentIndex];
        if (!request) {
          continue;
        }

        results.set(request.id, await this.evaluateOne(carrierRoute, request));
      }
    };

    const workerCount = Math.min(ROUTE_AWARE_CONCURRENCY, requests.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return results;
  }

  // Tek bir request'in secili route'a gore filtrede kalip kalmayacagini belirler.
  // Once ucuz bir kusbakisi alt sinir hesaplar, sonra gerekirse gercek rota cagrisi yapar.
  async evaluateOne(
    carrierRoute: CarrierRouteDetailResponseDto,
    request: OpenRequestDetailRecord | OpenRequestListItemRecord
  ): Promise<OpenRequestRouteFilterEvaluation> {
    const effectiveMaxSapmaKm = this.resolveEffectiveMaxSapmaKm(
      carrierRoute.maksimumSapmaKm
    );

    // Route veya request tarafinda gerekli koordinat/metrik verisi eksikse bu kayit
    // filtrelenebilir bir aday sayilmaz ve servis katmanina veri eksigi olarak doner.
    if (!this.isCarrierRouteReady(carrierRoute) || !this.hasReadyRequest(request)) {
      return {
        status: "UNAVAILABLE_DATA",
      };
    }

    const provider = this.resolveProvider(carrierRoute, request);

    if (!provider) {
      return {
        status: "UNAVAILABLE_DATA",
      };
    }

    // Bu asama, bariz alakasiz kayitlari Google rota maliyetine girmeden elemek icin
    // kusbakisi alt sinir kullanir. Nihai karar burada degil, exact hesapta verilir.
    const lowerBoundExtraMeters = this.calculateLowerBoundExtraMeters(
      {
        lat: carrierRoute.baslangicEnlem,
        lng: carrierRoute.baslangicBoylam,
      },
      {
        lat: request.baslangicEnlem,
        lng: request.baslangicBoylam,
      },
      {
        lat: request.varisEnlem,
        lng: request.varisBoylam,
      },
      {
        lat: carrierRoute.varisEnlem,
        lng: carrierRoute.varisBoylam,
      }
    );

    if (
      lowerBoundExtraMeters >
      (effectiveMaxSapmaKm + ROUTE_FILTER_PREFILTER_BUFFER_KM) * 1000
    ) {
      return {
        status: "OUTSIDE_ROUTE_FILTER",
      };
    }

    try {
      // Nihai karar icin gercek yol metrigini "start -> pickup -> dropoff -> end"
      // seklinde hesaplatarak ana rota ile karsilastirir.
      const routeMetrics = await this.locationsService.getRouteMetrics(
        provider,
        {
          lat: carrierRoute.baslangicEnlem,
          lng: carrierRoute.baslangicBoylam,
        },
        {
          lat: carrierRoute.varisEnlem,
          lng: carrierRoute.varisBoylam,
        },
        [
          {
            lat: request.baslangicEnlem,
            lng: request.baslangicBoylam,
          },
          {
            lat: request.varisEnlem,
            lng: request.varisBoylam,
          },
        ]
      );

      // Burada bulunan ekstra mesafe ve sure, request araya alindiginda secili
      // ana rotanin ne kadar uzadigini ifade eder.
      const anaRotaMesafeMetre = carrierRoute.rotaMesafeMetre ?? 0;
      const anaRotaSureSaniye = carrierRoute.rotaSureSaniye ?? 0;
      const extraMesafeMetre = Math.max(
        0,
        routeMetrics.distanceMeters - anaRotaMesafeMetre
      );

      // Nihai filtre esigi, kusbakisi degil gercek rota ciktisindan uretilen
      // ekstra mesafeye gore uygulanir.
      if (extraMesafeMetre > effectiveMaxSapmaKm * 1000) {
        return {
          status: "OUTSIDE_ROUTE_FILTER",
        };
      }

      const extraSureSaniye = Math.max(
        0,
        routeMetrics.durationSeconds - anaRotaSureSaniye
      );

      // Bu noktaya gelen kayit route filtresini gecmistir; response'a tasinacak
      // compatibility nesnesi burada uretilir.
      return {
        status: "MATCH",
        compatibility: {
          carrierRouteId: carrierRoute.id,
          extraMesafeMetre,
          extraSureSaniye,
          uygunlukEtiketi: this.resolveCompatibilityLabel(
            extraMesafeMetre,
            effectiveMaxSapmaKm
          ),
        },
      };
    } catch {
      // Provider cevabi gelmezse veya rota hesaplanamazsa tum filtre sonucunu
      // gecersiz sayip servis katmanina gecici servis problemi olarak doner.
      return {
        status: "UNAVAILABLE_ROUTE_SERVICE",
      };
    }
  }

  // Request tarafinda pickup ve dropoff koordinatlari varsa route filtre
  // hesabina girebilir; aksi halde exact hesap yapilmaz.
  private hasReadyRequest(request: RouteAwareRequestRecord): boolean {
    return (
      this.hasValidCoordinatePair(request.baslangicEnlem, request.baslangicBoylam) &&
      this.hasValidCoordinatePair(request.varisEnlem, request.varisBoylam)
    );
  }

  // Sayisal ve kullanilabilir bir koordinat cifti olup olmadigini dogrular.
  private hasValidCoordinatePair(lat: number, lng: number): boolean {
    return Number.isFinite(lat) && Number.isFinite(lng);
  }

  // Mesafe ve sure gibi ana rota metriklerinin negatif olmayan gecerli sayilar
  // olarak kaydedilip kaydedilmedigini kontrol eder.
  private hasNonNegativeNumber(value: number | null | undefined): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }

  // Secili route ile request'in ayni rota provider zincirinde olup olmadigini
  // kontrol eder; farkli provider'lar exact rota hesabini guvenilmez hale getirir.
  private resolveProvider(
    carrierRoute: CarrierRouteDetailResponseDto,
    request: RouteAwareRequestRecord
  ): string | null {
    const providers = [
      carrierRoute.baslangicProvider,
      carrierRoute.varisProvider,
      request.baslangicProvider,
      request.varisProvider,
    ]
      .map((value) => value?.trim().toLowerCase() ?? null)
      .filter((value): value is string => Boolean(value));

    if (providers.length !== 4) {
      return null;
    }

    const [provider, ...rest] = providers;
    if (!provider || rest.some((value) => value !== provider)) {
      return null;
    }

    return provider;
  }

  // Route ustunde sapma limiti tanimliysa onu kullanir; yoksa discovery icin
  // guvenli bir default sapma limiti uygular.
  private resolveEffectiveMaxSapmaKm(maksimumSapmaKm: number | null): number {
    if (typeof maksimumSapmaKm === "number" && Number.isFinite(maksimumSapmaKm)) {
      return Math.max(0, maksimumSapmaKm);
    }

    return DEFAULT_MAX_SAPMA_KM;
  }

  // Listeye kalan request'ler icin, ekstra mesafeyi route limitine gore
  // okunabilir bir etiket seviyesine cevirir.
  private resolveCompatibilityLabel(
    extraMesafeMetre: number,
    effectiveMaxSapmaKm: number
  ): "UYGUN" | "SINIRDA" | "UYGUN_DEGIL" {
    const extraKm = extraMesafeMetre / 1000;
    const uygunThresholdKm = effectiveMaxSapmaKm * ROUTE_MATCH_GOOD_RATIO;

    if (extraKm <= uygunThresholdKm) {
      return "UYGUN";
    }

    if (extraKm <= effectiveMaxSapmaKm) {
      return "SINIRDA";
    }

    return "UYGUN_DEGIL";
  }

  // Kusbakisi alt sinir hesabi, "start -> pickup -> dropoff -> end" yolunun
  // ana hatta gore minimum ne kadar ekstra yaratabilecegini ucuzca tahmin eder.
  private calculateLowerBoundExtraMeters(
    start: RoutePoint,
    pickup: RoutePoint,
    dropoff: RoutePoint,
    end: RoutePoint
  ): number {
    const pathMeters =
      this.haversineDistanceMeters(start, pickup) +
      this.haversineDistanceMeters(pickup, dropoff) +
      this.haversineDistanceMeters(dropoff, end);
    const baseMeters = this.haversineDistanceMeters(start, end);

    return Math.max(0, pathMeters - baseMeters);
  }

  // Iki koordinat arasindaki kusbakisi uzakligi haversine formulu ile hesaplar.
  // Bu deger sadece prefilter icindir; nihai filtre karari bununla verilmez.
  private haversineDistanceMeters(from: RoutePoint, to: RoutePoint): number {
    const lat1 = this.toRadians(from.lat);
    const lat2 = this.toRadians(to.lat);
    const deltaLat = this.toRadians(to.lat - from.lat);
    const deltaLng = this.toRadians(to.lng - from.lng);
    const sinLat = Math.sin(deltaLat / 2);
    const sinLng = Math.sin(deltaLng / 2);
    const a =
      sinLat * sinLat +
      Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_METERS * c;
  }

  // Trigonometrik hesaplarda kullanmak icin dereceyi radyana cevirir.
  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }
}
