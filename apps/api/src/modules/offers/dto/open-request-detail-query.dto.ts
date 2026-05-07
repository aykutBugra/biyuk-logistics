import { Transform } from "class-transformer";
import { IsNumber, IsOptional, Min } from "class-validator";

const toNumber = ({ value }: { value: unknown }) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? value : parsed;
};

export class OpenRequestDetailQueryDto {
  @Transform(toNumber)
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 0 })
  @Min(1)
  carrierRouteId?: number;
}
