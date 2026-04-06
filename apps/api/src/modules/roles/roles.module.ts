import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { RolesController } from "./roles.controller";
import { RolesRepository } from "./repositories/roles.repository";
import { RolesService } from "./roles.service";

@Module({
  providers: [RolesService, RolesRepository, JwtAuthGuard, RolesGuard],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}
