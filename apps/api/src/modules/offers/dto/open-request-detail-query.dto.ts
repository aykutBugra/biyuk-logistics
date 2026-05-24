import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

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

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class OpenRequestDetailQueryDto {
  @Transform(trimString)
  @IsOptional()
  @IsString()
  carrierRouteId?: string;

  @Transform(toNumber)
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(5000)
  maxSapmaKm?: number;
}
