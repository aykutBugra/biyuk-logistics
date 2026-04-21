import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { TransportLocationSelectionDto } from "../../locations/dto/transport-location-selection.dto";
import { REQUEST_CARGO_TYPES } from "../transport-request.constants";

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

  if (trimmed.length === 0) {
    return value;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? value : parsed;
};

export class CreateTransportRequestDto {
  @ValidateNested()
  @Type(() => TransportLocationSelectionDto)
  baslangicKonum!: TransportLocationSelectionDto;

  @ValidateNested()
  @Type(() => TransportLocationSelectionDto)
  varisKonum!: TransportLocationSelectionDto;

  @Transform(({ value }: { value: unknown }) => value === true || value === "true")
  @IsBoolean()
  tekTasimaIstiyor!: boolean;

  @Transform(toNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000)
  agirlikKg!: number;

  @Transform(toNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  hacimM3!: number;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @IsIn(REQUEST_CARGO_TYPES)
  yukTipi!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  tasimaTarihi!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  yukDetay!: string;
}
