"use client";

import type { ChangeEvent, FormEvent } from "react";
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
  maksimumSapmaKm: string;
};

const initialForm: UpdateCarrierRouteForm = {
  planlananTarih: "",
  maksimumSapmaKm: "",
};

export default function EditCarrierRoutePage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const params = useParams<{ id: string }>();
  const routeId = Number(params.id);
  const [form, setForm] = useState<UpdateCarrierRouteForm>(initialForm);
  const [baslangicKonum, setBaslangicKonum] = useState<SelectedLocation | null>(
    null
  );
  const [varisKonum, setVarisKonum] = useState<SelectedLocation | null>(null);
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

    if (!Number.isInteger(routeId) || routeId <= 0) {
      setErrorMessage("Gecersiz rota numarasi.");
      setIsLoading(false);
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
          maksimumSapmaKm:
            response.maksimumSapmaKm === null
              ? ""
              : String(response.maksimumSapmaKm),
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
      !Number.isInteger(routeId) ||
      routeId <= 0
    ) {
      return;
    }

    if (!baslangicKonum || !varisKonum) {
      window.alert("Baslangic ve varis konumunu listeden secmelisin.");
      return;
    }

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
      maksimumSapmaKm: form.maksimumSapmaKm
        ? Number(form.maksimumSapmaKm)
        : undefined,
    };

    try {
      const response = await updateCarrierRoute(routeId, payload, accessToken);
      router.replace(`/dashboard/rotalarim/${response.id}`);
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
        router.replace("/dashboard/rotalarim");
        return;
      }

      if (error instanceof ApiClientError) {
        window.alert(error.message);
      } else {
        window.alert("Rota guncellenirken beklenmeyen bir hata olustu.");
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
      title="Rotayi duzenle"
      description="Mevcut rotanin bilgilerini guncelle. Degisiklikler kaydedildiginde detay sayfasina yonlendirileceksin."
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
          <div className="grid gap-4 md:grid-cols-2">
            <LocationAutocompleteField
              label="Baslangic konumu"
              placeholder="Sefer baslangicini ara"
              accessToken={accessToken ?? ""}
              value={baslangicKonum}
              onSelect={setBaslangicKonum}
              disabled={isSubmitting}
            />
            <LocationAutocompleteField
              label="Varis konumu"
              placeholder="Sefer varisini ara"
              accessToken={accessToken ?? ""}
              value={varisKonum}
              onSelect={setVarisKonum}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Rota guncelleniyor..." : "Degisiklikleri kaydet"}
            </button>
          </div>
        </form>
      ) : null}
    </CarrierVehiclesShell>
  );
}
