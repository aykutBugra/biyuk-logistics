"use client";

import Link from "next/link";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import StatusBadge from "@/components/StatusBadge";
import { Badge, EmptyState, LinkButton, Surface } from "@/components/ui";
import { getRequestStatusLabel } from "@/features/transport-requests/request-list-model";
import type { CustomerHomeData } from "@/lib/dashboard/use-home-data";
import { formatTransportRouteLabel } from "@/lib/logistics";
import { formatDateOnly } from "@/lib/date-only";
import styles from "./customer-overview.module.css";

const currency = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const messageDate = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function OverviewMetric({ label, value, description, icon, tone }: {
  label: string; value: number; description: string; icon: string; tone: "teal" | "amber" | "blue" | "green";
}) {
  return (
    <Surface className={`${styles.metric} ${styles[tone]}`}>
      <span className={styles.metricIcon} aria-hidden="true"><i className={`pi ${icon}`} /></span>
      <div className={styles.metricText}><p>{label}</p><strong>{value.toLocaleString("tr-TR")}</strong><span>{description}</span></div>
    </Surface>
  );
}

export default function CustomerDashboardOverview({ home }: { home: CustomerHomeData }) {
  const pending = home.incomingOffers.filter((offer) => offer.durum.trim().toUpperCase() === "OLUSTURULDU");
  const requests = [...home.requests].sort((a, b) => new Date(b.olusturmaTarihi).getTime() - new Date(a.olusturmaTarihi).getTime()).slice(0, 4);
  const threads = [...home.threads].sort((a, b) => Number(b.hasUnread) - Number(a.hasUnread) || new Date(b.lastMessageAt ?? b.closedAt ?? 0).getTime() - new Date(a.lastMessageAt ?? a.closedAt ?? 0).getTime()).slice(0, 3);

  return (
    <div className={styles.dashboard}>
      <section className={styles.stats} aria-label="Operasyon özeti">
        <OverviewMetric label="Aktif talep" value={home.openRequestCount} description="Teklif almaya açık" icon="pi-box" tone="teal" />
        <OverviewMetric label="Bekleyen teklif" value={home.pendingIncomingOfferCount} description="Kararınızı bekliyor" icon="pi-send" tone="amber" />
        <OverviewMetric label="Okunmamış" value={home.unreadMessageCount + home.unreadNotificationCount} description="Mesaj ve bildirim" icon="pi-comments" tone="blue" />
        <OverviewMetric label="Tamamlanan" value={home.completedRequestCount} description="Sonuçlanan taşıma" icon="pi-check-circle" tone="green" />
      </section>

      <div className={styles.columns}>
        <div className={styles.leftColumn}>
          <Surface padding="none" className={styles.panel}>
            <section aria-labelledby="overview-offers">
              <div className={styles.sectionHeading}>
                <h2 id="overview-offers"><i className="pi pi-bolt" aria-hidden="true" />Yanıt bekleyen teklifler <Badge className={styles.countBadge}>{pending.length}</Badge></h2>
                <Link className={styles.textLink} href="/dashboard/gelen_teklifler">Tüm teklifler <i className="pi pi-arrow-right" aria-hidden="true" /></Link>
              </div>
              {pending.length ? <div>{pending.slice(0, 3).map((offer) => {
                const route = formatTransportRouteLabel({ origin: offer.baslangicSehri, destination: offer.varisSehri, cargoType: offer.yukTipi });
                return <Link key={offer.id} href="/dashboard/gelen_teklifler" className={styles.offerRow} aria-label={`${route}, ${offer.carrierName}, teklifi incele`}>
                  <CustomerInitialsAvatar name={offer.carrierName} fallback={offer.carrierUsername} imageUrl={offer.carrierProfileImageUrl} size="sm" className={styles.avatar} />
                  <div className={styles.offerIdentity}><strong title={route}>{route}</strong><span title={offer.carrierName}>{offer.carrierName} · Nakliyeci</span></div>
                  <div className={styles.offerPrice}><strong>{currency.format(offer.fiyat)}</strong><Badge tone="amber">Karar bekliyor</Badge></div>
                  <i className="pi pi-angle-right" aria-hidden="true" />
                </Link>;
              })}</div> : <div className={styles.quietState}><i className="pi pi-check-circle" aria-hidden="true" /><div><strong>Yanıt bekleyen teklif yok</strong><p>Yeni teklifleriniz burada listelenecek.</p></div></div>}
            </section>
          </Surface>

          <Surface padding="none" className={styles.panel}>
            <section aria-labelledby="overview-requests">
              <div className={styles.sectionHeading}><h2 id="overview-requests"><i className="pi pi-clone" aria-hidden="true" />Son taşıma talepleri</h2><Link href="/dashboard/isteklerim" className={styles.textLink}>Tüm talepler <i className="pi pi-arrow-right" aria-hidden="true" /></Link></div>
              {requests.length ? <div>{requests.map((request) => {
                const route = formatTransportRouteLabel({ origin: request.baslangicSehri, destination: request.varisSehri, cargoType: request.yukTipi });
                const count = home.incomingOffers.filter((offer) => offer.requestId === request.id).length;
                const href = `/dashboard/isteklerim/${request.id}`;
                return <div key={request.id} className={styles.requestRow}>
                  <i className={`pi pi-truck ${styles.requestIcon}`} aria-hidden="true" />
                  <div className={styles.requestRoute}><Link href={href} title={route}>{route}</Link><span><i className="pi pi-calendar" aria-hidden="true" />{formatDateOnly(request.tasimaTarihi)}</span></div>
                  <div className={styles.requestMeta}><StatusBadge status={request.durum} label={getRequestStatusLabel(request.durum)} /><span className={styles.offerCount}>{count} teklif</span></div>
                  <div className={styles.requestActions}>
                    <LinkButton href={href} className={styles.detailLink} aria-label={`${route} talebinin detayı`}>Detay <i className="pi pi-arrow-up-right" aria-hidden="true" /></LinkButton>
                    <Link href={`${href}/duzenle`} className={styles.editLink} aria-label={`${route} talebini düzenle`} title="Talebi düzenle"><i className="pi pi-pencil" aria-hidden="true" /></Link>
                  </div>
                </div>;
              })}</div> : <EmptyState title="İlk talebinizi oluşturun" description="Güzergâh ve yük bilgilerinizi ekleyerek teklif almaya başlayın." action={<LinkButton href="/dashboard/istek_ekle" variant="primary">Yeni istek</LinkButton>} />}
            </section>
          </Surface>
        </div>

        <aside className={styles.rightRail} aria-label="Görüşmeler ve hızlı işlemler">
          <Surface padding="none" className={styles.panel}>
            <section aria-labelledby="overview-messages">
              <div className={styles.sectionHeading}><h2 id="overview-messages"><i className="pi pi-comments" aria-hidden="true" />Konuşmalar</h2><Link href="/dashboard/konusmalar" className={styles.textLink}>Tüm görüşmeler <i className="pi pi-arrow-right" aria-hidden="true" /></Link></div>
              {threads.length ? threads.map((thread) => {
                const timestamp = thread.lastMessageAt ?? thread.closedAt;
                const date = timestamp ? new Date(timestamp) : null;
                const validDate = date && Number.isFinite(date.getTime()) ? date : null;
                const route = formatTransportRouteLabel({ origin: thread.baslangicSehri, destination: thread.varisSehri });
                return <Link key={thread.id} href={`/dashboard/konusmalar/teklif/${thread.offerId}`} className={styles.messageRow}>
                  <CustomerInitialsAvatar name={thread.karsiTarafAdSoyad} fallback={thread.karsiTarafKullaniciAdi} imageUrl={thread.karsiTarafProfileImageUrl} size="sm" className={styles.avatar} />
                  <div className={styles.messageContent}>
                    <div className={styles.messageHeading}><strong title={thread.karsiTarafAdSoyad}>{thread.karsiTarafAdSoyad}</strong>{validDate ? <time dateTime={validDate.toISOString()}>{messageDate.format(validDate)}</time> : null}</div>
                    <p>{thread.lastMessageSummary ?? "Konuşmayı aç"}</p>
                    <div className={styles.messageMeta}><span title={route}>{route}</span>{thread.hasUnread ? <span className={styles.unreadDot} aria-label="Okunmamış mesaj" /> : null}</div>
                  </div>
                </Link>;
              }) : <p className={styles.noMessages}>Teklif görüşmeleriniz burada görünecek.</p>}
            </section>
          </Surface>

          <Surface padding="none" className={styles.panel}>
            <section aria-labelledby="overview-shortcuts">
              <div className={styles.sectionHeading}><h2 id="overview-shortcuts"><i className="pi pi-bolt" aria-hidden="true" />Hızlı işlemler</h2></div>
              <div className={styles.shortcuts}>
                <Link href="/dashboard/istek_ekle"><i className="pi pi-plus" aria-hidden="true" /><span>Yeni taşıma talebi oluştur</span><i className="pi pi-angle-right" aria-hidden="true" /></Link>
                <Link href="/dashboard/gelen_teklifler"><i className="pi pi-clone" aria-hidden="true" /><span>Gelen teklifleri incele</span><i className="pi pi-angle-right" aria-hidden="true" /></Link>
                <Link href="/dashboard/bildirimler"><i className="pi pi-bell" aria-hidden="true" /><span>Bildirimleri görüntüle</span><i className="pi pi-angle-right" aria-hidden="true" /></Link>
              </div>
            </section>
          </Surface>
        </aside>
      </div>
    </div>
  );
}
