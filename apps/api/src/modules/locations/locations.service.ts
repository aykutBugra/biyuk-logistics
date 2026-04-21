import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { LOCATION_PROVIDER, ROUTE_ENGINE } from "./location.tokens";
import type { LocationProvider } from "./location-provider.contract";
import type { CanonicalLocation, LocationSuggestion, RouteMetrics, RoutePoint } from "./location.types";
import type { RouteEngine } from "./route-engine.contract";

@Injectable()
export class LocationsService {
  constructor(
    @Inject(LOCATION_PROVIDER)
    private readonly locationProvider: LocationProvider,
    @Inject(ROUTE_ENGINE)
    private readonly routeEngine: RouteEngine
  ) {}

  autocomplete(query: string, sessionToken?: string): Promise<LocationSuggestion[]> {
    return this.locationProvider.autocomplete(query, sessionToken);
  }

  getPlaceDetails(placeId: string, sessionToken?: string): Promise<CanonicalLocation> {
    return this.locationProvider.getPlaceDetails(placeId, sessionToken);
  }

  async resolveCanonicalLocation(
    provider: string,
    placeId: string,
    sessionToken?: string
  ): Promise<CanonicalLocation> {
    this.assertProvider(provider, this.locationProvider.providerName);
    return this.locationProvider.getPlaceDetails(placeId, sessionToken);
  }

  async getRouteMetrics(
    provider: string,
    origin: RoutePoint,
    destination: RoutePoint,
    waypoints?: RoutePoint[]
  ): Promise<RouteMetrics> {
    this.assertProvider(provider, this.routeEngine.providerName);
    return this.routeEngine.getRouteMetrics(origin, destination, waypoints);
  }

  private assertProvider(selectedProvider: string, configuredProvider: string) {
    if (selectedProvider.trim().toLowerCase() === configuredProvider.trim().toLowerCase()) {
      return;
    }

    throw new InternalServerErrorException("Requested location provider is not available.");
  }
}
