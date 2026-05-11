"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import CustomerRatingActivityCard from "@/components/CustomerRatingActivityCard";
import CustomerSectionSurface from "@/components/CustomerSectionSurface";
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

type RatingDirection = "given" | "received";
type RatingFilter = "all" | "given" | "received";
type CombinedRatingItem = {
  direction: RatingDirection;
  item: RatingListItem;
};

const RATING_FILTERS: Array<{ id: RatingFilter; label: string }> = [
  { id: "all", label: "Tumu" },
  { id: "given", label: "Verdigim" },
  { id: "received", label: "Aldigim" },
];

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

function formatMetricAverage(value: number | null): string {
  return value === null ? "-" : value.toFixed(1);
}

function resolveOverallAverage(ratings: RatingListItem[]): number | null {
  if (ratings.length === 0) {
    return null;
  }

  const total = ratings.reduce((sum, rating) => sum + rating.puanDegeri, 0);
  return Number((total / ratings.length).toFixed(1));
}

function renderStars(score: number | null) {
  return Array.from({ length: 5 }, (_, index) => {
    const isFilled = score !== null && index < Math.round(score);

    return (
      <i
        key={`${score ?? "empty"}-${index}`}
        className={isFilled ? "pi pi-star-fill" : "pi pi-star"}
        aria-hidden="true"
      />
    );
  });
}

function resolveActiveRole(
  direction: RatingDirection,
  roleContext: string
): "MUSTERI" | "NAKLIYECI" {
  const normalizedRole = roleContext.trim().toUpperCase();

  if (direction === "received") {
    return normalizedRole === "MUSTERI" ? "MUSTERI" : "NAKLIYECI";
  }

  return normalizedRole === "NAKLIYECI" ? "MUSTERI" : "NAKLIYECI";
}

function resolveRatingDetailModel(
  item: RatingListItem,
  direction: RatingDirection
): {
  href: string;
  label: string;
} {
  const activeRole = resolveActiveRole(direction, item.rolBaglami);

  if (activeRole === "MUSTERI") {
    return {
      href: `/dashboard/isteklerim/${item.requestId}`,
      label: "Istek detayi",
    };
  }

  return {
    href: `/dashboard/nakliyelerim/${item.jobId}`,
    label: "Nakliye detayi",
  };
}

