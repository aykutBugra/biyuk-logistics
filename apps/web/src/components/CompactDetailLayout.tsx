import type { ReactNode } from "react";
import styles from "./compact-detail.module.css";

/** Density is scoped to operational details; overview and account pages retain their layout. */
export default function CompactDetailLayout({ children }: { children: ReactNode }) {
  return <div data-compact-details className={styles.scope}>{children}</div>;
}
