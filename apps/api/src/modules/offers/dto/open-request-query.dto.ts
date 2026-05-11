import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";
import { REQUEST_CARGO_TYPES } from "../../transport-requests/transport-request.constants";

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

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

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return value;
};

export class OpenRequestQueryDto {
  @Transform(toNumber)
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 0 })
  @Min(1)
  carrierRouteId?: number;

  @Transform(toNumber)
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(5000)
  maxSapmaKm?: number;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  baslangicSehir?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  varisSehir?: string;

  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  tekTasimaIstiyor?: boolean;

  @Transform(toNumber)
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  minAgirlikKg?: number;

  @Transform(toNumber)
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  maxAgirlikKg?: number;

  @Transform(toNumber)
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  minHacimM3?: number;

  @Transform(toNumber)
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  maxHacimM3?: number;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsIn(REQUEST_CARGO_TYPES)
  yukTipi?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  tasimaTarihi?: string;
}
