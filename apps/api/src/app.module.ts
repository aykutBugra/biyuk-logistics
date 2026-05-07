import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import aiConfig from "./config/ai.config";
import appConfig from "./config/app.config";
import authConfig from "./config/auth.config";
import { getEnvFilePaths } from "./config/env";
import mapsConfig from "./config/maps.config";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CarrierRoutesModule } from "./modules/carrier-routes/carrier-routes.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { LocationsModule } from "./modules/locations/locations.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OfferThreadsModule } from "./modules/offer-threads/offer-threads.module";
import { OffersModule } from "./modules/offers/offers.module";
import { RatingsModule } from "./modules/ratings/ratings.module";
import { RolesModule } from "./modules/roles/roles.module";
import { TransportRequestsModule } from "./modules/transport-requests/transport-requests.module";
import { VehicleCapacityModule } from "./modules/vehicle-capacity/vehicle-capacity.module";
import { VolumeEstimationModule } from "./modules/volume-estimation/volume-estimation.module";
import { UsersModule } from "./modules/users/users.module";
import { VehiclesModule } from "./modules/vehicles/vehicles.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, mapsConfig, aiConfig],
      envFilePath: getEnvFilePaths(),
    }),
    PrismaModule,
    RolesModule,
    UsersModule,
    AuthModule,
    CarrierRoutesModule,
    JobsModule,
    LocationsModule,
    NotificationsModule,
    OfferThreadsModule,
    OffersModule,
    RatingsModule,
    TransportRequestsModule,
    VehicleCapacityModule,
    VolumeEstimationModule,
    VehiclesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
