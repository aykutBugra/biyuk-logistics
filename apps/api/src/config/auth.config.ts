import { registerAs } from "@nestjs/config";

export type JwtTtlValue = number | `${number}${"ms" | "s" | "m" | "h" | "d"}`;

const DEFAULT_ACCESS_TTL = "15m" satisfies JwtTtlValue;
const DEFAULT_REFRESH_TTL = "7d" satisfies JwtTtlValue;

const requireSecretEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

export default registerAs("auth", () => ({
  accessSecret: requireSecretEnv("JWT_ACCESS_SECRET"),
  accessTtl: (process.env.JWT_ACCESS_TTL?.trim() || DEFAULT_ACCESS_TTL) as JwtTtlValue,
  refreshSecret: requireSecretEnv("JWT_REFRESH_SECRET"),
  refreshTtl: (process.env.JWT_REFRESH_TTL?.trim() || DEFAULT_REFRESH_TTL) as JwtTtlValue,
}));
