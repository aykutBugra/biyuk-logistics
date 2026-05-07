"use client";

import { useEffect, useState } from "react";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import DashboardShell from "@/components/DashboardShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getMyGivenRatings,
  getMyRatingSummary,
  getMyReceivedRatings,
  type MyRatingSummary,
  type RatingListItem,
} from "@/lib/api/ratings";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useDashboardAccess } from "@/lib/auth/use-dashboard-access";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRoleContext(value: string): string {
  return value.trim().toUpperCase() === "NAKLIYECI"
    ? "Nakliyeci puani"
    : "Musteri puani";
}

function formatAverageRating(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(1)} / 5`;
}

function SectionCard({
  title,
  emptyCopy,
  items,
}: {
  title: string;
  emptyCopy: string;
  items: RatingListItem[];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">{emptyCopy}</p>
      ) : (
        <div className="mt-5 grid gap-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {formatRoleContext(item.rolBaglami)}
                    </span>
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Puan #{item.id}
                    </span>
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Nakliye #{item.jobId}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-950">
                      {item.baslangicSehri} → {item.varisSehri}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      @{item.counterpartyUsername} - {item.counterpartyName}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {item.yorum ?? "Bu degerlendirme icin yorum eklenmedi."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 lg:min-w-[160px] lg:items-end">
                  <p className="text-2xl font-black tracking-tight text-emerald-700">
                    {item.puanDegeri} / 5
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {formatDate(item.tarih)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RatingsPage() {
  const { accessToken, auth, primaryRole, status } =
    useDashboardAccess("shared-business");
  const [givenRatings, setGivenRatings] = useState<RatingListItem[]>([]);
  const [receivedRatings, setReceivedRatings] = useState<RatingListItem[]>([]);
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

    const loadRatings = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [givenResponse, receivedResponse, summaryResponse] = await Promise.all([
          getMyGivenRatings(accessToken),
          getMyReceivedRatings(accessToken),
          getMyRatingSummary(accessToken),
        ]);

        if (!isMounted) {
          return;
        }

        setGivenRatings(givenResponse);
        setReceivedRatings(receivedResponse);
        setSummary(summaryResponse);
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
            : "Puanlar yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadRatings();

    return () => {
      isMounted = false;
    };
  }, [accessToken, status]);

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const totalRatingCount = givenRatings.length + receivedRatings.length;

  return (
    <DashboardShell
      title="Puanlarim"
      description="Verdigin ve aldigin degerlendirmeleri aktif is baglamina gore tek yerde incele."
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && summary ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
          <SummaryStatCard label="Verdigim puan" value={givenRatings.length} />
          <SummaryStatCard label="Aldigim puan" value={receivedRatings.length} />
          <SummaryStatCard
            label="Nakliyeci ortalamam"
            value={formatAverageRating(summary.asCarrier.averageRating)}
            hint={`${summary.asCarrier.ratingCount} degerlendirme`}
          />
          <SummaryStatCard
            label="Musteri ortalamam"
            value={formatAverageRating(summary.asCustomer.averageRating)}
            hint={`${summary.asCustomer.ratingCount} degerlendirme`}
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && totalRatingCount === 0 ? (
        <EmptyStateCard
          title="Henuz puan kaydi yok"
          description="Puanlarin burada listelenecek."
          actionHref={
            primaryRole === "NAKLIYECI" ? "/dashboard/nakliyelerim" : "/dashboard/isteklerim"
          }
          actionLabel={
            primaryRole === "NAKLIYECI" ? "Nakliyelerime git" : "Isteklerime git"
          }
        />
      ) : null}

      {!isLoading && !errorMessage && totalRatingCount > 0 ? (
        <div className="grid gap-6 ">
          <SectionCard
            title="Verdigim Puanlar"
            emptyCopy="Henuz karsi tarafa gonderdigin bir degerlendirme yok."
            items={givenRatings}
          />
          <SectionCard
            title="Aldigim Puanlar"
            emptyCopy="Henuz sana ulasan bir degerlendirme yok."
            items={receivedRatings}
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && auth?.user ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Hesap ozetin
          </p>
          <p className="mt-3 text-lg font-bold text-slate-950">
            {auth.user.ad} {auth.user.soyad}
          </p>
          <p className="mt-1 text-sm text-slate-600">@{auth.user.kullaniciAdi}</p>
        </div>
      ) : null}
    </DashboardShell>
  );
}
