"use client";

import { useEffect, useState } from "react";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import { getMyRatingSummary, type MyRatingSummary } from "@/lib/api/ratings";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useDashboardAccess } from "@/lib/auth/use-dashboard-access";

function formatAverageRating(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(1)} / 5`;
}

export default function ProfilePage() {
  const { accessToken, auth, isCarrier, isCustomer, status } = useDashboardAccess();
  const [summary, setSummary] = useState<MyRatingSummary | null>(null);
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

    const loadSummary = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getMyRatingSummary(accessToken);

        if (!isMounted) {
          return;
        }

        setSummary(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          clearStoredAuth();
          window.location.replace("/login");
          return;
        }

        if (error instanceof ApiClientError && error.status === 403) {
          window.location.replace("/");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Profil ozeti yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [accessToken, status]);

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="font-medium text-slate-600">Yukleniyor...</div>
      </div>
    );
  }

  const Shell = isCarrier ? CarrierVehiclesShell : CustomerTransportRequestsShell;
  const totalReceivedCount =
    (summary?.asCarrier.ratingCount ?? 0) + (summary?.asCustomer.ratingCount ?? 0);

  return (
    <Shell
      title="Profil"
      description="Profil ozetinde genel puanin ayri bir veri degil, tamamlanan nakliyelerden dogan puanlarin ortalamasi olarak gosterilir."
    >
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Profil ozeti yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && auth?.user ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            Hesap bilgisi
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            {auth.user.ad} {auth.user.soyad}
          </h2>
          <p className="mt-2 text-sm text-slate-600">@{auth.user.kullaniciAdi}</p>
          <p className="mt-1 text-sm text-slate-500">{auth.user.mail}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {isCarrier ? (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Nakliyeci
              </span>
            ) : null}
            {isCustomer ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Musteri
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {!isLoading && !errorMessage && summary ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryStatCard
            label="Nakliyeci puanim"
            value={formatAverageRating(summary.asCarrier.averageRating)}
            hint={`${summary.asCarrier.ratingCount} degerlendirme`}
          />
          <SummaryStatCard
            label="Musteri puanim"
            value={formatAverageRating(summary.asCustomer.averageRating)}
            hint={`${summary.asCustomer.ratingCount} degerlendirme`}
          />
          <SummaryStatCard
            label="Toplam geri bildirim"
            value={totalReceivedCount}
            hint="Tamamlanan nakliyelerden gelen puanlar."
          />
          <SummaryStatCard
            label="Sistem karari"
            value="Nakliye bazli"
            hint="Genel puan ayri verilmez, is bazli kayitlardan turetilir."
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && totalReceivedCount === 0 ? (
        <EmptyStateCard
          eyebrow="Profil ozeti"
          title="Henuz profil puani olusmadi"
          description="Tamamlanan nakliyeler sonrasinda gelen degerlendirmeler bu ozet alanini dolduracak."
          actionHref="/dashboard/puanlarim"
          actionLabel="Puanlarimi gor"
        />
      ) : null}
    </Shell>
  );
}
