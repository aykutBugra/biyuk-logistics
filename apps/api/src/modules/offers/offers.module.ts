import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { CarrierRoutesModule } from "../carrier-routes/carrier-routes.module";
import { LocationsModule } from "../locations/locations.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OfferThreadsModule } from "../offer-threads/offer-threads.module";
import { VehicleCapacityModule } from "../vehicle-capacity/vehicle-capacity.module";
import { OpenRequestRouteAwareEvaluator } from "./open-request-route-aware-evaluator.service";
import { OffersController } from "./offers.controller";
import { OffersService } from "./offers.service";
import { OffersRepository } from "./repositories/offers.repository";

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    NotificationsModule,
    CarrierRoutesModule,
    LocationsModule,
    OfferThreadsModule,
    VehicleCapacityModule,
  ],
  controllers: [OffersController],
  providers: [
    OffersService,
    OffersRepository,
    OpenRequestRouteAwareEvaluator,
    RolesGuard,
  ],
})
export class OffersModule {}
