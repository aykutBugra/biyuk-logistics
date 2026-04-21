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
import { VEHICLE_BODY_TYPE_OPTIONS } from "@/lib/logistics";

type CreateVehicleForm = {
  marka: string;
  model: string;
  plaka: string;
  yil: string;
  maksimumAgirlikKg: string;
  maksimumHacimM3: string;
  kasaTipi: string;
  uzunlukCm: string;
  genislikCm: string;
  yukseklikCm: string;
};

const initialForm: CreateVehicleForm = {
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

export default function CreateVehiclePage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [form, setForm] = useState<CreateVehicleForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
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
      maksimumAgirlikKg: Number(form.maksimumAgirlikKg),
      maksimumHacimM3: Number(form.maksimumHacimM3),
      kasaTipi: form.kasaTipi,
      uzunlukCm: form.uzunlukCm ? Number(form.uzunlukCm) : undefined,
      genislikCm: form.genislikCm ? Number(form.genislikCm) : undefined,
      yukseklikCm: form.yukseklikCm ? Number(form.yukseklikCm) : undefined,
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="font-medium text-gray-600">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <CarrierVehiclesShell title="Yeni arac ekle">
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
            value={form.yil}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <InputField
            name="maksimumAgirlikKg"
            label="Maksimum agirlik (kg)"
            type="number"
            min="0.01"
            step="0.01"
            value={form.maksimumAgirlikKg}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <InputField
            name="maksimumHacimM3"
            label="Maksimum hacim (m3)"
            type="number"
            min="0.01"
            step="0.01"
            value={form.maksimumHacimM3}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="kasaTipi">
              Kasa tipi
            </label>
            <select
              id="kasaTipi"
              name="kasaTipi"
              value={form.kasaTipi}
              onChange={handleChange}
              disabled={isSubmitting}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
            >
              {VEHICLE_BODY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <InputField
            name="uzunlukCm"
            label="Uzunluk (cm)"
            type="number"
            min="1"
            value={form.uzunlukCm}
            onChange={handleChange}
            disabled={isSubmitting}
            required={false}
          />
          <InputField
            name="genislikCm"
            label="Genislik (cm)"
            type="number"
            min="1"
            value={form.genislikCm}
            onChange={handleChange}
            disabled={isSubmitting}
            required={false}
          />
          <InputField
            name="yukseklikCm"
            label="Yukseklik (cm)"
            type="number"
            min="1"
            value={form.yukseklikCm}
            onChange={handleChange}
            disabled={isSubmitting}
            required={false}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
