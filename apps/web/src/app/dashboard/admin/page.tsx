"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import { getUsers } from "@/lib/api/users";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useDashboardAccess } from "@/lib/auth/use-dashboard-access";

type AdminOverviewState = {
  totalUsers: number;
  dualRoleUsers: number;
  adminUsers: number;
};

export default function AdminDashboardPage() {
  const { accessToken, auth, status } = useDashboardAccess("admin");
  const [overview, setOverview] = useState<AdminOverviewState | null>(null);
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

    const loadOverview = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const users = await getUsers(accessToken);

        if (!isMounted) {
          return;
        }

        setOverview({
          totalUsers: users.length,
          dualRoleUsers: users.filter((user) => user.businessRoles.length === 2).length,
          adminUsers: users.filter((user) => user.isAdmin).length,
        });
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
            : "Admin genel bakis yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadOverview();

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

  return (
    <DashboardShell
      title="Admin Genel Bakis"
      description="Ilk faz yonetim yuzeyi, kontrollu kullanici gorunurlugu ve temel operasyonel giris noktalarina odaklanir."
    >
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Admin genel bakis yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && overview ? (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <SummaryStatCard label="Toplam kullanici" value={overview.totalUsers} />
          <SummaryStatCard label="Dual-role kullanici" value={overview.dualRoleUsers} />
          <SummaryStatCard label="Admin kullanici" value={overview.adminUsers} />
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Link
            href="/dashboard/admin/kullanicilar"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
              Yonetim
            </p>
            <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">
              Kullanici gorunurlugu
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Rol dagilimini, dual-role kullanimini ve admin atanmis hesaplari incele.
            </p>
          </Link>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Oturum
            </p>
            <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950">
              {auth?.user?.ad} {auth?.user?.soyad}
            </h2>
            <p className="mt-2 text-sm text-slate-600">@{auth?.user?.kullaniciAdi}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Bu yuzey ilk fazda yalniz temel operasyonel okuma ve yonetim girislerini
              sunar; tam backoffice davranisi bu turun kapsamina alinmadi.
            </p>
          </div>
        </div>
      ) : null}

      {!isLoading && !errorMessage && !overview ? (
        <EmptyStateCard
          eyebrow="Yonetim"
          title="Admin verisi hazir degil"
          description="Kullanici yuzeyi tekrar denendiginde burada temel operasyonel ozetler gosterilecek."
        />
      ) : null}
    </DashboardShell>
  );
}
