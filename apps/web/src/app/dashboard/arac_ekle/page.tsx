"use client";

import CompactDetailLayout from "@/components/CompactDetailLayout";

import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import VehicleFormFields from "@/components/VehicleFormFields";
import { ApiClientError } from "@/lib/api/api-client";
import { createVehicle } from "@/lib/api/vehicles";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import {
  initialVehicleFormState,
  toCreateVehicleInput,
  type VehicleFormState,
} from "@/lib/vehicles/vehicle-form";
import { getVehicleBodyTypeLabel } from "@/lib/logistics";

function formatFormValue(value: string, suffix = ""): string {
  const trimmedValue = value.trim();
  return trimmedValue ? `${trimmedValue}${suffix}` : "Belirtilmedi";
}

// Girilen olcu alanlari tam degilse ozet kartinda eksik bilgi olarak gosterilir.
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

// Nakliyeci yeni arac kaydini bu sayfadan olusturur.
export default function CreateVehiclePage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [form, setForm] = useState<VehicleFormState>(initialVehicleFormState);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formdaki her alan VehicleFormState icinde string olarak tutulur.
  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setFormErrorMessage(null);
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  // Submit sirasinda string form state sayisal create input'a cevrilip backend'e gonderilir.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || !accessToken) {
      return;
    }

    setFormErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await createVehicle(toCreateVehicleInput(form), accessToken);
      router.replace(`/dashboard/araclarim/${response.id}`);
    } catch (error) {
      // Token veya rol hatasi formda kalmasin diye kullanici uygun sayfaya yonlendirilir.
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        window.alert("Oturum gecersiz. Lutfen yeniden giris yapin.");
        router.replace("/login");
        return;
      }

      if (error instanceof ApiClientError && error.status === 403) {
        window.alert("Bu sayfa yalnizca nakliyeci hesabi icin kullanilabilir.");
        router.replace("/");
        return;
      }

      if (error instanceof ApiClientError) {
        setFormErrorMessage(error.message);
      } else {
        setFormErrorMessage("Arac olusturulurken beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Carrier guard hazir olana kadar form yerine sade loading yuzeyi gosterilir.
  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  return (
    <CompactDetailLayout>
<CarrierVehiclesShell
      title="Yeni arac ekle"
      description="Arac bilgilerini girerek filonuza yeni bir kayit olusturun."
      headerVariant="compact"
      motionPreset="form"
    >
      <div data-compact-columns className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form data-compact-panel
          onSubmit={handleSubmit}
          data-dashboard-form-surface
          className="app-form-surface app-surface-strong space-y-5"
        >
          {formErrorMessage ? (
            <div data-dashboard-form-error className="app-form-error-banner" role="alert">
              <p className="text-sm font-semibold">Arac kaydedilemedi</p>
              <p className="mt-1 text-sm">{formErrorMessage}</p>
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
              {isSubmitting ? "Arac kaydediliyor..." : "Araci kaydet"}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section data-compact-panel className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm">
            <h2 className="text-base font-black text-slate-950">Kayit ozeti</h2>
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

          <section className="app-surface rounded-[1.15rem] border border-blue-200 bg-blue-50/60 p-4">
            <h2 className="text-sm font-black text-blue-950">Arac fotografi</h2>
            <p className="mt-2 text-sm leading-6 text-blue-900">
              Arac kaydi olustuktan sonra detay veya duzenleme ekranindan tek ana fotograf ekleyebilirsin.
            </p>
          </section>

          <Link
            href="/dashboard/araclarim"
            className="app-surface group flex items-center justify-between rounded-[1.05rem] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
          >
            <span>Araclarima don</span>
            <i className="pi pi-angle-right text-xs text-slate-400 group-hover:text-blue-500" />
          </Link>
        </aside>
      </div>
    </CarrierVehiclesShell>
</CompactDetailLayout>
  );
}
