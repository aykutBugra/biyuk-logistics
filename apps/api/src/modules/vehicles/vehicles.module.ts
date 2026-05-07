import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { VehicleCapacityModule } from "../vehicle-capacity/vehicle-capacity.module";
import { VehiclesRepository } from "./repositories/vehicles.repository";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";

@Module({
  imports: [AuthModule, PrismaModule, VehicleCapacityModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesRepository, RolesGuard],
})
export class VehiclesModule {}
