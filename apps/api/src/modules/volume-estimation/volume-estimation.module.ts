import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthModule } from "../auth/auth.module";
import { OpenAiVolumeEstimationService } from "./openai-volume-estimation.service";
import { ShapeBasedVolumeCalculatorService } from "./shape-based-volume-calculator.service";
import { VolumeEstimationController } from "./volume-estimation.controller";
import { VolumeEstimationRateLimitService } from "./volume-estimation-rate-limit.service";
import { VolumeEstimationService } from "./volume-estimation.service";

@Module({
  imports: [AuthModule],
  controllers: [VolumeEstimationController],
  providers: [
    VolumeEstimationService,
    OpenAiVolumeEstimationService,
    ShapeBasedVolumeCalculatorService,
    VolumeEstimationRateLimitService,
    RolesGuard,
  ],
})
export class VolumeEstimationModule {}
