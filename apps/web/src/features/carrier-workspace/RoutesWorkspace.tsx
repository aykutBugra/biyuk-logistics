"use client";

import { Badge, EmptyState, LinkButton } from "@/components/ui";
import type { RouteCardModel } from "@/components/RouteCard";
import type { LoadState } from "@/features/customer-workspace/shared";
import { CarrierListLayout, carrierText, carrierTone, type ListControls, type RouteFilter, type RouteSort, type SummaryItem } from "./shared";
import styles from "./workspace.module.css";

type RouteRow = RouteCardModel & { readinessKey: Exclude<RouteFilter, "all"> };

export default function RoutesWorkspace({
  items, metrics, totalCount, isEnriching, ...controls
}: LoadState & ListControls<RouteFilter, RouteSort> & {
  items: RouteRow[]; metrics: SummaryItem[]; totalCount: number; isEnriching: boolean;
}) {
  return (
    <CarrierListLayout {...controls} metrics={metrics} totalCount={totalCount} visibleCount={items.length} isEnriching={isEnriching}
      title="Kayıtlı rotalar" description="Ana hatlarınızı, planlanan tarihleri ve mevcut yük eşleşmelerini inceleyin."
      loadingLabel="Rotalar yükleniyor…" searchLabel="Rotalarda ara" placeholder="Kalkış, varış veya konum ara…"
      filters={[{ id: "all", label: "Tümü" }, { id: "coordinate-ready", label: "Koordinatlı" }, { id: "distance-ready", label: "Yalnızca mesafe" }, { id: "incomplete", label: "Veri eksik" }]}
      sortOptions={[{ value: "newest", label: "En yeni kayıt" }, { value: "oldest", label: "En eski kayıt" }, { value: "distance-desc", label: "Mesafe: uzundan" }, { value: "distance-asc", label: "Mesafe: kısadan" }]}
      emptyState={<EmptyState icon="pi pi-map" title="Henüz kayıtlı rota yok" description="Planladığınız ana hattı kaydederek yük keşfinde kullanabilirsiniz." action={<LinkButton href="/dashboard/rotalarim/yeni" variant="primary">İlk rotayı oluştur</LinkButton>} />}
    >
      {items.map((route) => {
        const title = carrierText(route.rotaDetay || route.rotaBaslik, "Kayıtlı rota");
        return (
          <article key={route.id} data-dashboard-card className={styles.row}>
            <div className={styles.rowTop}>
              <div className={styles.routeHeading}>
                <div className={styles.badges}><Badge tone={carrierTone(route.durumTonu)}>{carrierText(route.durumEtiketi)}</Badge>
                  <span>{carrierText(route.eslesmeBilgisi, "Yük eşleşme özeti alınamadı")}</span></div>
                <h3 title={title}>{title}</h3>
                {route.rotaDetay ? <p className={styles.address} title={carrierText(route.rotaBaslik)}>{carrierText(route.rotaBaslik)}</p> : null}
              </div>
              <span className={styles.routeIcon} aria-hidden="true"><i className="pi pi-directions" /></span>
            </div>
            <div className={styles.routeFacts}>{route.chipler.map((chip, index) => <div key={chip.label}>
              {index === 0 ? <i className="pi pi-calendar" aria-hidden="true" /> : null}<span>{carrierText(chip.label)}</span>
            </div>)}</div>
            <footer className={styles.rowFooter}><span className={styles.updated}>Kayıt: {route.olusturmaBilgisi}</span><div className={styles.actions}>
              <LinkButton href={route.editHref} variant="ghost">Düzenle</LinkButton>
              <LinkButton href={route.detailHref}>Rotayı aç <i className="pi pi-arrow-up-right" aria-hidden="true" /></LinkButton>
            </div></footer>
          </article>
        );
      })}
    </CarrierListLayout>
  );
}
