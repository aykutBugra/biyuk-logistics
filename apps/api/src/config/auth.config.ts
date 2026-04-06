import { registerAs } from "@nestjs/config";

export type JwtTtlValue = number | `${number}${"ms" | "s" | "m" | "h" | "d"}`;

export default registerAs("auth", () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
  accessTtl: (process.env.JWT_ACCESS_TTL ?? "15m") as JwtTtlValue,
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
  refreshTtl: (process.env.JWT_REFRESH_TTL ?? "7d") as JwtTtlValue,
}));