function matchesRatingFilter(
  rating: CombinedRatingItem,
  filter: RatingFilter
): boolean {
  if (filter === "all") {
    return true;
  }

  return rating.direction === filter;
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
                      {item.baslangicSehri} {"->"} {item.varisSehri}
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
  const {
    accessToken,
    auth,
    isAdmin,
    isCarrier,
    isCustomer,
    isCustomerWorkspace,
    primaryRole,
    status,
  } = useDashboardAccess("shared-business");
  const [givenRatings, setGivenRatings] = useState<RatingListItem[]>([]);
  const [receivedRatings, setReceivedRatings] = useState<RatingListItem[]>([]);
  const [summary, setSummary] = useState<MyRatingSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<RatingFilter>("all");

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
  const combinedRatings = [
    ...givenRatings.map((item) => ({
      direction: "given" as const,
      item,
    })),
    ...receivedRatings.map((item) => ({
      direction: "received" as const,
      item,
    })),
  ]
    .sort((left, right) => {
      const timeDifference =
        new Date(right.item.tarih).getTime() - new Date(left.item.tarih).getTime();

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return right.item.id - left.item.id;
    });
  const filteredRatings = combinedRatings.filter((rating) =>
    matchesRatingFilter(rating, selectedFilter)
  );
  const overallReceivedAverage = resolveOverallAverage(receivedRatings);
  const commentedReceivedCount = receivedRatings.filter((rating) =>
    Boolean(rating.yorum?.trim())
  ).length;

  return (
    <DashboardShell
      title="Puanlarim"
      description="Verdigin ve aldigin degerlendirmeleri aktif is baglamina gore tek yerde incele."
      pageEyebrow={isCustomerWorkspace ? "Calisma alani" : undefined}
      headerVariant={isCustomerWorkspace ? "compact" : "default"}
      motionPreset={isCustomerWorkspace ? "operational" : "default"}
      cardMotionLimit={isCustomerWorkspace ? 8 : undefined}
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && isCustomerWorkspace && summary ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CustomerMetricCard
            label="Verdigim puan"
            value={givenRatings.length}
            hint="Gonderdigin degerlendirme kaydi"
            tone="blue"
            icon={<i className="pi pi-star text-lg" />}
          />
          <CustomerMetricCard
            label="Aldigim puan"
            value={receivedRatings.length}
            hint="Sana ulasan degerlendirmeler"
            tone="emerald"
            icon={<i className="pi pi-inbox text-lg" />}
          />
          <CustomerMetricCard
            label="Nakliyeci ortalamam"
            value={formatMetricAverage(summary.asCarrier.averageRating)}
            hint={`${summary.asCarrier.ratingCount} degerlendirme`}
            tone="violet"
            icon={<i className="pi pi-truck text-lg" />}
          />
          <CustomerMetricCard
            label="Musteri ortalamam"
            value={formatMetricAverage(summary.asCustomer.averageRating)}
            hint={`${summary.asCustomer.ratingCount} degerlendirme`}
            tone="amber"
            icon={<i className="pi pi-user text-lg" />}
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && !isCustomerWorkspace && summary ? (
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      {!isLoading && !errorMessage && isCustomerWorkspace ? (
        <>
          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
            <CustomerSectionSurface
              title="Puan ozeti"
              count={receivedRatings.length}
              description="Aldigin degerlendirmeleri genel seviye ve rol baglamina gore tek bakista incele."
            >
              {receivedRatings.length === 0 ? (
                <EmptyStateCard
                  eyebrow="Ozet"
                  title="Henuz yeterli degerlendirme yok"
                  description="Sana puan geldikce genel ortalama ve rol bazli ozet kartlari burada dolacak."
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <div className="rounded-[1.45rem] border border-emerald-200 bg-emerald-50/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Genel ortalama
                    </p>
                    <p className="mt-3 text-[3.2rem] font-black leading-none tracking-tight text-emerald-900">
                      {formatMetricAverage(overallReceivedAverage)}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-sm text-amber-500">
                      {renderStars(overallReceivedAverage)}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-emerald-900">
                      Toplam {receivedRatings.length} degerlendirme aldin. Ozet mevcut
                      rating verisi geldikce kendini gunceller.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-sm font-semibold text-slate-500">
                        Musteri rolundeki ortalama
                      </p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        {formatMetricAverage(summary?.asCustomer.averageRating ?? null)}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {summary?.asCustomer.ratingCount ?? 0} degerlendirme
                      </p>
                    </div>

                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-sm font-semibold text-slate-500">
                        Nakliyeci rolundeki ortalama
                      </p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        {formatMetricAverage(summary?.asCarrier.averageRating ?? null)}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {summary?.asCarrier.ratingCount ?? 0} degerlendirme
                      </p>
                    </div>

                    <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4 sm:col-span-2 lg:col-span-1">
                      <p className="text-sm font-semibold text-slate-500">
                        Yorumlu geri bildirim
                      </p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        {commentedReceivedCount}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Yorum iceren aldigin degerlendirme kaydi
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CustomerSectionSurface>

            <CustomerSectionSurface
              title="Hesap ozeti"
              description="Profil ve rol bilgilerin puan akisiyla birlikte burada gorunur."
            >
              {auth?.user ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <CustomerInitialsAvatar
                      name={`${auth.user.ad} ${auth.user.soyad}`}
                      fallback={auth.user.kullaniciAdi}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <p className="text-[1.45rem] font-black tracking-tight text-slate-950">
                        {auth.user.ad} {auth.user.soyad}
                      </p>
                      <p className="text-sm text-slate-500">@{auth.user.kullaniciAdi}</p>
                    </div>
                  </div>

                  <dl className="grid gap-3 text-sm text-slate-600">
                    <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        E-posta
                      </dt>
                      <dd className="mt-1 font-medium text-slate-900">{auth.user.mail}</dd>
                    </div>
                    <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Telefon
                      </dt>
                      <dd className="mt-1 font-medium text-slate-900">
                        {auth.user.telefonNumarasi ?? "Telefon eklenmedi"}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    {isCustomer ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Musteri
                      </span>
                    ) : null}
                    {isCarrier ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        Nakliyeci
                      </span>
                    ) : null}
                    {isAdmin ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Admin
                      </span>
                    ) : null}
                  </div>

                  <Link href="/dashboard/profil" className="app-button-secondary">
                    Profili ac
                  </Link>
                </div>
              ) : (
                <EmptyStateCard
                  eyebrow="Profil"
                  title="Hesap bilgisi gorunemedi"
                  description="Profil bilgileri tekrar yuklendiginde bu alanda rol ve hesap ozetin gorunecek."
                />
              )}
            </CustomerSectionSurface>
          </div>

          <div className="mt-6">
            <CustomerSectionSurface
              title="Son degerlendirmeler"
              count={filteredRatings.length}
              description="Verdigin ve aldigin rating kayitlarini tarih sirasiyla incele."
              action={
                <div className="flex flex-wrap gap-2">
                  {RATING_FILTERS.map((filter) => {
                    const isActive = selectedFilter === filter.id;

                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setSelectedFilter(filter.id)}
                        className={`app-pressable inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                          isActive
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              }
            >
              {combinedRatings.length === 0 ? (
                <EmptyStateCard
                  eyebrow="Degerlendirme"
                  title="Henuz puan kaydi yok"
                  description="Tamamlanan isler sonrasinda verdigin ve aldigin tum degerlendirmeler burada listelenecek."
                  actionHref="/dashboard/isteklerim"
                  actionLabel="Isteklerime git"
                />
              ) : filteredRatings.length === 0 ? (
                <EmptyStateCard
                  eyebrow="Filtre sonucu"
                  title="Filtreye uyan degerlendirme bulunamadi"
                  description="Secili gorunumu degistirerek verdigin ve aldigin kayitlari tekrar inceleyebilirsin."
                />
              ) : (
                <div className="grid gap-4">
                  {filteredRatings.map((rating) => {
                    const detailModel = resolveRatingDetailModel(
                      rating.item,
                      rating.direction
                    );

                    return (
                      <CustomerRatingActivityCard
                        key={`${rating.direction}-${rating.item.id}`}
                        item={rating.item}
                        direction={rating.direction}
                        detailHref={detailModel.href}
                        detailLabel={detailModel.label}
                      />
                    );
                  })}
                </div>
              )}
            </CustomerSectionSurface>
          </div>
        </>
      ) : null}

      {!isLoading && !errorMessage && !isCustomerWorkspace && totalRatingCount === 0 ? (
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

      {!isLoading && !errorMessage && !isCustomerWorkspace && totalRatingCount > 0 ? (
        <div className="grid gap-6">
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

      {!isLoading && !errorMessage && !isCustomerWorkspace && auth?.user ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
