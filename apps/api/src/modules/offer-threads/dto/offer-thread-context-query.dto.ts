import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString } from "class-validator";

export const OFFER_THREAD_CONTEXT_VALUES = ["customer", "carrier"] as const;

export type OfferThreadContextSide = (typeof OFFER_THREAD_CONTEXT_VALUES)[number];

export class OfferThreadContextQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value
  )
  @IsString()
  @IsIn(OFFER_THREAD_CONTEXT_VALUES)
  as?: OfferThreadContextSide;
}
