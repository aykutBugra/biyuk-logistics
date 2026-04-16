import { Transform } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

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
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  baslangicSehri!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  varisSehri!: string;

  @Transform(toNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  baslangicEnlem!: number;

  @Transform(toNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  baslangicBoylam!: number;

  @Transform(toNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  varisEnlem!: number;

  @Transform(toNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  varisBoylam!: number;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  yukDetay!: string;
}
