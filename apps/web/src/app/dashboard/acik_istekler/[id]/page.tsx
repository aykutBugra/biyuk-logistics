"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import { ApiClientError } from "@/lib/api/api-client";
import {
  createOffer,
  getOpenOfferRequestDetail,
  type OpenOfferRequestDetail,
} from "@/lib/api/offers";
import { getMyVehicles, type VehicleListItem } from "@/lib/api/vehicles";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";

type OfferForm = {
  aracId: string;
  fiyat: string;
  not: string;
};

const initialForm: OfferForm = {
  aracId: "",
  fiyat: "",
  not: "",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function OpenTransportRequestDetailPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const params = useParams<{ id: string }>();
  const requestId = Number(params.id);
  const [request, setRequest] = useState<OpenOfferRequestDetail | null>(null);
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [form, setForm] = useState<OfferForm>(initialForm);
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

    if (!Number.isInteger(requestId) || requestId <= 0) {
      setErrorMessage("Gecersiz istek numarasi.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadRequest = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [requestResponse, vehicleResponse] = await Promise.all([
          getOpenOfferRequestDetail(requestId, accessToken),
          getMyVehicles(accessToken),
        ]);

        if (!isMounted) {
          return;
        }

        setRequest(requestResponse);
        setVehicles(vehicleResponse);
        setForm((currentForm) => ({
          ...currentForm,
          aracId:
            currentForm.aracId ||
            (vehicleResponse.length === 1 ? String(vehicleResponse[0].id) : ""),
        }));
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
          setErrorMessage("Bu istek teklif vermeye uygun degil veya bulunamadi.");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Istek detayi yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadRequest();

    return () => {
      isMounted = false;
    };
  }, [accessToken, requestId, router, status]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
      !accessToken ||
      !request ||
      isSubmitting ||
      !request.hasActiveVehicle ||
      request.hasExistingOffer
    ) {
      return;
    }

    if (!form.aracId) {
      window.alert("Teklif vermeden once bir arac secmelisiniz.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createOffer(
        request.id,
        {
          aracId: Number(form.aracId),
          fiyat: Number(form.fiyat),
          not: form.not.trim() || undefined,
        },
        accessToken
      );
      router.replace("/dashboard/tekliflerim");
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
        window.alert("Bu istek artik teklif vermeye uygun degil.");
        router.replace("/dashboard/acik_istekler");
        return;
      }

      if (error instanceof ApiClientError && error.status === 409) {
        if (error.message === "You have already created an open offer for this transport request.") {
          window.alert("Bu istege zaten acik bir teklif verdiniz.");
          return;
        }

        if (error.message === "This transport request is no longer open for offers.") {
          window.alert("Bu istek artik teklif kabul etmiyor.");
          router.replace("/dashboard/acik_istekler");
          return;
        }

        if (
          error.message ===
          "The selected vehicle is not an active vehicle of the current carrier."
        ) {
          window.alert("Sectiginiz arac artik aktif degil. Lutfen aktif bir arac secin.");
          return;
        }
      }

      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Teklif olusturulurken beklenmeyen bir hata olustu."
      );
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
      title="Istek detayi ve teklif"
      description="Teklif vermeden once tasima talebini ve yuk detaylarini kontrol et."
    >
      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-600 shadow-sm">
          Istek detayi yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Kayit goruntulenemedi</h2>
          <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && request ? (
        <div className="grid gap-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                    {request.durum}
                  </span>
                  <span>#{request.id}</span>
                  {request.hasExistingOffer ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                      Acik teklifin var
                    </span>
                  ) : null}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {request.baslangicSehri} {"->"} {request.varisSehri}
                </h2>
              </div>
              <div className="text-sm text-gray-500">
                {formatDate(request.olusturmaTarihi)}
              </div>
            </div>
          </div>

          {!request.hasActiveVehicle ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Teklif verebilmek icin once en az bir aktif araciniz olmali.
            </div>
          ) : null}

          {request.hasExistingOffer ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Bu istege zaten acik bir teklif verdiniz. Yeni teklif olusturamazsiniz.
            </div>
          ) : null}

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">Yuk detayi</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
              {request.yukDetay}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">Baslangic</h3>
              <dl className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Sehir</dt>
                  <dd>{request.baslangicSehri}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Enlem</dt>
                  <dd>{request.baslangicEnlem}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Boylam</dt>
                  <dd>{request.baslangicBoylam}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">Varis</h3>
              <dl className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Sehir</dt>
                  <dd>{request.varisSehri}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Enlem</dt>
                  <dd>{request.varisEnlem}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Boylam</dt>
                  <dd>{request.varisBoylam}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">Teklif ver</h3>
            <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <label
                  className="text-sm font-semibold text-gray-900"
                  htmlFor="aracId"
                >
                  Aktif arac sec
                </label>
                <select
                  id="aracId"
                  name="aracId"
                  value={form.aracId}
                  onChange={handleChange}
                  disabled={
                    isSubmitting || !request.hasActiveVehicle || request.hasExistingOffer
                  }
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">Arac secin</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plaka} - {vehicle.marka} {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label
                  className="text-sm font-semibold text-gray-900"
                  htmlFor="fiyat"
                >
                  Teklif fiyatiniz (TRY)
                </label>
                <input
                  id="fiyat"
                  name="fiyat"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.fiyat}
                  onChange={handleChange}
                  placeholder="Orn: 12500"
                  disabled={
                    isSubmitting || !request.hasActiveVehicle || request.hasExistingOffer
                  }
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-900" htmlFor="not">
                  Teklif notu
                </label>
                <textarea
                  id="not"
                  name="not"
                  value={form.not}
                  onChange={handleChange}
                  rows={4}
                  maxLength={255}
                  placeholder="Teslim plani, sure veya ek aciklama yazabilirsiniz."
                  disabled={
                    isSubmitting || !request.hasActiveVehicle || request.hasExistingOffer
                  }
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !request.hasActiveVehicle ||
                  request.hasExistingOffer ||
                  !form.aracId
                }
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Teklif gonderiliyor..." : "Teklif Olustur"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
