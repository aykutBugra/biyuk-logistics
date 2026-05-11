"use client";

import Link from "next/link";
import CustomerConversationsPreviewPanel from "@/components/CustomerConversationsPreviewPanel";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import CustomerOffersPreviewPanel from "@/components/CustomerOffersPreviewPanel";
import CustomerRecentRequestsPanel from "@/components/CustomerRecentRequestsPanel";
import type { CustomerHomeData } from "@/lib/dashboard/use-home-data";

type CustomerDashboardOverviewProps = {
  home: CustomerHomeData;
};

type NextActionModel =
  | {
      kind: "offers";
      title: string;
      description: string;
      ctaHref: string;
      ctaLabel: string;
      bestOffer: {
        price: number;
        carrierName: string;
      } | null;
    }
  | {
      kind: "live";
      title: string;
      description: string;
      ctaHref: string;
      ctaLabel: string;
      bestOffer: null;
    }
  | {
      kind: "empty";
      title: string;
      description: string;
      ctaHref: string;
      ctaLabel: string;
      bestOffer: null;
    };

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRouteTitle(baslangicSehri: string, varisSehri: string): string {
  return `${baslangicSehri} -> ${varisSehri}`;
}

function buildOfferCountMap(home: CustomerHomeData): Map<number, number> {
  return home.incomingOffers.reduce((map, offer) => {
    const currentValue = map.get(offer.requestId) ?? 0;
    map.set(offer.requestId, currentValue + 1);
    return map;
  }, new Map<number, number>());
}

function resolveNextAction(home: CustomerHomeData): NextActionModel {
  const sortedRequests = [...home.requests].sort(
    (left, right) =>
      new Date(right.olusturmaTarihi).getTime() - new Date(left.olusturmaTarihi).getTime()
  );
  const openRequests = sortedRequests.filter(
    (request) => normalizeStatus(request.durum) === "OLUSTURULDU"
  );

  if (home.pendingIncomingOfferCount > 0) {
    const offerCountMap = buildOfferCountMap(home);
    const requestWithOffers =
      openRequests.find((request) => (offerCountMap.get(request.id) ?? 0) > 0) ?? null;

    if (requestWithOffers) {
      const offersForRequest = home.incomingOffers.filter(
        (offer) =>
          offer.requestId === requestWithOffers.id &&
          normalizeStatus(offer.durum) === "OLUSTURULDU"
      );
      const bestOffer = [...offersForRequest].sort((left, right) => left.fiyat - right.fiyat)[0];

      return {
        kind: "offers",
        title: `${formatRouteTitle(
          requestWithOffers.baslangicSehri,
          requestWithOffers.varisSehri
        )} istegin teklif bekliyor`,
        description: `${offersForRequest.length} nakliyeci teklif verdi. Fiyat ve notlarini karsilastirarak karar verebilirsin.`,
        ctaHref: "/dashboard/gelen_teklifler",
        ctaLabel: "Teklifleri incele",
        bestOffer: bestOffer
          ? {
              price: bestOffer.fiyat,
              carrierName: bestOffer.carrierName,
            }
          : null,
      };
    }
  }

  if (openRequests.length > 0) {
    const activeRequest = openRequests[0];

    return {
      kind: "live",
      title: "Istein yayinda",
      description:
        "Nakliyeciler teklif verdiginde burada goreceksin. Mevcut talebin acik kesifte listelenmeye devam ediyor.",
      ctaHref: `/dashboard/isteklerim/${activeRequest.id}`,
      ctaLabel: "Istegi goruntule",
      bestOffer: null,
    };
  }

  return {
    kind: "empty",
    title: "Ilk tasima istegini olustur",
    description:
      "Konum, yuk ve tarih bilgilerini girerek nakliyecilerden teklif al. Ilk talebin burada ozetlenecek.",
    ctaHref: "/dashboard/istek_ekle",
    ctaLabel: "Yeni istek olustur",
    bestOffer: null,
  };
}

function CustomerTrustCard() {
  return (
    <aside className="app-surface-strong relative overflow-hidden rounded-[1.6rem] border border-slate-200 p-6 shadow-sm">
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
        Hesap
      </span>
      <h2 className="mt-4 text-[2rem] font-black tracking-tight text-slate-950">
        Hesabiniz guvenli
      </h2>
      <p className="mt-3 max-w-md text-sm leading-7 text-slate-500">
        Telefon ve e-posta dogrulamasi tamamlandi. Hesap detaylarini ve rol
        bilgilerini profil ekranindan yonetebilirsin.
      </p>

      <Link href="/dashboard/profil" className="app-button-secondary mt-6">
        Profili duzenle
      </Link>

      <div className="pointer-events-none absolute bottom-5 right-5 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-blue-100 bg-blue-50/80 text-blue-600">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
          <i className="pi pi-shield text-2xl" />
        </div>
      </div>
    </aside>
  );
}

function CustomerNextActionPanel({ model }: { model: NextActionModel }) {
  return (
    <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-6 shadow-sm">
      <div className="flex h-full flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
            Siradaki aksiyon
          </span>
          <h2 className="mt-4 text-[2rem] font-black tracking-tight text-slate-950">
            {model.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            {model.description}
          </p>

          <Link href={model.ctaHref} className="app-button-primary mt-6">
            {model.ctaLabel}
          </Link>
        </div>

        {model.bestOffer ? (
          <div className="w-full rounded-[1.45rem] border border-slate-200 bg-slate-50/70 p-5 lg:max-w-[210px]">
            <p className="text-sm font-semibold text-slate-500">En iyi teklif</p>
            <p className="mt-3 text-[2.25rem] font-black leading-none tracking-tight text-emerald-600">
              {formatCurrency(model.bestOffer.price)}
            </p>
            <p className="mt-3 text-base font-bold text-slate-950">
              {model.bestOffer.carrierName}
            </p>
            <p className="mt-1 text-sm text-slate-500">Guncel en dusuk fiyat</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function CustomerDashboardOverview({
  home,
}: CustomerDashboardOverviewProps) {
  const nextAction = resolveNextAction(home);
  const unreadTotal = home.unreadMessageCount + home.unreadNotificationCount;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CustomerMetricCard
          label="Aktif istek"
          value={home.openRequestCount}
          hint="Teklif almaya acik"
          tone="blue"
          icon={<i className="pi pi-box text-lg" />}
        />
        <CustomerMetricCard
          label="Gelen Teklif"
          value={home.pendingIncomingOfferCount}
          hint="Karar bekliyor"
          tone="emerald"
          icon={<i className="pi pi-wallet text-lg" />}
        />
        <CustomerMetricCard
          label="Okunmamis"
          value={unreadTotal}
          hint="Mesaj / bildirim"
          tone="violet"
          icon={<i className="pi pi-comments text-lg" />}
        />
        <CustomerMetricCard
          label="Tamamlanan"
          value={home.completedRequestCount}
          hint="Gecmis tasima"
          tone="amber"
          icon={<i className="pi pi-check text-lg" />}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.95fr)]">
        <CustomerNextActionPanel model={nextAction} />
        <CustomerTrustCard />
      </section>

      <CustomerRecentRequestsPanel
        requests={home.requests}
        incomingOffers={home.incomingOffers}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <CustomerOffersPreviewPanel offers={home.incomingOffers} />
        <CustomerConversationsPreviewPanel
          threads={home.threads}
          unreadMessageCount={home.unreadMessageCount}
        />
      </section>
    </div>
  );
}
