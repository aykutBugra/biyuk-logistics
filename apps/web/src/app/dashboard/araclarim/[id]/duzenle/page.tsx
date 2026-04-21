"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import InputField from "@/components/InputField";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getVehicleDetail,
  updateVehicle,
  type UpdateVehicleInput,
} from "@/lib/api/vehicles";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import { VEHICLE_BODY_TYPE_OPTIONS } from "@/lib/logistics";

type UpdateVehicleForm = {
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

const initialForm: UpdateVehicleForm = {
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

export default function EditVehiclePage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const params = useParams<{ id: string }>();
  const vehicleId = Number(params.id);

  const [form, setForm] = useState<UpdateVehicleForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      setErrorMessage("Gecersiz arac numarasi.");
      setIsLoading(false);
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

    if (
      isSubmitting ||
      !accessToken ||
      !Number.isInteger(vehicleId) ||
      vehicleId <= 0
    ) {
      return;
    }

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
        window.alert(error.message);
      } else {
        window.alert("Arac guncellenirken beklenmeyen bir hata olustu.");
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
    <CarrierVehiclesShell title="Araci duzenle">
      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-600 shadow-sm">
          Arac bilgileri yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Kayit duzenlenemedi</h2>
          <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              name="marka"
              label="Marka"
              value={form.marka}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <InputField
              name="model"
              label="Model"
              value={form.model}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <InputField
              name="plaka"
              label="Plaka"
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
              {isSubmitting ? "Arac guncelleniyor..." : "Degisiklikleri kaydet"}
            </button>
          </div>
        </form>
      ) : null}
    </CarrierVehiclesShell>
  );
}
