import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString } from "class-validator";

export const JOB_AUDIENCE_VALUES = ["customer", "carrier"] as const;

export type JobAudience = (typeof JOB_AUDIENCE_VALUES)[number];

export class JobAudienceQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value
  )
  @IsString()
  @IsIn(JOB_AUDIENCE_VALUES)
  as?: JobAudience;
}
