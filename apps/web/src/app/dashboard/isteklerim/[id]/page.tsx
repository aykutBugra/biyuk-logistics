"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import CustomerSectionSurface from "@/components/CustomerSectionSurface";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import RatingComposerCard from "@/components/RatingComposerCard";
import RequestImageGallery from "@/components/RequestImageGallery";
import StatusBadge from "@/components/StatusBadge";
import { ApiClientError } from "@/lib/api/api-client";
import { confirmJobDelivery } from "@/lib/api/jobs";
import {
  getIncomingOffersForRequest,
  type IncomingOfferItem,
} from "@/lib/api/offers";
import { createRatingForJob } from "@/lib/api/ratings";
import {
  deleteTransportRequest,
  getTransportRequestDetail,
  type TransportRequestDetail,
} from "@/lib/api/transport-requests";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCustomerPageAccess } from "@/lib/auth/use-customer-page-access";
import { useConfirm } from "@/lib/confirm/confirm-context";
import {
  formatLocationLabel,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";
import { useToast } from "@/lib/toast/toast-context";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTransportDate(value: string | null): string {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function getRequestStatusLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return "Acik";
    case "ANLASILDI":
      return "Anlasma saglandi";
    case "TAMAMLANDI":
      return "Tamamlandi";
    case "IPTAL_EDILDI":
      return "Iptal edildi";
    default:
      return status;
  }
}

function getJobStatusCopy(status: string): { title: string; description: string } {
  switch (status) {
    case "OLUSTURULDU":
      return {
        title: "Bu istek icin anlasma saglandi",
        description:
          "Teklif kabul edildi ve resmi nakliye kaydi olusturuldu. Nakliyeci isi baslatinca durum guncellenecek.",
      };
    case "BASLATILDI":
      return {
        title: "Nakliye basladi",
        description:
          "Tasima sureci resmi olarak basladi. Guncel durumlari bu ekrandan takip edebilirsin.",
      };
    case "TESLIM_BEKLIYOR":
      return {
        title: "Teslim edildi, musteri onayi bekleniyor",
        description:
          "Nakliyeci teslimati bildirdi. Teslimat tamamlandiysa asagidan onaylayabilirsin.",
      };
    case "TAMAMLANDI":
      return {
        title: "Nakliye tamamlandi",
        description:
          "Tasima sureci tamamlandi. Kapanis puanlamasi ve genel kayit bilgileri asagida gorunuyor.",
      };
    default:
      return {
        title: "Bu istek icin anlasma saglandi",
        description: "Nakliye kaydi olustu ve durum bilgisi bu ekrandan takip edilebilir.",
      };
  }
}

function getJobStatusLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return "Hazir";
    case "BASLATILDI":
      return "Yolda";
    case "TESLIM_BEKLIYOR":
      return "Musteri onayi bekliyor";
    case "TAMAMLANDI":
      return "Teslim edildi";
    default:
      return status;
  }
}

function formatRouteTitle(request: TransportRequestDetail): string {
  return `${request.baslangicSehri} -> ${request.varisSehri}`;
}

