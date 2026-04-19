"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import CollectionToolbar from "@/components/CollectionToolbar";
import EmptyStateCard from "@/components/EmptyStateCard";
import StatusBadge from "@/components/StatusBadge";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getOpenOfferRequests,
  type OpenOfferRequestListItem,
} from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function OpenTransportRequestsPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [requests, setRequests] = useState<OpenOfferRequestListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    let isMounted = true;

    const loadRequests = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getOpenOfferRequests(accessToken);

        if (!isMounted) {
          return;
        }

        setRequests(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        if (error instanceof ApiClientError && error.status === 403) {
          router.replace("/");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Acik istekler yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadRequests();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status]);

  if (status !== "ready") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600 font-medium">Yukleniyor...</div>
      </div>
    );
  }

  const alreadyOfferedCount = requests.filter((request) => request.alreadyOffered).length;
  const freshOpportunityCount = requests.length - alreadyOfferedCount;

  return (
    <CarrierVehiclesShell
      title="Acik istekler"
      description="Teklif verebilecegin aktif tasima taleplerini burada gorebilirsin."
    >
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Acik istekler yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryStatCard
              label="Acik istek"
              value={requests.length}
              hint="Kesif listesindeki toplam uygun talep."
            />
            <SummaryStatCard
              label="Yeni firsat"
              value={freshOpportunityCount}
              hint="Henuz teklif vermedigin kayitlar."
            />
            <SummaryStatCard
              label="Takip ettigin"
              value={alreadyOfferedCount}
              hint="Bu listede teklif verdigin istekler."
            />
          </div>

          <CollectionToolbar
            title="Kesif listesi"
            description="Bu sayfa gelecekte filtrelenebilir pazaryeri listesine evrilecek ilk sade iskeleti tasir."
            countLabel={`${requests.length} acik istek`}
            hint="Filtreler ve siralama yakinda"
          />
        </>
      ) : null}

      {!isLoading && !errorMessage && requests.length === 0 ? (
        <EmptyStateCard
          eyebrow="Kesif listesi"
          title="Uygun istek bulunmuyor"
          description="Su anda teklif vermeye acik bir tasima talebi yok. Yeni kayitlar geldiginde kesif akisi burada gorunecek."
        />
      ) : null}

      {!isLoading && !errorMessage && requests.length > 0 ? (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-200"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <StatusBadge status={request.durum} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Istek #{request.id}
                    </span>
                    {request.alreadyOffered ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                        Teklif verdin
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      {request.baslangicSehri} {"->"} {request.varisSehri}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      Kesif listesinde rota, yuk ozeti ve teklif baglami bir
                      arada tutulur.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Yuk ozeti
                    </p>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 line-clamp-3">
                      {request.yukDetay}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-[220px] flex-col gap-4 lg:items-end">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {formatDate(request.olusturmaTarihi)}
                  </p>
                  <Link
                    href={`/dashboard/acik_istekler/${request.id}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    Detay ve Teklif
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
