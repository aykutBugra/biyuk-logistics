import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { VehicleCapacityRepository } from "./repositories/vehicle-capacity.repository";
import { VehicleCapacityService } from "./vehicle-capacity.service";

@Module({
  imports: [PrismaModule],
  providers: [VehicleCapacityService, VehicleCapacityRepository],
  exports: [VehicleCapacityService, VehicleCapacityRepository],
})
export class VehicleCapacityModule {}
