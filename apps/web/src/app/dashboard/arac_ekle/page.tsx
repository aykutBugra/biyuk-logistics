"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import InputField from "@/components/InputField";
import { ApiClientError } from "@/lib/api/api-client";
import { createVehicle, type CreateVehicleInput } from "@/lib/api/vehicles";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";

type CreateVehicleForm = {
  marka: string;
  model: string;
  plaka: string;
  yil: string;
  kapasite: string;
};

const initialForm: CreateVehicleForm = {
  marka: "",
  model: "",
  plaka: "",
  yil: "",
  kapasite: "",
};

export default function CreateVehiclePage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [form, setForm] = useState<CreateVehicleForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

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

    const payload: CreateVehicleInput = {
      marka: form.marka,
      model: form.model,
      plaka: form.plaka,
      yil: Number(form.yil),
      kapasite: Number(form.kapasite),
    };

    try {
      const response = await createVehicle(payload, accessToken);
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
        window.alert(error.message);
      } else {
        window.alert("Arac olusturulurken beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== "ready") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600 font-medium">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <CarrierVehiclesShell
      title="Yeni arac ekle"
      description="Bu ilk fazda yalnizca temel arac bilgileri kaydedilir. Kapasite alanini ton cinsinden gir."
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <InputField
            name="marka"
            label="Marka"
            placeholder="Orn: Ford"
            value={form.marka}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <InputField
            name="model"
            label="Model"
            placeholder="Orn: Transit"
            value={form.model}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <InputField
            name="plaka"
            label="Plaka"
            placeholder="Orn: 34 ABC 123"
            value={form.plaka}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <InputField
            name="yil"
            label="Yil"
            type="number"
            min="1900"
            max={`${new Date().getFullYear() + 1}`}
            placeholder="Orn: 2020"
            value={form.yil}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <InputField
            name="kapasite"
            label="Kapasite (ton)"
            type="number"
            min="0.01"
            max="1000"
            step="0.01"
            placeholder="Orn: 20"
            value={form.kapasite}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Plaka trim, uppercase ve bosluk sadeleştirme ile normalize edilir.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isSubmitting ? "Arac kaydediliyor..." : "Araci kaydet"}
          </button>
        </div>
      </form>
    </CarrierVehiclesShell>
  );
}
