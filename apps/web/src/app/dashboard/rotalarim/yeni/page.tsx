"use client";

import CompactDetailLayout from "@/components/CompactDetailLayout";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import InputField from "@/components/InputField";
import LocationAutocompleteField from "@/components/LocationAutocompleteField";
import { ApiClientError } from "@/lib/api/api-client";
import {
  createCarrierRoute,
  type CreateCarrierRouteInput,
} from "@/lib/api/carrier-routes";
import type { SelectedLocation } from "@/lib/api/locations";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";

type CreateCarrierRouteForm = {
  planlananTarih: string;
};

const initialForm: CreateCarrierRouteForm = {
  planlananTarih: "",
};

function formatSelectedLocation(value: SelectedLocation | null): string {
  return value?.konumMetni?.trim() || value?.sehir || "Secilmedi";
}

// Rota formu iki konum alanini ve planlanan tarihi ortak panelde toplar.
function RouteFormPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
      <div className="mb-4">
        <h2 className="text-sm font-black text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

// Nakliyeci yeni calisma hattini bu sayfadan tanimlar.
export default function CreateCarrierRoutePage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [form, setForm] = useState<CreateCarrierRouteForm>(initialForm);
  const [baslangicKonum, setBaslangicKonum] = useState<SelectedLocation | null>(
    null
  );
  const [varisKonum, setVarisKonum] = useState<SelectedLocation | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [locationValidationActive, setLocationValidationActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Planlanan tarih gibi duz inputlar form state icinde tutulur.
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormErrorMessage(null);
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  // Secilen baslangic/varis konumlari backend rota create input'una cevrilir.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || !accessToken) {
      return;
    }

    if (!baslangicKonum || !varisKonum) {
      setLocationValidationActive(true);
      return;
    }

    setFormErrorMessage(null);
    setIsSubmitting(true);

    const payload: CreateCarrierRouteInput = {
      baslangicKonum: {
        provider: baslangicKonum.provider,
        placeId: baslangicKonum.placeId,
        sessionToken: baslangicKonum.sessionToken,
      },
      varisKonum: {
        provider: varisKonum.provider,
        placeId: varisKonum.placeId,
        sessionToken: varisKonum.sessionToken,
      },
      planlananTarih: form.planlananTarih,
    };

    try {
      const response = await createCarrierRoute(payload, accessToken);
      router.replace(`/dashboard/rotalarim/${response.id}`);
    } catch (error) {
      // Auth veya rol hatasinda rota formunda kalinmaz.
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
        setFormErrorMessage("Rota olusturulurken beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Carrier guard hazir olmadan rota formu render edilmez.
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
      title="Yeni rota tanimla"
      description="Planladigin ana hatti kaydet. Açık Talepler ekraninda bu rotayi secip sapma limitini ayrica belirleyeceksin."
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
              <p className="text-sm font-semibold">Rota kaydedilemedi</p>
              <p className="mt-1 text-sm">{formErrorMessage}</p>
            </div>
          ) : null}

          <RouteFormPanel
            title="Guzergah"
            description="Baslangic ve varis konumunu secerek ana hattin kimligini olustur."
          >
            <div data-dashboard-form-section className="grid gap-4 md:grid-cols-2">
              <LocationAutocompleteField
                label="Baslangic konumu"
                placeholder="Sefer baslangicini ara"
                accessToken={accessToken ?? ""}
                value={baslangicKonum}
                onSelect={(value) => {
                  setBaslangicKonum(value);
                  setFormErrorMessage(null);
                }}
                disabled={isSubmitting}
                invalid={locationValidationActive && !baslangicKonum}
                validationMessage={
                  locationValidationActive && !baslangicKonum
                    ? "Listeden bir baslangic konumu sec."
                    : null
                }
              />
              <LocationAutocompleteField
                label="Varis konumu"
                placeholder="Sefer varisini ara"
                accessToken={accessToken ?? ""}
                value={varisKonum}
                onSelect={(value) => {
                  setVarisKonum(value);
                  setFormErrorMessage(null);
                }}
                disabled={isSubmitting}
                invalid={locationValidationActive && !varisKonum}
                validationMessage={
                  locationValidationActive && !varisKonum
                    ? "Listeden bir varis konumu sec."
                    : null
                }
              />
            </div>
          </RouteFormPanel>

          <RouteFormPanel title="Planlama">
            <div data-dashboard-form-section className="grid gap-4 md:grid-cols-2">
              <InputField
                name="planlananTarih"
                label="Planlanan tarih"
                type="date"
                value={form.planlananTarih}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </RouteFormPanel>

          <div
            data-dashboard-form-submit
            className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <button
              type="submit"
              disabled={isSubmitting}
              className="app-button-primary app-form-submit-button app-pressable text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Rota kaydediliyor..." : "Rotayi kaydet"}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section data-compact-panel className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm">
            <h2 className="text-base font-black text-slate-950">Kayit ozeti</h2>
            <dl className="mt-4">
              <SummaryRow label="Baslangic" value={formatSelectedLocation(baslangicKonum)} />
              <SummaryRow label="Varis" value={formatSelectedLocation(varisKonum)} />
              <SummaryRow
                label="Planlanan tarih"
                value={form.planlananTarih || "Secilmedi"}
              />
            </dl>
          </section>

          <section className="app-surface rounded-[1.15rem] border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                <i className="pi pi-info-circle text-sm" />
              </span>
              <p className="text-sm leading-6 text-slate-600">
                Rota tanimi ve ana mesafe-sure snapshot'i kaydedilir. Sapma limiti
                Açık Talepler kesfinde rota secildikten sonra belirlenir.
              </p>
            </div>
          </section>

          <Link
            href="/dashboard/rotalarim"
            className="app-surface group flex items-center justify-between rounded-[1.05rem] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
          >
            <span>Rotalarima don</span>
            <i className="pi pi-angle-right text-xs text-slate-400 group-hover:text-blue-500" />
          </Link>
        </aside>
      </div>
    </CarrierVehiclesShell>
</CompactDetailLayout>
  );
}
