"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import { getUsers, type UserProfile } from "@/lib/api/users";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useDashboardAccess } from "@/lib/auth/use-dashboard-access";
import { WORKSPACE_LABELS } from "@/lib/ui/terminology";

function roleLabel(role: string): string {
  switch (role) {
    case "MUSTERI":
      return WORKSPACE_LABELS.customer;
    case "NAKLIYECI":
      return WORKSPACE_LABELS.carrier;
    case "ADMIN":
      return "Admin";
    default:
      return role;
  }
}

// Admin kullanici listesi; rolleri ve hesap tiplerini tek tabloda gosterir.
export default function AdminUsersPage() {
  const { accessToken, status } = useDashboardAccess("admin");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Admin yetkisi dogrulanmadan liste endpoint'i cagrilmaz.
    if (status !== "ready" || !accessToken) {
      return;
    }

    let isMounted = true;

    const loadUsers = async () => {
      try {
        // Tum kullanici profilleri admin token'i ile backend'den alinir.
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getUsers(accessToken);

        if (!isMounted) {
          return;
        }

        setUsers(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        // Token/rol problemi varsa admin sayfasinda kalmak yerine uygun cikis yapilir.
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
            : "Kullanici listesi yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, [accessToken, status]);

  const dualRoleCount = users.filter((user) => user.businessRoles.length === 2).length;

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="font-medium text-slate-600">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <DashboardShell
      title="Kullanicilar"
      description="Admin ilk fazinda kullanici rol dagilimini ve hesap tiplerini operasyonel gorunurluk icin inceleyebilirsin."
    >
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Kullanici listesi yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <SummaryStatCard label="Toplam kullanici" value={users.length} />
          <SummaryStatCard label="Dual-role" value={dualRoleCount} />
          <SummaryStatCard
            label="Admin"
            value={users.filter((user) => user.isAdmin).length}
          />
        </div>
      ) : null}

      {!isLoading && !errorMessage && users.length === 0 ? (
        <EmptyStateCard
          eyebrow="Yonetim"
          title="Gosterilecek kullanici yok"
          description="Aktif kullanici hesaplari olustukca bu liste dolacak."
        />
      ) : null}

      {!isLoading && !errorMessage && users.length > 0 ? (
        <div className="grid gap-4">
          {users.map((user) => (
            <article
              key={user.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      {user.ad} {user.soyad}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">@{user.kullaniciAdi}</p>
                    <p className="mt-1 text-sm text-slate-500">{user.mail}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {user.roles.map((role) => (
                      <span
                        key={`${user.id}-${role}`}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {roleLabel(role)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p>Telefon: {user.telefonNumarasi ?? "-"}</p>
                  <p className="mt-2">
                    Business role:{" "}
                    {user.businessRoles.length > 0
                      ? user.businessRoles.map(roleLabel).join(", ")
                      : "-"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </DashboardShell>
  );
}
