import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { OffersController } from "./offers.controller";
import { OffersService } from "./offers.service";
import { OffersRepository } from "./repositories/offers.repository";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [OffersController],
  providers: [OffersService, OffersRepository, RolesGuard],
})
export class OffersModule {}
