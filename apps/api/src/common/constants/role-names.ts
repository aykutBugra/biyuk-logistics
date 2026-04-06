export const ROLE_NAMES = {
  MUSTERI: "MUSTERI",
  NAKLIYECI: "NAKLIYECI",
  ADMIN: "ADMIN",
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

export const ROLE_VALUES = Object.values(ROLE_NAMES) as RoleName[];
