import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthModule } from "../auth/auth.module";
import { VehiclesRepository } from "./repositories/vehicles.repository";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";

@Module({
  imports: [AuthModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesRepository, RolesGuard],
})
export class VehiclesModule {}
