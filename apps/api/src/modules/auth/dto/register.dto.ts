import { Transform } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsInt,
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
import {
  BUSINESS_ROLE_VALUES,
  ROLE_NAMES,
} from "../../../common/constants/role-names";
import { VEHICLE_BODY_TYPES } from "../../vehicles/vehicle.constants";

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

const trimOptionalString = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toNumber = ({ value }: { value: unknown }) => {
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
  return Number.isNaN(parsed) ? value : parsed;
};

export const REGISTER_ROLE_VALUES = [
  "KULLANICI",
  ...BUSINESS_ROLE_VALUES,
] as const;

export type RegisterRoleName = (typeof REGISTER_ROLE_VALUES)[number];

const currentMaxVehicleYear = new Date().getFullYear() + 1;

function isCarrierRegister(dto: RegisterDto): boolean {
  return dto.role === ROLE_NAMES.NAKLIYECI;
}

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
  @Transform(toNumber)
  @IsInt()
  @Min(1900)
  @Max(currentMaxVehicleYear)
  yil?: number;

  @ValidateIf(isCarrierRegister)
  @Transform(toNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  maksimumAgirlikKg?: number;

  @ValidateIf(isCarrierRegister)
  @Transform(toNumber)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  maksimumHacimM3?: number;

  @ValidateIf(isCarrierRegister)
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.toUpperCase() : undefined;
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(VEHICLE_BODY_TYPES)
  kasaTipi?: string;

  @ValidateIf(isCarrierRegister)
  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  uzunlukCm?: number;

  @ValidateIf(isCarrierRegister)
  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  genislikCm?: number;

  @ValidateIf(isCarrierRegister)
  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  yukseklikCm?: number;
}
