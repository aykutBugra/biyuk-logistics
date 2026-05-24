import { Injectable } from "@nestjs/common";
import { AppErrorCode, AppErrors } from "../../../common/errors";
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

  // Google Routes computeRoutes endpoint'ini kullanarak origin, destination ve
  // gerekirse ara noktalar icin gercek yol mesafesi ve sure metrigini hesaplar.
  async getRouteMetrics(
    origin: RoutePoint,
    destination: RoutePoint,
    waypoints: RoutePoint[] = []
  ): Promise<RouteMetrics> {
    const apiKey = this.requireGoogleApiKey();
    const defaultLanguageCode =
      this.configService.get<string>("maps.defaultLanguageCode") ?? "tr";

    // Request gomdesi "start -> waypointler -> end" zincirini tarif eder.
    // Route sapma evaluator'u burada pickup ve dropoff'u ara nokta olarak gonderir.
    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          // MVP'de geometry degil yalnizca mesafe ve sure gerektigi icin dar bir field mask kullanilir.
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
      }
    );

    // Upstream cevap vermezse evaluator bunu gecici route servis problemi olarak ele alir.
    if (!response.ok) {
      throw AppErrors.badGateway(
        AppErrorCode.LOCATION_ROUTE_BAD_GATEWAY,
        "Rota metrikleri su anda hesaplanamiyor."
      );
    }

    const payload = (await response.json()) as GoogleRoutesResponse;
    const route = payload.routes?.[0];
    const durationSeconds = route?.duration
      ? this.parseDurationSeconds(route.duration)
      : null;

    // Provider'dan gelen payload'da gerekli alanlar yoksa metrikleri guvenilir
    // kabul etmeyip hesaplamayi gecersiz sayar.
    if (
      typeof route?.distanceMeters !== "number" ||
      !Number.isFinite(route.distanceMeters) ||
      route.distanceMeters < 0 ||
      durationSeconds === null
    ) {
      throw AppErrors.badGateway(
        AppErrorCode.LOCATION_ROUTE_BAD_GATEWAY,
        "Rota metrikleri dogrulanamadi."
      );
    }

    return {
      distanceMeters: route.distanceMeters,
      durationSeconds,
    };
  }

  // Google'in "123.4s" formatindaki sure degerini tam sayi saniyeye cevirir.
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

  // Route engine'i sadece server-side Google key ile calistirir; key yoksa
  // rota hesaplayan ust katmanlar sessiz bozulmasin diye acik hata verir.
  private requireGoogleApiKey(): string {
    const apiKey = this.configService.get<string>("maps.googleApiKey")?.trim();

    if (apiKey) {
      return apiKey;
    }

    throw AppErrors.internal(
      AppErrorCode.LOCATION_INTERNAL,
      "Google Maps route engine is not configured."
    );
  }
}
