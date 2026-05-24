import { Transform } from "class-transformer";
import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
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

export class CreateOfferDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value
  )
  @IsUUID("4")
  aracId!: string;

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
  @MaxLength(255)
  not?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  planlananAlimTarihi!: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  tahminiTeslimTarihi?: string;
}
