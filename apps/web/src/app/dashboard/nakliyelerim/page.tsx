"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600 font-medium">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <CarrierVehiclesShell
      title="Nakliyelerim"
      description="Anlasilan isleri ve olusan nakliye kayitlarini buradan takip et."
    >
      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-600 shadow-sm">
          Nakliyeler yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && jobs.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Henuz aktif nakliye yok</h2>
          <p className="mt-2 text-sm text-gray-600">
            Teklifin kabul edilince burada resmi nakliye kaydini goreceksin.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && jobs.length > 0 ? (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                      {job.durum}
                    </span>
                    <span>Nakliye #{job.id}</span>
                    <span>Istek #{job.requestId}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {job.baslangicSehri} {"->"} {job.varisSehri}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Musteri: {job.counterpartyName} (@{job.counterpartyUsername})
                  </p>
                  <p className="text-sm text-gray-500">Arac: {job.aracPlaka}</p>
                </div>
                <div className="space-y-2 md:text-right">
                  <p className="text-sm font-semibold text-emerald-700">
                    {formatCurrency(job.anlasilanFiyat)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Kayit: {formatDate(job.olusturmaTarihi)}
                  </p>
                  {job.baslangicTarihi ? (
                    <p className="text-xs text-gray-500">
                      Basladi: {formatDate(job.baslangicTarihi)}
                    </p>
                  ) : null}
                  {job.teslimTarihi ? (
                    <p className="text-xs text-gray-500">
                      Tamamlandi: {formatDate(job.teslimTarihi)}
                    </p>
                  ) : null}
                  <Link
                    href={`/dashboard/nakliyelerim/${job.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
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
