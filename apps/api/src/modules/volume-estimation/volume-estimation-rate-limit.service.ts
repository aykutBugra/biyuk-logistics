import { Injectable } from "@nestjs/common";

@Injectable()
export class VolumeEstimationRateLimitService {
  assertWithinLimit(userId: number) {
    void userId;

    // Temporarily disabled while the volume estimation flow is under manual test.
  }
}
