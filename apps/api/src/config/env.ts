import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function getEnvFilePaths(): string[] {
  const candidatePaths = [
    resolve(process.cwd(), "apps/api/.env"),
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
  ];

  return [...new Set(candidatePaths.filter((path) => existsSync(path)))];
}
