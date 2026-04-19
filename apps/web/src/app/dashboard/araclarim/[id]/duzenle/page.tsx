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

type UpdateVehicleForm = {
  marka: string;
  model: string;
  plaka: string;
  yil: string;
  kapasite: string;
};

const initialForm: UpdateVehicleForm = {
  marka: "",
  model: "",
  plaka: "",
  yil: "",
  kapasite: "",
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
          kapasite: String(response.kapasite),
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

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
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
      kapasite: Number(form.kapasite),
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600 font-medium">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <CarrierVehiclesShell
      title="Araci duzenle"
      description="Bu ekranda aracinin temel bilgilerini guncelleyebilirsin."
    >
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
              Degisiklikler kaydedildiginde mevcut arac detayi ekranina donulecek.
            </p>
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
