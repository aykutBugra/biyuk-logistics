"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import CustomerSectionSurface from "@/components/CustomerSectionSurface";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import RatingComposerCard from "@/components/RatingComposerCard";
import StatusBadge from "@/components/StatusBadge";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getJobDetail,
  markJobDelivered,
  startJob,
  type JobDetail,
} from "@/lib/api/jobs";
import { createRatingForJob } from "@/lib/api/ratings";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import { useConfirm } from "@/lib/confirm/confirm-context";
import {
  formatLocationLabel,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";
import { emitNotificationsChanged } from "@/lib/notifications/notification-events";
import { useToast } from "@/lib/toast/toast-context";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Henuz yok";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPlanningDate(value: string | null): string {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function getJobStatusLabel(status: string): string {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return "Hazir";
    case "BASLATILDI":
      return "Yolda";
    case "TESLIM_BEKLIYOR":
      return "Teslim edildi, musteri onayi bekleniyor";
    case "TAMAMLANDI":
      return "Teslim edildi";
    default:
      return status;
  }
}

// Job durumuna gore detay sayfasindaki bilgilendirme metni belirlenir.
function getJobStatusCopy(status: string): { title: string; description: string } {
  switch (status.trim().toUpperCase()) {
    case "OLUSTURULDU":
      return {
        title: "Yukleme oncesi hazirlik asamasi",
        description:
          "Teklif kabul edildi ve nakliye kaydi olustu. Yola cikis oncesi son kontrollerini tamamlayabilirsin.",
      };
    case "BASLATILDI":
      return {
        title: "Nakliye operasyonu aktif",
        description:
          "Tasima sureci resmen basladi. Baslangic ve teslim adimlari bu kayit uzerinden izlenir.",
      };
    case "TESLIM_BEKLIYOR":
      return {
        title: "Teslim edildi, musteri onayi bekleniyor",
        description:
          "Teslimat bildirildi. Nakliye, musteri onayi geldikten sonra tamamlanacak.",
      };
    case "TAMAMLANDI":
      return {
        title: "Nakliye basariyla tamamlandi",
        description:
          "Teslimat kaydi kapandi. Geri bildirim ve gecmis operasyon ozetleri asagida gorunuyor.",
      };
    default:
      return {
        title: "Nakliye durumu guncel",
        description: "Bu kayit icin son operasyon bilgileri tek ekranda toplanir.",
      };
  }
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

function TimelineStep({
  step,
  title,
  description,
  value,
  isComplete,
  isCurrent,
  isLast = false,
}: {
  step: 1 | 2 | 3;
  title: string;
  description: string;
  value: string;
  isComplete: boolean;
  isCurrent?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black ${
            isComplete
              ? "border-emerald-200 bg-emerald-500 text-white"
              : isCurrent
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-white text-slate-400"
          }`}
        >
          {step}
        </span>
        {!isLast ? <span className="mt-2 h-full min-h-[2rem] w-px bg-slate-200" /> : null}
      </div>

      <div className="min-w-0 flex-1 pb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-base font-black tracking-tight text-slate-950">{title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

function InfoBanner({
  tone,
  children,
}: {
  tone: "amber" | "blue";
  children: string;
}) {
  const className =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={`rounded-[1.2rem] border px-4 py-3 text-sm ${className}`}>
      {children}
    </div>
  );
}

// Nakliyeci tek nakliye kaydini, baslat/tamamla aksiyonunu ve puanlamayi yonetir.
export default function CarrierJobDetailPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const confirm = useConfirm();
  const showToast = useToast();
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingAction, setActingAction] = useState<"start" | "complete" | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Job id ve nakliyeci token'i hazir olmadan detay endpoint'i cagrilmaz.
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    if (!jobId.trim()) {
      setErrorMessage("Gecersiz nakliye numarasi.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadJob = async () => {
      try {
        // Detay response'u lifecycle capability ve ratingContext bilgilerini de tasir.
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getJobDetail(jobId, accessToken, "carrier");

        if (!isMounted) {
          return;
        }

        setJob(response);
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
          setErrorMessage("Bu nakliye bulunamadi.");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Nakliye detayi yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadJob();

    return () => {
      isMounted = false;
    };
  }, [accessToken, jobId, reloadKey, router, status]);

  // Nakliye baslatma/tamamlama aksiyonlari tek handler'da action parametresiyle ayrilir.
  const handleLifecycleAction = async (action: "start" | "complete") => {
    if (!accessToken || !job || actingAction !== null) {
      return;
    }

    const confirmMessage =
      action === "start"
        ? "Bu isi baslatmak istedigine emin misin?"
        : "Teslimati musteri onayina gondermek istedigine emin misin?";

    const isConfirmed = await confirm({
      title: action === "start" ? "Nakliyeyi baslat" : "Teslimati bildir",
      message: confirmMessage,
      confirmLabel: action === "start" ? "Baslat" : "Teslimati bildir",
      cancelLabel: "Vazgec",
      defaultFocus: "accept",
      dismissableMask: true,
    });

    if (!isConfirmed) {
      return;
    }

    try {
      setActingAction(action);

      if (action === "start") {
        await startJob(job.id, accessToken);
        showToast({
          severity: "success",
          summary: "Nakliye baslatildi",
          detail: "Is artik aktif surecte.",
        });
      } else {
        await markJobDelivered(job.id, accessToken);
        emitNotificationsChanged();
        showToast({
          severity: "success",
          summary: "Teslimat bildirildi",
          detail: "Musteri onayi bekleniyor.",
        });
      }

      setReloadKey((currentKey) => currentKey + 1);
    } catch (error) {
      // Auth/rol/bulunamama hatalarinda stale detay sayfasinda kalinmaz.
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
          detail: "Listeye yonlendiriliyorsun.",
          life: 3200,
          closable: true,
        });
        router.replace("/dashboard/nakliyelerim");
        return;
      }

      showToast({
        severity: "error",
        summary: "Durum guncellenemedi",
        detail:
          error instanceof ApiClientError
            ? error.message
            : "Nakliye durumu guncellenirken beklenmeyen bir hata olustu.",
        life: 3600,
        closable: true,
      });
      setReloadKey((currentKey) => currentKey + 1);
    } finally {
      setActingAction(null);
    }
  };

  // Tamamlanan is icin nakliyeci karsi tarafa puan verir ve detay yeniden yuklenir.
  const handleCreateRating = async (input: { puanDegeri: number; yorum?: string }) => {
    if (!accessToken || !job || isSubmittingRating) {
      return;
    }

    try {
      setIsSubmittingRating(true);
      await createRatingForJob(job.id, input, accessToken);
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
        router.replace("/dashboard/nakliyelerim");
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="font-medium text-gray-600">Yukleniyor...</div>
      </div>
    );
  }

  const statusCopy = job ? getJobStatusCopy(job.durum) : null;
  const routeTitle = job ? `${job.baslangicSehri} -> ${job.varisSehri}` : "";

  return (
    <CarrierVehiclesShell
      title="Nakliye detayi"
      description="Operasyon durumunu, taraf bilgilerini ve teslim akisindaki adimlari tek ekranda yonet."
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

      {!isLoading && !errorMessage && job ? (
        <div className="space-y-6">
          <section
            data-dashboard-primary
            className="app-surface-strong rounded-[1.85rem] border border-slate-200/80 px-5 py-5 shadow-sm md:px-6 md:py-6"
          >
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={job.durum} label={getJobStatusLabel(job.durum)} />
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    Nakliye detayi
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    Bagli istek
                  </span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-[2rem] font-black tracking-tight text-slate-950 md:text-[2.35rem]">
                    {routeTitle}
                  </h1>
                  <p className="max-w-3xl text-sm leading-6 text-slate-500">
                    Musteri: {job.customer.name} (@{job.customer.username})
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {getCargoTypeLabel(job.yukTipi)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {formatWeightKg(job.agirlikKg)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {formatVolumeM3(job.hacimM3)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Tasima {formatPlanningDate(job.tasimaTarihi)}
                  </span>
                  {job.tekTasimaIstiyor ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Tek tasima
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[340px] xl:grid-cols-1">
                <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50/80 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Anlasilan fiyat
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-emerald-800">
                    {formatCurrency(job.anlasilanFiyat)}
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Arac / plaka
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {job.vehicle.plaka} - {job.vehicle.marka} {job.vehicle.model}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  {job.canStart ? (
                    <button
                      type="button"
                      onClick={() => void handleLifecycleAction("start")}
                      disabled={actingAction !== null}
                      className="app-button-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actingAction === "start" ? "Baslatiliyor..." : "Baslat"}
                    </button>
                  ) : null}
                  {job.canMarkDelivered ? (
                    <button
                      type="button"
                      onClick={() => void handleLifecycleAction("complete")}
                      disabled={actingAction !== null}
                      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actingAction === "complete" ? "Bildiriliyor..." : "Teslimati bildir"}
                    </button>
                  ) : null}
                  <Link href="/dashboard/nakliyelerim" className="app-button-secondary">
                    Listeye don
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <div data-dashboard-stats className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CustomerMetricCard
              label="Durum"
              value={getJobStatusLabel(job.durum)}
              hint="Aktif operasyon asamasi"
              tone="blue"
              icon={<i className="pi pi-sync text-lg" />}
            />
            <CustomerMetricCard
              label="Arac"
              value={job.vehicle.plaka}
              hint="Operasyona atanan plaka"
              tone="violet"
              icon={<i className="pi pi-truck text-lg" />}
            />
            <CustomerMetricCard
              label="Musteri"
              value={job.customer.username}
              hint="Operasyonun karsi tarafi"
              tone="amber"
              icon={<i className="pi pi-user text-lg" />}
            />
            <CustomerMetricCard
              label="Tasima modeli"
              value={job.tekTasimaIstiyor ? "Tek" : "Esnek"}
              hint="Yuk paylasim tercihi"
              tone="emerald"
              icon={<i className="pi pi-box text-lg" />}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_360px] xl:items-start">
            <div className="space-y-6">
              <CustomerSectionSurface
                title="Operasyon zaman cizelgesi"
                description="Nakliye kaydinin resmi adimlari ve tarihleri."
              >
                <div className="space-y-1">
                  <TimelineStep
                    step={1}
                    title="Teklif kabul edildi"
                    description="Nakliye kaydi olustu ve operasyon resmen basladi."
                    value={formatDateTime(job.olusturmaTarihi)}
                    isComplete
                  />
                  <TimelineStep
                    step={2}
                    title="Yukleme / yola cikis"
                    description="Nakliyeci yuklemeyi baslattiginda bu adim aktif hale gelir."
                    value={formatDateTime(job.baslangicTarihi)}
                    isComplete={job.baslangicTarihi !== null}
                    isCurrent={job.canStart}
                  />
                  <TimelineStep
                    step={3}
                    title="Teslimat onayi"
                    description="Nakliyeci teslimati bildirir, musteri onayi gelince operasyon kapanir."
                    value={formatDateTime(job.teslimTarihi ?? job.teslimBildirimTarihi)}
                    isComplete={job.teslimTarihi !== null}
                    isCurrent={
                      job.canMarkDelivered ||
                      job.durum.trim().toUpperCase() === "TESLIM_BEKLIYOR"
                    }
                    isLast
                  />
                </div>
              </CustomerSectionSurface>

              <CustomerSectionSurface
                title="Yuk ozeti"
                description="Fiyatlama ve tasima planini etkileyen temel yuk bilgileri."
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailInfoRow label="Yuk tipi" value={getCargoTypeLabel(job.yukTipi)} />
                  <DetailInfoRow label="Agirlik" value={formatWeightKg(job.agirlikKg)} />
                  <DetailInfoRow label="Hacim" value={formatVolumeM3(job.hacimM3)} />
                  <DetailInfoRow
                    label="Tasima tarihi"
                    value={formatPlanningDate(job.tasimaTarihi)}
                  />
                  <div className="md:col-span-2">
                    <DetailInfoRow
                      label="Tasima tercihi"
                      value={job.tekTasimaIstiyor ? "Tek tasima" : "Paylasimli olabilir"}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-[1.15rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Operasyon notu
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {job.yukDetay || "Ek operasyon notu bulunmuyor."}
                  </p>
                </div>
              </CustomerSectionSurface>

              <CustomerSectionSurface
                title="Baslangic ve teslim"
                description="Yukleme ve teslim noktalarinin kayitli detaylari."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Baslangic
                    </p>
                    <p className="mt-2 text-base font-bold text-slate-950">
                      {formatLocationLabel(job.baslangicKonumMetni, job.baslangicSehri)}
                    </p>
                    <dl className="mt-4 space-y-3">
                      <DetailInfoRow label="Sehir" value={job.baslangicSehri} />
                    </dl>
                  </div>

                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Teslim
                    </p>
                    <p className="mt-2 text-base font-bold text-slate-950">
                      {formatLocationLabel(job.varisKonumMetni, job.varisSehri)}
                    </p>
                    <dl className="mt-4 space-y-3">
                      <DetailInfoRow label="Sehir" value={job.varisSehri} />
                    </dl>
                  </div>
                </div>
              </CustomerSectionSurface>

              <RatingComposerCard
                eyebrow="Kapanis degerlendirmesi"
                title="Musteriyi puanla"
                description="Tamamlanan nakliye sonrasinda musteri deneyimini 1 ile 5 arasinda puanlayabilirsin."
                shipmentStatus={job.durum}
                pendingDescription="Nakliye tamamlandiginda musteri puanlama alani burada acilacak."
                canRateCounterparty={job.ratingContext.canRateCounterparty}
                mySubmittedRating={job.ratingContext.mySubmittedRating}
                isSubmitting={isSubmittingRating}
                onSubmit={handleCreateRating}
              />
            </div>

            <div className="space-y-6">
              <CustomerSectionSurface
                title="Teslimat ozeti"
                description="Durum, fiyat ve resmi tarihlerin hizli ozeti."
              >
                <dl className="space-y-3">
                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <dt className="text-sm font-semibold text-slate-700">Durum</dt>
                    <dd className="mt-2">
                      <StatusBadge status={job.durum} label={getJobStatusLabel(job.durum)} />
                    </dd>
                  </div>
                  <DetailInfoRow label="Anlasilan fiyat" value={formatCurrency(job.anlasilanFiyat)} />
                  <DetailInfoRow label="Kayit tarihi" value={formatDateTime(job.olusturmaTarihi)} />
                  <DetailInfoRow label="Baslangic" value={formatDateTime(job.baslangicTarihi)} />
                  <DetailInfoRow label="Teslim bildirimi" value={formatDateTime(job.teslimBildirimTarihi)} />
                  <DetailInfoRow label="Teslim" value={formatDateTime(job.teslimTarihi)} />
                </dl>

                <div className="mt-4 rounded-[1.2rem] border border-blue-200 bg-blue-50/70 px-4 py-4">
                  <p className="text-sm font-semibold text-blue-950">{statusCopy?.title}</p>
                  <p className="mt-2 text-sm leading-6 text-blue-800">{statusCopy?.description}</p>
                </div>
              </CustomerSectionSurface>

              <CustomerSectionSurface
                title="Arac ve kapasite"
                description="Operasyona atanan arac kaydi."
              >
                <dl className="space-y-3">
                  <DetailInfoRow
                    label="Arac"
                    value={`${job.vehicle.marka} ${job.vehicle.model}`}
                  />
                  <DetailInfoRow label="Plaka" value={job.vehicle.plaka} />
                  <DetailInfoRow
                    label="Arsiv durumu"
                    value={job.vehicle.isArchived ? "Arsivlenmis" : "Aktif kayit"}
                  />
                </dl>

                {job.vehicle.isArchived ? (
                  <div className="mt-4">
                    <InfoBanner tone="amber">
                      Bu nakliye arsivlenmis bir arac referansi tasiyor. Gecmis kaydi korunuyor;
                      lifecycle aksiyonlari durum kurallarina gore devam eder.
                    </InfoBanner>
                  </div>
                ) : null}
              </CustomerSectionSurface>

              <CustomerSectionSurface
                title="Musteri bilgisi"
                description="Operasyonun karsi tarafina ait temel bilgiler."
              >
                <div className="flex items-start gap-4 rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <CustomerInitialsAvatar
                    name={job.customer.name}
                    fallback={job.customer.username}
                    size="lg"
                    tone="blue"
                  />
                  <div className="min-w-0">
                    <p className="text-base font-black tracking-tight text-slate-950">
                      {job.customer.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">@{job.customer.username}</p>
                  </div>
                </div>
              </CustomerSectionSurface>

              <CustomerSectionSurface
                title="Hizli aksiyonlar"
                description="Mevcut durum kurallarina gore kullanabilecegin islemler."
              >
                <div className="flex flex-col gap-3">
                  {job.canStart ? (
                    <button
                      type="button"
                      onClick={() => void handleLifecycleAction("start")}
                      disabled={actingAction !== null}
                      className="app-button-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actingAction === "start" ? "Baslatiliyor..." : "Nakliyeyi baslat"}
                    </button>
                  ) : null}
                  {job.canMarkDelivered ? (
                    <button
                      type="button"
                      onClick={() => void handleLifecycleAction("complete")}
                      disabled={actingAction !== null}
                      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actingAction === "complete" ? "Bildiriliyor..." : "Teslimati bildir"}
                    </button>
                  ) : null}
                  <Link href="/dashboard/nakliyelerim" className="app-button-secondary w-full justify-center">
                    Nakliyelerime don
                  </Link>
                </div>
              </CustomerSectionSurface>
            </div>
          </div>
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
