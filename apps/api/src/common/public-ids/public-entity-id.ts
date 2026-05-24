import { Injectable, PipeTransform } from "@nestjs/common";
import { AppErrorCode, AppErrors } from "../errors";

export type PublicEntityId =
  | {
      kind: "uuid";
      value: string;
    }
  | {
      kind: "legacy";
      value: number;
      raw: string;
    };

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]*$/;

export function isUuidV4(value: string): boolean {
  return UUID_V4_PATTERN.test(value.trim());
}

export function isLegacyNumericEntityId(value: string): boolean {
  return POSITIVE_INTEGER_PATTERN.test(value.trim());
}

export function isLegacyNumericIdsAllowed(): boolean {
  return process.env.ALLOW_LEGACY_NUMERIC_IDS?.trim().toLowerCase() === "true";
}

export function parsePublicEntityId(
  value: string,
  allowLegacyNumericIds = false
): PublicEntityId {
  const trimmed = value.trim();

  if (isUuidV4(trimmed)) {
    return {
      kind: "uuid",
      value: trimmed,
    };
  }

  if (allowLegacyNumericIds && isLegacyNumericEntityId(trimmed)) {
    return {
      kind: "legacy",
      value: Number(trimmed),
      raw: trimmed,
    };
  }

  throw AppErrors.badRequest(AppErrorCode.PUBLIC_ID_INVALID, "Invalid public entity id.");
}

export function publicEntityWhere(id: PublicEntityId): { id: number } | { publicId: string } {
  return id.kind === "legacy" ? { id: id.value } : { publicId: id.value };
}

@Injectable()
export class PublicEntityIdPipe implements PipeTransform<string, PublicEntityId> {
  transform(value: string): PublicEntityId {
    return parsePublicEntityId(value, isLegacyNumericIdsAllowed());
  }
}
