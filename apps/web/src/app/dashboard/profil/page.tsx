"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import DashboardShell from "@/components/DashboardShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import { deleteMyAccount } from "@/lib/api/auth";
import { getMyRatingSummary, type MyRatingSummary } from "@/lib/api/ratings";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useDashboardAccess } from "@/lib/auth/use-dashboard-access";

function formatAverageRating(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(1)} / 5`;
}

export default function ProfilePage() {
  const router = useRouter();
  const {
    accessToken,
    auth,
    hasBusinessAccess,
    isAdmin,
    isCarrier,
    isCustomer,
    status,
  } = useDashboardAccess("shared-account");
  const [summary, setSummary] = useState<MyRatingSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletePanelOpen, setIsDeletePanelOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
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

  const handleOpenDeletePanel = () => {
    setDeleteErrorMessage(null);
    setIsDeletePanelOpen(true);
  };

  const handleCancelDelete = () => {
    if (isDeletingAccount) {
      return;
    }

    setDeleteErrorMessage(null);
    setIsDeletePanelOpen(false);
  };

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

  const totalReceivedCount =
    (summary?.asCarrier.ratingCount ?? 0) + (summary?.asCustomer.ratingCount ?? 0);

  return (
    <DashboardShell
      title="Profil"
      description="Hesap bilgilerin, rol gorunurlugun ve genel itibar ozeti burada toplanir."
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && auth?.user ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
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
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Mevcut hesabini ikinci kez kayit olmadan genislet. Ilk aracin
                basariyla kaydedildiginde nakliyeci workspace'i acilir.
              </p>
              <Link
                href="/dashboard/profil/nakliyeci-rolu-ekle"
                className="mt-5 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Nakliyeci rolunu ekle
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !errorMessage && summary ? (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
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

      {!isLoading && !errorMessage && hasBusinessAccess && totalReceivedCount === 0 ? (
        <EmptyStateCard
          eyebrow="Profil ozeti"
          title="Henuz profil puani olusmadi"
          description="Puan geldikce profil ozeti burada dolacak."
          actionHref="/dashboard/puanlarim"
          actionLabel="Puanlarimi gor"
        />
      ) : null}

      {!isLoading && auth?.user ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-6 shadow-sm mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">
            Danger zone
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            Hesabimi sil
          </h2>
          <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
            <p>Bu islem geri alinamaz.</p>
            <p>Hesabina bagli arac, rota ve istek kayitlari kaldirilabilir.</p>
            <p>Aktif operasyonlar veya acik tekliflerin varsa silme engellenebilir.</p>
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
                Silme sonrasi oturumun kapatilacak. Aktif nakliye, anlasma veya acik
                teklif varsa islem bloklanir.
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
                  {isDeletingAccount ? "Hesap siliniyor..." : "Silmeyi onayla"}
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
