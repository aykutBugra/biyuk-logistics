import { Transform } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { ROLE_NAMES } from "../../../common/constants/role-names";

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

const trimOptionalString = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const REGISTER_ROLE_VALUES = [ROLE_NAMES.MUSTERI, ROLE_NAMES.NAKLIYECI] as const;

export type RegisterRoleName = (typeof REGISTER_ROLE_VALUES)[number];

export class RegisterDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ad!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  soyad!: string;

  @Transform(trimString)
  @IsEmail()
  @MaxLength(100)
  mail!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  kullaniciAdi!: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefonNumarasi?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  password!: string;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.toUpperCase() : undefined;
  })
  @IsOptional()
  @IsIn(REGISTER_ROLE_VALUES)
  role?: RegisterRoleName;
}
