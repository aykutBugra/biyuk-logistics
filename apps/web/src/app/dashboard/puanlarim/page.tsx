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

const EMPTY_RATING_SUMMARY: MyRatingSummary = {
  asCarrier: {
    averageRating: null,
    ratingCount: 0,
  },
  asCustomer: {
    averageRating: null,
    ratingCount: 0,
  },
};

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

// Ortalama veya tek puan degeri 5 yildiz ikonuna cevrilir.
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

// Aktif dashboard rolune gore kullanici puanlari hangi rolde goruyor belirlenir.
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

// Verilen/alinan puan kayitlari tek liste kart modeline normalize edilir.
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

function resolveLatestRatingDate(ratings: RatingListItem[]): string | null {
  if (ratings.length === 0) {
    return null;
  }

  const latestRating = [...ratings].sort(
    (left, right) =>
      new Date(right.tarih).getTime() - new Date(left.tarih).getTime()
  )[0];

  return latestRating ? formatDate(latestRating.tarih) : null;
}

// Puanlarim sayfasi verilen, alinan ve ozet puanlari tek ekranda toplar.
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
    // Dashboard guard hazir olmadan rating endpoint'leri cagrilmaz.
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    let isMounted = true;

    const loadRatings = async () => {
      try {
        // Verilen, alinan ve ozet endpoint'leri ayni anda cekilir.
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

  useEffect(() => {
    // Aktif workspace degisince onceki filtre yeni rol ekranina tasinmaz.
    setSelectedFilter("all");
  }, [primaryRole]);

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

      return right.item.id.localeCompare(left.item.id);
    });
  const filteredRatings = combinedRatings.filter((rating) =>
    matchesRatingFilter(rating, selectedFilter)
  );
  const overallReceivedAverage = resolveOverallAverage(receivedRatings);
  const commentedReceivedCount = receivedRatings.filter((rating) =>
    Boolean(rating.yorum?.trim())
  ).length;
  const latestReceivedRatingDate = resolveLatestRatingDate(receivedRatings);
  const ratingSummary = summary ?? EMPTY_RATING_SUMMARY;

  return (
    <DashboardShell
      title="Puanlarim"
      description="Verdigin ve aldigin degerlendirmeleri aktif is baglamina gore tek yerde incele."
      pageEyebrow={isCustomerWorkspace ? "Calisma alani" : undefined}
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={8}
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && isCustomerWorkspace ? (
        <>
          <div data-dashboard-stats className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              value={formatMetricAverage(ratingSummary.asCarrier.averageRating)}
              hint={`${ratingSummary.asCarrier.ratingCount} degerlendirme`}
              tone="violet"
              icon={<i className="pi pi-truck text-lg" />}
            />
            <CustomerMetricCard
              label="Musteri ortalamam"
              value={formatMetricAverage(ratingSummary.asCustomer.averageRating)}
              hint={`${ratingSummary.asCustomer.ratingCount} degerlendirme`}
              tone="amber"
              icon={<i className="pi pi-user text-lg" />}
            />
          </div>

          <div data-dashboard-primary className="mt-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
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
                          {formatMetricAverage(ratingSummary.asCustomer.averageRating)}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {ratingSummary.asCustomer.ratingCount} degerlendirme
                        </p>
                      </div>

                      <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-sm font-semibold text-slate-500">
                          Nakliyeci rolundeki ortalama
                        </p>
                        <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                          {formatMetricAverage(ratingSummary.asCarrier.averageRating)}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {ratingSummary.asCarrier.ratingCount} degerlendirme
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
                        imageUrl={auth.user.profileImageUrl}
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
          </div>
        </>
      ) : null}

      {!isLoading && !errorMessage && !isCustomerWorkspace ? (
        totalRatingCount === 0 ? (
          <div data-dashboard-primary className="mt-6">
            <EmptyStateCard
              title="Henuz profil puani olusmadi"
              description="Tasima ve teklif surecleri tamamlandikca puanlarin burada gorunecek."
              actionHref="/dashboard/nakliyelerim"
              actionLabel="Nakliyelerime git"
            />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div
              data-dashboard-stats
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <CustomerMetricCard
                label="Verdigim puan"
                value={givenRatings.length}
                hint="Karsi tarafa ilettigin degerlendirme"
                tone="blue"
                icon={<i className="pi pi-star text-lg" />}
              />
              <CustomerMetricCard
                label="Aldigim puan"
                value={receivedRatings.length}
                hint="Profiline gelen geri bildirim"
                tone="emerald"
                icon={<i className="pi pi-inbox text-lg" />}
              />
              <CustomerMetricCard
                label="Nakliyeci ortalamam"
                value={formatMetricAverage(ratingSummary.asCarrier.averageRating)}
                hint={`${ratingSummary.asCarrier.ratingCount} degerlendirme`}
                tone="violet"
                icon={<i className="pi pi-truck text-lg" />}
              />
              <CustomerMetricCard
                label="Musteri ortalamam"
                value={formatMetricAverage(ratingSummary.asCustomer.averageRating)}
                hint={`${ratingSummary.asCustomer.ratingCount} degerlendirme`}
                tone="amber"
                icon={<i className="pi pi-user text-lg" />}
              />
            </div>

            <div data-dashboard-primary className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
                <CustomerSectionSurface
                  title="Puan ozeti"
                  count={receivedRatings.length}
                  description="Aldigin puanlari genel memnuniyet seviyesi ve aktif is baglami ile birlikte oku."
                >
                  {receivedRatings.length === 0 ? (
                    <EmptyStateCard
                      eyebrow="Profil skoru"
                      title="Henuz profil puani olusmadi"
                      description="Tasima ve teklif surecleri tamamlandikca aldigin puanlar burada ortalamaya donusecek."
                      actionHref="/dashboard/nakliyelerim"
                      actionLabel="Nakliyelerime git"
                    />
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                      <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50/70 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                          Genel ortalama
                        </p>
                        <div className="mt-5 flex items-center justify-center">
                          <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-[10px] border-emerald-500 bg-white shadow-sm">
                            <p className="text-[2.9rem] font-black leading-none tracking-tight text-emerald-900">
                              {formatMetricAverage(overallReceivedAverage)}
                            </p>
                            <div className="mt-2 flex items-center gap-1 text-sm text-amber-500">
                              {renderStars(overallReceivedAverage)}
                            </div>
                          </div>
                        </div>
                        <p className="mt-4 text-center text-sm leading-6 text-emerald-900">
                          Toplam {receivedRatings.length} aldigin degerlendirme profil
                          skorunu olusturur.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 p-4">
                          <p className="text-sm font-semibold text-slate-500">
                            Toplam degerlendirme
                          </p>
                          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                            {receivedRatings.length}
                          </p>
                          <p className="mt-2 text-sm text-slate-500">
                            Sana verilen puan kaydi
                          </p>
                        </div>

                        <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 p-4">
                          <p className="text-sm font-semibold text-slate-500">
                            Yorumlu geri bildirim
                          </p>
                          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                            {commentedReceivedCount}
                          </p>
                          <p className="mt-2 text-sm text-slate-500">
                            Yorum eklenmis puan
                          </p>
                        </div>

                        <div className="rounded-[1.15rem] border border-slate-200 bg-white p-4 sm:col-span-2">
                          <p className="text-sm font-semibold text-slate-500">
                            Son alinan puan
                          </p>
                          <p className="mt-2 text-lg font-black tracking-tight text-slate-950">
                            {latestReceivedRatingDate ?? "-"}
                          </p>
                          <p className="mt-2 text-sm text-slate-500">
                            Son ulasan geri bildirimin tarihi
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CustomerSectionSurface>

                <CustomerSectionSurface
                  title="Hesap ozeti"
                  description="Rol ve iletisim bilgilerinin puan akisiyla birlikte kisa ozeti."
                >
                  {auth?.user ? (
                    <div className="space-y-5">
                      <div className="flex items-center gap-4">
                        <CustomerInitialsAvatar
                          name={`${auth.user.ad} ${auth.user.soyad}`}
                          fallback={auth.user.kullaniciAdi}
                          imageUrl={auth.user.profileImageUrl}
                          size="lg"
                        />
                        <div className="min-w-0">
                          <p className="text-[1.35rem] font-black tracking-tight text-slate-950">
                            {auth.user.ad} {auth.user.soyad}
                          </p>
                          <p className="text-sm text-slate-500">
                            @{auth.user.kullaniciAdi}
                          </p>
                        </div>
                      </div>

                      <dl className="grid gap-3 text-sm text-slate-600">
                        <div className="rounded-[1.05rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            E-posta
                          </dt>
                          <dd className="mt-1 font-medium text-slate-900">
                            {auth.user.mail}
                          </dd>
                        </div>

                        <div className="rounded-[1.05rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Telefon
                          </dt>
                          <dd className="mt-1 font-medium text-slate-900">
                            {auth.user.telefonNumarasi ?? "Telefon eklenmedi"}
                          </dd>
                        </div>
                      </dl>

                      <div className="flex flex-wrap gap-2">
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
                      description="Profil verisi tekrar yuklendiginde hesap ozeti bu alanda gosterilecek."
                    />
                  )}
                </CustomerSectionSurface>
              </div>

              <CustomerSectionSurface
                title="Son degerlendirmeler"
                count={filteredRatings.length}
                description="Verdigin ve aldigin degerlendirmeleri tarih sirasiyla tek listede incele."
                action={
                  <div className="flex flex-wrap gap-2">
                    {RATING_FILTERS.map((filter) => {
                      const isActive = selectedFilter === filter.id;

                      return (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setSelectedFilter(filter.id)}
                          className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                            isActive
                              ? "border-blue-200 bg-blue-50 text-blue-700"
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
                {filteredRatings.length === 0 ? (
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
          </div>
        )
      ) : null}
    </DashboardShell>
  );
}
