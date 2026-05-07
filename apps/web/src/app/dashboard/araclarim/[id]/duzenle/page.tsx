"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import VehicleFormFields from "@/components/VehicleFormFields";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getVehicleDetail,
  updateVehicle,
  type UpdateVehicleInput,
} from "@/lib/api/vehicles";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
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

export default function EditVehiclePage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const params = useParams<{ id: string }>();
  const vehicleId = Number(params.id);

  const [form, setForm] = useState<VehicleFormState>(emptyForm);
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  return (
    <CarrierVehiclesShell
      title="Araci duzenle"
      description="Arac bilgilerini guncelleyerek kaydet."
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          <h2 className="text-base font-bold text-red-800">Kayit duzenlenemedi</h2>
          <p className="mt-1">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <VehicleFormFields
            values={form}
            onChange={handleChange}
            disabled={isSubmitting}
          />

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Arac guncelleniyor..." : "Degisiklikleri kaydet"}
            </button>
          </div>
        </form>
      ) : null}
    </CarrierVehiclesShell>
  );
}
