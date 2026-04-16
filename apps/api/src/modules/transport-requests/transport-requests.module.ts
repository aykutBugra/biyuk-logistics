import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthModule } from "../auth/auth.module";
import { TransportRequestsRepository } from "./repositories/transport-requests.repository";
import { TransportRequestsController } from "./transport-requests.controller";
import { TransportRequestsService } from "./transport-requests.service";

@Module({
  imports: [AuthModule],
  controllers: [TransportRequestsController],
  providers: [
    TransportRequestsService,
    TransportRequestsRepository,
    RolesGuard,
  ],
})
export class TransportRequestsModule {}
