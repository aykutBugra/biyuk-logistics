"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import StatusBadge from "@/components/StatusBadge";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import { getMyJobs, type JobListItem } from "@/lib/api/jobs";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MyJobsPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [jobs, setJobs] = useState<JobListItem[]>([]);
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

    const loadJobs = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getMyJobs(accessToken);

        if (!isMounted) {
          return;
        }

        setJobs(response);
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
            : "Nakliyeler yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadJobs();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status]);

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="font-medium text-slate-600">Yukleniyor...</div>
      </div>
    );
  }

  const activeJobCount = jobs.filter((job) => {
    const normalizedStatus = job.durum.trim().toUpperCase();

    return normalizedStatus === "OLUSTURULDU" || normalizedStatus === "BASLATILDI";
  }).length;
  const completedJobCount = jobs.filter(
    (job) => job.durum.trim().toUpperCase() === "TAMAMLANDI"
  ).length;

  return (
    <CarrierVehiclesShell title="Nakliyelerim">
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Nakliyeler yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && jobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryStatCard label="Toplam nakliye" value={jobs.length} />
          <SummaryStatCard label="Aktif is" value={activeJobCount} />
          <SummaryStatCard label="Tamamlanan" value={completedJobCount} />
        </div>
      ) : null}

      {!isLoading && !errorMessage && jobs.length === 0 ? (
        <EmptyStateCard
          title="Henuz aktif nakliye yok"
          description="Teklifin kabul edildiginde burada goreceksin."
          actionHref="/dashboard/acik_istekler"
          actionLabel="Acik istekleri incele"
        />
      ) : null}

      {!isLoading && !errorMessage && jobs.length > 0 ? (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-200"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <StatusBadge status={job.durum} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Nakliye #{job.id}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Istek #{job.requestId}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      {job.baslangicSehri} {"->"} {job.varisSehri}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      Musteri: {job.counterpartyName} (@{job.counterpartyUsername})
                    </p>
                    <p className="text-sm leading-6 text-slate-500">
                      Arac: {job.aracPlaka}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 lg:min-w-[230px] lg:items-end">
                  <p className="text-2xl font-black tracking-tight text-emerald-700">
                    {formatCurrency(job.anlasilanFiyat)}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Kayit: {formatDate(job.olusturmaTarihi)}
                  </p>
                  {job.baslangicTarihi ? (
                    <p className="text-xs text-slate-500">
                      Basladi: {formatDate(job.baslangicTarihi)}
                    </p>
                  ) : null}
                  {job.teslimTarihi ? (
                    <p className="text-xs text-slate-500">
                      Tamamlandi: {formatDate(job.teslimTarihi)}
                    </p>
                  ) : null}
                  <Link
                    href={`/dashboard/nakliyelerim/${job.id}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    Detay
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
