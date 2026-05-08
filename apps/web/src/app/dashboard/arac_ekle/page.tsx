"use client";

import type { ChangeEvent, FormEvent } from "react";
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

export default function CreateVehiclePage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [form, setForm] = useState<VehicleFormState>(initialVehicleFormState);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  return (
    <CarrierVehiclesShell
      title="Yeni arac ekle"
      description="Arac bilgilerini girerek filonuza yeni bir kayit olusturun."
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
            <p className="text-sm font-semibold">Arac kaydedilemedi</p>
            <p className="mt-1 text-sm">{formErrorMessage}</p>
          </div>
        ) : null}

        <div data-dashboard-form-section>
          <VehicleFormFields values={form} onChange={handleChange} disabled={isSubmitting} />
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
    </CarrierVehiclesShell>
  );
}
