function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeCityFilter(
  value: string | null | undefined
): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return undefined;
  }

  return normalized.toLocaleUpperCase("tr-TR");
}
