"use client";

import Link from "next/link";
import { Badge, EmptyState, LinkButton } from "@/components/ui";
import type { MyShipmentCardModel } from "@/components/MyShipmentCard";
import { formatMoney, type LoadState } from "@/features/customer-workspace/shared";
import { CarrierListLayout, carrierText, shipmentState, type ListControls, type ShipmentFilter, type ShipmentSort, type SummaryItem } from "./shared";
import styles from "./workspace.module.css";

export default function ShipmentsWorkspace({
  items, metrics, totalCount, isEnriching, todayTasks, ...controls
}: LoadState & ListControls<ShipmentFilter, ShipmentSort> & {
  items: MyShipmentCardModel[]; metrics: SummaryItem[]; totalCount: number; isEnriching: boolean; todayTasks: MyShipmentCardModel[];
}) {
  return (
    <CarrierListLayout {...controls} metrics={metrics} totalCount={totalCount} visibleCount={items.length} isEnriching={isEnriching}
      title="Taşıma operasyonları" description="Başlatma ve teslimat adımları için ilgili nakliyeyi açın."
      loadingLabel="Nakliyeler yükleniyor…" searchLabel="Nakliyelerde ara" placeholder="Güzergâh, müşteri veya araç ara…"
      filters={[{ id: "all", label: "Tümü" }, { id: "active", label: "Aktif" }, { id: "on-road", label: "Yolda" }, { id: "completed", label: "Tamamlanan" }]}
      sortOptions={[{ value: "newest", label: "En yeni kayıt" }, { value: "oldest", label: "En eski kayıt" }, { value: "delivery-soon", label: "Teslim tarihine göre" }]}
      priorityContent={todayTasks.length ? <div className={styles.todayStrip}><strong><i className="pi pi-calendar" aria-hidden="true" />Bugün teslim planlanan</strong><div>{todayTasks.map((task) => <Link key={task.id} href={task.detailHref} title={carrierText(task.rotaBaslik)}>{carrierText(task.rotaBaslik)}<i className="pi pi-arrow-up-right" aria-hidden="true" /></Link>)}</div></div> : null}
      emptyState={<EmptyState icon="pi pi-truck" title="Henüz nakliye yok" description="Kabul edilen teklifleriniz nakliyeye dönüştüğünde burada listelenecek." action={<LinkButton href="/dashboard/tekliflerim">Tekliflerimi gör</LinkButton>} />}
    >
      {items.map((shipment) => {
        const state = shipmentState(shipment.durum);
        const route = carrierText(shipment.rotaBaslik, "Taşıma");
        return (
          <article key={shipment.id} data-dashboard-card className={styles.row}>
            <div className={styles.rowTop}>
              <div className={styles.routeHeading}>
                <div className={styles.badges}><Badge tone={state.tone}>{state.label}</Badge>{shipment.isDelayed ? <Badge tone="amber">Gecikme riski</Badge> : null}</div>
                <h3 title={route}>{route}</h3>
                {shipment.rotaMeta ? <p className={styles.address} title={carrierText(shipment.rotaMeta)}>{carrierText(shipment.rotaMeta)}</p> : null}
              </div>
              <strong className={styles.price}>{formatMoney(shipment.fiyat)}</strong>
            </div>
            <div className={styles.facts}><span>{carrierText(shipment.musteriAdi, "Müşteri")}</span>{shipment.musteriKullaniciAdi ? <span>@{carrierText(shipment.musteriKullaniciAdi)}</span> : null}<span>{carrierText(shipment.aracEtiketi)}</span>{shipment.chipler.map((chip) => <span key={chip.label}>{carrierText(chip.label)}</span>)}</div>
            <div className={styles.shipmentPlanning}>
              <dl className={styles.dates}>
                <div><dt>Planlanan alım</dt><dd>{shipment.planlananAlimTarihi || "Belirtilmedi"}</dd></div>
                <div><dt>Tahmini teslim</dt><dd>{shipment.tahminiTeslimTarihi || "Belirtilmedi"}</dd></div>
              </dl>
              <ol className={styles.timeline} aria-label="Taşıma aşamaları">{shipment.timelineSteps.map((step) => <li key={step.label} data-state={step.state} aria-current={step.state === "current" ? "step" : undefined}>
                <i className={step.state === "complete" ? "pi pi-check-circle" : "pi pi-circle"} aria-hidden="true" />
                <span>{carrierText(step.label)}<small>{step.timestamp || "Henüz yok"}</small></span>
              </li>)}</ol>
            </div>
            <p className={styles.note}>{carrierText(shipment.durumNotu)}</p>
            <footer className={styles.rowFooter}><span className={styles.updated}>Kayıt: {shipment.kayitTarihi}</span><div className={styles.actions}>
              {shipment.conversationHref ? <LinkButton href={shipment.conversationHref} variant="ghost">Konuşma</LinkButton> : null}
              <LinkButton href={shipment.detailHref}>Nakliyeyi aç <i className="pi pi-arrow-up-right" aria-hidden="true" /></LinkButton>
            </div></footer>
          </article>
        );
      })}
    </CarrierListLayout>
  );
}
