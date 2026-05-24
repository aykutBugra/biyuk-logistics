import { Module } from "@nestjs/common";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthModule } from "../auth/auth.module";
import { OpenAiVolumeEstimationService } from "./openai-volume-estimation.service";
import { VOLUME_ESTIMATION_PROVIDER } from "./volume-estimation.tokens";
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
    {
      provide: VOLUME_ESTIMATION_PROVIDER,
      useExisting: OpenAiVolumeEstimationService,
    },
    ShapeBasedVolumeCalculatorService,
    VolumeEstimationRateLimitService,
    RolesGuard,
  ],
})
export class VolumeEstimationModule {}
