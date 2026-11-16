"use client";

import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import { LinkButton } from "@/components/ui";
import styles from "./customer-overview.module.css";
import { WORKSPACE_LABELS } from "@/lib/ui/terminology";

export default function CustomerOverviewHero({ workspace = "customer" }: { workspace?: "customer" | "carrier" }) {
  const isCarrier = workspace === "carrier";
  return (
    <header className={styles.hero}>
      <div className={styles.heroText}>
        <p className={styles.eyebrow}>{WORKSPACE_LABELS[workspace]}</p>
        <h1>Genel Bakış</h1>
        <p className={styles.heroDescription}>{isCarrier ? "Yük fırsatlarını, tekliflerinizi ve taşımalarınızı tek yerden yönetin." : "Taleplerinizi, tekliflerinizi ve son görüşmelerinizi tek ekrandan yönetin."}</p>
      </div>
      <div className={styles.heroActions}>
        <InlineHelpTrigger helpKey={isCarrier ? "dashboard-home-carrier" : "dashboard-home-customer"} buttonLabel="Yardım" />
        <LinkButton href={isCarrier ? "/dashboard/acik_istekler" : "/dashboard/istek_ekle"} variant="primary" className={styles.newRequest}>
          <i className={isCarrier ? "pi pi-search" : "pi pi-plus"} aria-hidden="true" /> {isCarrier ? "Yükleri Keşfet" : "Yeni Talep"}
        </LinkButton>
      </div>
    </header>
  );
}
