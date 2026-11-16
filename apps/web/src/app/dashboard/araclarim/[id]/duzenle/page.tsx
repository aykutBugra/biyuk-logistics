"use client";

import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import VehicleFormFields from "@/components/VehicleFormFields";
import VehicleImageUploader from "@/components/VehicleImageUploader";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getVehicleDetail,
  updateVehicle,
  type VehicleDetail,
  type UpdateVehicleInput,
} from "@/lib/api/vehicles";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import { getVehicleBodyTypeLabel } from "@/lib/logistics";
import { type VehicleFormState } from "@/lib/vehicles/vehicle-form";

const emptyForm: VehicleFormState = {
  marka: "",
  model: "",
  plaka: "",
  yil: "",
  maksimumAgirlikKg: "",
  maksimumHacimM3: "",
  kasaTipi: "DIGER",
  uzunlukCm: "",
  genislikCm: "",
  yukseklikCm: "",
};

function formatFormValue(value: string, suffix = ""): string {
  const trimmedValue = value.trim();
  return trimmedValue ? `${trimmedValue}${suffix}` : "Belirtilmedi";
}

// Olcu uc alan tamamlanmadan yukleme alani ozetlenmez.
function formatFormDimensions(values: VehicleFormState): string {
  if (!values.uzunlukCm || !values.genislikCm || !values.yukseklikCm) {
    return "Belirtilmedi";
  }

  return `${values.uzunlukCm} x ${values.genislikCm} x ${values.yukseklikCm} cm`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

// Nakliyeci kendi arac kaydini ve fotografini bu sayfadan gunceller.
export default function EditVehiclePage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const params = useParams<{ id: string }>();
  const vehicleId = params.id;

  const [form, setForm] = useState<VehicleFormState>(emptyForm);
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loadErrorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [isDataLoading, setIsLoading] = useState(true);
  const hasValidId = Boolean(vehicleId.trim());
  const isLoading = hasValidId && isDataLoading;
  const errorMessage = hasValidId ? loadErrorMessage : "Gecersiz arac numarasi.";
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Duzenleme icin once mevcut arac detayi cekilip form state'e aktarilir.
    if (status !== "ready" || !accessToken) {
      return;
    }

    if (!vehicleId.trim()) {
      return;
    }

    let isMounted = true;

    const loadVehicle = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getVehicleDetail(vehicleId, accessToken);

        if (!isMounted) {
          return;
        }

        setVehicle(response);
        setForm({
          marka: response.marka,
          model: response.model,
          plaka: response.plaka,
          yil: String(response.yil),
          maksimumAgirlikKg: String(response.maksimumAgirlikKg),
          maksimumHacimM3: String(response.maksimumHacimM3 ?? ""),
          kasaTipi: response.kasaTipi ?? "DIGER",
          uzunlukCm: String(response.uzunlukCm ?? ""),
          genislikCm: String(response.genislikCm ?? ""),
          yukseklikCm: String(response.yukseklikCm ?? ""),
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        if (error instanceof ApiClientError && error.status === 403) {
          router.replace("/");
          return;
        }

        if (error instanceof ApiClientError && error.status === 404) {
          setErrorMessage("Bu arac bulunamadi.");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Arac bilgileri yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadVehicle();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status, vehicleId]);

  // Form alanlari string olarak tutulur; submitte API input'a cevrilir.
  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setSubmitErrorMessage(null);
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  // Kaydetme sirasinda arac bilgileri guncellenir, sonra kullanici detay sayfasina doner.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      isSubmitting ||
      !accessToken ||
      !vehicleId.trim()
    ) {
      return;
    }

    setSubmitErrorMessage(null);
    setIsSubmitting(true);

    const payload: UpdateVehicleInput = {
      marka: form.marka,
      model: form.model,
      plaka: form.plaka,
      yil: Number(form.yil),
      maksimumAgirlikKg: Number(form.maksimumAgirlikKg),
      maksimumHacimM3: Number(form.maksimumHacimM3),
      kasaTipi: form.kasaTipi,
      uzunlukCm: form.uzunlukCm ? Number(form.uzunlukCm) : undefined,
      genislikCm: form.genislikCm ? Number(form.genislikCm) : undefined,
      yukseklikCm: form.yukseklikCm ? Number(form.yukseklikCm) : undefined,
    };

    try {
      const response = await updateVehicle(vehicleId, payload, accessToken);
      router.replace(`/dashboard/araclarim/${response.id}`);
    } catch (error) {
      // Token/rol hatasinda kullanici duzenleme ekraninda kalmaz.
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        window.alert("Oturum gecersiz. Lutfen yeniden giris yapin.");
        router.replace("/login");
        return;
      }

      if (error instanceof ApiClientError && error.status === 403) {
        window.alert("Bu islem icin yetkin yok.");
        router.replace("/");
        return;
      }

      if (error instanceof ApiClientError && error.status === 404) {
        window.alert(error.message);
        router.replace("/dashboard/araclarim");
        return;
      }

      if (error instanceof ApiClientError) {
        setSubmitErrorMessage(error.message);
      } else {
        setSubmitErrorMessage("Arac guncellenirken beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  return (
    <CarrierVehiclesShell
      title="Araci duzenle"
      description="Arac bilgilerini guncelleyerek kaydet."
      headerVariant="compact"
      motionPreset="form"
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          <h2 className="text-base font-bold text-red-800">Kayit duzenlenemedi</h2>
          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <form
            onSubmit={handleSubmit}
            data-dashboard-form-surface
            className="app-form-surface app-surface-strong space-y-5"
          >
            {submitErrorMessage ? (
              <div data-dashboard-form-error className="app-form-error-banner" role="alert">
                <p className="text-sm font-semibold">Degisiklikler kaydedilemedi</p>
                <p className="mt-1 text-sm">{submitErrorMessage}</p>
              </div>
            ) : null}

            <div data-dashboard-form-section>
              <VehicleFormFields
                values={form}
                onChange={handleChange}
                disabled={isSubmitting}
                layoutVariant="operational"
              />
            </div>

            <div
              data-dashboard-form-submit
              className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <button
                type="submit"
                disabled={isSubmitting}
                className="app-button-primary app-form-submit-button app-pressable text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Arac guncelleniyor..." : "Degisiklikleri kaydet"}
              </button>
            </div>
          </form>

          <aside className="space-y-4">
            <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-950">Mevcut ozet</h2>
              <dl className="mt-4">
                <SummaryRow label="Plaka" value={formatFormValue(form.plaka)} />
                <SummaryRow
                  label="Marka / model"
                  value={`${formatFormValue(form.marka)} / ${formatFormValue(form.model)}`}
                />
                <SummaryRow label="Kasa tipi" value={getVehicleBodyTypeLabel(form.kasaTipi)} />
                <SummaryRow label="Yil" value={formatFormValue(form.yil)} />
              </dl>
            </section>

            {vehicle && accessToken ? (
              <VehicleImageUploader
                accessToken={accessToken}
                vehicle={vehicle}
                onVehicleChange={setVehicle}
              />
            ) : null}

            <section className="app-surface rounded-[1.15rem] border border-slate-200 p-4">
              <h2 className="text-sm font-black text-slate-950">Nakliye Bilgileri</h2>
              <dl className="mt-3">
                <SummaryRow
                  label="Maks. agirlik"
                  value={formatFormValue(form.maksimumAgirlikKg, " kg")}
                />
                <SummaryRow
                  label="Maks. hacim"
                  value={formatFormValue(form.maksimumHacimM3, " m3")}
                />
                <SummaryRow label="Yukleme alani" value={formatFormDimensions(form)} />
              </dl>
            </section>

            <div className="grid gap-2">
              <Link
                href={`/dashboard/araclarim/${vehicleId}`}
                className="app-surface group flex items-center justify-between rounded-[1.05rem] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              >
                <span>Arac detayina don</span>
                <i className="pi pi-angle-right text-xs text-slate-400 group-hover:text-blue-500" />
              </Link>
              <Link
                href="/dashboard/araclarim"
                className="app-surface group flex items-center justify-between rounded-[1.05rem] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              >
                <span>Araclarima don</span>
                <i className="pi pi-angle-right text-xs text-slate-400 group-hover:text-blue-500" />
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
