import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import appConfig from "./config/app.config";
import authConfig from "./config/auth.config";
import { getEnvFilePaths } from "./config/env";
import mapsConfig from "./config/maps.config";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { LocationsModule } from "./modules/locations/locations.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OffersModule } from "./modules/offers/offers.module";
import { RatingsModule } from "./modules/ratings/ratings.module";
import { RolesModule } from "./modules/roles/roles.module";
import { TransportRequestsModule } from "./modules/transport-requests/transport-requests.module";
import { UsersModule } from "./modules/users/users.module";
import { VehiclesModule } from "./modules/vehicles/vehicles.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, mapsConfig],
      envFilePath: getEnvFilePaths(),
    }),
    PrismaModule,
    RolesModule,
    UsersModule,
    AuthModule,
    JobsModule,
    LocationsModule,
    NotificationsModule,
    OffersModule,
    RatingsModule,
    TransportRequestsModule,
    VehiclesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
