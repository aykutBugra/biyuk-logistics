"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, EmptyState, InlineNotice, LinkButton, MetricCard, Surface, TextField } from "@/components/ui";
import type { MyIncomingOfferItem } from "@/lib/api/offers";
import type { TransportRequestListItem } from "@/lib/api/transport-requests";
import { countRequestsByFilter, REQUEST_FILTERS, selectRequests, summarizeRequests, type RequestFilter } from "../request-list-model";
import RequestCard from "./RequestCard";
import styles from "./requests.module.css";

type RequestsWorkspaceProps = {
  requests: TransportRequestListItem[];
  incomingOffers: MyIncomingOfferItem[];
  isLoading: boolean;
  errorMessage: string | null;
  deletingRequestId: string | null;
  onDelete: (requestId: string) => void;
};

function RequestsSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-label="Taşıma talepleri yükleniyor" aria-busy="true">
      <div className={styles.metrics}>{[0, 1, 2].map((item) => <div key={item} className={styles.skeletonMetric} />)}</div>
      {[0, 1, 2].map((item) => <div key={item} className={styles.skeletonCard} />)}
    </div>
  );
}

export default function RequestsWorkspace({ requests, incomingOffers, isLoading, errorMessage, deletingRequestId, onDelete }: RequestsWorkspaceProps) {
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [query, setQuery] = useState("");
  const summary = useMemo(() => summarizeRequests(requests, incomingOffers), [requests, incomingOffers]);
  const visibleRequests = useMemo(() => selectRequests(requests, filter, query), [requests, filter, query]);

  const resetFilters = () => {
    setFilter("all");
    setQuery("");
  };

  if (isLoading) return <RequestsSkeleton />;
  if (errorMessage) return <InlineNotice tone="red" title="Talepler yüklenemedi">{errorMessage}</InlineNotice>;

  return (
    <div className={styles.workspace}>
      <div className={styles.metrics} data-dashboard-stats>
        <MetricCard label="Toplam talep" value={summary.total} description="Oluşturduğunuz tüm talepler" icon={<i className="pi pi-box" />} />
        <MetricCard label="Tekliflere açık" value={summary.open} description="Teklif almaya devam edenler" tone="green" icon={<i className="pi pi-send" />} />
        <MetricCard label="Anlaşılan işler" value={summary.agreed} description="Tamamlanan işler dahil" tone="amber" icon={<i className="pi pi-check-circle" />} />
      </div>

      {summary.pendingRequestCount > 0 ? (
        <InlineNotice
          title={`${summary.pendingRequestCount} talebinizde yanıt bekleyen teklifler var`}
          action={<LinkButton href="/dashboard/gelen_teklifler" variant="ghost">Teklifleri incele <i className="pi pi-arrow-right" aria-hidden="true" /></LinkButton>}
        />
      ) : null}

      <section aria-labelledby="requests-list-title" data-dashboard-primary>
        <Surface padding="none" className={styles.listSheet}>
        <div className={styles.listControls}>
          <div className={styles.listHeading}>
            <div className={styles.listTitle}>
              <h2 id="requests-list-title"><i className="pi pi-truck" aria-hidden="true" />Taşıma talepleriniz</h2>
              <Badge>{summary.total}</Badge>
            </div>
            <Link href="/dashboard/gelen_teklifler" className={styles.textLink}>Gelen teklifler <i className="pi pi-arrow-right" aria-hidden="true" /></Link>
          </div>

          {requests.length > 0 ? (
            <div className={styles.controlsRow}>
              <div className={styles.filters} role="group" aria-label="Talepleri duruma göre filtrele">
                {REQUEST_FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={filter === item.value}
                    onClick={() => setFilter(item.value)}
                    className={`${styles.filterButton} ${filter === item.value ? styles.activeFilter : ""}`}
                  >
                    {item.label}<span>{countRequestsByFilter(requests, item.value)}</span>
                  </button>
                ))}
              </div>
              <div className={styles.search}>
                <TextField
                  label="Taleplerde ara"
                  hideLabel
                  type="search"
                  placeholder="Güzergâh veya yük ara…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  leadingIcon={<i className="pi pi-search" />}
                />
              </div>
            </div>
          ) : null}
        </div>

        {requests.length === 0 ? (
          <Surface className={styles.emptySurface}>
            <EmptyState
              title="İlk taşıma talebinizi oluşturun"
              description="Güzergâhınızı ve yük bilgilerinizi ekleyin. Talepleriniz ve gelen teklifler burada takip edilsin."
              action={<LinkButton href="/dashboard/istek_ekle" variant="primary"><i className="pi pi-plus" aria-hidden="true" /> Yeni talep</LinkButton>}
              icon="pi pi-box"
            />
          </Surface>
        ) : (
          <>
            <div className={styles.listMeta}>
              <p role="status" aria-live="polite">{visibleRequests.length} talep gösteriliyor</p>
              <span>En yeni önce</span>
            </div>
            {visibleRequests.length > 0 ? (
              <div className={styles.cards}>
                {visibleRequests.map((request) => <RequestCard key={request.id} request={request} offerCount={summary.offerCounts.get(request.id) ?? 0} isDeleting={deletingRequestId === request.id} onDelete={() => onDelete(request.id)} />)}
              </div>
            ) : (
              <Surface>
                <EmptyState title="Eşleşen talep bulunamadı" description="Farklı bir güzergâh veya yük arayın; tüm talepleri görmek için filtreleri temizleyin." icon="pi pi-search" action={<Button onClick={resetFilters}>Filtreleri temizle</Button>} />
              </Surface>
            )}
          </>
        )}
        </Surface>
      </section>

      {requests.length > 0 ? <p className={styles.footerNote}>Taşıma görüşmelerinizi <Link href="/dashboard/konusmalar" className={styles.textLink}>Konuşmalar</Link> ekranından sürdürebilirsiniz.</p> : null}
    </div>
  );
}
