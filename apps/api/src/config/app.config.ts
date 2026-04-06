import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  port: Number(process.env.NEST_PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
}));
