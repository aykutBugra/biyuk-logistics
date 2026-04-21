import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RouteEngine } from "../route-engine.contract";
import type { RouteMetrics, RoutePoint } from "../location.types";

type GoogleRoutesResponse = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
  }>;
};

@Injectable()
export class GoogleRouteEngine implements RouteEngine {
  readonly providerName = "google";

  constructor(private readonly configService: ConfigService) {}

  async getRouteMetrics(
    origin: RoutePoint,
    destination: RoutePoint,
    waypoints: RoutePoint[] = []
  ): Promise<RouteMetrics> {
    const apiKey = this.requireGoogleApiKey();
    const defaultLanguageCode =
      this.configService.get<string>("maps.defaultLanguageCode") ?? "tr";
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.lat,
              longitude: origin.lng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.lat,
              longitude: destination.lng,
            },
          },
        },
        intermediates: waypoints.map((waypoint) => ({
          location: {
            latLng: {
              latitude: waypoint.lat,
              longitude: waypoint.lng,
            },
          },
        })),
        travelMode: "DRIVE",
        languageCode: defaultLanguageCode,
      }),
    });

    if (!response.ok) {
      throw new BadGatewayException("Rota metrikleri su anda hesaplanamiyor.");
    }

    const payload = (await response.json()) as GoogleRoutesResponse;
    const route = payload.routes?.[0];

    if (!route?.distanceMeters || !route.duration) {
      throw new BadGatewayException("Rota metrikleri dogrulanamadi.");
    }

    const durationSeconds = Number.parseInt(route.duration.replace("s", ""), 10);

    return {
      distanceMeters: route.distanceMeters,
      durationSeconds: Number.isNaN(durationSeconds) ? 0 : durationSeconds,
    };
  }

  private requireGoogleApiKey(): string {
    const apiKey = this.configService.get<string>("maps.googleApiKey")?.trim();

    if (apiKey) {
      return apiKey;
    }

    throw new InternalServerErrorException(
      "Google Maps route engine is not configured."
    );
  }
}
