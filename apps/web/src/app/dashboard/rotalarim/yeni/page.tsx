"use client";

import type { ChangeEvent, FormEvent } from "react";
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
  maksimumSapmaKm: string;
};

const initialForm: CreateCarrierRouteForm = {
  planlananTarih: "",
  maksimumSapmaKm: "",
};

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

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormErrorMessage(null);
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
      maksimumSapmaKm: form.maksimumSapmaKm
        ? Number(form.maksimumSapmaKm)
        : undefined,
    };

    try {
      const response = await createCarrierRoute(payload, accessToken);
      router.replace(`/dashboard/rotalarim/${response.id}`);
    } catch (error) {
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

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  return (
    <CarrierVehiclesShell
      title="Yeni rota tanimla"
      description="Planladigin ana hatti kaydet. Bu adim mevcut discovery'yi degistirmez, sonraki route-aware faz icin veri uretir."
      headerVariant="compact"
      motionPreset="form"
    >
      <form
        onSubmit={handleSubmit}
        data-dashboard-form-surface
        className="app-form-surface app-surface-strong space-y-6"
      >
        {formErrorMessage ? (
          <div data-dashboard-form-error className="app-form-error-banner" role="alert">
            <p className="text-sm font-semibold">Rota kaydedilemedi</p>
            <p className="mt-1 text-sm">{formErrorMessage}</p>
          </div>
        ) : null}

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

        <div data-dashboard-form-section className="grid gap-4 md:grid-cols-2">
          <InputField
            name="planlananTarih"
            label="Planlanan tarih"
            type="date"
            value={form.planlananTarih}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <InputField
            name="maksimumSapmaKm"
            label="Maksimum sapma (km)"
            type="number"
            min="0"
            step="0.01"
            value={form.maksimumSapmaKm}
            onChange={handleChange}
            disabled={isSubmitting}
            required={false}
            placeholder="Opsiyonel"
          />
        </div>

        <div
          data-dashboard-form-section
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        >
          Sistem bu adimda sadece rota tanimini ve ana rota mesafe/sure snapshot'ini
          saklar. Extra km, extra sure ve route-aware skor daha sonraki fazda
          acilacak.
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
            {isSubmitting ? "Rota kaydediliyor..." : "Rotayi kaydet"}
          </button>
        </div>
      </form>
    </CarrierVehiclesShell>
  );
}
