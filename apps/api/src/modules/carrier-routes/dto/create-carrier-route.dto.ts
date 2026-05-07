import { Transform, Type } from "class-transformer";
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { TransportLocationSelectionDto } from "../../locations/dto/transport-location-selection.dto";

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

export class CreateCarrierRouteDto {
  @ValidateNested()
  @Type(() => TransportLocationSelectionDto)
  baslangicKonum!: TransportLocationSelectionDto;

  @ValidateNested()
  @Type(() => TransportLocationSelectionDto)
  varisKonum!: TransportLocationSelectionDto;

  @Transform(trimString)
  @IsString()
  @MaxLength(10)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  planlananTarih!: string;

  @Transform(toNumber)
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(5000)
  maksimumSapmaKm?: number;
}
