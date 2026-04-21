import { Transform } from "class-transformer";
import {
  IsInt,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { VEHICLE_BODY_TYPES } from "../vehicle.constants";

const trimAndCollapseWhitespace = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().replace(/\s+/g, " ");
};

const toNumber = ({ value }: { value: unknown }) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return value;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? value : parsed;
};

const MAX_VEHICLE_YEAR = new Date().getFullYear() + 1;

export class UpdateVehicleDto {
  @Transform(trimAndCollapseWhitespace)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  marka!: string;

  @Transform(trimAndCollapseWhitespace)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @Transform(trimAndCollapseWhitespace)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plaka!: string;

  @Transform(toNumber)
  @IsInt()
  @Min(1900)
  @Max(MAX_VEHICLE_YEAR)
  yil!: number;

  @Transform(toNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000)
  maksimumAgirlikKg!: number;

  @Transform(toNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  maksimumHacimM3!: number;

  @Transform(trimAndCollapseWhitespace)
  @IsString()
  @IsNotEmpty()
  @IsIn(VEHICLE_BODY_TYPES)
  kasaTipi!: string;

  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  uzunlukCm?: number;

  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  genislikCm?: number;

  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  yukseklikCm?: number;
}
