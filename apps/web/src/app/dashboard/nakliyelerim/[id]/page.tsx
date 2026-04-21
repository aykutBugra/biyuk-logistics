"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import RatingComposerCard from "@/components/RatingComposerCard";
import { ApiClientError } from "@/lib/api/api-client";
import { createRatingForJob } from "@/lib/api/ratings";
import {
  completeJob,
  getJobDetail,
  startJob,
  type JobDetail,
} from "@/lib/api/jobs";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import {
  formatLocationLabel,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";
import { emitNotificationsChanged } from "@/lib/notifications/notification-events";

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

export default function CarrierJobDetailPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const params = useParams<{ id: string }>();
  const jobId = Number(params.id);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingAction, setActingAction] = useState<"start" | "complete" | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    if (!Number.isInteger(jobId) || jobId <= 0) {
      setErrorMessage("Gecersiz nakliye numarasi.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadJob = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getJobDetail(jobId, accessToken);

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

  const handleLifecycleAction = async (action: "start" | "complete") => {
    if (!accessToken || !job || actingAction !== null) {
      return;
    }

    const confirmMessage =
      action === "start"
        ? "Bu isi baslatmak istedigine emin misin?"
        : "Bu isi tamamlamak istedigine emin misin?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setActingAction(action);

      if (action === "start") {
        await startJob(job.id, accessToken);
        window.alert("Nakliye baslatildi.");
      } else {
        await completeJob(job.id, accessToken);
        emitNotificationsChanged();
        window.alert("Nakliye tamamlandi.");
      }

      setReloadKey((currentKey) => currentKey + 1);
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
        window.alert("Bu nakliye artik bulunamiyor.");
        router.replace("/dashboard/nakliyelerim");
        return;
      }

      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Nakliye durumu guncellenirken beklenmeyen bir hata olustu."
      );
      setReloadKey((currentKey) => currentKey + 1);
    } finally {
      setActingAction(null);
    }
  };

  const handleCreateRating = async (input: { puanDegeri: number; yorum?: string }) => {
    if (!accessToken || !job || isSubmittingRating) {
      return;
    }

    try {
      setIsSubmittingRating(true);
      await createRatingForJob(job.id, input, accessToken);
      window.alert("Puanin kaydedildi.");
      setReloadKey((currentKey) => currentKey + 1);
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
        window.alert("Bu nakliye artik bulunamiyor.");
        router.replace("/dashboard/nakliyelerim");
        return;
      }

      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Puan gonderilirken beklenmeyen bir hata olustu."
      );
      setReloadKey((currentKey) => currentKey + 1);
    } finally {
      setIsSubmittingRating(false);
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
    <CarrierVehiclesShell title="Nakliye detayi">
      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-600 shadow-sm">
          Nakliye detayi yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Kayit goruntulenemedi</h2>
          <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && job ? (
        <div className="grid gap-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                    {job.durum}
                  </span>
                  <span>Nakliye #{job.id}</span>
                  <span>Istek #{job.requestId}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {formatLocationLabel(job.baslangicKonumMetni, job.baslangicSehri)}{" "}
                  {"->"} {formatLocationLabel(job.varisKonumMetni, job.varisSehri)}
                </h2>
                <p className="text-sm text-gray-500">
                  Musteri: {job.customer.name} (@{job.customer.username})
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {getCargoTypeLabel(job.yukTipi)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {formatWeightKg(job.agirlikKg)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {formatVolumeM3(job.hacimM3)}
                  </span>
                  {job.tekTasimaIstiyor ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                      Tek tasima
                    </span>
                  ) : null}
                  {job.tasimaTarihi ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {job.tasimaTarihi}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 md:items-end">
                <p className="text-sm font-semibold text-emerald-700">
                  {formatCurrency(job.anlasilanFiyat)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {job.canStart ? (
                    <button
                      type="button"
                      onClick={() => handleLifecycleAction("start")}
                      disabled={actingAction !== null}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actingAction === "start" ? "Baslatiliyor..." : "Baslat"}
                    </button>
                  ) : null}
                  {job.canComplete ? (
                    <button
                      type="button"
                      onClick={() => handleLifecycleAction("complete")}
                      disabled={actingAction !== null}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actingAction === "complete" ? "Tamamlaniyor..." : "Tamamla"}
                    </button>
                  ) : null}
                  <Link
                    href="/dashboard/nakliyelerim"
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Listeye Don
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {job.vehicle.isArchived ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Bu nakliye arsivlenmis bir arac referansi tasiyor. Gecmis kaydi
              korunuyor; lifecycle aksiyonlari durum kurallarina gore devam eder.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                Kayit
              </h3>
              <p className="mt-3 text-sm text-gray-600">
                {formatDateTime(job.olusturmaTarihi)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                Baslangic
              </h3>
              <p className="mt-3 text-sm text-gray-600">
                {formatDateTime(job.baslangicTarihi)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
                Teslim
              </h3>
              <p className="mt-3 text-sm text-gray-600">
                {formatDateTime(job.teslimTarihi)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">Yuk ozeti</h3>
            <dl className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Yuk tipi</dt>
                <dd>{getCargoTypeLabel(job.yukTipi)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Agirlik</dt>
                <dd>{formatWeightKg(job.agirlikKg)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Hacim</dt>
                <dd>{formatVolumeM3(job.hacimM3)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Tasima tarihi</dt>
                <dd>{job.tasimaTarihi ?? "Belirtilmedi"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 md:col-span-2">
                <dt className="font-medium text-gray-900">Tasima tercihi</dt>
                <dd>{job.tekTasimaIstiyor ? "Tek tasima" : "Paylasimli olabilir"}</dd>
              </div>
            </dl>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
              {job.yukDetay}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">Rota</h3>
              <dl className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Baslangic</dt>
                  <dd className="text-right">
                    {formatLocationLabel(job.baslangicKonumMetni, job.baslangicSehri)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Baslangic sehri</dt>
                  <dd>{job.baslangicSehri}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Varis</dt>
                  <dd className="text-right">
                    {formatLocationLabel(job.varisKonumMetni, job.varisSehri)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Varis sehri</dt>
                  <dd>{job.varisSehri}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">Arac ve taraflar</h3>
              <dl className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Arac</dt>
                  <dd>
                    {job.vehicle.plaka} - {job.vehicle.marka} {job.vehicle.model}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Musteri</dt>
                  <dd>{job.customer.name}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Musteri kullanici adi</dt>
                  <dd>@{job.customer.username}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Anlasilan fiyat</dt>
                  <dd>{formatCurrency(job.anlasilanFiyat)}</dd>
                </div>
              </dl>
            </div>
          </div>

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
      ) : null}
    </CarrierVehiclesShell>
  );
}
