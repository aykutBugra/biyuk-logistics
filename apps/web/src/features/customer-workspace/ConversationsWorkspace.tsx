"use client";

import Link from "next/link";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import { Badge, EmptyState, LinkButton } from "@/components/ui";
import type { OfferThreadSummary } from "@/lib/api/offer-threads";
import { formatDateOnly } from "@/lib/date-only";
import { displayText, FilterBar, formatMoney, formatTimestamp, LoadFeedback, type LoadState, NoFilterResults, offerStatus, Panel, routeLabel, SummaryStrip } from "./shared";
import styles from "./workspace.module.css";

type ConversationFilter = "all" | "unread" | "open" | "closed" | "pending" | "active";

export default function ConversationsWorkspace({
  threads, visibleThreads, query, filter, onQueryChange, onFilterChange, isLoading, errorMessage, workspace = "customer",
}: LoadState & {
  threads: OfferThreadSummary[]; visibleThreads: OfferThreadSummary[];
  query: string; filter: ConversationFilter;
  onQueryChange: (value: string) => void; onFilterChange: (value: ConversationFilter) => void;
  workspace?: "customer" | "carrier";
}) {
  if (isLoading || errorMessage) return <LoadFeedback isLoading={isLoading} errorMessage={errorMessage} label="Konuşmalar yükleniyor…" />;
  const unread = threads.filter((t) => t.hasUnread).length;
  const open = threads.filter((t) => !t.isClosed).length;
  const pending = threads.filter((t) => !t.isClosed && t.durum.trim().toUpperCase() === "OLUSTURULDU").length;
  const filters: Array<{ id: ConversationFilter; label: string; count: number }> = workspace === "carrier" ? [
    { id: "all", label: "Tümü", count: threads.length },
    { id: "pending", label: "Bekleyen", count: pending },
    { id: "active", label: "Aktif", count: open - pending },
    { id: "closed", label: "Kapalı", count: threads.length - open },
  ] : [
    { id: "all", label: "Tümü", count: threads.length },
    { id: "unread", label: "Okunmamış", count: unread },
    { id: "open", label: "Açık", count: open },
    { id: "closed", label: "Kapalı", count: threads.length - open },
  ];
  return (
    <div className={styles.workspace}>
      <SummaryStrip items={[
        { label: "Toplam konuşma", value: threads.length, description: "Tekliflerle ilgili görüşmeler", icon: "pi pi-comments" },
        { label: "Okunmamış", value: unread, description: "Yeni mesaj içeren konuşmalar", icon: "pi pi-comment" },
        { label: "Devam eden", value: open, description: "Açık görüşmeler", icon: "pi pi-inbox" },
      ]} />
      <Panel title="Konuşma kutusu" icon="pi pi-comments" description="Teklif ve taşıma detaylarıyla birlikte son görüşmeleriniz.">
        <FilterBar filters={filters} selected={filter} onSelect={onFilterChange} query={query} onQueryChange={onQueryChange}
          searchLabel="Konuşmalarda ara" placeholder="Kişi, güzergâh veya mesaj ara…" />
        {!threads.length ? <EmptyState title="Henüz konuşma yok" description="Tekliflerle ilgili görüşmeleriniz burada listelenecek."
          action={<LinkButton href={workspace === "carrier" ? "/dashboard/tekliflerim" : "/dashboard/gelen_teklifler"}>Teklifleri gör</LinkButton>} />
        : !visibleThreads.length ? <NoFilterResults onReset={() => { onQueryChange(""); onFilterChange("all"); }} />
        : <div className={styles.list}>{visibleThreads.map((thread) => {
          const route = routeLabel(thread.baslangicSehri, thread.varisSehri);
          const state = offerStatus(thread.durum);
          const updatedAt = thread.lastMessageAt ?? thread.closedAt;
          const href = "/dashboard/konusmalar/teklif/" + thread.offerId;
          return (
            <article key={thread.id} data-dashboard-card className={[styles.conversationRow, thread.hasUnread ? styles.unreadRow : ""].join(" ")}>
              <div className={styles.conversationMain}>
                <CustomerInitialsAvatar name={displayText(thread.karsiTarafAdSoyad)} fallback={displayText(thread.karsiTarafKullaniciAdi)} imageUrl={thread.karsiTarafProfileImageUrl} size="sm" className={styles.avatar} />
                <div className={styles.conversationBody}>
                  <div className={styles.rowHeading}>
                    <h3><Link href={href}>{displayText(thread.karsiTarafAdSoyad, "Kullanıcı")}</Link></h3>
                    {thread.hasUnread ? <Badge tone="blue">{thread.unreadCount > 0 ? thread.unreadCount + " yeni mesaj" : "Okunmamış"}</Badge> : null}
                    <time dateTime={updatedAt ?? undefined}>{formatTimestamp(updatedAt)}</time>
                  </div>
                  <Link href={href} className={styles.routeSmall} title={route}>{route}</Link>
                  <p className={styles.messagePreview}>{displayText(thread.lastMessageSummary, thread.isClosed ? "Görüşme kapandı." : "Henüz mesaj yok.")}</p>
                  <div className={styles.conversationMeta}>
                    <Badge tone={state.tone}>{state.label}</Badge>
                    <span>{thread.isClosed ? "Kapalı görüşme" : "Açık görüşme"}</span>
                    <span>{formatMoney(thread.fiyat)}</span>
                    <span>Alım: {formatDateOnly(thread.planlananAlimTarihi)}</span>
                    {thread.tahminiTeslimTarihi ? <span>Teslim: {formatDateOnly(thread.tahminiTeslimTarihi)}</span> : null}
                  </div>
                </div>
              </div>
              <div className={styles.conversationActions}>
                {workspace !== "carrier" || (!thread.isClosed && thread.durum.trim().toUpperCase() === "OLUSTURULDU") ? <LinkButton href={(workspace === "carrier" ? "/dashboard/acik_istekler/" : "/dashboard/isteklerim/") + thread.requestId} variant="ghost">İstek detayı</LinkButton> : null}
                <LinkButton href={href}>Konuşmayı aç <i className="pi pi-arrow-up-right" aria-hidden="true" /></LinkButton>
              </div>
            </article>
          );
        })}</div>}
      </Panel>
    </div>
  );
}
