"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import VehicleFormFields from "@/components/VehicleFormFields";
import { ApiClientError, apiFetch } from "@/lib/api/api-client";
import { formatAccountError } from "@/lib/ui/terminology";
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

// Musteri hesabina nakliyeci rolunu ilk arac kaydi ile ekleyen onboarding sayfasi.
export default function CarrierRoleOnboardingPage() {
  const router = useRouter();
  const { accessToken, isAdmin, isCarrier, isCustomer, status } =
    useDashboardAccess("shared-account");
  const [form, setForm] = useState<VehicleFormState>(initialVehicleFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Zaten nakliyeci olan veya musteri olmayan kullanici bu akista kalmaz.
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

  // Ilk arac formu string state olarak tutulur.
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

  // Ilk arac basariyla olusunca auth profili guncellenir ve nakliyeci workspace'e gecilir.
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
        setErrorMessage(formatAccountError(error));
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Nakliye Paneli etkinleştirilirken beklenmeyen bir hata oluştu.");
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
      title="Nakliye Panelini etkinleştir"
      description="İlk aracınızı tanımlayın. Araç kaydı tamamlanınca aynı hesapla hem talep oluşturabilir hem nakliye hizmeti verebilirsiniz."
      headerActions={<InlineHelpTrigger helpKey="add-carrier-role" />}
      headerVariant="compact"
      motionPreset="form"
    >
      <form
        onSubmit={handleSubmit}
        data-dashboard-form-surface
        className="app-form-surface app-surface-strong space-y-6"
      >
        {errorMessage ? (
          <div
            data-dashboard-form-error
            className="app-form-error-banner"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        <div data-dashboard-form-section>
          <VehicleFormFields
            values={form}
            onChange={handleChange}
            disabled={isSubmitting}
            sectionTitle="İlk araç bilgileri"
            sectionHint="Araç başarıyla kaydedilmeden Nakliye Paneli etkinleşmez."
          />
        </div>

        <div
          data-dashboard-form-submit
          className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-slate-500">
            Bu adımı tamamlamazsanız Talep Paneli’ni kullanmaya devam edebilirsiniz.
            Kuruluma daha sonra Profil ekranından yeniden başlayabilirsiniz.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="app-button-primary app-form-submit-button app-pressable text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Nakliye Paneli etkinleştiriliyor…" : "Nakliye Panelini etkinleştir"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}
