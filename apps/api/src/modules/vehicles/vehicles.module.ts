import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { VehiclesRepository } from "./repositories/vehicles.repository";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesRepository, RolesGuard],
})
export class VehiclesModule {}
