import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OfferThreadsController } from "./offer-threads.controller";
import { OfferThreadMediaService } from "./offer-thread-media.service";
import { OfferThreadsService } from "./offer-threads.service";
import { OfferThreadsRepository } from "./repositories/offer-threads.repository";

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [OfferThreadsController],
  providers: [OfferThreadMediaService, OfferThreadsService, OfferThreadsRepository, RolesGuard],
  exports: [OfferThreadsService],
})
export class OfferThreadsModule {}
