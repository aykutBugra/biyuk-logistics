export const ROLE_NAMES = {
  MUSTERI: "MUSTERI",
  NAKLIYECI: "NAKLIYECI",
  ADMIN: "ADMIN",
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

export const ROLE_VALUES = Object.values(ROLE_NAMES) as RoleName[];

export const BUSINESS_ROLE_VALUES = [
  ROLE_NAMES.MUSTERI,
  ROLE_NAMES.NAKLIYECI,
] as const;

export type BusinessRoleName = (typeof BUSINESS_ROLE_VALUES)[number];

export function isBusinessRoleName(roleName: RoleName): roleName is BusinessRoleName {
  return BUSINESS_ROLE_VALUES.includes(roleName as BusinessRoleName);
}
