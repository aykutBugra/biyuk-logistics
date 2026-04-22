import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class LocationAutocompleteQueryDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: "Konum aramasi icin en az 3 karakter girilmelidir." })
  @MaxLength(120)
  q!: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(36)
  sessionToken?: string;
}
