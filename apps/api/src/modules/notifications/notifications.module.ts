import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsController } from "./notifications.controller";
import { NOTIFICATION_PUBLISHER } from "./notification-publisher.token";
import { NotificationsPublisher } from "./notifications.publisher";
import { NotificationsService } from "./notifications.service";
import { NotificationsRepository } from "./repositories/notifications.repository";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    NotificationsPublisher,
    {
      provide: NOTIFICATION_PUBLISHER,
      useExisting: NotificationsPublisher,
    },
    RolesGuard,
  ],
  exports: [NotificationsService, NotificationsPublisher, NOTIFICATION_PUBLISHER],
})
export class NotificationsModule {}
