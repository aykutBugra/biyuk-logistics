import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

const trimOptionalString = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export class CreateOfferThreadImageMessageDto {
  @IsOptional()
  @Transform(trimOptionalString)
  @IsString()
  @MaxLength(1000)
  mesaj?: string;
}
