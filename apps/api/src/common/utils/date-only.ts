const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnlyString(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false;
  }

  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function parseDateOnlyToUtcDate(value: string): Date {
  if (!isDateOnlyString(value)) {
    throw new Error(`Invalid date-only value: ${value}`);
  }

  const [yearPart, monthPart, dayPart] = value.split("-");
  return new Date(Date.UTC(Number(yearPart), Number(monthPart) - 1, Number(dayPart)));
}

export function formatDateOnlyFromDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}
