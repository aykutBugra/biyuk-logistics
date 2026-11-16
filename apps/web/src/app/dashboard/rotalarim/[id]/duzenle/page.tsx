"use client";

import CompactDetailLayout from "@/components/CompactDetailLayout";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import InputField from "@/components/InputField";
import LocationAutocompleteField from "@/components/LocationAutocompleteField";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getCarrierRouteDetail,
  updateCarrierRoute,
  type UpdateCarrierRouteInput,
} from "@/lib/api/carrier-routes";
import type { SelectedLocation } from "@/lib/api/locations";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";

type UpdateCarrierRouteForm = {
  planlananTarih: string;
};

const initialForm: UpdateCarrierRouteForm = {
  planlananTarih: "",
};

function formatSelectedLocation(value: SelectedLocation | null): string {
  return value?.konumMetni?.trim() || value?.sehir || "Secilmedi";
}

// Duzenleme formu mevcut rota konumlarini ve tarih bilgisini ayni yuzeyde toplar.
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

// Nakliyeci kendi rota kaydini bu sayfadan gunceller.
export default function EditCarrierRoutePage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const params = useParams<{ id: string }>();
  const routeId = params.id;
  const [form, setForm] = useState<UpdateCarrierRouteForm>(initialForm);
  const [baslangicKonum, setBaslangicKonum] = useState<SelectedLocation | null>(
    null
  );
  const [varisKonum, setVarisKonum] = useState<SelectedLocation | null>(null);
  const [loadErrorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [locationValidationActive, setLocationValidationActive] = useState(false);
  const [isDataLoading, setIsLoading] = useState(true);
  const hasValidId = Boolean(routeId.trim());
  const isLoading = hasValidId && isDataLoading;
  const errorMessage = hasValidId ? loadErrorMessage : "Gecersiz rota numarasi.";
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Mevcut rota detaylari cekilip selected location state'lerine geri kurulur.
    if (status !== "ready" || !accessToken) {
      return;
    }

    if (!routeId.trim()) {
      return;
    }

    let isMounted = true;

    const loadRoute = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getCarrierRouteDetail(routeId, accessToken);

        if (!isMounted) {
          return;
        }

        setForm({
          planlananTarih: response.planlananTarih,
        });
        setBaslangicKonum({
          provider: response.baslangicProvider ?? "",
          placeId: response.baslangicPlaceId ?? "",
          konumMetni:
            response.baslangicKonumMetni ??
            response.normalizeBaslangicSehir ??
            response.baslangicSehri,
          sehir: response.normalizeBaslangicSehir ?? response.baslangicSehri,
          ilce: response.normalizeBaslangicIlce,
          lat: response.baslangicEnlem,
          lng: response.baslangicBoylam,
        });
        setVarisKonum({
          provider: response.varisProvider ?? "",
          placeId: response.varisPlaceId ?? "",
          konumMetni:
            response.varisKonumMetni ??
            response.normalizeVarisSehir ??
            response.varisSehri,
          sehir: response.normalizeVarisSehir ?? response.varisSehri,
          ilce: response.normalizeVarisIlce,
          lat: response.varisEnlem,
          lng: response.varisBoylam,
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
          setErrorMessage("Bu rota bulunamadi.");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Rota bilgileri yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadRoute();

    return () => {
      isMounted = false;
    };
  }, [accessToken, routeId, router, status]);

  // Tarih inputu degistikce submit hatasi temizlenir.
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setSubmitErrorMessage(null);
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  // Guncel konum secimleri ve tarih backend update endpoint'ine gonderilir.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      isSubmitting ||
      !accessToken ||
      !routeId.trim()
    ) {
      return;
    }

    if (!baslangicKonum || !varisKonum) {
      setLocationValidationActive(true);
      return;
    }

    setSubmitErrorMessage(null);
    setIsSubmitting(true);

    const payload: UpdateCarrierRouteInput = {
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
      const response = await updateCarrierRoute(routeId, payload, accessToken);
      router.replace(`/dashboard/rotalarim/${response.id}`);
    } catch (error) {
      // Yetki veya bulunamama durumunda kullanici uygun sayfaya geri alinir.
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
        router.replace("/dashboard/rotalarim");
        return;
      }

      if (error instanceof ApiClientError) {
        setSubmitErrorMessage(error.message);
      } else {
        setSubmitErrorMessage("Rota guncellenirken beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guard hazir degilken duzenleme formu yerine loading gosterilir.
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
      title="Rotayi duzenle"
      description="Mevcut rotanin ana guzergah bilgisini güncelle. Sapma limiti artik Açık Talepler ekraninda seçilir."
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
        <div data-compact-columns className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <form data-compact-panel
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

            <RouteFormPanel
              title="Guzergah"
              description="Baslangic ve varis konumunu guncelle."
            >
              <div data-dashboard-form-section className="grid gap-4 md:grid-cols-2">
                <LocationAutocompleteField
                  label="Baslangic konumu"
                  placeholder="Sefer baslangicini ara"
                  accessToken={accessToken ?? ""}
                  value={baslangicKonum}
                  onSelect={(value) => {
                    setBaslangicKonum(value);
                    setSubmitErrorMessage(null);
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
                    setSubmitErrorMessage(null);
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
                {isSubmitting ? "Rota guncelleniyor..." : "Degisiklikleri kaydet"}
              </button>
            </div>
          </form>

          <aside className="space-y-4">
            <section data-compact-panel className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-950">Mevcut ozet</h2>
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
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-700">
                  <i className="pi pi-exclamation-triangle text-sm" />
                </span>
                <p className="text-sm leading-6 text-slate-600">
                  Sapma limiti bu ekranda degistirilmez. Kesif akisi Açık Talepler
                  ekraninda mevcut rota uzerinden devam eder.
                </p>
              </div>
            </section>

            <div className="grid gap-2">
              <Link
                href={`/dashboard/rotalarim/${routeId}`}
                className="app-surface group flex items-center justify-between rounded-[1.05rem] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              >
                <span>Rota detayina don</span>
                <i className="pi pi-angle-right text-xs text-slate-400 group-hover:text-blue-500" />
              </Link>
              <Link
                href="/dashboard/rotalarim"
                className="app-surface group flex items-center justify-between rounded-[1.05rem] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              >
                <span>Rotalarima don</span>
                <i className="pi pi-angle-right text-xs text-slate-400 group-hover:text-blue-500" />
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </CarrierVehiclesShell>
</CompactDetailLayout>
  );
}
