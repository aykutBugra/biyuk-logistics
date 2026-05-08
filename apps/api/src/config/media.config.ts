import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { registerAs } from "@nestjs/config";

function resolveLocalUploadRoot(): string {
  const configuredRoot = process.env.MEDIA_LOCAL_ROOT?.trim();

  if (configuredRoot) {
    return resolve(configuredRoot);
  }

  const runningInsideApiWorkspace = existsSync(
    resolve(process.cwd(), "prisma/schema.prisma")
  );

  return runningInsideApiWorkspace
    ? resolve(process.cwd(), "uploads")
    : resolve(process.cwd(), "apps/api/uploads");
}

export default registerAs("media", () => ({
  driver: (process.env.MEDIA_DRIVER ?? "local").trim().toLowerCase(),
  publicBaseUrl:
    process.env.MEDIA_PUBLIC_BASE_URL?.trim() ??
    `http://localhost:${Number(process.env.NEST_PORT ?? 4000)}`,
  localRoot: resolveLocalUploadRoot(),
}));
