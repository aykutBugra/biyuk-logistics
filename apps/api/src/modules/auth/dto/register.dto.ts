import { Transform } from "class-transformer";
import {
  IsEmail,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
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

const currentMaxVehicleYear = new Date().getFullYear() + 1;

function isCarrierRegister(dto: RegisterDto): boolean {
  return dto.role === ROLE_NAMES.NAKLIYECI;
}

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

  @ValidateIf(isCarrierRegister)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  marka?: string;

  @ValidateIf(isCarrierRegister)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model?: string;

  @ValidateIf(isCarrierRegister)
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  plaka?: string;

  @ValidateIf(isCarrierRegister)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? Number(value.trim()) : value
  )
  @IsInt()
  @Min(1900)
  @Max(currentMaxVehicleYear)
  yil?: number;

  @ValidateIf(isCarrierRegister)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? Number(value.trim()) : value
  )
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  kapasite?: number;
}
