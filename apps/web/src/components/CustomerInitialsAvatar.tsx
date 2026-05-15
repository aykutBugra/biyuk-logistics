type CustomerInitialsAvatarProps = {
  name?: string | null;
  fallback?: string;
  imageUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  tone?: "blue" | "slate" | "amber";
  className?: string;
};

const SIZE_STYLES: Record<
  NonNullable<CustomerInitialsAvatarProps["size"]>,
  string
> = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-xl",
};

const IMAGE_SIZE_STYLES: Record<
  NonNullable<CustomerInitialsAvatarProps["size"]>,
  string
> = {
  xs: "h-6 w-6",
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

const TONE_STYLES: Record<
  NonNullable<CustomerInitialsAvatarProps["tone"]>,
  string
> = {
  blue: "border-blue-200 bg-blue-600 text-white",
  slate: "border-slate-200 bg-slate-900 text-white",
  amber: "border-amber-200 bg-amber-100 text-amber-700",
};

function getInitials(name: string | null | undefined, fallback: string): string {
  const parts = (name ?? "")
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return fallback.slice(0, 2).toUpperCase();
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default function CustomerInitialsAvatar({
  name,
  fallback = "NA",
  imageUrl,
  size = "md",
  tone = "blue",
  className,
}: CustomerInitialsAvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={`inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-100 object-cover shadow-sm ${
          IMAGE_SIZE_STYLES[size]
        } ${className ?? ""}`.trim()}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full border font-black tracking-tight shadow-sm ${
        SIZE_STYLES[size]
      } ${TONE_STYLES[tone]} ${className ?? ""}`.trim()}
      aria-hidden="true"
    >
      {getInitials(name, fallback)}
    </div>
  );
}
