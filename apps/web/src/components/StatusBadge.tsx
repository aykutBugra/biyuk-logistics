type StatusBadgeProps = {
  status: string;
  label?: string;
};

function getBadgeClasses(status: string): string {
  const normalizedStatus = status.trim().toUpperCase();

  if (
    normalizedStatus === "OLUSTURULDU" ||
    normalizedStatus === "ACIK" ||
    normalizedStatus === "YENI"
  ) {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }

  if (normalizedStatus === "ANLASILDI" || normalizedStatus === "BASLATILDI") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (
    normalizedStatus === "TAMAMLANDI" ||
    normalizedStatus === "KABUL_EDILDI"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (normalizedStatus === "REDDEDILDI" || normalizedStatus === "IPTAL_EDILDI") {
    return "bg-rose-50 text-rose-700 ring-rose-100";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getBadgeClasses(
        status
      )}`}
    >
      {label ?? status}
    </span>
  );
}
