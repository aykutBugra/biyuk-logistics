import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RatingsController } from "./ratings.controller";
import { RatingsService } from "./ratings.service";
import { RatingsRepository } from "./repositories/ratings.repository";

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [RatingsController],
  providers: [RatingsService, RatingsRepository, RolesGuard],
})
export class RatingsModule {}
