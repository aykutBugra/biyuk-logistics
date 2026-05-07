import { Transform } from "class-transformer";
import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

const trimRequiredString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class CreateOfferThreadMessageDto {
  @Transform(trimRequiredString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  mesaj!: string;
}
