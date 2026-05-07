"use client";

import type { ChangeEvent, FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import {
  type ReadonlyURLSearchParams,
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getCarrierRouteDetail,
  type CarrierRouteDetail,
} from "@/lib/api/carrier-routes";
import {
  createOffer,
  getOpenOfferRequestDetail,
  type OpenOfferRequestDetail,
  type OpenOfferRequestRouteCompatibility,
} from "@/lib/api/offers";
import { getMyVehicles, type VehicleListItem } from "@/lib/api/vehicles";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import {
  formatLocationLabel,
  formatRouteDistanceKm,
  formatRouteDuration,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";
import { TeklifFiyatÖnerisiHesaplama } from "@/lib/pricing/offer-price-suggestion";

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

function formatPlannedDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildCarrierRouteSelectionPath(
  pathname: string,
  searchParams: ReadonlyURLSearchParams | null,
  carrierRouteId: number | null
): string {
  const nextSearchParams = new URLSearchParams(searchParams?.toString() ?? "");

  if (carrierRouteId === null) {
    nextSearchParams.delete("carrierRouteId");
  } else {
    nextSearchParams.set("carrierRouteId", String(carrierRouteId));
  }

  const nextQuery = nextSearchParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildOpenRequestsListPath(carrierRouteId: number | null): string {
  if (carrierRouteId === null) {
    return "/dashboard/acik_istekler";
  }

  return `/dashboard/acik_istekler?carrierRouteId=${carrierRouteId}`;
}

function getRouteCompatibilityLabelText(
  value: OpenOfferRequestRouteCompatibility["uygunlukEtiketi"]
): string {
  switch (value) {
    case "UYGUN":
      return "Uygun";
    case "SINIRDA":
      return "Sinirda";
    case "UYGUN_DEGIL":
      return "Uygun degil";
    default:
      return value;
  }
}

function getRouteCompatibilityBadgeClassName(
  value: OpenOfferRequestRouteCompatibility["uygunlukEtiketi"]
): string {
  switch (value) {
    case "UYGUN":
      return "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100";
    case "SINIRDA":
      return "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100";
    case "UYGUN_DEGIL":
      return "rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100";
    default:
      return "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700";
  }
}

function OpenTransportRequestDetailPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="font-medium text-gray-600">Yukleniyor...</div>
    </div>
  );
}

function OpenTransportRequestDetailPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { accessToken, status } = useCarrierPageAccess();
  const params = useParams<{ id: string }>();
  const requestId = Number(params.id);
  const selectedCarrierRouteId = parsePositiveInteger(
    searchParams?.get("carrierRouteId") ?? null
  );
  const [request, setRequest] = useState<OpenOfferRequestDetail | null>(null);
  const [selectedCarrierRoute, setSelectedCarrierRoute] =
    useState<CarrierRouteDetail | null>(null);
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
      let hasValidatedSelectedRoute = false;

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const carrierRouteResponse =
          selectedCarrierRouteId !== null
            ? await getCarrierRouteDetail(selectedCarrierRouteId, accessToken)
            : null;

        hasValidatedSelectedRoute = selectedCarrierRouteId !== null;

        const [requestResponse, vehicleResponse] = await Promise.all([
          getOpenOfferRequestDetail(
            requestId,
            accessToken,
            selectedCarrierRouteId ?? undefined
          ),
          getMyVehicles(accessToken),
        ]);

        if (!isMounted) {
          return;
        }

        setRequest(requestResponse);
        setSelectedCarrierRoute(carrierRouteResponse);
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

        if (
          error instanceof ApiClientError &&
          error.status === 404 &&
          selectedCarrierRouteId !== null
        ) {
          if (hasValidatedSelectedRoute) {
            window.alert("Bu istek secili rota filtresine uymuyor.");
            router.replace(buildOpenRequestsListPath(selectedCarrierRouteId));
            return;
          }

          setSelectedCarrierRoute(null);
          router.replace(buildCarrierRouteSelectionPath(pathname, searchParams, null));
          return;
        }

        if (
          error instanceof ApiClientError &&
          error.status === 503 &&
          selectedCarrierRouteId !== null
        ) {
          setErrorMessage("Secili rota filtresi su anda uygulanamiyor.");
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
  }, [
    accessToken,
    pathname,
    requestId,
    router,
    searchParams,
    selectedCarrierRouteId,
    status,
  ]);

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
      window.alert("Teklif vermeden once bir arac secmelisin.");
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
        router.replace(buildOpenRequestsListPath(selectedCarrierRouteId));
        return;
      }

      if (error instanceof ApiClientError && error.status === 409) {
        if (
          error.message ===
          "You have already created an open offer for this transport request."
        ) {
          window.alert("Bu istege zaten acik bir teklif verdin.");
          return;
        }

        if (
          error.message === "This transport request is no longer open for offers."
        ) {
          window.alert("Bu istek artik teklif kabul etmiyor.");
          router.replace(buildOpenRequestsListPath(selectedCarrierRouteId));
          return;
        }

        if (
          error.message ===
          "The selected vehicle is not an active vehicle of the current carrier."
        ) {
          window.alert("Sectigin arac artik aktif degil. Lutfen aktif bir arac sec.");
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

  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === Number(form.aracId)) ?? null;
  const selectedVehicleCapacitySummary = selectedVehicle?.capacitySummary ?? null;
  const needsVehicleForSuggestion = Boolean(
    request?.tekTasimaIstiyor && !selectedVehicle
  );
  const teorikKalanAgirlikKg =
    request && selectedVehicleCapacitySummary && request.agirlikKg !== null
      ? selectedVehicleCapacitySummary.kalanAgirlikKg - request.agirlikKg
      : null;
  const teorikKalanHacimM3 =
    request &&
    selectedVehicleCapacitySummary &&
    request.hacimM3 !== null &&
    selectedVehicleCapacitySummary.kalanHacimM3 !== null
      ? selectedVehicleCapacitySummary.kalanHacimM3 - request.hacimM3
      : null;
  const showsDedicatedIncomingWarning = Boolean(
    request?.tekTasimaIstiyor &&
      selectedVehicleCapacitySummary &&
      selectedVehicleCapacitySummary.aktifRezervasyonSayisi > 0
  );
  const showsDedicatedExistingWarning = Boolean(
    selectedVehicleCapacitySummary?.aktifTekTasimaRezervasyonuVar
  );
  const showsWeightOverflowWarning =
    teorikKalanAgirlikKg !== null && teorikKalanAgirlikKg < 0;
  const showsVolumeOverflowWarning =
    teorikKalanHacimM3 !== null && teorikKalanHacimM3 < 0;

  const priceSuggestion =
    request && !needsVehicleForSuggestion
      ? TeklifFiyatÖnerisiHesaplama({
          rotaMesafeMetre: request.rotaMesafeMetre,
          agirlikKg: request.agirlikKg,
          hacimM3: request.hacimM3,
          aracMaksimumHacimM3: selectedVehicle?.maksimumHacimM3 ?? null,
          tekTasimaIstiyor: request.tekTasimaIstiyor,
        })
      : null;

  if (status !== "ready") {
    return <OpenTransportRequestDetailPageFallback />;
  }

  return (
    <CarrierVehiclesShell
      title="Istek detayi ve teklif"
      headerActions={<InlineHelpTrigger helpKey="offer-create" />}
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
                  {formatLocationLabel(
                    request.baslangicKonumMetni,
                    request.baslangicSehri
                  )}{" "}
                  {"->"}{" "}
                  {formatLocationLabel(request.varisKonumMetni, request.varisSehri)}
                </h2>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {getCargoTypeLabel(request.yukTipi)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {formatWeightKg(request.agirlikKg)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {formatVolumeM3(request.hacimM3)}
                  </span>
                  {request.tekTasimaIstiyor ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                      Tek tasima
                    </span>
                  ) : null}
                  {request.tasimaTarihi ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {request.tasimaTarihi}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {formatDate(request.olusturmaTarihi)}
              </div>
            </div>
          </div>

          {selectedCarrierRoute ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-950">Secili rota</h3>
                <p className="mt-3 text-sm text-slate-700">
                  {formatLocationLabel(
                    selectedCarrierRoute.baslangicKonumMetni,
                    selectedCarrierRoute.baslangicSehri
                  )}{" "}
                  {"->"}{" "}
                  {formatLocationLabel(
                    selectedCarrierRoute.varisKonumMetni,
                    selectedCarrierRoute.varisSehri
                  )}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                  <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-blue-100">
                    {formatPlannedDate(selectedCarrierRoute.planlananTarih)}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-blue-100">
                    {formatRouteDistanceKm(selectedCarrierRoute.rotaMesafeMetre)}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-blue-100">
                    {formatRouteDuration(selectedCarrierRoute.rotaSureSaniye)}
                  </span>
                  {selectedCarrierRoute.maksimumSapmaKm !== null ? (
                    <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-blue-100">
                      Max sapma {selectedCarrierRoute.maksimumSapmaKm.toFixed(1)} km
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-950">Rota uyumu</h3>
                {request.rotaUyumu ? (
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <span
                      className={getRouteCompatibilityBadgeClassName(
                        request.rotaUyumu.uygunlukEtiketi
                      )}
                    >
                      {getRouteCompatibilityLabelText(
                        request.rotaUyumu.uygunlukEtiketi
                      )}
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        Ek {formatRouteDistanceKm(request.rotaUyumu.extraMesafeMetre)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                        Ek {formatRouteDuration(request.rotaUyumu.extraSureSaniye)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {!request.hasActiveVehicle ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Teklif verebilmek icin once en az bir aktif aracin olmali.
            </div>
          ) : null}

          {request.hasExistingOffer ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Bu istege zaten acik bir teklif verdin. Yeni teklif olusturamazsin.
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
                  <dt className="font-medium text-gray-900">Konum</dt>
                  <dd className="text-right">
                    {formatLocationLabel(
                      request.baslangicKonumMetni,
                      request.baslangicSehri
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Sehir</dt>
                  <dd>{request.normalizeBaslangicSehir || request.baslangicSehri}</dd>
                </div>
                {request.normalizeBaslangicIlce ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-gray-900">Ilce</dt>
                    <dd>{request.normalizeBaslangicIlce}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">Varis</h3>
              <dl className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Konum</dt>
                  <dd className="text-right">
                    {formatLocationLabel(request.varisKonumMetni, request.varisSehri)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Sehir</dt>
                  <dd>{request.normalizeVarisSehir || request.varisSehri}</dd>
                </div>
                {request.normalizeVarisIlce ? (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-medium text-gray-900">Ilce</dt>
                    <dd>{request.normalizeVarisIlce}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">Teklif ver</h3>
            {needsVehicleForSuggestion ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Tek tasima isteginde onerilen fiyat icin once arac secmelisin.
              </div>
            ) : null}
            {priceSuggestion ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
                <p className="font-semibold">
                  Onerilen fiyat: {priceSuggestion.onerilenFiyat} TRY
                </p>
                <p className="mt-1">Mesafe: {priceSuggestion.km.toFixed(1)} km</p>
                <p className="mt-1">
                  Faturalanan yuk: {priceSuggestion.faturalanabilirYukKg.toFixed(0)} kg
                </p>
                {request.tekTasimaIstiyor && selectedVehicle?.maksimumHacimM3 ? (
                  <p className="mt-1">
                    Tek tasima icin arac hacmi esas alindi:{" "}
                    {selectedVehicle.maksimumHacimM3.toFixed(1)} m3
                  </p>
                ) : null}
              </div>
            ) : null}
            <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-900" htmlFor="aracId">
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

              {selectedVehicle && selectedVehicleCapacitySummary ? (
                <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Arac kapasite ozeti
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <span>Toplam agirlik</span>
                        <span className="font-semibold text-slate-950">
                          {formatWeightKg(
                            selectedVehicleCapacitySummary.toplamAgirlikKg
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Rezerve agirlik</span>
                        <span className="font-semibold text-slate-950">
                          {formatWeightKg(
                            selectedVehicleCapacitySummary.rezerveAgirlikKg
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Kalan agirlik</span>
                        <span className="font-semibold text-slate-950">
                          {formatWeightKg(
                            selectedVehicleCapacitySummary.kalanAgirlikKg
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Toplam hacim</span>
                        <span className="font-semibold text-slate-950">
                          {formatVolumeM3(
                            selectedVehicleCapacitySummary.toplamHacimM3
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Rezerve hacim</span>
                        <span className="font-semibold text-slate-950">
                          {formatVolumeM3(
                            selectedVehicleCapacitySummary.rezerveHacimM3
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Kalan hacim</span>
                        <span className="font-semibold text-slate-950">
                          {formatVolumeM3(
                            selectedVehicleCapacitySummary.kalanHacimM3
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Bu yuk eklendiginde
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <span>Yuk agirligi</span>
                        <span className="font-semibold text-slate-950">
                          {formatWeightKg(request.agirlikKg)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Yuk hacmi</span>
                        <span className="font-semibold text-slate-950">
                          {formatVolumeM3(request.hacimM3)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Teorik sonrasi agirlik</span>
                        <span className="font-semibold text-slate-950">
                          {formatWeightKg(teorikKalanAgirlikKg)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Teorik sonrasi hacim</span>
                        <span className="font-semibold text-slate-950">
                          {formatVolumeM3(teorikKalanHacimM3)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 mb-6">
                        <span>Aktif rezervasyon</span>
                        <span className="font-semibold text-slate-950">
                          {selectedVehicleCapacitySummary.aktifRezervasyonSayisi}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-3">
                    {showsWeightOverflowWarning ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        Bu aracta kayitli agirlik kapasitesi teorik olarak asiliyor.
                      </div>
                    ) : null}
                    {showsVolumeOverflowWarning ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        Bu aracta kayitli hacim kapasitesi teorik olarak asiliyor.
                      </div>
                    ) : null}
                    {showsDedicatedIncomingWarning ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Bu yuk tek tasima istiyor; secilen aracta aktif rezervasyon
                        varken operasyonel uyumu ayrica kontrol etmelisin.
                      </div>
                    ) : null}
                    {showsDedicatedExistingWarning ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Secilen aracta halihazirda tek tasima talebi olan aktif bir
                        rezervasyon var.
                      </div>
                    ) : null}
                    {selectedVehicleCapacitySummary.hesapEksigiVar ? (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        Kapasite ozeti yalnizca kayitli agirlik ve hacim verilerine
                        gore hesaplanir; fiziksel sigma veya yerlesim garantisi vermez.
                      </div>
                    ) : null}
                    {!selectedVehicleCapacitySummary.hesapEksigiVar ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        Bu ozet yalnizca kayitli agirlik ve hacim verilerine dayanir;
                        fiziksel sigma, istif ve yukleme sekli ayrica kontrol
                        edilmelidir.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-900" htmlFor="fiyat">
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

export default function OpenTransportRequestDetailPage() {
  return (
    <Suspense fallback={<OpenTransportRequestDetailPageFallback />}>
      <OpenTransportRequestDetailPageContent />
    </Suspense>
  );
}
