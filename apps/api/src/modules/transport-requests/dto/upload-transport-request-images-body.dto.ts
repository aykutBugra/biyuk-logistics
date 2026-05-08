import { Transform } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

const toOptionalInteger = ({ value }: { value: unknown }) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : value;
};

export class UploadTransportRequestImagesBodyDto {
  @IsOptional()
  @Transform(toOptionalInteger)
  @IsInt()
  @Min(0)
  primaryIndex?: number;
}
