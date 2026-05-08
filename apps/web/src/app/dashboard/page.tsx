"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import DashboardActionCard from "@/components/DashboardActionCard";
import DashboardHomeSection from "@/components/DashboardHomeSection";
import DashboardIntroPanel from "@/components/DashboardIntroPanel";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import DashboardSegmentedWorkspaceView from "@/components/DashboardSegmentedWorkspaceView";
import DashboardShell from "@/components/DashboardShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import SummaryStatCard from "@/components/SummaryStatCard";
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

  const handleDismissIntro = async (targetHref?: string) => {
    if (!auth?.accessToken || !pendingIntroRole || isDismissingIntro) return;

    setIsDismissingIntro(true);
    setIntroErrorMessage(null);

    try {
      const user = await dismissMyDashboardIntro(auth.accessToken, pendingIntroRole);
      mergeStoredAuthUser(user);
      setStoredDashboardWorkspaceMode(pendingIntroRole);
      if (targetHref) router.replace(targetHref);
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
          : "İlk kullanım rehberi kapatılırken beklenmeyen bir hata oluştu."
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
        <p className="font-medium text-slate-500">Yönlendiriliyor...</p>
      </div>
    );
  }

  if (!hasBusinessAccess && isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Panel yükleniyor...</p>
      </div>
    );
  }

  const pageTitle = "Genel Bakış";
  const pageDescription = dualRoleAccess
    ? "Ortak alanları sabit tut, aktif iş tarafını tek seçimle değiştir."
    : hasCarrierRole
      ? "Teklif ve operasyon akışını buradan yönet."
      : "Taleplerini ve gelen teklifleri buradan yönet.";
  const customerHome =
    homeState.customer && (!dualRoleAccess || activeWorkspaceMode === "customer")
      ? homeState.customer
      : null;
  const carrierHome =
    homeState.carrier && (!dualRoleAccess || activeWorkspaceMode === "carrier")
      ? homeState.carrier
      : null;
  const quickMenuActions =
    activeWorkspaceMode === "carrier"
      ? [
          { href: "/dashboard/acik_istekler", title: "Açık İstekler" },
          { href: "/dashboard/tekliflerim", title: "Tekliflerim" },
          { href: "/dashboard/nakliyelerim", title: "Nakliyelerim" },
          { href: "/dashboard/rotalarim", title: "Rotalarım" },
          { href: "/dashboard/araclarim", title: "Araçlarım" },
        ]
      : [
          { href: "/dashboard/isteklerim", title: "İsteklerim" },
          { href: "/dashboard/gelen_teklifler", title: "Gelen Teklifler" },
          { href: "/dashboard/bildirimler", title: "Bildirimler" },
        ];
  const sharedShortcutActions = homeState.shared
    ? [
        ...(activeWorkspaceMode === "carrier"
          ? [
              {
                href: "/dashboard/konusmalar",
                title: "Konuşmalar",
                meta:
                  homeState.shared.unreadConversationCount > 0
                    ? `${homeState.shared.unreadConversationCount}`
                    : undefined,
              },
            ]
          : []),
        ...(activeWorkspaceMode === "carrier"
          ? [
              {
                href: "/dashboard/bildirimler",
                title: "Bildirimler",
                meta:
                  homeState.shared.unreadNotificationCount > 0
                    ? `${homeState.shared.unreadNotificationCount}`
                    : undefined,
              },
            ]
          : []),
        {
          href: "/dashboard/profil",
          title: "Profil",
        },
        {
          href: "/dashboard/puanlarim",
          title: "Puanlarım",
        },
      ]
    : [];

  return (
    <DashboardShell
      title={pendingIntroRole ? "İlk kullanım rehberi" : pageTitle}
      description={
        pendingIntroRole
          ? "Bu alan yalnızca ilgili role ilk girişte görünür."
          : pageDescription
      }
      workspaceHint={workspaceMode ?? undefined}
      headerActions={!pendingIntroRole ? <InlineHelpTrigger helpKey="dashboard-home" /> : null}
      headerVariant="compact"
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
          {homeState.isLoading ? <DashboardPageSkeleton /> : null}

          {!homeState.isLoading && homeState.errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {homeState.errorMessage}
            </div>
          ) : null}

          {!homeState.isLoading && !homeState.errorMessage ? (
            <div className="space-y-4">
              <DashboardHomeSection
                title="Hızlı Menü"
                headerActions={
                  dualRoleAccess ? (
                    <DashboardSegmentedWorkspaceView
                      value={activeWorkspaceMode}
                      onChange={(mode) => {
                        if (mode !== activeWorkspaceMode) {
                          setStoredDashboardWorkspaceMode(mode);
                        }
                      }}
                    />
                  ) : null
                }
              >
                <div
                  className={`grid gap-3 ${
                    activeWorkspaceMode === "carrier"
                      ? "sm:grid-cols-2 xl:grid-cols-5"
                      : "sm:grid-cols-2 xl:grid-cols-3"
                  }`}
                >
                  {quickMenuActions.map((action) => (
                    <DashboardActionCard
                      key={action.href}
                      href={action.href}
                      title={action.title}
                      variant="shortcut"
                    />
                  ))}
                </div>
              </DashboardHomeSection>

              {customerHome ? (
                <DashboardHomeSection
                  eyebrow="Müşteri alanı"
                  title="Talep ve teklifler"
                  helpKey="dashboard-home-customer"
                  density="compact"
                >
                  <div className="grid gap-3 md:grid-cols-3">
                    <SummaryStatCard
                      label="İsteklerim"
                      value={customerHome.requestCount}
                      density="tight"
                    />
                    <SummaryStatCard
                      label="Gelen teklifler"
                      value={customerHome.incomingOfferCount}
                      density="tight"
                    />
                    <SummaryStatCard
                      label="Bildirimler"
                      value={customerHome.unreadNotificationCount}
                      density="tight"
                    />
                  </div>
                </DashboardHomeSection>
              ) : null}

              {carrierHome ? (
                <DashboardHomeSection
                  eyebrow="Nakliyeci alanı"
                  title="Keşif ve operasyon"
                  helpKey="dashboard-home-carrier"
                  density="compact"
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <SummaryStatCard
                      label="Tekliflerim"
                      value={carrierHome.offerCount}
                      hint={`${carrierHome.openOfferCount} açık teklif`}
                      density="tight"
                    />
                    <SummaryStatCard
                      label="Nakliyelerim"
                      value={carrierHome.shipmentCount}
                      hint={`${carrierHome.activeShipmentCount} aktif iş`}
                      density="tight"
                    />
                    <SummaryStatCard
                      label="Rotalarım"
                      value={carrierHome.routeCount}
                      density="tight"
                    />
                    <SummaryStatCard
                      label="Araçlarım"
                      value={carrierHome.vehicleCount}
                      density="tight"
                    />
                    <SummaryStatCard
                      label="Okunmamış konuşma"
                      value={carrierHome.unreadConversationCount}
                      density="tight"
                    />
                    <SummaryStatCard
                      label="Okunmamış bildirim"
                      value={carrierHome.unreadNotificationCount}
                      density="tight"
                    />
                  </div>

                  {carrierHome.routeCount === 0 || carrierHome.vehicleCount === 0 ? (
                    <div className="rounded-[1.45rem] border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            Hazırlık durumu
                          </p>
                          <h3 className="text-base font-black tracking-tight text-slate-950 md:text-lg">
                            Operasyon hazırlığı tamamlanmadı
                          </h3>
                          <p className="max-w-2xl text-sm leading-6 text-slate-500">
                            Rota ve araç tanımları tamamlandıkça görünürlüğün ve teklif kaliten artar.
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-3">
                          {carrierHome.routeCount === 0 ? (
                            <Link
                              href="/dashboard/rotalarim/yeni"
                              className="inline-flex items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                            >
                              İlk rotamı ekle
                            </Link>
                          ) : null}
                          {carrierHome.vehicleCount === 0 ? (
                            <Link
                              href="/dashboard/arac_ekle"
                              className="inline-flex items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                            >
                              İlk aracımı ekle
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DashboardHomeSection>
              ) : null}

              {sharedShortcutActions.length ? (
                <DashboardHomeSection title="Diğer" helpKey="dashboard-home-shared">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {sharedShortcutActions.map((action) => (
                      <DashboardActionCard
                        key={action.href}
                        href={action.href}
                        title={action.title}
                        meta={action.meta}
                        variant="quiet"
                      />
                    ))}
                  </div>
                </DashboardHomeSection>
              ) : null}

              {isAdmin ? (
                <div className="app-surface rounded-[1.5rem] p-4 md:p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Yönetim erişimi
                  </p>
                  <h2 className="mt-2 text-base font-black tracking-tight text-slate-950 md:text-lg">
                    Yönetim alanın da açık
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Genel bakıştan çıkmadan yönetim tarafına geçip kullanıcı görünürlüğünü de açabilirsin.
                  </p>
                  <Link
                    href="/dashboard/admin"
                    className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Yönetim alanına git
                  </Link>
                </div>
              ) : null}

              {!homeState.customer && !homeState.carrier ? (
                <EmptyStateCard
                  title="Gösterilecek içerik yok"
                  description="Rolüne uygun operasyon verileri hazır olduğunda burada görünecek."
                />
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </DashboardShell>
  );
}
