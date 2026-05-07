"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import VehicleFormFields from "@/components/VehicleFormFields";
import { ApiClientError, apiFetch } from "@/lib/api/api-client";
import {
  clearStoredAuth,
  setStoredAuth,
  setStoredDashboardWorkspaceMode,
  type StoredAuth,
} from "@/lib/auth/auth-storage";
import { useDashboardAccess } from "@/lib/auth/use-dashboard-access";
import {
  initialVehicleFormState,
  toCreateVehicleInput,
  type VehicleFormState,
} from "@/lib/vehicles/vehicle-form";

export default function CarrierRoleOnboardingPage() {
  const router = useRouter();
  const { accessToken, isAdmin, isCarrier, isCustomer, status } =
    useDashboardAccess("shared-account");
  const [form, setForm] = useState<VehicleFormState>(initialVehicleFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    if (isCarrier) {
      router.replace("/dashboard/profil");
      return;
    }

    if (!isCustomer) {
      router.replace(isAdmin ? "/dashboard/admin" : "/");
    }
  }, [isAdmin, isCarrier, isCustomer, router, status]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setErrorMessage(null);
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || !accessToken) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await apiFetch<StoredAuth>("/auth/me/carrier-onboarding", {
        method: "POST",
        accessToken,
        body: JSON.stringify(toCreateVehicleInput(form)),
      });

      setStoredDashboardWorkspaceMode("carrier");
      setStoredAuth(response);
      router.replace("/dashboard");
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

      if (error instanceof ApiClientError) {
        if (error.message === "Vehicle plate is already in use.") {
          setErrorMessage("Bu plaka zaten aktif bir araca ait.");
        } else if (error.message === "Carrier onboarding is already complete.") {
          setErrorMessage("Nakliyeci rolun zaten aktif. Araclarini dashboard uzerinden yonetebilirsin.");
        } else {
          setErrorMessage(error.message);
        }
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nakliyeci rolu eklenirken beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== "ready" || isCarrier || !isCustomer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yonlendiriliyor...</p>
      </div>
    );
  }

  return (
    <DashboardShell
      title="Nakliyeci rolunu ekle"
      description="Ilk aracini tanimla. Arac basariyla kaydoldugunda hesabin musteri + nakliyeci olarak genisler."
      headerActions={<InlineHelpTrigger helpKey="add-carrier-role" />}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <VehicleFormFields
          values={form}
          onChange={handleChange}
          disabled={isSubmitting}
          sectionTitle="Ilk Arac Bilgisi"
          sectionHint="Arac basariyla olusmadan nakliyeci rolu verilmez."
        />

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Bu adim yarim kalirsa hesabin yalnizca musteri olarak kalir.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Nakliyeci rolu ekleniyor..." : "Nakliyeci rolunu ekle"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
