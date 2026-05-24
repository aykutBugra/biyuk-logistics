"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Link from "next/link";
import { Suspense, use, useEffect, useState } from "react";
import {
  type ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import CustomerSectionSurface from "@/components/CustomerSectionSurface";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import MotionCollapse from "@/components/MotionCollapse";
import RequestImageGallery from "@/components/RequestImageGallery";
import StatusBadge from "@/components/StatusBadge";
import { ApiClientError } from "@/lib/api/api-client";
import { getMyOfferThreads, type OfferThreadSummary } from "@/lib/api/offer-threads";
import {
  getCarrierRouteDetail,
  type CarrierRouteDetail,
} from "@/lib/api/carrier-routes";
import {
  createOffer,
  getMyOffers,
  getOpenOfferRequestDetail,
  type OfferItem,
  type OpenOfferRequestDetail,
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
import { TeklifFiyatÖnerisiHesaplama as teklifFiyatOnerisiHesaplama } from "@/lib/pricing/offer-price-suggestion";

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatOfferStatusLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return "Bekliyor";
    case "KABUL_EDILDI":
      return "Kabul edildi";
    case "REDDEDILDI":
      return "Reddedildi";
    case "IPTAL_EDILDI":
      return "Iptal edildi";
    default:
      return status;
  }
}

