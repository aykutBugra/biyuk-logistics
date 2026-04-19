import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import { JobsRepository } from "./repositories/jobs.repository";

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [JobsController],
  providers: [JobsService, JobsRepository, RolesGuard],
})
export class JobsModule {}
