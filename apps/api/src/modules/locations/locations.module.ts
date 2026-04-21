import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { GoogleLocationProvider } from "./google/google-location.provider";
import { GoogleRouteEngine } from "./google/google-route.engine";
import { LocationProvider } from "./location-provider.contract";
import { LocationsController } from "./locations.controller";
import { LocationsService } from "./locations.service";
import { LOCATION_PROVIDER, ROUTE_ENGINE } from "./location.tokens";
import { RouteEngine } from "./route-engine.contract";

@Module({
  imports: [AuthModule],
  controllers: [LocationsController],
  providers: [
    LocationsService,
    GoogleLocationProvider,
    GoogleRouteEngine,
    {
      provide: LOCATION_PROVIDER,
      inject: [ConfigService, GoogleLocationProvider],
      useFactory: (
        configService: ConfigService,
        googleProvider: GoogleLocationProvider
      ): LocationProvider => {
        const provider = configService.get<string>("maps.provider") ?? "google";

        if (provider === "google") {
          return googleProvider;
        }

        throw new Error(`Unsupported map provider: ${provider}`);
      },
    },
    {
      provide: ROUTE_ENGINE,
      inject: [ConfigService, GoogleRouteEngine],
      useFactory: (
        configService: ConfigService,
        googleRouteEngine: GoogleRouteEngine
      ): RouteEngine => {
        const provider = configService.get<string>("maps.routeEngine") ?? "google";

        if (provider === "google") {
          return googleRouteEngine;
        }

        throw new Error(`Unsupported route engine: ${provider}`);
      },
    },
  ],
  exports: [LocationsService, LOCATION_PROVIDER, ROUTE_ENGINE],
})
export class LocationsModule {}
