import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, HTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

type Tone = "neutral" | "blue" | "green" | "amber" | "red";
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

function buttonClasses(variant: ButtonVariant, className = "") {
  return `${styles.button} ${styles[variant]} ${className}`.trim();
}

export function UiScope({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`${styles.scope} ${className}`.trim()} />;
}

export function Button({
  variant = "secondary",
  loading = false,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClasses(variant, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "secondary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link {...props} className={buttonClasses(variant, className)} />;
}

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span {...props} className={`${styles.badge} ${styles[tone]} ${className}`.trim()} />;
}

export function Surface({
  padding = "default",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { padding?: "none" | "default" }) {
  return (
    <div
      {...props}
      className={`${styles.surface} ${padding === "default" ? styles.padded : ""} ${className}`.trim()}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.headerText}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.pageTitle}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  description,
  icon,
  tone = "blue",
}: {
  label: string;
  value: number | string;
  description: string;
  icon?: ReactNode;
  tone?: Tone;
}) {
  return (
    <Surface className={styles.metric}>
      <div className={styles.metricHeading}>
        <p className={styles.metricLabel}>{label}</p>
        {icon ? <span className={`${styles.metricIcon} ${styles[tone]}`} aria-hidden="true">{icon}</span> : null}
      </div>
      <p className={styles.metricValue}>{value}</p>
      <p className={styles.metricDescription}>{description}</p>
    </Surface>
  );
}

export function InlineNotice({
  title,
  children,
  action,
  tone = "blue",
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={`${styles.notice} ${styles[tone]}`} role={tone === "red" ? "alert" : "status"}>
      <div className={styles.noticeText}>
        <p className={styles.noticeTitle}>{title}</p>
        {children ? <div className={styles.noticeDescription}>{children}</div> : null}
      </div>
      {action ? <div className={styles.noticeAction}>{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = "pi pi-inbox",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon} aria-hidden="true"><i className={icon} /></span>
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyDescription}>{description}</p>
      {action ? <div className={styles.emptyAction}>{action}</div> : null}
    </div>
  );
}
