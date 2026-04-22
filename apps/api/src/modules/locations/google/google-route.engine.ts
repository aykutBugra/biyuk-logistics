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


    //fetch API'si kullanarak Google Routes API'ye bir POST isteği gönderir. 
    // İstek gövdesi, başlangıç noktası, varış noktası ve ara noktaları 
    // içeren JSON formatında hazırlanır. Ayrıca, istek başlıklarında API
    //  anahtarı ve istenen alanlar belirtilir.
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        //computeRoutes kusbakışı yerine gerçek yol torasını döndürür, bu yüzden daha doğru metrikler sağlar.
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
    const durationSeconds = route?.duration
      ? this.parseDurationSeconds(route.duration)
      : null;

    if (
      typeof route?.distanceMeters !== "number" ||
      !Number.isFinite(route.distanceMeters) ||
      route.distanceMeters < 0 ||
      durationSeconds === null
    ) {
      throw new BadGatewayException("Rota metrikleri dogrulanamadi.");
    }

    return {
      distanceMeters: route.distanceMeters,
      durationSeconds,
    };
  }

  private parseDurationSeconds(duration: string): number | null {
    const normalizedDuration = duration.trim();

    if (!normalizedDuration.endsWith("s")) {
      return null;
    }

    const parsedSeconds = Number.parseFloat(normalizedDuration.slice(0, -1));

    if (!Number.isFinite(parsedSeconds) || parsedSeconds < 0) {
      return null;
    }

    return Math.round(parsedSeconds);
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
