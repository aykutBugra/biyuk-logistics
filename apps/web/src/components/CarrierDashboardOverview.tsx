"use client";

import Link from "next/link";
import { Badge, EmptyState, LinkButton } from "@/components/ui";
import { Panel, formatMoney, formatTimestamp, routeLabel } from "@/features/customer-workspace/shared";
import { CarrierMetrics, carrierText, carrierTone, shipmentState } from "@/features/carrier-workspace/shared";
import type { CarrierHomeData } from "@/lib/dashboard/use-home-data";
import { formatDateOnly } from "@/lib/date-only";
import { formatVolumeM3, formatWeightKg, getCargoTypeLabel } from "@/lib/logistics";
import styles from "@/features/carrier-workspace/workspace.module.css";

function activityTimestamp(value: string | null) {
  if (!value) return "Tarih belirtilmedi";
  return Number.isNaN(new Date(value).getTime()) ? carrierText(value) : formatTimestamp(value);
}

export default function CarrierDashboardOverview({ home }: { home: CarrierHomeData }) {
  const priority: Record<string, number> = { TESLIM_BEKLIYOR: 0, BASLATILDI: 1, OLUSTURULDU: 2 };
  const activeJobs = home.jobs.filter((job) => job.durum.trim().toUpperCase() in priority).sort((a, b) =>
    priority[a.durum.trim().toUpperCase()] - priority[b.durum.trim().toUpperCase()] ||
    new Date(b.olusturmaTarihi).getTime() - new Date(a.olusturmaTarihi).getTime()).slice(0, 4);
  const request = home.featuredRequest;
  const route = home.routePreview;
  const vehicle = home.vehiclePreview;

  return (
    <div className={styles.workspace}>
      <CarrierMetrics items={[
        { label: "Uygun yük", value: home.suitableOpenRequestCount, description: route ? "Seçili rota eşleşmeleri" : "Keşifteki açık talepler" },
        { label: "Tekliflerim", value: home.offerCount, description: home.openOfferCount + " yanıt bekliyor" },
        { label: "Aktif nakliye", value: home.activeShipmentCount, description: home.completedShipmentCount + " tamamlanan taşıma" },
        { label: "Kayıtlı rota", value: home.routeCount, description: "Planlanan ana hatlar" },
        { label: "Araçlarım", value: home.vehicleCount, description: "Tanımlı filo kayıtları" },
      ]} />
      <div className={styles.overviewGrid}>
        <div className={styles.overviewMain}>
          <Panel title="Devam eden taşımalar" icon="pi pi-truck" description="Onay bekleyen ve yoldaki operasyonlar öncelikli gösterilir."
            action={<LinkButton href="/dashboard/nakliyelerim" variant="ghost">Tüm nakliyeler <i className="pi pi-arrow-up-right" aria-hidden="true" /></LinkButton>}>
            {activeJobs.length ? <div className={styles.overviewRows}>{activeJobs.map((job) => {
              const state = shipmentState(job.durum);
              const title = routeLabel(job.baslangicSehri, job.varisSehri);
              return <Link key={job.id} href={"/dashboard/nakliyelerim/" + job.id} className={styles.overviewJob}>
                <span className={styles.overviewJobIcon} aria-hidden="true"><i className="pi pi-truck" /></span>
                <div><strong title={title}>{title}</strong><span>{carrierText(job.counterpartyName)} · Alım: {formatDateOnly(job.planlananAlimTarihi)}</span></div>
                <div className={styles.overviewJobStatus}><Badge tone={state.tone}>{state.label}</Badge><small>{formatMoney(job.anlasilanFiyat)}</small></div>
              </Link>;
            })}</div> : <EmptyState icon="pi pi-truck" title="Aktif nakliye yok" description="Kabul edilen teklifleriniz nakliyeye dönüştüğünde burada takip edebilirsiniz." action={<LinkButton href="/dashboard/tekliflerim">Tekliflerime git</LinkButton>} />}
          </Panel>
          <Panel title="Son aktiviteler" icon="pi pi-history" description="Teklif, mesaj ve operasyon hareketleriniz.">
            {home.recentActivities.length ? <div className={styles.activities}>{home.recentActivities.map((activity) => {
              const content = <><span className={styles.activityDot} aria-hidden="true" /><div><strong>{carrierText(activity.title)}</strong><p>{carrierText(activity.description)}</p></div><div className={styles.activityMeta}>{activity.badge ? <Badge tone={carrierTone(activity.tone)}>{carrierText(activity.badge)}</Badge> : null}<time dateTime={activity.timestamp ?? undefined}>{activityTimestamp(activity.timestamp)}</time></div></>;
              return activity.href ? <Link key={activity.id} href={activity.href} className={styles.activity}>{content}</Link> : <div key={activity.id} className={styles.activity}>{content}</div>;
            })}</div> : <p className={styles.quietEmpty}>Teklif, rota, araç ve mesaj hareketleri burada görünecek.</p>}
          </Panel>
        </div>
        <aside className={styles.overviewAside}>
          <Panel title="Yük keşfi" icon="pi pi-box" action={<LinkButton href="/dashboard/acik_istekler" variant="ghost">Keşfet <i className="pi pi-arrow-up-right" aria-hidden="true" /></LinkButton>}>
            <div className={styles.previewContent}>
              {request ? <><Link className={styles.previewRoute} href={"/dashboard/acik_istekler/" + request.id} title={routeLabel(request.baslangicSehri, request.varisSehri)}>{routeLabel(request.baslangicSehri, request.varisSehri)}</Link>
                <div className={styles.facts}><span>{getCargoTypeLabel(request.yukTipi)}</span>{request.agirlikKg !== null ? <span>{formatWeightKg(request.agirlikKg)}</span> : null}{request.hacimM3 !== null ? <span>{formatVolumeM3(request.hacimM3)}</span> : null}</div>
                <p>Tercih edilen tarih: {formatDateOnly(request.tasimaTarihi)}</p>
                <LinkButton href={"/dashboard/acik_istekler/" + request.id}>Talebi incele</LinkButton>
              </> : <p>Şu anda öne çıkarılacak açık talep bulunmuyor. Açık talepleri keşfedebilirsiniz.</p>}
            </div>
          </Panel>
          <Panel title="Rota ve filo" icon="pi pi-map">
            <div className={styles.previewContent}>
              {route ? <div className={styles.previewBlock}><span>Kayıtlı rota</span><Link href={"/dashboard/rotalarim/" + route.route.id} title={routeLabel(route.route.baslangicSehri, route.route.varisSehri)}>{routeLabel(route.route.baslangicSehri, route.route.varisSehri)}</Link><small>{formatDateOnly(route.route.planlananTarih)} · {route.suitableCount} eşleşen talep</small></div> : <div className={styles.previewBlock}><span>Kayıtlı rota bulunmuyor</span><Link href="/dashboard/rotalarim/yeni">Rota oluştur →</Link></div>}
              {vehicle ? <div className={styles.previewBlock}><span>Araç özeti</span><Link href={"/dashboard/araclarim/" + vehicle.id}>{carrierText(vehicle.plaka)} · {carrierText(vehicle.marka + " " + vehicle.model)}</Link><small>Kalan: {formatWeightKg(vehicle.capacitySummary.kalanAgirlikKg)} · {formatVolumeM3(vehicle.capacitySummary.kalanHacimM3)}</small></div> : <div className={styles.previewBlock}><span>Henüz araç eklenmedi</span><Link href="/dashboard/arac_ekle">Araç ekle →</Link></div>}
            </div>
          </Panel>
          <nav className={styles.quickLinks} aria-label="Hızlı işlemler"><h2><i className="pi pi-bolt" aria-hidden="true" />Hızlı işlemler</h2>
            <Link href="/dashboard/rotalarim/yeni"><i className="pi pi-map" aria-hidden="true" />Yeni rota<i className="pi pi-arrow-up-right" aria-hidden="true" /></Link>
            <Link href="/dashboard/arac_ekle"><i className="pi pi-truck" aria-hidden="true" />Araç ekle<i className="pi pi-arrow-up-right" aria-hidden="true" /></Link>
            <Link href="/dashboard/tekliflerim"><i className="pi pi-send" aria-hidden="true" />Tekliflerim<i className="pi pi-arrow-up-right" aria-hidden="true" /></Link>
            <Link href="/dashboard/konusmalar"><i className="pi pi-comments" aria-hidden="true" />Konuşmalar{home.unreadConversationCount ? <Badge tone="blue">{home.unreadConversationCount}</Badge> : null}<i className="pi pi-arrow-up-right" aria-hidden="true" /></Link>
          </nav>
        </aside>
      </div>
    </div>
  );
}
