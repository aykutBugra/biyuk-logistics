import { Transform } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
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

export class CreateRatingDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? Number(value.trim()) : value
  )
  @IsInt()
  @Min(1)
  @Max(5)
  puanDegeri!: number;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  yorum?: string;
}
