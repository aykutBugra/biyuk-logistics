import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class TransportLocationSelectionDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  provider!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  placeId!: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(36)
  sessionToken?: string;
}
