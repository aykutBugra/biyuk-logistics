import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthModule } from "../auth/auth.module";
import { LocationsModule } from "../locations/locations.module";
import { CarrierRoutesController } from "./carrier-routes.controller";
import { CarrierRoutesService } from "./carrier-routes.service";
import { CarrierRoutesRepository } from "./repositories/carrier-routes.repository";

@Module({
  imports: [AuthModule, LocationsModule],
  controllers: [CarrierRoutesController],
  providers: [CarrierRoutesService, CarrierRoutesRepository, RolesGuard],
  exports: [CarrierRoutesService],
})
export class CarrierRoutesModule {}
