"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import type { MyIncomingOfferItem } from "@/lib/api/offers";
import type { TransportRequestListItem } from "@/lib/api/transport-requests";
import {
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";

type CustomerRecentRequestsPanelProps = {
  requests: TransportRequestListItem[];
  incomingOffers: MyIncomingOfferItem[];
};

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}

function formatRequestStatus(status: string): string {
  switch (normalizeStatus(status)) {
    case "OLUSTURULDU":
      return "Acik";
    case "ANLASILDI":
      return "Anlasildi";
    case "TAMAMLANDI":
      return "Tamamlandi";
    case "IPTAL_EDILDI":
      return "Iptal";
    default:
      return status;
  }
}

function formatRouteTitle(request: TransportRequestListItem): string {
  return `${request.baslangicSehri} -> ${request.varisSehri}`;
}

function formatRouteMeta(request: TransportRequestListItem): string | null {
  const baslangic = request.baslangicKonumMetni?.trim();
  const varis = request.varisKonumMetni?.trim();

  if (!baslangic && !varis) {
    return null;
  }

  const baslangicText = baslangic && baslangic !== request.baslangicSehri ? baslangic : null;
  const varisText = varis && varis !== request.varisSehri ? varis : null;

  if (!baslangicText && !varisText) {
    return null;
  }

  return `${baslangicText ?? request.baslangicSehri} -> ${varisText ?? request.varisSehri}`;
}

function formatDateBadge(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function buildOfferCountMap(incomingOffers: MyIncomingOfferItem[]): Map<number, number> {
  return incomingOffers.reduce((map, offer) => {
    const currentCount = map.get(offer.requestId) ?? 0;
    map.set(offer.requestId, currentCount + 1);
    return map;
  }, new Map<number, number>());
}

export default function CustomerRecentRequestsPanel({
  requests,
  incomingOffers,
}: CustomerRecentRequestsPanelProps) {
  const recentRequests = [...requests]
    .sort(
      (left, right) =>
        new Date(right.olusturmaTarihi).getTime() - new Date(left.olusturmaTarihi).getTime()
    )
    .slice(0, 3);
  const activeCount = requests.filter(
    (request) => normalizeStatus(request.durum) === "OLUSTURULDU"
  ).length;
  const offerCountMap = buildOfferCountMap(incomingOffers);

  return (
    <section className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[1.65rem] font-black tracking-tight text-slate-950">
            Son tasima talepleriniz
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {activeCount} aktif
            </span>
            <p className="text-sm text-slate-500">
              Son olusturdugun talepleri ve teklif akislarini tek yerden izle.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/isteklerim"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Tum istekleri gor
        </Link>
      </div>

      {recentRequests.length === 0 ? (
        <div className="py-8">
          <p className="text-base font-semibold text-slate-900">
            Henuz tasima talebi olusturmadin.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Ilk istegini olusturdugunda burada en guncel taleplerini, durumlarini ve
            gelen teklifleri goreceksin.
          </p>
          <Link href="/dashboard/istek_ekle" className="app-button-primary mt-5">
            Yeni istek olustur
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {recentRequests.map((request) => {
            const offerCount = offerCountMap.get(request.id) ?? 0;
            const routeMeta = formatRouteMeta(request);
            const formattedDate = formatDateBadge(request.tasimaTarihi);

            return (
              <article
                key={request.id}
                className="flex flex-col gap-4 py-5 xl:flex-row xl:items-center xl:justify-between"
              >
                <div className="flex min-w-0 flex-1 gap-4">
                  <div className="relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    {request.primaryImage ? (
                      <>
                        <img
                          src={request.primaryImage.thumbnailUrl}
                          alt="Tasima istegi fotografi"
                          className="h-full w-full object-cover"
                        />
                        {request.imageCount && request.imageCount > 1 ? (
                          <span className="absolute right-2 top-2 rounded-full bg-slate-900/72 px-2 py-1 text-[10px] font-semibold text-white">
                            +{request.imageCount - 1} fotograf
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <i className="pi pi-box text-xl text-slate-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={request.durum}
                        label={formatRequestStatus(request.durum)}
                      />
                      {request.imageCount && request.imageCount > 1 && !request.primaryImage ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                          +{request.imageCount} fotograf
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-[1.7rem] font-black tracking-tight text-slate-950">
                      {formatRouteTitle(request)}
                    </h3>

                    {routeMeta ? (
                      <p className="mt-1 text-sm text-slate-500">{routeMeta}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {getCargoTypeLabel(request.yukTipi)}
                      </span>
                      {request.agirlikKg !== null ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {formatWeightKg(request.agirlikKg)}
                        </span>
                      ) : null}
                      {request.hacimM3 !== null ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {formatVolumeM3(request.hacimM3)}
                        </span>
                      ) : null}
                      {formattedDate ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {formattedDate}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 xl:min-w-[280px] xl:items-end">
                  <p
                    className={`text-sm font-semibold ${
                      offerCount > 0 ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    {offerCount > 0 ? `${offerCount} teklif geldi` : "Henuz teklif yok"}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <Link href={`/dashboard/isteklerim/${request.id}`} className="app-button-primary">
                      Detay
                    </Link>
                    <Link
                      href={`/dashboard/isteklerim/${request.id}/duzenle`}
                      className="app-button-secondary"
                    >
                      Duzenle
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
