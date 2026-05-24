const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DateOnlyParts = {
  year: number;
  month: number;
  day: number;
};

function parseDateOnlyParts(value: string): DateOnlyParts | null {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return null;
  }

  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isDateOnly(value: string | null | undefined): value is string {
  return typeof value === "string" && parseDateOnlyParts(value) !== null;
}

export function isDateOnlyBefore(left: string, right: string): boolean {
  if (!isDateOnly(left) || !isDateOnly(right)) {
    return false;
  }

  return left < right;
}

export function dateOnlyToLocalDate(value: string | null | undefined): Date | null {
  const parts = typeof value === "string" ? parseDateOnlyParts(value) : null;

  if (!parts) {
    return null;
  }

  return new Date(parts.year, parts.month - 1, parts.day);
}

export function formatDateOnly(
  value: string | null | undefined,
  fallback = "Belirtilmedi"
): string {
  const parts = typeof value === "string" ? parseDateOnlyParts(value) : null;

  if (!parts) {
    return fallback;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(parts.year, parts.month - 1, parts.day));
}