function parsePublicId(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parsePositiveNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildCarrierRouteSelectionPath(
  pathname: string,
  searchParams: ReadonlyURLSearchParams | null,
  carrierRouteId: string | null,
  maxSapmaKm: number | null
): string {
  const nextSearchParams = new URLSearchParams(searchParams?.toString() ?? "");

  if (carrierRouteId === null) {
    nextSearchParams.delete("carrierRouteId");
    nextSearchParams.delete("maxSapmaKm");
  } else {
    nextSearchParams.set("carrierRouteId", carrierRouteId);

    if (typeof maxSapmaKm === "number") {
      nextSearchParams.set("maxSapmaKm", String(maxSapmaKm));
    } else {
      nextSearchParams.delete("maxSapmaKm");
    }
  }

  const nextQuery = nextSearchParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function buildOpenRequestsListPath(
  carrierRouteId: string | null,
  maxSapmaKm: number | null
): string {
  if (carrierRouteId === null) {
    return "/dashboard/acik_istekler";
  }

  const searchParams = new URLSearchParams({
    carrierRouteId,
  });

  if (typeof maxSapmaKm === "number") {
    searchParams.set("maxSapmaKm", String(maxSapmaKm));
  }

  return `/dashboard/acik_istekler?${searchParams.toString()}`;
}

function getPreferredOfferForRequest(
  offers: OfferItem[],
  requestId: string
): OfferItem | null {
  const matchingOffers = offers.filter((offer) => offer.requestId === requestId);

  if (matchingOffers.length === 0) {
    return null;
  }

  const activeOffer =
    matchingOffers.find((offer) => offer.durum.trim().toUpperCase() === "OLUSTURULDU") ??
    matchingOffers.find((offer) => offer.durum.trim().toUpperCase() === "KABUL_EDILDI");

  if (activeOffer) {
    return activeOffer;
  }

  return matchingOffers
    .sort((left, right) => right.id.localeCompare(left.id))[0] ?? null;
}

function DetailInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[1rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
      <dt className="text-sm font-semibold text-slate-700">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function DetailAddressCard({
  title,
  location,
  city,
  district,
}: {
  title: string;
  location: string;
  city: string;
  district: string | null;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-base font-bold text-slate-950">{location}</p>
      <dl className="mt-4 space-y-3">
        <DetailInfoRow label="Sehir" value={city} />
        {district ? <DetailInfoRow label="Ilce" value={district} /> : null}
      </dl>
    </div>
  );
}

function InfoBanner({
  tone,
  children,
}: {
  tone: "amber" | "emerald" | "rose" | "blue" | "slate";
  children: ReactNode;
}) {
  const classes: Record<typeof tone, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div className={`rounded-[1.2rem] border px-4 py-3 text-sm ${classes[tone]}`}>
      {children}
    </div>
  );
}

function OfferSummaryPanel({
  offer,
  thread,
  backHref,
}: {
  offer: OfferItem | null;
  thread: OfferThreadSummary | null;
  backHref: string;
}) {
  if (!offer) {
    return (
      <CustomerSectionSurface
        title="Teklif ozeti"
        description="Bu istek icin acik teklifin var; detaylar gec yuklenirse Tekliflerim ekranindan akisa donebilirsin."
      >
        <div className="space-y-4">
          <InfoBanner tone="emerald">
            Bu istek icin acik teklifin var. Guncel fiyat ve durum detaylari yuklenemedi.
          </InfoBanner>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/tekliflerim" className="app-button-primary">
              Tekliflerime git
            </Link>
            <Link href={backHref} className="app-button-secondary">
              Listeye don
            </Link>
          </div>
        </div>
      </CustomerSectionSurface>
    );
  }

  const conversationHref = thread
    ? `/dashboard/konusmalar/teklif/${thread.offerId}`
    : `/dashboard/konusmalar/teklif/${offer.id}`;

  return (
    <CustomerSectionSurface
      title="Teklif ozeti"
      description="Bu istek icin acik teklifin ve ilgili konusma akisin."
      action={
        <div className="flex flex-wrap gap-2">
          {thread?.hasUnread ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {thread.unreadCount} okunmamis
            </span>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50/80 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Teklif tutari
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-emerald-800">
            {formatCurrency(offer.fiyat)}
          </p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Durum
            </p>
            <div className="mt-2">
              <StatusBadge
                status={offer.durum}
                label={formatOfferStatusLabel(offer.durum)}
              />
            </div>
          </div>
          <DetailInfoRow label="Teklif" value="Mevcut teklif" />
          <DetailInfoRow label="Arac" value={offer.aracPlaka ?? "Belirtilmedi"} />
          <DetailInfoRow
            label="Son hareket"
            value={thread?.lastMessageAt ? formatDate(thread.lastMessageAt) : "Henuz yok"}
          />
        </div>

        <div className="rounded-[1rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Durum notu
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {thread?.lastMessageSummary ?? offer.not ?? "Bu teklif icin ek not bulunmuyor."}
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
          <Link href={conversationHref} className="app-button-primary w-full justify-center">
            Konusmaya git
          </Link>
          <Link href="/dashboard/tekliflerim" className="app-button-secondary w-full justify-center">
            Tekliflerime don
          </Link>
        </div>
      </div>
    </CustomerSectionSurface>
  );
}

function OpenTransportRequestDetailPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="font-medium text-gray-600">Yukleniyor...</div>
    </div>
  );
}

function OpenTransportRequestDetailPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { accessToken, status } = useCarrierPageAccess();
  const { id } = use(params);
  const requestId = id;
  const selectedCarrierRouteId = parsePublicId(
    searchParams?.get("carrierRouteId") ?? null
  );
  const selectedMaxSapmaKm =
    selectedCarrierRouteId !== null
      ? parsePositiveNumber(searchParams?.get("maxSapmaKm") ?? null)
      : null;

  const [request, setRequest] = useState<OpenOfferRequestDetail | null>(null);
  const [selectedCarrierRoute, setSelectedCarrierRoute] =
    useState<CarrierRouteDetail | null>(null);
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [currentOffer, setCurrentOffer] = useState<OfferItem | null>(null);
  const [currentOfferThread, setCurrentOfferThread] = useState<OfferThreadSummary | null>(
    null
  );
  const [form, setForm] = useState<OfferForm>(initialForm);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [vehicleSelectionValidationActive, setVehicleSelectionValidationActive] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    if (selectedCarrierRouteId === null) {
      if (searchParams.get("maxSapmaKm")) {
        router.replace(buildCarrierRouteSelectionPath(pathname, searchParams, null, null));
      }
      return;
    }

    if (selectedMaxSapmaKm === null) {
      router.replace(
        buildCarrierRouteSelectionPath(
          pathname,
          searchParams,
          selectedCarrierRouteId,
          50
        )
      );
    }
  }, [
    pathname,
    router,
    searchParams,
    selectedCarrierRouteId,
    selectedMaxSapmaKm,
  ]);

  useEffect(() => {
    const hasPendingRouteContext =
      selectedCarrierRouteId !== null && selectedMaxSapmaKm === null;

    if (status !== "ready" || !accessToken || hasPendingRouteContext) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    if (!requestId.trim()) {
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
          getOpenOfferRequestDetail(requestId, accessToken, {
            carrierRouteId: selectedCarrierRouteId ?? undefined,
            maxSapmaKm: selectedMaxSapmaKm ?? undefined,
          }),
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
            (vehicleResponse.length === 1 ? vehicleResponse[0].id : ""),
        }));

        if (requestResponse.hasExistingOffer) {
          const [offersResult, threadsResult] = await Promise.allSettled([
            getMyOffers(accessToken),
            getMyOfferThreads(accessToken, { as: "carrier" }),
          ]);

          if (!isMounted) {
            return;
          }

          if (
            offersResult.status === "rejected" &&
            offersResult.reason instanceof ApiClientError &&
            offersResult.reason.status === 401
          ) {
            clearStoredAuth();
            router.replace("/login");
            return;
          }

          if (
            offersResult.status === "rejected" &&
            offersResult.reason instanceof ApiClientError &&
            offersResult.reason.status === 403
          ) {
            router.replace("/");
            return;
          }

          const matchedOffer =
            offersResult.status === "fulfilled"
              ? getPreferredOfferForRequest(offersResult.value, requestId)
              : null;

          const matchedThread =
            threadsResult.status === "fulfilled"
              ? threadsResult.value.find((thread) =>
                  matchedOffer
                    ? thread.offerId === matchedOffer.id
                    : thread.requestId === requestId
                ) ?? null
              : null;

          setCurrentOffer(matchedOffer);
          setCurrentOfferThread(matchedThread);
        } else {
          setCurrentOffer(null);
          setCurrentOfferThread(null);
        }
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
            router.replace(
              buildOpenRequestsListPath(selectedCarrierRouteId, selectedMaxSapmaKm)
            );
            return;
          }

          setSelectedCarrierRoute(null);
          router.replace(buildCarrierRouteSelectionPath(pathname, searchParams, null, null));
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
    selectedMaxSapmaKm,
    status,
  ]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setSubmitErrorMessage(null);
    if (name === "aracId") {
      setVehicleSelectionValidationActive(false);
    }

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
      setVehicleSelectionValidationActive(true);
      return;
    }

    try {
      setSubmitErrorMessage(null);
      setIsSubmitting(true);
      await createOffer(
        request.id,
        {
          aracId: form.aracId,
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
        router.replace(buildOpenRequestsListPath(selectedCarrierRouteId, selectedMaxSapmaKm));
        return;
      }

      if (error instanceof ApiClientError && error.status === 409) {
        if (
          error.message ===
          "You have already created an open offer for this transport request."
        ) {
          setSubmitErrorMessage("Bu istege zaten acik bir teklif verdin.");
          return;
        }

        if (error.message === "This transport request is no longer open for offers.") {
          window.alert("Bu istek artik teklif kabul etmiyor.");
          router.replace(buildOpenRequestsListPath(selectedCarrierRouteId, selectedMaxSapmaKm));
          return;
        }

        if (
          error.message ===
          "The selected vehicle is not an active vehicle of the current carrier."
        ) {
          setSubmitErrorMessage(
            "Sectigin arac artik aktif degil. Lutfen aktif bir arac sec."
          );
          return;
        }
      }

      setSubmitErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Teklif olusturulurken beklenmeyen bir hata olustu."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === form.aracId) ?? null;
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
      ? teklifFiyatOnerisiHesaplama({
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

  const backHref = request?.hasExistingOffer
    ? "/dashboard/tekliflerim"
    : buildOpenRequestsListPath(selectedCarrierRouteId, selectedMaxSapmaKm);
  const routeTitle = request ? `${request.baslangicSehri} -> ${request.varisSehri}` : "";
  const routeMeta =
    request &&
    `${formatLocationLabel(request.baslangicKonumMetni, request.baslangicSehri)} -> ${formatLocationLabel(
      request.varisKonumMetni,
      request.varisSehri
    )}`;
  return (
    <CarrierVehiclesShell
      title={request?.hasExistingOffer ? "Teklif detayi" : "Istek detayi ve teklif"}
      description={
        request?.hasExistingOffer
          ? "Verdigin teklifin durumunu ve ilgili istek baglamini tek ekranda takip et."
          : "Yuk baglamini inceleyip teklifini ayni ekrandan profesyonelce hazirla."
      }
      headerActions={<InlineHelpTrigger helpKey="offer-create" />}
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={6}
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-[1.6rem] border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-700 shadow-sm">
          <h2 className="text-base font-bold text-rose-800">Kayit goruntulenemedi</h2>
          <p className="mt-1.5 leading-6">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && request ? (
        <div className="space-y-4">
          <section
            data-dashboard-primary
            className="app-surface-strong rounded-[1.6rem] border border-slate-200/80 px-4 py-4 shadow-sm md:px-5 md:py-5"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={request.durum} />
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    Istek detayi
                  </span>
                  {currentOffer ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                      Teklifin var
                    </span>
                  ) : null}
                  {request.hasExistingOffer ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Acik teklifin var
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-[1.75rem] font-black tracking-tight text-slate-950 md:text-[2rem]">
                    {routeTitle}
                  </h1>
                  <p className="max-w-3xl text-sm leading-6 text-slate-500">{routeMeta}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {getCargoTypeLabel(request.yukTipi)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {formatWeightKg(request.agirlikKg)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {formatVolumeM3(request.hacimM3)}
                  </span>
                  {request.tasimaTarihi ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {formatPlannedDate(request.tasimaTarihi)}
                    </span>
                  ) : null}
                  {request.tekTasimaIstiyor ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Tek tasima
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start xl:w-[300px] xl:flex-col">
                <div className="flex-1 rounded-[1.1rem] border border-slate-200 bg-slate-50/80 px-3.5 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Kayit tarihi
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">
                {formatDate(request.olusturmaTarihi)}
                  </p>
          </div>

                <div
                  className={`flex-1 rounded-[1.1rem] border px-3.5 py-3 ${
                    request.hasExistingOffer
                      ? "border-emerald-200 bg-emerald-50/80"
                      : "border-blue-200 bg-blue-50/80"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                      request.hasExistingOffer ? "text-emerald-700" : "text-blue-700"
                    }`}
                  >
                    {request.hasExistingOffer ? "Mevcut teklif" : "Hazirlik durumu"}
                </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">
                    {request.hasExistingOffer
                      ? currentOffer
                        ? formatCurrency(currentOffer.fiyat)
                        : "Acik teklif kaydin var"
                      : request.hasActiveVehicle
                        ? "Teklif girmeye hazirsin"
                        : "Teklif icin aktif arac gerekiyor"}
                  </p>
              </div>

                <div className="flex flex-wrap gap-2">
                  {currentOffer ? (
                    <Link
                      href={`/dashboard/konusmalar/teklif/${currentOfferThread?.offerId ?? currentOffer.id}`}
                      className="app-button-primary"
                    >
                      Konusmaya git
                    </Link>
                ) : null}
                  <Link href={backHref} className="app-button-secondary">
                    {request.hasExistingOffer ? "Tekliflerime don" : "Listeye don"}
                  </Link>
              </div>
            </div>
            </div>
          </section>

          <div data-dashboard-stats className="grid gap-3 grid-cols-2">
            <CustomerMetricCard
              label="Rota mesafesi"
              value={formatRouteDistanceKm(request.rotaMesafeMetre)}
              hint="Kayitli rota verisine gore"
              tone="blue"
              icon={<i className="pi pi-map text-lg" />}
            />
            <CustomerMetricCard
              label="Tahmini sure"
              value={formatRouteDuration(request.rotaSureSaniye)}
              hint="Mevcut rota bilgisinden"
              tone="violet"
              icon={<i className="pi pi-clock text-lg" />}
            />
            </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_360px] xl:items-start">
            <div className="space-y-4">
              {request.images && request.images.length > 0 ? (
                <RequestImageGallery
                  images={request.images}
                  primaryImageId={request.primaryImageId ?? null}
                />
              ) : (
                <EmptyStateCard
                  eyebrow="Fotograf galerisi"
                  title="Bu istek icin henuz fotograf paylasilmamis"
                  description="Teklif karari yalnizca mevcut yuk detaylari ve rota bilgilerine dayanir."
                />
              )}

              <CustomerSectionSurface
                title="Yuk ve konum ozeti"
                description="Kargo, tasima ve konum bilgileri."
              >
                <div className="space-y-3">
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailInfoRow label="Yuk tipi" value={getCargoTypeLabel(request.yukTipi)} />
                    <DetailInfoRow label="Agirlik" value={formatWeightKg(request.agirlikKg)} />
                    <DetailInfoRow label="Hacim" value={formatVolumeM3(request.hacimM3)} />
                    <DetailInfoRow
                      label="Tasima tarihi"
                      value={
                        request.tasimaTarihi
                          ? formatPlannedDate(request.tasimaTarihi)
                          : "Belirtilmedi"
                      }
                    />
                    <DetailInfoRow
                      label="Tasima modeli"
                      value={request.tekTasimaIstiyor ? "Tek tasima" : "Paylasimli olabilir"}
                    />
          </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <DetailAddressCard
                      title="Baslangic"
                      location={formatLocationLabel(
                      request.baslangicKonumMetni,
                      request.baslangicSehri
                    )}
                      city={request.normalizeBaslangicSehir || request.baslangicSehri}
                      district={request.normalizeBaslangicIlce}
                    />
                    <DetailAddressCard
                      title="Varis"
                      location={formatLocationLabel(
                        request.varisKonumMetni,
                        request.varisSehri
                      )}
                      city={request.normalizeVarisSehir || request.varisSehri}
                      district={request.normalizeVarisIlce}
                    />
                </div>
                </div>
              </CustomerSectionSurface>

              <CustomerSectionSurface
                title="Musteri notu"
                description="Talebe eklenmis aciklama ve operasyon beklentisi."
              >
                <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {request.yukDetay || "Ek aciklama paylasilmadi."}
                  </p>
                  </div>
              </CustomerSectionSurface>
            </div>

            <div className="space-y-4">
              {request.hasExistingOffer ? (
                <OfferSummaryPanel
                  offer={currentOffer}
                  thread={currentOfferThread}
                  backHref={backHref}
                />
              ) : (
                <CustomerSectionSurface
                  title="Teklif ver"
                  description="Fiyat, arac ve not alanlariyla teklifini hazirla."
                >
                  <div className="space-y-4">
                    {submitErrorMessage ? (
                      <div className="app-form-error-banner" role="alert">
                        <p className="text-sm font-semibold">Teklif gonderilemedi</p>
                        <p className="mt-1 text-sm">{submitErrorMessage}</p>
                  </div>
                ) : null}

                    {!request.hasActiveVehicle ? (
                      <InfoBanner tone="amber">
                        Teklif verebilmek icin once en az bir aktif aracin olmali.
                      </InfoBanner>
                    ) : null}

            {needsVehicleForSuggestion ? (
                      <InfoBanner tone="amber">
                Tek tasima isteginde onerilen fiyat icin once arac secmelisin.
                      </InfoBanner>
            ) : null}

            {priceSuggestion ? (
                      <InfoBanner tone="blue">
                <p className="font-semibold">
                          Onerilen fiyat: {formatCurrency(priceSuggestion.onerilenFiyat)}
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
                      </InfoBanner>
            ) : null}

                    <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-gray-900" htmlFor="aracId">
                  Aktif arac sec
                </label>
                <select
                  id="aracId"
                  name="aracId"
                  value={form.aracId}
                  onChange={handleChange}
                          aria-invalid={
                            (vehicleSelectionValidationActive && !form.aracId) || undefined
                  }
                          disabled={isSubmitting || !request.hasActiveVehicle}
                          className="app-input block text-sm"
                >
                  <option value="">Arac secin</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plaka} - {vehicle.marka} {vehicle.model}
                    </option>
                  ))}
                </select>
                        {vehicleSelectionValidationActive && !form.aracId ? (
                          <p className="app-field-status app-field-error">
                            Teklif vermeden once bir aktif arac sec.
                          </p>
                        ) : null}
              </div>

                      <MotionCollapse
                        isOpen={Boolean(selectedVehicle && selectedVehicleCapacitySummary)}
                      >
              {selectedVehicle && selectedVehicleCapacitySummary ? (
                          <div
                            data-dashboard-form-conditional
                            className="grid gap-4 rounded-[1.2rem] border border-slate-200 bg-slate-50/80 p-4"
                          >
                            <div className="grid gap-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Arac kapasite ozeti
                    </p>
                              <DetailInfoRow
                                label="Toplam agirlik"
                                value={formatWeightKg(
                            selectedVehicleCapacitySummary.toplamAgirlikKg
                          )}
                              />
                              <DetailInfoRow
                                label="Kalan agirlik"
                                value={formatWeightKg(
                            selectedVehicleCapacitySummary.kalanAgirlikKg
                          )}
                              />
                              <DetailInfoRow
                                label="Toplam hacim"
                                value={formatVolumeM3(
                            selectedVehicleCapacitySummary.toplamHacimM3
                          )}
                              />
                              <DetailInfoRow
                                label="Kalan hacim"
                                value={formatVolumeM3(
                            selectedVehicleCapacitySummary.kalanHacimM3
                          )}
                              />
                  </div>

                            <div className="grid gap-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Bu yuk eklendiginde
                    </p>
                              <DetailInfoRow
                                label="Yuk agirligi"
                                value={formatWeightKg(request.agirlikKg)}
                              />
                              <DetailInfoRow
                                label="Yuk hacmi"
                                value={formatVolumeM3(request.hacimM3)}
                              />
                              <DetailInfoRow
                                label="Teorik sonrasi agirlik"
                                value={formatWeightKg(teorikKalanAgirlikKg)}
                              />
                              <DetailInfoRow
                                label="Teorik sonrasi hacim"
                                value={formatVolumeM3(teorikKalanHacimM3)}
                              />
                  </div>

                            <div className="space-y-3">
                    {showsWeightOverflowWarning ? (
                                <InfoBanner tone="rose">
                        Bu aracta kayitli agirlik kapasitesi teorik olarak asiliyor.
                                </InfoBanner>
                    ) : null}
                    {showsVolumeOverflowWarning ? (
                                <InfoBanner tone="rose">
                        Bu aracta kayitli hacim kapasitesi teorik olarak asiliyor.
                                </InfoBanner>
                    ) : null}
                    {showsDedicatedIncomingWarning ? (
                                <InfoBanner tone="amber">
                                  Bu yuk tek tasima istiyor; secilen aracta aktif rezervasyon varken
                                  operasyonel uyumu ayrica kontrol etmelisin.
                                </InfoBanner>
                    ) : null}
                    {showsDedicatedExistingWarning ? (
                                <InfoBanner tone="amber">
                        Secilen aracta halihazirda tek tasima talebi olan aktif bir
                        rezervasyon var.
                                </InfoBanner>
                    ) : null}
                              <InfoBanner
                                tone={selectedVehicleCapacitySummary.hesapEksigiVar ? "blue" : "slate"}
                              >
                        Bu ozet yalnizca kayitli agirlik ve hacim verilerine dayanir;
                                fiziksel yerlesim ve istif uygunlugu ayrica kontrol edilmelidir.
                              </InfoBanner>
                  </div>
                </div>
              ) : null}
                      </MotionCollapse>

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
                          disabled={isSubmitting || !request.hasActiveVehicle}
                          className="app-input block text-sm"
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
                          disabled={isSubmitting || !request.hasActiveVehicle}
                          className="app-input block min-h-[7rem] resize-y text-sm"
                />
              </div>

              <button
                type="submit"
                        disabled={isSubmitting || !request.hasActiveVehicle || !form.aracId}
                        className="app-button-primary app-form-submit-button app-pressable w-full justify-center text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                        {isSubmitting ? "Teklif gonderiliyor..." : "Teklif olustur"}
              </button>
            </form>
                  </div>
                </CustomerSectionSurface>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}

export default function OpenTransportRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<OpenTransportRequestDetailPageFallback />}>
      <OpenTransportRequestDetailPageContent params={params} />
    </Suspense>
  );
}
