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
import { ROLE_NAMES } from "../../../common/constants/role-names";    //ROLE_NAMES sabitlerini içeren bir modülü içe aktarır

const trimString = ({ value }: { value: unknown }) => //Verilen değerin bir string olup olmadığını kontrol eder ve eğer öyleyse başındaki ve sonundaki boşlukları kaldırır
  typeof value === "string" ? value.trim() : value;

const trimOptionalString = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const REGISTER_ROLE_VALUES = [
  "KULLANICI",
  ROLE_NAMES.MUSTERI,
  ROLE_NAMES.NAKLIYECI,
] as const;

export type RegisterRoleName = (typeof REGISTER_ROLE_VALUES)[number];

export class RegisterDto {//RegisterDto, kullanıcı kayıt işlemi için gerekli olan bilgileri içeren bir DTO'dur
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

  @Transform(({ value }: { value: unknown }) => {//
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.toUpperCase() : undefined;
  })
  @IsOptional()
  @IsIn(REGISTER_ROLE_VALUES) //Bu, role alanının sadece REGISTER_ROLE_VALUES içinde tanımlı olan değerleri kabul etmesini sağlar
  role?: RegisterRoleName;
}
