"use client";

import { Badge, Button, EmptyState, LinkButton } from "@/components/ui";
import type { NotificationListItem } from "@/lib/api/notifications";
import { displayText, FilterBar, formatTimestamp, LoadFeedback, type LoadState, NoFilterResults, Panel, SummaryStrip } from "./shared";
import styles from "./workspace.module.css";

type NotificationFilter = "all" | "offers" | "messages" | "operations" | "ratings" | "other";

function notificationType(value: string) {
  switch (value.trim().toUpperCase()) {
    case "TEKLIF_GELDI": return { label: "Yeni teklif", icon: "pi pi-wallet" };
    case "TEKLIF_KABUL_EDILDI": return { label: "Teklif kabulü", icon: "pi pi-check-circle" };
    case "TEKLIF_REDDEDILDI": return { label: "Teklif reddi", icon: "pi pi-times-circle" };
    case "KARSI_TEKLIF_GELDI": return { label: "Karşı teklif", icon: "pi pi-replay" };
    case "MESAJ_GELDI": return { label: "Mesaj", icon: "pi pi-comment" };
    case "IS_BASLADI": return { label: "Taşıma başladı", icon: "pi pi-truck" };
    case "TESLIM_ONAYI_BEKLIYOR": return { label: "Teslim onayı", icon: "pi pi-inbox" };
    case "IS_TAMAMLANDI": return { label: "Taşıma tamamlandı", icon: "pi pi-check" };
    case "RATING_ALDIN": return { label: "Değerlendirme", icon: "pi pi-star" };
    case "RATING_BEKLIYOR": return { label: "Puan hatırlatması", icon: "pi pi-star" };
    default: return { label: "Bildirim", icon: "pi pi-bell" };
  }
}

function openLabel(url: string) {
  if (url.startsWith("/dashboard/konusmalar/teklif/")) return "Konuşmaya git";
  if (url.startsWith("/dashboard/isteklerim/")) return "İstek detayı";
  if (url.startsWith("/dashboard/nakliyelerim/")) return "Nakliyeyi aç";
  if (url.startsWith("/dashboard/puanlarim")) return "Puanları gör";
  return "Aç";
}

export default function NotificationsWorkspace({
  notifications, visibleNotifications, unreadCount, query, filter, hasOtherNotifications,
  onQueryChange, onFilterChange, onMarkAll, onMarkAsRead, onOpen,
  actingId, actingAction, isMarkingAll, isLoading, errorMessage, emptyHref = "/dashboard/isteklerim",
}: LoadState & {
  notifications: NotificationListItem[]; visibleNotifications: NotificationListItem[]; unreadCount: number;
  query: string; filter: NotificationFilter; hasOtherNotifications: boolean;
  onQueryChange: (value: string) => void; onFilterChange: (value: NotificationFilter) => void;
  onMarkAll: () => void; onMarkAsRead: (id: string) => void; onOpen: (notification: NotificationListItem) => void;
  actingId: string | null; actingAction: "mark" | "open" | null; isMarkingAll: boolean;
  emptyHref?: string;
}) {
  if (isLoading || errorMessage) return <LoadFeedback isLoading={isLoading} errorMessage={errorMessage} label="Bildirimler yükleniyor…" />;
  const listedUnread = notifications.filter((n) => !n.isRead).length;
  const busy = actingId !== null || isMarkingAll;
  const filters: Array<{ id: NotificationFilter; label: string }> = [
    { id: "all", label: "Tümü" }, { id: "offers", label: "Teklifler" }, { id: "messages", label: "Mesajlar" },
    { id: "operations", label: "Operasyonlar" }, { id: "ratings", label: "Puanlar" },
    ...(hasOtherNotifications ? [{ id: "other" as const, label: "Diğer" }] : []),
  ];
  return (
    <div className={styles.workspace}>
      <SummaryStrip items={[
        { label: "Listelenen bildirim", value: notifications.length, description: "Son 50 kayıt içinden", icon: "pi pi-bell" },
        { label: "Hesapta okunmamış", value: unreadCount, description: listedUnread + " tanesi bu listede", icon: "pi pi-inbox" },
        { label: "Listede okundu", value: notifications.length - listedUnread, description: "İncelediğiniz bildirimler", icon: "pi pi-check-circle" },
      ]} />
      <Panel title="Bildirim merkezi" icon="pi pi-bell" description="Teklifler, mesajlar ve taşıma hareketleriniz."
        action={<Button disabled={busy || unreadCount === 0} loading={isMarkingAll} onClick={onMarkAll}><i className="pi pi-check" aria-hidden="true" />Tümünü okundu say</Button>}>
        <FilterBar filters={filters} selected={filter} onSelect={onFilterChange} query={query} onQueryChange={onQueryChange}
          searchLabel="Bildirimlerde ara" placeholder="Başlık, mesaj veya bildirim tipi ara…" />
        {!notifications.length ? <EmptyState icon="pi pi-bell" title="Henüz bildirim yok" description="Teklif, mesaj ve taşıma hareketleri oluştukça burada listelenecek."
          action={<LinkButton href={emptyHref}>Taşıma taleplerini gör</LinkButton>} />
        : !visibleNotifications.length ? <NoFilterResults onReset={() => { onQueryChange(""); onFilterChange("all"); }} />
        : <div className={styles.list}>{visibleNotifications.map((notification) => {
          const visual = notificationType(notification.tip);
          const acting = actingId === notification.id;
          return (
            <article key={notification.id} data-dashboard-card aria-busy={acting || undefined}
              className={[styles.notificationRow, notification.isRead ? "" : styles.unreadRow].join(" ")}>
              <span className={styles.notificationIcon} aria-hidden="true"><i className={visual.icon} /></span>
              <div className={styles.notificationBody}>
                <div className={styles.notificationMeta}><span>{visual.label}</span>
                  {!notification.isRead ? <Badge tone="blue">Okunmamış</Badge> : <span>Okundu</span>}
                  <time dateTime={notification.olusturmaTarihi}>{formatTimestamp(notification.olusturmaTarihi)}</time>
                </div>
                <h3>{displayText(notification.baslik, visual.label)}</h3>
                <p className={styles.messageText}>{displayText(notification.mesaj)}</p>
                <div className={styles.notificationActions}>
                  {!notification.isRead ? <Button variant="ghost" disabled={busy} loading={acting && actingAction === "mark"} onClick={() => onMarkAsRead(notification.id)}>Okundu say</Button> : null}
                  {notification.hedefUrl ? <Button disabled={busy} loading={acting && actingAction === "open"} onClick={() => onOpen(notification)}>{openLabel(notification.hedefUrl)} <i className="pi pi-arrow-up-right" aria-hidden="true" /></Button> : null}
                </div>
              </div>
            </article>
          );
        })}</div>}
      </Panel>
    </div>
  );
}