function formatRouteMeta(request: TransportRequestDetail): string | null {
  const pickup = request.baslangicKonumMetni?.trim();
  const dropoff = request.varisKonumMetni?.trim();
  const pickupLabel = pickup && pickup !== request.baslangicSehri ? pickup : null;
  const dropoffLabel = dropoff && dropoff !== request.varisSehri ? dropoff : null;

  if (!pickupLabel && !dropoffLabel) {
    return null;
  }

  return `${pickupLabel ?? request.baslangicSehri} -> ${dropoffLabel ?? request.varisSehri}`;
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

function StatusCallout({
  tone,
  title,
  description,
}: {
  tone: "emerald" | "slate";
  title: string;
  description: string;
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-slate-200 bg-slate-50 text-slate-900";
  const bodyToneClasses =
    tone === "emerald" ? "text-emerald-800" : "text-slate-600";

  return (
    <div className={`rounded-[1.25rem] border px-4 py-4 ${toneClasses}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className={`mt-2 text-sm leading-6 ${bodyToneClasses}`}>{description}</p>
    </div>
  );
}

export default function TransportRequestDetailPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const confirm = useConfirm();
  const showToast = useToast();
  const params = useParams<{ id: string }>();
  const requestId = params.id;
  const [request, setRequest] = useState<TransportRequestDetail | null>(null);
  const [incomingOffers, setIncomingOffers] = useState<IncomingOfferItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
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
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await getTransportRequestDetail(requestId, accessToken);

        if (!isMounted) {
          return;
        }

        setRequest(response);

        try {
          const incomingOffersResponse = await getIncomingOffersForRequest(
            requestId,
            accessToken
          );

          if (!isMounted) {
            return;
          }

          setIncomingOffers(incomingOffersResponse);
        } catch (offersError) {
          if (!isMounted) {
            return;
          }

          if (offersError instanceof ApiClientError && offersError.status === 401) {
            clearStoredAuth();
            router.replace("/login");
            return;
          }

          if (offersError instanceof ApiClientError && offersError.status === 403) {
            router.replace("/");
            return;
          }
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

        if (error instanceof ApiClientError && error.status === 404) {
          setErrorMessage("Bu istek bulunamadi.");
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
  }, [accessToken, reloadKey, requestId, router, status]);

  const handleDelete = async () => {
    if (!accessToken || !request || isDeleting || request.nakliye) {
      return;
    }

    const isConfirmed = await confirm({
      title: "Tasima istegini sil",
      message: "Bu tasima istegini silmek istedigine emin misin?",
      tone: "danger",
      confirmLabel: "Sil",
      cancelLabel: "Vazgec",
      defaultFocus: "reject",
      dismissableMask: false,
    });

    if (!isConfirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteTransportRequest(request.id, accessToken);
      showToast({
        severity: "success",
        summary: "Istek silindi",
        detail: "Tasima istegi listeden kaldirildi.",
      });
      router.replace("/dashboard/isteklerim");
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        showToast({
          severity: "error",
          summary: "Oturum sona erdi",
          detail: "Lutfen yeniden giris yapin.",
          life: 3400,
          closable: true,
        });
        router.replace("/login");
        return;
      }

      if (error instanceof ApiClientError && error.status === 403) {
        showToast({
          severity: "error",
          summary: "Yetki yok",
          detail: "Bu islem icin yetkin yok.",
          life: 3400,
          closable: true,
        });
        router.replace("/");
        return;
      }

      if (error instanceof ApiClientError && error.status === 404) {
        showToast({
          severity: "warn",
          summary: "Istek bulunamadi",
          detail: "Listeye yonlendiriliyorsun.",
          life: 3200,
          closable: true,
        });
        router.replace("/dashboard/isteklerim");
        return;
      }

      showToast({
        severity: "error",
        summary: "Istek silinemedi",
        detail:
          error instanceof ApiClientError
            ? error.message
            : "Istek silinirken beklenmeyen bir hata olustu.",
        life: 3600,
        closable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (
      !accessToken ||
      !request?.nakliye ||
      !request.nakliye.canConfirmDelivery ||
      isConfirmingDelivery
    ) {
      return;
    }

    const isConfirmed = await confirm({
      title: "Teslimati onayla",
      message: "Teslimatin tamamlandigini onaylamak istedigine emin misin?",
      confirmLabel: "Teslimati onayla",
      cancelLabel: "Vazgec",
      defaultFocus: "accept",
      dismissableMask: true,
    });

    if (!isConfirmed) {
      return;
    }

    try {
      setIsConfirmingDelivery(true);
      await confirmJobDelivery(request.nakliye.id, accessToken);
      showToast({
        severity: "success",
        summary: "Teslimat onaylandi",
        detail: "Nakliye tamamlandi.",
      });
      setReloadKey((currentKey) => currentKey + 1);
    } catch (error) {
      showToast({
        severity: "error",
        summary: "Teslimat onaylanamadi",
        detail:
          error instanceof ApiClientError
            ? error.message
            : "Teslimat onaylanirken beklenmeyen bir hata olustu.",
        life: 3600,
        closable: true,
      });
      setReloadKey((currentKey) => currentKey + 1);
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  const handleCreateRating = async (input: { puanDegeri: number; yorum?: string }) => {
    if (!accessToken || !request?.nakliye || isSubmittingRating) {
      return;
    }

    try {
      setIsSubmittingRating(true);
      await createRatingForJob(request.nakliye.id, input, accessToken);
      showToast({
        severity: "success",
        summary: "Puan kaydedildi",
        detail: "Degerlendirmen basariyla gonderildi.",
      });
      setReloadKey((currentKey) => currentKey + 1);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        showToast({
          severity: "error",
          summary: "Oturum sona erdi",
          detail: "Lutfen yeniden giris yapin.",
          life: 3400,
          closable: true,
        });
        router.replace("/login");
        return;
      }

      if (error instanceof ApiClientError && error.status === 403) {
        showToast({
          severity: "error",
          summary: "Yetki yok",
          detail: "Bu islem icin yetkin yok.",
          life: 3400,
          closable: true,
        });
        router.replace("/");
        return;
      }

      if (error instanceof ApiClientError && error.status === 404) {
        showToast({
          severity: "warn",
          summary: "Nakliye bulunamadi",
          detail: "Kayit guncellenecek.",
          life: 3200,
          closable: true,
        });
        setReloadKey((currentKey) => currentKey + 1);
        return;
      }

      showToast({
        severity: "error",
        summary: "Puan gonderilemedi",
        detail:
          error instanceof ApiClientError
            ? error.message
            : "Puan gonderilirken beklenmeyen bir hata olustu.",
        life: 3600,
        closable: true,
      });
      setReloadKey((currentKey) => currentKey + 1);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const canMutateRequest = Boolean(
    request && request.durum === "OLUSTURULDU" && request.nakliye === null
  );
  const jobStatusCopy = request?.nakliye
    ? getJobStatusCopy(request.nakliye.durum)
    : null;
  const routeTitle = request ? formatRouteTitle(request) : "";
  const routeMeta = request ? formatRouteMeta(request) : null;
  const imageCount = request?.images?.length ?? 0;

  return (
    <CustomerTransportRequestsShell
      title="Istek detayi"
      description={
        request
          ? "Talep ozeti, yuk fotograflari ve gelen teklifleri tek ekranda yonet."
          : "Kayit bilgileri yukleniyor."
      }
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
                  <StatusBadge
                    status={request.durum}
                    label={getRequestStatusLabel(request.durum)}
                  />
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    Istek detayi
                  </span>
                  {request.nakliye ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Nakliye olustu
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-[1.75rem] font-black tracking-tight text-slate-950 md:text-[2rem]">
                    {routeTitle}
                  </h1>
                  {routeMeta ? (
                    <p className="max-w-3xl text-sm leading-6 text-slate-500">{routeMeta}</p>
                  ) : null}
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
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Tasima {formatTransportDate(request.tasimaTarihi)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      request.tekTasimaIstiyor
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {request.tekTasimaIstiyor ? "Tek tasima" : "Paylasimli olabilir"}
                  </span>
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

                {jobStatusCopy ? (
                  <StatusCallout
                    tone="emerald"
                    title={jobStatusCopy.title}
                    description={jobStatusCopy.description}
                  />
                ) : (
                  <StatusCallout
                    tone="slate"
                    title="Talep su anda teklif topluyor"
                    description="Duzenleme, silme ve gelen teklifleri inceleme aksiyonlari bu kayit acik kaldigi surece kullanilabilir."
                  />
                )}
              </div>
            </div>
          </section>

          <div data-dashboard-stats className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CustomerMetricCard
              label="Gelen teklif"
              value={incomingOffers.length}
              hint="Bu kayit icin ulasan toplam teklif"
              tone="blue"
              icon={<i className="pi pi-inbox text-lg" />}
            />
            <CustomerMetricCard
              label="Fotograf"
              value={imageCount}
              hint="Yuke eklenen gorsel adedi"
              tone="amber"
              icon={<i className="pi pi-images text-lg" />}
            />
            <CustomerMetricCard
              label="Kayit durumu"
              value={getRequestStatusLabel(request.durum)}
              hint="Talebin operasyonel asamasi"
              tone="emerald"
              icon={<i className="pi pi-flag text-lg" />}
            />
            <CustomerMetricCard
              label="Tasima modeli"
              value={request.tekTasimaIstiyor ? "Tek" : "Esnek"}
              hint="Yukun paylasim tercihi"
              tone="violet"
              icon={<i className="pi pi-box text-lg" />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_360px] xl:items-start">
            <div className="space-y-4">
              {imageCount > 0 ? (
                <RequestImageGallery
                  images={request.images ?? []}
                  primaryImageId={request.primaryImageId}
                />
              ) : (
                <EmptyStateCard
                  eyebrow="Fotograf galerisi"
                  title="Bu talep icin henuz fotograf yok"
                  description="Istek acik durumdayken Duzenle ekranindan yuk fotograflari ekleyebilirsin."
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
                      value={formatTransportDate(request.tasimaTarihi)}
                    />
                    <DetailInfoRow
                      label="Tasima tercihi"
                      value={request.tekTasimaIstiyor ? "Tek tasima" : "Paylasimli olabilir"}
                    />
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Baslangic
                      </p>
                      <p className="mt-2 text-base font-bold text-slate-950">
                        {formatLocationLabel(request.baslangicKonumMetni, request.baslangicSehri)}
                      </p>
                      <dl className="mt-3 space-y-2.5">
                        <DetailInfoRow
                          label="Sehir"
                          value={request.normalizeBaslangicSehir || request.baslangicSehri}
                        />
                        {request.normalizeBaslangicIlce ? (
                          <DetailInfoRow label="Ilce" value={request.normalizeBaslangicIlce} />
                        ) : null}
                      </dl>
                    </div>

                    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Varis
                      </p>
                      <p className="mt-2 text-base font-bold text-slate-950">
                        {formatLocationLabel(request.varisKonumMetni, request.varisSehri)}
                      </p>
                      <dl className="mt-3 space-y-2.5">
                        <DetailInfoRow
                          label="Sehir"
                          value={request.normalizeVarisSehir || request.varisSehri}
                        />
                        {request.normalizeVarisIlce ? (
                          <DetailInfoRow label="Ilce" value={request.normalizeVarisIlce} />
                        ) : null}
                      </dl>
                    </div>
                  </div>

                  <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Yuk notu
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {request.yukDetay || "Ek not paylasilmadi."}
                    </p>
                  </div>
                </div>
              </CustomerSectionSurface>

              {request.nakliye ? (
                <RatingComposerCard
                  eyebrow="Kapanis degerlendirmesi"
                  title="Nakliyeciyi puanla"
                  description="Tamamlanan nakliye sonrasinda nakliyeci deneyimini 1 ile 5 arasinda puanlayabilirsin."
                  shipmentStatus={request.nakliye.durum}
                  pendingDescription="Nakliye tamamlandiginda nakliyeciyi puanlama alani burada acilacak."
                  canRateCounterparty={request.nakliye.ratingContext.canRateCounterparty}
                  mySubmittedRating={request.nakliye.ratingContext.mySubmittedRating}
                  isSubmitting={isSubmittingRating}
                  onSubmit={handleCreateRating}
                />
              ) : null}
            </div>

            <div className="space-y-4">
              <CustomerSectionSurface
                title="Istek durumu"
                description="Kaydin guncel durumu ve kullanabilecegin mevcut aksiyonlar."
                action={
                  canMutateRequest ? (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/isteklerim/${request.id}/duzenle`}
                        className="app-button-secondary"
                      >
                        Duzenle
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleDelete()}
                        disabled={isDeleting}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? "Siliniyor..." : "Sil"}
                      </button>
                    </div>
                  ) : undefined
                }
              >
                <dl className="space-y-3">
                  <DetailInfoRow label="Kayit" value="Istek kaydi" />
                  <DetailInfoRow
                    label="Durum"
                    value={getRequestStatusLabel(request.durum)}
                  />
                  <DetailInfoRow
                    label="Tasima tarihi"
                    value={formatTransportDate(request.tasimaTarihi)}
                  />
                  <DetailInfoRow label="Gelen teklif" value={`${incomingOffers.length}`} />
                  <DetailInfoRow label="Fotograf" value={`${imageCount}`} />
                </dl>

                <div className="mt-4">
                  {jobStatusCopy ? (
                    <StatusCallout
                      tone="emerald"
                      title={jobStatusCopy.title}
                      description={jobStatusCopy.description}
                    />
                  ) : (
                    <StatusCallout
                      tone="slate"
                      title={
                        canMutateRequest
                          ? "Kayit su an acik durumda"
                          : "Bu kayit artik duzenlenemiyor"
                      }
                      description={
                        canMutateRequest
                          ? "Konum, yuk bilgileri ve fotograflari guncellemeye devam edebilirsin."
                          : "Teklif karari verildigi veya nakliye kaydi olustugu icin temel alanlar kilitlendi."
                      }
                    />
                  )}
                </div>
              </CustomerSectionSurface>

              {request.nakliye ? (
                <CustomerSectionSurface
                  title="Olusan nakliye"
                  description="Kabul edilen tekliften dogan tasima kaydinin mevcut durumu."
                >
                  <dl className="space-y-3">
                    <div className="rounded-[1rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <dt className="text-sm font-semibold text-slate-700">Durum</dt>
                      <dd className="mt-2">
                        <StatusBadge
                          status={request.nakliye.durum}
                          label={getJobStatusLabel(request.nakliye.durum)}
                        />
                      </dd>
                    </div>
                    <DetailInfoRow label="Nakliye kaydi" value="Olusturuldu" />
                    <DetailInfoRow
                      label="Anlasilan fiyat"
                      value={formatCurrency(request.nakliye.anlasilanFiyat)}
                    />
                    <DetailInfoRow
                      label="Nakliyeci"
                      value={request.nakliye.carrierName}
                    />
                    <DetailInfoRow
                      label="Kullanici adi"
                      value={`@${request.nakliye.carrierUsername}`}
                    />
                    <DetailInfoRow
                      label="Arac plakasi"
                      value={request.nakliye.aracPlaka}
                    />
                    <DetailInfoRow
                      label="Kayit zamani"
                      value={formatDate(request.nakliye.olusturmaTarihi)}
                    />
                    <DetailInfoRow
                      label="Baslangic"
                      value={
                        request.nakliye.baslangicTarihi
                          ? formatDate(request.nakliye.baslangicTarihi)
                          : "Henuz baslamadi"
                      }
                    />
                    <DetailInfoRow
                      label="Teslim bildirimi"
                      value={
                        request.nakliye.teslimBildirimTarihi
                          ? formatDate(request.nakliye.teslimBildirimTarihi)
                          : "Henuz bildirilmedi"
                      }
                    />
                    <DetailInfoRow
                      label="Teslim"
                      value={
                        request.nakliye.teslimTarihi
                          ? formatDate(request.nakliye.teslimTarihi)
                          : "Henuz tamamlanmadi"
                      }
                    />
                  </dl>
                  {request.nakliye.canConfirmDelivery ? (
                    <button
                      type="button"
                      onClick={() => void handleConfirmDelivery()}
                      disabled={isConfirmingDelivery}
                      className="app-button-primary mt-4 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isConfirmingDelivery ? "Onaylaniyor..." : "Teslimati onayla"}
                    </button>
                  ) : null}
                </CustomerSectionSurface>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </CustomerTransportRequestsShell>
  );
}
