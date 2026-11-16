"use client";

import Link from "next/link";
import { LinkButton } from "@/components/ui";
import { CarrierFeedback } from "@/features/carrier-workspace/shared";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import CarrierDashboardOverview from "@/components/CarrierDashboardOverview";
import CustomerDashboardOverview from "@/components/CustomerDashboardOverview";
import CustomerOverviewHero from "@/components/CustomerOverviewHero";
import DashboardIntroPanel from "@/components/DashboardIntroPanel";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import DashboardShell from "@/components/DashboardShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import { ApiClientError } from "@/lib/api/api-client";
import { dismissMyDashboardIntro } from "@/lib/api/auth";
import {
  clearStoredAuth,
  getPendingDashboardIntroRole,
  STORED_ROLE_NAMES,
  getStoredAuth,
  hasDualBusinessRoles,
  mergeStoredAuthUser,
  resolveStoredDashboardWorkspaceMode,
  setStoredDashboardWorkspaceMode,
  storedAuthHasRole,
  subscribeToAuthChanges,
  type StoredAuth,
} from "@/lib/auth/auth-storage";
import { useHomeData } from "@/lib/dashboard/use-home-data";

function getServerAuthSnapshot(): StoredAuth | null | undefined {
  return undefined;
}

// Dashboard ana girisi; kullanicinin rolune gore musteri, nakliyeci veya admin alanina yon verir.
export default function DashboardLandingPage() {
  const router = useRouter();
  const auth = useSyncExternalStore(
    subscribeToAuthChanges,
    getStoredAuth,
    getServerAuthSnapshot
  );

  const hasCustomerRole = storedAuthHasRole(auth ?? null, STORED_ROLE_NAMES.MUSTERI);
  const hasCarrierRole = storedAuthHasRole(auth ?? null, STORED_ROLE_NAMES.NAKLIYECI);
  const isAdmin = storedAuthHasRole(auth ?? null, STORED_ROLE_NAMES.ADMIN);
  const hasBusinessAccess = hasCustomerRole || hasCarrierRole;
  const dualRoleAccess = hasDualBusinessRoles(auth ?? null);
  const workspaceMode = resolveStoredDashboardWorkspaceMode(auth ?? null);
  const pendingIntroRole = getPendingDashboardIntroRole(auth ?? null, workspaceMode);
  const activeWorkspaceMode =
    workspaceMode ?? (hasCarrierRole && !hasCustomerRole ? "carrier" : "customer");

  const [isDismissingIntro, setIsDismissingIntro] = useState(false);
  const [introErrorMessage, setIntroErrorMessage] = useState<string | null>(null);

  const homeState = useHomeData({
    auth,
    hasCustomerRole,
    hasCarrierRole,
    hasBusinessAccess,
    pendingIntroRole,
  });

  useEffect(() => {
    // Auth ve rol bilgisi hazir olunca kullanicinin girebilecegi dashboard yuzeyi kontrol edilir.
    if (auth === undefined) return;

    if (!auth) {
      router.replace("/login");
      return;
    }

    if (!hasBusinessAccess && !isAdmin) {
      router.replace("/");
      return;
    }

    if (!hasBusinessAccess && isAdmin) {
      router.replace("/dashboard/admin");
    }
  }, [auth, hasBusinessAccess, isAdmin, router]);

  // Ilk kullanim paneli kapatilinca backend profil flag'i guncellenir ve ilgili workspace acilir.
  const handleDismissIntro = async (targetHref?: string) => {
    if (!auth?.accessToken || !pendingIntroRole || isDismissingIntro) return;

    setIsDismissingIntro(true);
    setIntroErrorMessage(null);

    try {
      const user = await dismissMyDashboardIntro(auth.accessToken, pendingIntroRole);
      mergeStoredAuthUser(user);
      setStoredDashboardWorkspaceMode(pendingIntroRole);

      if (targetHref) {
        router.replace(targetHref);
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        router.replace("/login");
        return;
      }

      if (error instanceof ApiClientError && error.status === 403) {
        router.replace("/");
        return;
      }

      setIntroErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Ilk kullanim rehberi kapatilirken beklenmeyen bir hata olustu."
      );
    } finally {
      setIsDismissingIntro(false);
    }
  };

  if (auth === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <DashboardPageSkeleton />
      </div>
    );
  }

  if (!auth || (!hasBusinessAccess && !isAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yonlendiriliyor...</p>
      </div>
    );
  }

  if (!hasBusinessAccess && isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Panel yukleniyor...</p>
      </div>
    );
  }

  const customerHome =
    homeState.customer && (!dualRoleAccess || activeWorkspaceMode === "customer")
      ? homeState.customer
      : null;
  const carrierHome =
    homeState.carrier && (!dualRoleAccess || activeWorkspaceMode === "carrier")
      ? homeState.carrier
      : null;
  const isCustomerOverview = Boolean(customerHome && activeWorkspaceMode === "customer");

  const pageTitle = "Genel Bakis";
  const pageDescription = isCustomerOverview
    ? "Tasima taleplerini, gelen teklifleri ve konusmalari tek merkezden yonetin."
    : "Rotalarina uygun yukleri, tekliflerini ve aktif tasima surecini tek yerden takip et.";

  const headerActions = !pendingIntroRole ? (
    isCustomerOverview ? (
      <div className="flex items-center gap-3">
        <InlineHelpTrigger helpKey="dashboard-home-customer" />
        <Link
          href="/dashboard/istek_ekle"
          className="app-button-primary inline-flex items-center gap-2"
        >
          <i className="pi pi-plus text-xs" />
          Yeni talep
        </Link>
      </div>
    ) : carrierHome ? (
      <div className="flex items-center gap-3">
        <InlineHelpTrigger helpKey="dashboard-home-carrier" />
        <LinkButton
          href="/dashboard/acik_istekler"
          variant="primary"
        >
          <i className="pi pi-search text-xs" />
          Yükleri keşfet
        </LinkButton>
      </div>
    ) : (
      <InlineHelpTrigger helpKey="dashboard-home" />
    )
  ) : null;

  return (
    <DashboardShell
      title={pendingIntroRole ? "Ilk kullanim rehberi" : pageTitle}
      description={
        pendingIntroRole
          ? "Bu alan yalnizca ilgili role ilk giriste gorunur."
          : pageDescription
      }
      workspaceHint={workspaceMode ?? undefined}
      headerActions={headerActions}
      headerVariant="compact"
      visualTheme={!pendingIntroRole ? activeWorkspaceMode === "customer" ? "customer-overview" : "petrol" : undefined}
      unreadNotificationCount={customerHome?.unreadNotificationCount ?? carrierHome?.unreadNotificationCount}
      pageHeader={!pendingIntroRole ? <CustomerOverviewHero workspace={activeWorkspaceMode === "carrier" ? "carrier" : "customer"} /> : undefined}
    >
      {pendingIntroRole ? (
        <DashboardIntroPanel
          role={pendingIntroRole}
          isSubmitting={isDismissingIntro}
          errorMessage={introErrorMessage}
          onContinue={() => void handleDismissIntro()}
          onShortcut={() =>
            void handleDismissIntro(
              pendingIntroRole === "carrier"
                ? "/dashboard/acik_istekler"
                : "/dashboard/isteklerim"
            )
          }
        />
      ) : null}

      {!pendingIntroRole ? (
        <>
          {homeState.isLoading ? activeWorkspaceMode === "carrier" ? <CarrierFeedback isLoading errorMessage={null} label="Operasyon özeti yükleniyor…" /> : <DashboardPageSkeleton /> : null}

          {!homeState.isLoading && homeState.errorMessage ? (
            activeWorkspaceMode === "carrier" ? <CarrierFeedback isLoading={false} errorMessage={homeState.errorMessage} label="Operasyon özeti" /> :
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {homeState.errorMessage}
            </div>
          ) : null}

          {!homeState.isLoading && !homeState.errorMessage ? (
            <div className="space-y-4">
              {isCustomerOverview && customerHome ? (
                <CustomerDashboardOverview home={customerHome} />
              ) : null}

              {activeWorkspaceMode === "carrier" && carrierHome ? (
                <>
                  <CarrierDashboardOverview home={carrierHome} />

                  {isAdmin ? (
                    <div className="app-surface rounded-[1.5rem] p-4 md:p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Yonetim erisimi
                      </p>
                      <h2 className="mt-2 text-base font-black tracking-tight text-slate-950 md:text-lg">
                        Yonetim alani da acik
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        Genel bakistan cikmadan yonetim tarafina gecip kullanici
                        gorunurlugunu de acabilirsin.
                      </p>
                      <Link
                        href="/dashboard/admin"
                        className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Yonetim alanina git
                      </Link>
                    </div>
                  ) : null}
                </>
              ) : null}

              {!homeState.customer && !homeState.carrier ? (
                <EmptyStateCard
                  title="Gosterilecek icerik yok"
                  description="Rolune uygun operasyon verileri hazir oldugunda burada gorunecek."
                />
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </DashboardShell>
  );
}
