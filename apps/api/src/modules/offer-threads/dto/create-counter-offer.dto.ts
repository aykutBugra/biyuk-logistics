import { Transform } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

const trimOptionalString = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export class CreateCounterOfferDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? Number(value.trim()) : value
  )
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  fiyat!: number;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  mesaj?: string;
}
