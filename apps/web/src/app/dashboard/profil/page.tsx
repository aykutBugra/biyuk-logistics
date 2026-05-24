"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import CustomerSectionSurface from "@/components/CustomerSectionSurface";
import CustomerWorkspaceSignalPill from "@/components/CustomerWorkspaceSignalPill";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import DashboardShell from "@/components/DashboardShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import ProfileImageUploader from "@/components/ProfileImageUploader";
import SummaryStatCard from "@/components/SummaryStatCard";

import { ApiClientError } from "@/lib/api/api-client";
import { deleteMyAccount } from "@/lib/api/auth";
import {
  getMyRatingSummary,
  type MyRatingSummary,
} from "@/lib/api/ratings";

import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useDashboardAccess } from "@/lib/auth/use-dashboard-access";

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

function formatAverageRating(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(1)} / 5`;
}

function formatMetricRating(value: number | null): string {
  return value === null ? "-" : value.toFixed(1);
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

// Profil sayfasi hesap bilgisi, profil fotografi, roller ve hesap silme aksiyonlarini toplar.
export default function ProfilePage() {
  const router = useRouter();

  const {
    accessToken,
    auth,
    hasBusinessAccess,
    isAdmin,
    isCarrier,
    isCarrierWorkspace,
    isCustomer,
    isCustomerWorkspace,
    status,
  } = useDashboardAccess("shared-account");

  const [summary, setSummary] = useState<MyRatingSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] =
    useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    // Profil acilinca business rol varsa puan ozeti cekilir.
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }

      return;
    }

    if (!hasBusinessAccess) {
      setSummary(null);
      setErrorMessage(null);
      setIsLoading(false);

      return;
    }

    let isMounted = true;

    const loadSummary = async () => {
      try {
        // Rating ozeti profil kartlarindaki ortalama ve toplam sayilari besler.
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
  }, [accessToken, hasBusinessAccess, status]);

  // Silme paneli acildiginda hata state'i temizlenir.
  const handleOpenDeletePanel = () => {
    setDeleteErrorMessage(null);
    setIsDeletePanelOpen(true);
  };

  // Hesap silme akisi iptal edilirse panel kapanir.
  const handleCancelDelete = () => {
    if (isDeletingAccount) {
      return;
    }

    setDeleteErrorMessage(null);
    setIsDeletePanelOpen(false);
  };

  // Hesap silme basarili olursa auth temizlenip login'e bilgi query'siyle donulur.
  const handleDeleteAccount = async () => {
    if (!accessToken || isDeletingAccount) {
      return;
    }

    try {
      setIsDeletingAccount(true);
      setDeleteErrorMessage(null);

      await deleteMyAccount(accessToken);

      clearStoredAuth();

      window.location.replace("/login?accountDeleted=1");
    } catch (error) {
      // Silme sirasinda token gecersizse kullanici tekrar login'e yonlendirilir.
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();

        window.location.replace("/login");

        return;
      }

      if (error instanceof ApiClientError && error.status === 403) {
        router.replace("/");

        return;
      }

      setDeleteErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Hesap silinirken beklenmeyen bir hata olustu."
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const ratingSummary = summary ?? EMPTY_RATING_SUMMARY;
  const totalReceivedCount =
    ratingSummary.asCarrier.ratingCount + ratingSummary.asCustomer.ratingCount;
  const isFallbackAccountView = !isCustomerWorkspace && !isCarrierWorkspace;

  return (
    <DashboardShell
      title="Profil"
      description={
        isCarrierWorkspace
          ? "Hesap bilgilerinizi, itibarinizi ve ayarlarinizi buradan yonetin."
          : "Hesap bilgilerin, rol gorunurlugun ve genel itibar ozeti burada toplanir."
      }
      headerVariant={isCustomerWorkspace || isCarrierWorkspace ? "compact" : "default"}
      motionPreset={isCustomerWorkspace || isCarrierWorkspace ? "operational" : "default"}
      cardMotionLimit={isCustomerWorkspace || isCarrierWorkspace ? 6 : undefined}
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && auth?.user && accessToken ? (
        <ProfileImageUploader accessToken={accessToken} user={auth.user} />
      ) : null}

      {!isLoading && !errorMessage && auth?.user && isCustomerWorkspace ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)] xl:items-start">
            <article className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <CustomerInitialsAvatar
                  name={`${auth.user.ad} ${auth.user.soyad}`}
                  fallback={auth.user.kullaniciAdi}
                  imageUrl={auth.user.profileImageUrl}
                  size="lg"
                  tone="blue"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Hesap bilgisi
                  </p>

                  <h2 className="mt-3 text-[2rem] font-black tracking-tight text-slate-950">
                    {auth.user.ad} {auth.user.soyad}
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">
                    @{auth.user.kullaniciAdi}
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-500">
                    {auth.user.mail}
                  </p>

                  <p className="mt-3 text-sm text-slate-500">
                    {auth.user.telefonNumarasi ?? "Telefon eklenmedi"}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
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
                </div>
              </div>
            </article>

            {isCustomer && !isCarrier ? (
              <aside className="app-surface-strong rounded-[1.6rem] border border-blue-200 bg-blue-50/60 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Rol genisletme
                </p>

                <h2 className="mt-3 text-[1.8rem] font-black tracking-tight text-slate-950">
                  Nakliyeci rolunu ekle
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Mevcut hesabini ikinci kez kayit olmadan genislet. Ilk aracin
                  basariyla kaydedildiginde nakliyeci workspace'i acilir.
                </p>

                <Link
                  href="/dashboard/profil/nakliyeci-rolu-ekle"
                  className="app-button-primary mt-6"
                >
                  Nakliyeci rolunu ekle
                </Link>
              </aside>
            ) : (
              <aside className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Hesap kapsami
                </p>

                <h2 className="mt-3 text-[1.8rem] font-black tracking-tight text-slate-950">
                  Cift rol aktif
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Bu hesap hem musteri hem nakliyeci alanina acik. Workspace
                  secicisi uzerinden iki operasyon alani arasinda gecis
                  yapabilirsin.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <CustomerWorkspaceSignalPill
                    tone="amber"
                    label="Musteri workspace"
                  />
                  <CustomerWorkspaceSignalPill
                    tone="blue"
                    label="Nakliyeci workspace"
                  />
                </div>
              </aside>
            )}
          </div>

          {summary ? (
            <div
              className={`mt-6 grid gap-4 ${
                isCarrier ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"
              }`}
            >
              <CustomerMetricCard
                label="Musteri puanim"
                value={formatMetricRating(summary.asCustomer.averageRating)}
                hint={`${summary.asCustomer.ratingCount} degerlendirme`}
                tone="blue"
                icon={<i className="pi pi-user text-lg" />}
              />

              {isCarrier ? (
                <CustomerMetricCard
                  label="Nakliyeci puanim"
                  value={formatMetricRating(summary.asCarrier.averageRating)}
                  hint={`${summary.asCarrier.ratingCount} degerlendirme`}
                  tone="emerald"
                  icon={<i className="pi pi-truck text-lg" />}
                />
              ) : null}

              <CustomerMetricCard
                label="Toplam geri bildirim"
                value={totalReceivedCount}
                hint="Tamamlanan operasyonlardan"
                tone="amber"
                icon={<i className="pi pi-star text-lg" />}
              />
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.95fr)] xl:items-start">
            <CustomerSectionSurface
              title="Profil ozeti"
              count={totalReceivedCount}
              description="Aldigin geri bildirimleri ve rol bazli ortalamalari tek yerde incele."
              action={
                totalReceivedCount > 0 ? (
                  <Link href="/dashboard/puanlarim" className="app-button-secondary">
                    Puanlarimi gor
                  </Link>
                ) : undefined
              }
            >
              {totalReceivedCount === 0 ? (
                <EmptyStateCard
                  eyebrow="Ozet"
                  title="Henuz profil puani olusmadi"
                  description="Puan geldikce rol bazli profil ozeti burada dolacak."
                  actionHref="/dashboard/puanlarim"
                  actionLabel="Puanlarimi gor"
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
                  <div className="rounded-[1.45rem] border border-blue-200 bg-blue-50/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                      Musteri puani
                    </p>
                    <p className="mt-3 text-[3rem] font-black leading-none tracking-tight text-blue-950">
                      {formatMetricRating(summary?.asCustomer.averageRating ?? null)}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-sm text-amber-500">
                      {renderStars(summary?.asCustomer.averageRating ?? null)}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-blue-950">
                      {summary?.asCustomer.ratingCount ?? 0} degerlendirme ile
                      musteri tarafindaki ortalaman.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {isCarrier ? (
                      <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-sm font-semibold text-slate-500">
                          Nakliyeci puani
                        </p>
                        <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                          {formatMetricRating(
                            summary?.asCarrier.averageRating ?? null
                          )}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {summary?.asCarrier.ratingCount ?? 0} degerlendirme
                        </p>
                      </div>
                    ) : null}

                    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-sm font-semibold text-slate-500">
                        Toplam geri bildirim
                      </p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        {totalReceivedCount}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Tamamlanan islerden gelen kayitlar
                      </p>
                    </div>

                    <div className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
                      <p className="text-sm leading-6 text-slate-500">
                        Profil puanlari yalnizca tamamlanan operasyonlardan
                        olusan gercek rating kayitlarindan turetilir.
                      </p>
                      <Link
                        href="/dashboard/puanlarim"
                        className="app-button-secondary mt-4"
                      >
                        Tum puanlari incele
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </CustomerSectionSurface>

            <section className="app-surface-strong rounded-[1.6rem] border border-red-200 bg-red-50/70 shadow-sm">
              <div className="border-b border-red-100 px-5 py-4 md:px-6">
                <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950">
                  Danger zone
                </h2>
                <p className="mt-1 text-sm leading-6 text-red-700">
                  Hesap silme islemi geri alinamaz ve aktif operasyonlar
                  tarafindan engellenebilir.
                </p>
              </div>

              <div className="p-5 md:p-6 ">
                <div className="space-y-2 text-sm leading-6 text-slate-700">
                  <p>Bu islem geri alinamaz.</p>
                  <p>Hesabina bagli arac, rota ve istek kayitlari kaldirilabilir.</p>
                  <p>
                    Aktif operasyonlar veya acik tekliflerin varsa silme
                    engellenebilir.
                  </p>
                </div>

                {!isDeletePanelOpen ? (
                  <button
                    type="button"
                    onClick={handleOpenDeletePanel}
                    className="mt-5 inline-flex items-center rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-100"
                  >
                    Hesabimi sil
                  </button>
                ) : (
                  <div className="mt-5 rounded-[1.3rem] border border-red-300 bg-white p-5">
                    <p className="text-sm font-semibold text-slate-950">
                      Bu hesabi kalici olarak silmek istedigine emin misin?
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Silme sonrasi oturumun kapatilacak. Aktif nakliye,
                      anlasma veya acik teklif varsa islem bloklanir.
                    </p>

                    {deleteErrorMessage ? (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {deleteErrorMessage}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount}
                        className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                      >
                        {isDeletingAccount
                          ? "Hesap siliniyor..."
                          : "Silmeyi onayla"}
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelDelete}
                        disabled={isDeletingAccount}
                        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        Vazgec
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      ) : null}

      {!isLoading && !errorMessage && auth?.user && isCarrierWorkspace ? (
        <div data-dashboard-primary className="mt-6 space-y-6">
          <article className="app-surface-strong rounded-[1.6rem] border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
                <CustomerInitialsAvatar
                  name={`${auth.user.ad} ${auth.user.soyad}`}
                  fallback={auth.user.kullaniciAdi}
                  imageUrl={auth.user.profileImageUrl}
                  size="lg"
                  tone="blue"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Hesap bilgisi
                  </p>

                  <h2 className="mt-3 text-[2rem] font-black tracking-tight text-slate-950">
                    {auth.user.ad} {auth.user.soyad}
                  </h2>

                  <p className="mt-2 text-sm text-slate-600">
                    @{auth.user.kullaniciAdi}
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-500">
                    {auth.user.mail}
                  </p>

                  <p className="mt-3 text-sm text-slate-500">
                    {auth.user.telefonNumarasi ?? "Telefon eklenmedi"}
                  </p>

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
                    {isAdmin ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Admin
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px]">
                <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Aktif gorunum
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    Nakliyeci workspace
                  </p>
                </div>

                <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Rol kapsami
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {isCustomer ? "Cift rol aktif" : "Tek rol aktif"}
                  </p>
                </div>
              </div>
            </div>
          </article>

          <div
            data-dashboard-stats
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            <CustomerMetricCard
              label="Nakliyeci puanim"
              value={formatMetricRating(ratingSummary.asCarrier.averageRating)}
              hint={`${ratingSummary.asCarrier.ratingCount} degerlendirme`}
              tone="blue"
              icon={<i className="pi pi-truck text-lg" />}
            />
            <CustomerMetricCard
              label="Musteri puanim"
              value={formatMetricRating(ratingSummary.asCustomer.averageRating)}
              hint={`${ratingSummary.asCustomer.ratingCount} degerlendirme`}
              tone="amber"
              icon={<i className="pi pi-user text-lg" />}
            />
            <CustomerMetricCard
              label="Toplam geri bildirim"
              value={totalReceivedCount}
              hint="Tamamlanan operasyonlardan"
              tone="emerald"
              icon={<i className="pi pi-star text-lg" />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.95fr)] xl:items-start">
            <CustomerSectionSurface
              title="Profil ozeti"
              count={totalReceivedCount}
              description="Rol bazli ortalamalarini ve profil itibarini tek yerde incele."
              action={
                totalReceivedCount > 0 ? (
                  <Link href="/dashboard/puanlarim" className="app-button-secondary">
                    Puanlarimi gor
                  </Link>
                ) : undefined
              }
            >
              {totalReceivedCount === 0 ? (
                <EmptyStateCard
                  eyebrow="Profil skoru"
                  title="Henuz profil puani olusmadi"
                  description="Tasima ve teklif surecleri tamamlandikca puanlarin burada gorunecek."
                  actionHref="/dashboard/puanlarim"
                  actionLabel="Puanlarimi gor"
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="rounded-[1.45rem] border border-blue-200 bg-blue-50/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                      Nakliyeci itibari
                    </p>
                    <p className="mt-3 text-[3rem] font-black leading-none tracking-tight text-blue-950">
                      {formatMetricRating(ratingSummary.asCarrier.averageRating)}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-sm text-amber-500">
                      {renderStars(ratingSummary.asCarrier.averageRating)}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-blue-950">
                      {ratingSummary.asCarrier.ratingCount} degerlendirme ile
                      nakliyeci tarafindaki ortalaman.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-sm font-semibold text-slate-500">
                        Musteri puani
                      </p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        {formatMetricRating(ratingSummary.asCustomer.averageRating)}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {ratingSummary.asCustomer.ratingCount} degerlendirme
                      </p>
                    </div>

                    <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-sm font-semibold text-slate-500">
                        Toplam geri bildirim
                      </p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                        {totalReceivedCount}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Tum rollerden biriken puan
                      </p>
                    </div>

                    <div className="rounded-[1.15rem] border border-slate-200 bg-white p-4 sm:col-span-2">
                      <p className="text-sm leading-6 text-slate-500">
                        Bu ozet yalnizca mevcut hesap kaydi ve rating summary
                        yanitindan gelen gercek verilere dayanir.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CustomerSectionSurface>

            <CustomerSectionSurface
              title="Hesap kapsami"
              description="Rol ve iletisim alanlarin mevcut hesap kaydindan okunur."
            >
              <div className="space-y-4">
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

                <div className="rounded-[1.15rem] border border-blue-200 bg-blue-50/70 p-4">
                  <p className="text-sm font-semibold text-blue-900">
                    Veri kaynagi
                  </p>
                  <p className="mt-2 text-sm leading-6 text-blue-950">
                    Bu sayfadaki rol, iletisim ve puan alanlari mevcut auth
                    kaydi ile rating summary yanitindan uretilir. Ek rozet veya
                    dogrulama bilgisi olusturulmaz.
                  </p>
                </div>
              </div>
            </CustomerSectionSurface>
          </div>

          <section className="app-surface-strong rounded-[1.6rem] border border-red-200 bg-red-50/70 shadow-sm">
            <div className="border-b border-red-100 px-5 py-4 md:px-6">
              <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950">
                Danger zone
              </h2>
              <p className="mt-1 text-sm leading-6 text-red-700">
                Hesap silme islemi geri alinamaz ve aktif operasyonlar
                tarafindan engellenebilir.
              </p>
            </div>

            <div className="p-5 md:p-6">
              <div className="space-y-2 text-sm leading-6 text-slate-700">
                <p>Bu islem geri alinamaz.</p>
                <p>Hesabina bagli arac, rota ve istek kayitlari kaldirilabilir.</p>
                <p>
                  Aktif operasyonlar veya acik tekliflerin varsa silme
                  engellenebilir.
                </p>
              </div>

              {!isDeletePanelOpen ? (
                <button
                  type="button"
                  onClick={handleOpenDeletePanel}
                  className="mt-5 inline-flex items-center rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-100"
                >
                  Hesabimi sil
                </button>
              ) : (
                <div className="mt-5 rounded-[1.3rem] border border-red-300 bg-white p-5">
                  <p className="text-sm font-semibold text-slate-950">
                    Bu hesabi kalici olarak silmek istedigine emin misin?
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Silme sonrasi oturumun kapatilacak. Aktif nakliye,
                    anlasma veya acik teklif varsa islem bloklanir.
                  </p>

                  {deleteErrorMessage ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {deleteErrorMessage}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                    >
                      {isDeletingAccount
                        ? "Hesap siliniyor..."
                        : "Silmeyi onayla"}
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      disabled={isDeletingAccount}
                      className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      Vazgec
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {!isLoading && !errorMessage && auth?.user && isFallbackAccountView ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
              Hesap bilgisi
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              {auth.user.ad} {auth.user.soyad}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              @{auth.user.kullaniciAdi}
            </p>

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

              {isAdmin ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Admin
                </span>
              ) : null}
            </div>
          </div>

          {isCustomer && !isCarrier ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                Role onboarding
              </p>

              <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">
                Nakliyeci rolunu ekle
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                Mevcut hesabini ikinci kez kayit olmadan genislet. Ilk aracin
                basariyla kaydedildiginde nakliyeci workspace'i acilir.
              </p>

              <Link
                href="/dashboard/profil/nakliyeci-rolu-ekle"
                className="mt-6 inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Nakliyeci rolunu ekle
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !errorMessage && summary && isFallbackAccountView ? (
        <div className="mb-6 mt-2 grid gap-4 md:grid-cols-3">
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
        </div>
      ) : null}

      {!isLoading &&
      !errorMessage &&
      hasBusinessAccess &&
      totalReceivedCount === 0 &&
      isFallbackAccountView ? (
        <div className="mb-6 mt-2">
          <EmptyStateCard
            eyebrow="Profil ozeti"
            title="Henuz profil puani olusmadi"
            description="Puan geldikce profil ozeti burada dolacak."
            actionHref="/dashboard/puanlarim"
            actionLabel="Puanlarimi gor"
          />
        </div>
      ) : null}

      {!isLoading && auth?.user && isFallbackAccountView ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">
            Danger zone
          </p>

          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            Hesabimi sil
          </h2>

          <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
            <p>Bu islem geri alinamaz.</p>

            <p>Hesabina bagli arac, rota ve istek kayitlari kaldirilabilir.</p>

            <p>
              Aktif operasyonlar veya acik tekliflerin varsa silme
              engellenebilir.
            </p>
          </div>

          {!isDeletePanelOpen ? (
            <button
              type="button"
              onClick={handleOpenDeletePanel}
              className="mt-5 inline-flex items-center rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:bg-red-100"
            >
              Hesabimi sil
            </button>
          ) : (
            <div className="mt-5 rounded-2xl border border-red-300 bg-white p-5">
              <p className="text-sm font-semibold text-slate-950">
                Bu hesabi kalici olarak silmek istedigine emin misin?
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Silme sonrasi oturumun kapatilacak. Aktif nakliye, anlasma veya
                acik teklif varsa islem bloklanir.
              </p>

              {deleteErrorMessage ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {deleteErrorMessage}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  {isDeletingAccount
                    ? "Hesap siliniyor..."
                    : "Silmeyi onayla"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isDeletingAccount}
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Vazgec
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </DashboardShell>
  );
}
