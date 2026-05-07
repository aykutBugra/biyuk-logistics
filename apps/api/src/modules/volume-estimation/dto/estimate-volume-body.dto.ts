import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { REQUEST_CARGO_TYPES } from "../../transport-requests/transport-request.constants";

const trimOptionalString = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export class EstimateVolumeBodyDto {
  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @IsIn(REQUEST_CARGO_TYPES)
  yukTipi?: string;
}
