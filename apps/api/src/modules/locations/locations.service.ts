import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { LOCATION_PROVIDER, ROUTE_ENGINE } from "./location.tokens";
import type { LocationProvider } from "./location-provider.contract";
import type {
  CanonicalLocation,
  LocationSuggestion,
  RouteMetrics,
  RoutePoint,
} from "./location.types";
import type { RouteEngine } from "./route-engine.contract";

@Injectable()
export class LocationsService {
  constructor(
    @Inject(LOCATION_PROVIDER)
    private readonly locationProvider: LocationProvider,
    @Inject(ROUTE_ENGINE)
    private readonly routeEngine: RouteEngine
  ) {}

  // UI tarafindaki yer arama kutulari icin provider uzerinden konum onerileri uretir.
  autocomplete(query: string, sessionToken?: string): Promise<LocationSuggestion[]> {
    return this.locationProvider.autocomplete(query, sessionToken);
  }

  // Secilen place id icin provider tarafindan dondurulen canonical konum bilgisini getirir.
  getPlaceDetails(placeId: string, sessionToken?: string): Promise<CanonicalLocation> {
    return this.locationProvider.getPlaceDetails(placeId, sessionToken);
  }

  // Konum secimini canonical koordinat, sehir ve ilce gibi route hesaplarinda
  // kullanilacak sabit bir snapshot'a cevirir.
  async resolveCanonicalLocation(
    provider: string,
    placeId: string,
    sessionToken?: string
  ): Promise<CanonicalLocation> {
    this.assertProvider(provider, this.locationProvider.providerName);
    return this.locationProvider.getPlaceDetails(placeId, sessionToken);
  }

  // Rota motorunu dogru provider ile cagirarak iki nokta arasinda veya ara
  // noktalarla birlikte gercek yol mesafesi ve sure metrigini dondurur.
  async getRouteMetrics(
    provider: string,
    origin: RoutePoint,
    destination: RoutePoint,
    waypoints?: RoutePoint[]
  ): Promise<RouteMetrics> {
    this.assertProvider(provider, this.routeEngine.providerName);
    return this.routeEngine.getRouteMetrics(origin, destination, waypoints);
  }

  // Istekte secilen provider ile uygulamada aktif provider'in ayni oldugunu
  // zorunlu tutar; farkli provider'lar karisik route verisi uretmesin diye vardir.
  private assertProvider(selectedProvider: string, configuredProvider: string) {
    if (selectedProvider.trim().toLowerCase() === configuredProvider.trim().toLowerCase()) {
      return;
    }

    throw new InternalServerErrorException("Requested location provider is not available.");
  }
}
