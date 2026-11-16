"use client";

import CompactDetailLayout from "@/components/CompactDetailLayout";

import ShipmentsWorkspace from "@/features/carrier-workspace/ShipmentsWorkspace";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";

import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import { type MyShipmentCardModel } from "@/components/MyShipmentCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getJobDetail,
  getMyJobs,
  type JobDetail,
  type JobListItem,
} from "@/lib/api/jobs";
import {
  getMyOfferThreads,
  type OfferThreadSummary,
} from "@/lib/api/offer-threads";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import { dateOnlyToLocalDate, formatDateOnly } from "@/lib/date-only";
import {
  formatLocationLabel,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";

type ShipmentFilterTab = "all" | "active" | "on-road" | "completed";
type ShipmentSortMode = "newest" | "oldest" | "delivery-soon";

type ShipmentViewModel = MyShipmentCardModel & {
  searchText: string;
  createdSortValue: number;
  deliverySortValue: number;
  isTodayDelivery: boolean;
  isActive: boolean;
  isOnRoad: boolean;
  isCompleted: boolean;
};

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}

function isActiveJobStatus(status: string): boolean {
  const normalizedStatus = normalizeStatus(status);
  return (
    normalizedStatus === "OLUSTURULDU" ||
    normalizedStatus === "BASLATILDI" ||
    normalizedStatus === "TESLIM_BEKLIYOR"
  );
}

function isCompletedJobStatus(status: string): boolean {
  return normalizeStatus(status) === "TAMAMLANDI";
}

function formatDateTime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function formatPlanningDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return formatDateOnly(value);
}

function parsePlanningDate(value: string | null): Date | null {
  return dateOnlyToLocalDate(value);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function buildJobChips(detail: JobDetail | null) {
  if (!detail) {
    return [];
  }

  const chips: MyShipmentCardModel["chipler"] = [
    {
      label: getCargoTypeLabel(detail.yukTipi),
    },
  ];

  if (detail.agirlikKg !== null) {
    chips.push({ label: formatWeightKg(detail.agirlikKg) });
  }

  if (detail.hacimM3 !== null) {
    chips.push({ label: formatVolumeM3(detail.hacimM3) });
  }

  const planningDate = formatPlanningDate(detail.tasimaTarihi);

  if (planningDate) {
    chips.push({ label: `Tercih: ${planningDate}`, tone: "blue" as const });
  }

  if (detail.tekTasimaIstiyor) {
    chips.push({ label: "Tek tasima", tone: "amber" as const });
  }

  return chips;
}

function buildRouteMeta(job: JobListItem, detail: JobDetail | null): string | null {
  if (!detail) {
    return null;
  }

  const pickup = formatLocationLabel(
    detail.baslangicKonumMetni,
    detail.baslangicSehri
  );
  const dropoff = formatLocationLabel(detail.varisKonumMetni, detail.varisSehri);

  if (pickup === job.baslangicSehri && dropoff === job.varisSehri) {
    return null;
  }

  return `${pickup} -> ${dropoff}`;
}

function buildShipmentSignal(
  status: string,
  isDelayed: boolean
): Pick<MyShipmentCardModel, "sinyalEtiketi" | "sinyalTonu"> {
  if (isDelayed) {
    return {
      sinyalEtiketi: "Gecikme riski",
      sinyalTonu: "amber",
    };
  }

  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "TAMAMLANDI") {
    return {
      sinyalEtiketi: "Teslim edildi",
      sinyalTonu: "emerald",
    };
  }

  if (normalizedStatus === "BASLATILDI") {
    return {
      sinyalEtiketi: "Yolda",
      sinyalTonu: "blue",
    };
  }
  if (normalizedStatus === "TESLIM_BEKLIYOR") {
    return {
      sinyalEtiketi: "Musteri onayi bekliyor",
      sinyalTonu: "amber" as const,
    };
  }

  return {
    sinyalEtiketi: "Hazirlaniyor",
    sinyalTonu: "amber",
  };
}

function buildTimelineSteps(job: JobListItem, detail: JobDetail | null) {
  const normalizedStatus = normalizeStatus(job.durum);

  return [
    {
      label: "Teklif kabul edildi",
      timestamp: formatDateTime(job.olusturmaTarihi),
      state:
        normalizedStatus === "OLUSTURULDU" ||
        normalizedStatus === "BASLATILDI" ||
        normalizedStatus === "TESLIM_BEKLIYOR" ||
        normalizedStatus === "TAMAMLANDI"
          ? ("complete" as const)
          : ("pending" as const),
    },
    {
      label: "Yolda",
      timestamp: formatDateTime(detail?.baslangicTarihi ?? job.baslangicTarihi),
      state:
        normalizedStatus === "BASLATILDI"
          ? ("current" as const)
          : normalizedStatus === "TESLIM_BEKLIYOR" ||
              normalizedStatus === "TAMAMLANDI"
            ? ("complete" as const)
            : ("pending" as const),
    },
    {
      label: "Teslim onayi",
      timestamp: formatDateTime(
        detail?.teslimTarihi ??
          job.teslimTarihi ??
          detail?.teslimBildirimTarihi ??
          job.teslimBildirimTarihi
      ),
      state:
        normalizedStatus === "TAMAMLANDI"
          ? ("complete" as const)
          : normalizedStatus === "TESLIM_BEKLIYOR"
            ? ("current" as const)
          : ("pending" as const),
    },
  ];
}

function buildShipmentNote(status: string, isDelayed: boolean): string {
  if (isDelayed) {
    return "Planlanan teslim tarihi gecti. Detay sayfasindan operasyonu ve musteri ile iletisimi kontrol et.";
  }

  switch (normalizeStatus(status)) {
    case "BASLATILDI":
      return "Yuk sahada ilerliyor. Teslim sureci aktif olarak devam ediyor.";
    case "TESLIM_BEKLIYOR":
      return "Teslim edildi, musteri onayi bekleniyor.";
    case "TAMAMLANDI":
      return "Teslimat basariyla tamamlandi ve kayit kapanisa hazir.";
    default:
      return "Teklif kabul edildi. Cikis ve operasyon hazirligi devam ediyor.";
  }
}

export default function MyJobsPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [threads, setThreads] = useState<OfferThreadSummary[]>([]);
  const [jobDetailsById, setJobDetailsById] = useState<Record<string, JobDetail | null>>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ShipmentFilterTab>("all");
  const [sortMode, setSortMode] = useState<ShipmentSortMode>("newest");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrichmentPending, setIsEnriching] = useState(false);
  const isEnriching =
    status === "ready" &&
    Boolean(accessToken) &&
    jobs.length > 0 &&
    isEnrichmentPending;

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      return;
    }

    let isMounted = true;

    const loadJobs = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const [jobsResult, threadsResult] =
          await Promise.allSettled([
            getMyJobs(accessToken, "carrier"),
            getMyOfferThreads(accessToken, { as: "carrier" }),
          ]);

        if (!isMounted) {
          return;
        }

        if (jobsResult.status === "rejected") {
          throw jobsResult.reason;
        }

        if (
          threadsResult.status === "rejected" &&
          threadsResult.reason instanceof ApiClientError &&
          threadsResult.reason.status === 401
        ) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        if (
          threadsResult.status === "rejected" &&
          threadsResult.reason instanceof ApiClientError &&
          threadsResult.reason.status === 403
        ) {
          router.replace("/");
          return;
        }

        setJobs(jobsResult.value);
        setThreads(threadsResult.status === "fulfilled" ? threadsResult.value : []);
        setJobDetailsById({});
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

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Nakliyeler yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadJobs();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status]);

  useEffect(() => {
    if (status !== "ready" || !accessToken || jobs.length === 0) {
      return;
    }

    const missingDetailJobIds = jobs
      .map((job) => job.id)
      .filter((jobId) => jobDetailsById[jobId] === undefined);

    if (missingDetailJobIds.length === 0) {
      return;
    }

    let isMounted = true;

    const loadJobDetails = async () => {
      try {
        setIsEnriching(true);

        const results = await Promise.allSettled(
          missingDetailJobIds.map(async (jobId) => {
            const detail = await getJobDetail(jobId, accessToken, "carrier");
            return { jobId, detail };
          })
        );

        if (!isMounted) {
          return;
        }

        const hasUnauthorized = results.some(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof ApiClientError &&
            result.reason.status === 401
        );

        if (hasUnauthorized) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        const hasForbidden = results.some(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof ApiClientError &&
            result.reason.status === 403
        );

        if (hasForbidden) {
          router.replace("/");
          return;
        }

        setJobDetailsById((currentState) => {
          const nextState = { ...currentState };

          for (const [index, result] of results.entries()) {
            if (result.status === "fulfilled") {
              nextState[result.value.jobId] = result.value.detail;
              continue;
            }

            const jobId = missingDetailJobIds[index];
            nextState[jobId] = null;
          }

          return nextState;
        });
      } finally {
        if (!isMounted) {
          return;
        }

        setIsEnriching(false);
      }
    };

    void loadJobDetails();

    return () => {
      isMounted = false;
    };
  }, [accessToken, jobDetailsById, jobs, router, status]);

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="font-medium text-slate-600">Yukleniyor...</div>
      </div>
    );
  }

  const todayStart = startOfToday();
  const activeJobCount = jobs.filter((job) => isActiveJobStatus(job.durum)).length;
  const completedJobCount = jobs.filter((job) => isCompletedJobStatus(job.durum)).length;
  const threadByConversationKey = new Map<string, OfferThreadSummary>();

  for (const thread of threads) {
    const key = `${thread.requestId}-${thread.karsiTarafId}`;
    const currentValue = threadByConversationKey.get(key);

    if (!currentValue) {
      threadByConversationKey.set(key, thread);
      continue;
    }

    const currentTimestamp = new Date(currentValue.lastMessageAt ?? 0).getTime();
    const nextTimestamp = new Date(thread.lastMessageAt ?? 0).getTime();

    if (nextTimestamp >= currentTimestamp) {
      threadByConversationKey.set(key, thread);
    }
  }

  const shipmentCards: ShipmentViewModel[] = jobs.map((job) => {
    const detail = jobDetailsById[job.id] ?? null;
    const planningDate = parsePlanningDate(
      job.tahminiTeslimTarihi ?? detail?.tahminiTeslimTarihi ?? null
    );
    const isDelayed =
      planningDate !== null &&
      planningDate.getTime() < todayStart.getTime() &&
      !isCompletedJobStatus(job.durum);
    const signal = buildShipmentSignal(job.durum, isDelayed);
    const conversationThread =
      threadByConversationKey.get(`${job.requestId}-${job.counterpartyId}`) ?? null;
    const plannedPickupLabel = formatPlanningDate(
      job.planlananAlimTarihi ?? detail?.planlananAlimTarihi ?? null
    );
    const plannedDeliveryLabel = formatPlanningDate(
      job.tahminiTeslimTarihi ?? detail?.tahminiTeslimTarihi ?? null
    );
    const searchText = [
      job.baslangicSehri,
      job.varisSehri,
      job.counterpartyName,
      job.counterpartyUsername,
      detail?.yukTipi ? getCargoTypeLabel(detail.yukTipi) : null,
      detail?.yukDetay,
      detail?.vehicle.plaka,
      detail?.vehicle.marka,
      detail?.vehicle.model,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("tr-TR");

    return {
      id: job.id,
      requestId: job.requestId,
      durum: job.durum,
      rotaBaslik: `${job.baslangicSehri} -> ${job.varisSehri}`,
      rotaMeta: buildRouteMeta(job, detail),
      fiyat: job.anlasilanFiyat,
      musteriAdi: job.counterpartyName,
      musteriKullaniciAdi: job.counterpartyUsername,
      aracEtiketi: detail
        ? `Arac: ${detail.vehicle.plaka} - ${detail.vehicle.marka} ${detail.vehicle.model}`
        : `Arac: ${job.aracPlaka}`,
      chipler: buildJobChips(detail),
      planlananAlimTarihi: plannedPickupLabel,
      tahminiTeslimTarihi: plannedDeliveryLabel,
      kayitTarihi: formatDateTime(job.olusturmaTarihi) ?? "Bilinmiyor",
      durumNotu: buildShipmentNote(job.durum, isDelayed),
      sinyalEtiketi: signal.sinyalEtiketi,
      sinyalTonu: signal.sinyalTonu,
      isDelayed,
      detailHref: `/dashboard/nakliyelerim/${job.id}`,
      conversationHref: conversationThread
        ? `/dashboard/konusmalar/teklif/${conversationThread.offerId}`
        : null,
      timelineSteps: buildTimelineSteps(job, detail),
      searchText,
      createdSortValue: new Date(job.olusturmaTarihi).getTime(),
      deliverySortValue:
        planningDate?.getTime() ?? new Date(job.olusturmaTarihi).getTime(),
      isTodayDelivery:
        planningDate !== null && planningDate.getTime() === todayStart.getTime(),
      isActive: isActiveJobStatus(job.durum),
      isOnRoad: normalizeStatus(job.durum) === "BASLATILDI",
      isCompleted: isCompletedJobStatus(job.durum),
    };
  });

  const todayDeliveryCount = shipmentCards.filter((shipment) => shipment.isTodayDelivery).length;
  const delayedShipmentCount = shipmentCards.filter(
    (shipment) => shipment.isDelayed
  ).length;
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("tr-TR");
  const filteredShipments = shipmentCards.filter((shipment) => {
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      shipment.searchText.includes(normalizedSearchQuery);

    if (!matchesSearch) {
      return false;
    }

    switch (activeTab) {
      case "active":
        return shipment.isActive;
      case "on-road":
        return shipment.isOnRoad;
      case "completed":
        return shipment.isCompleted;
      default:
        return true;
    }
  });

  const sortedShipments = [...filteredShipments].sort((left, right) => {
    if (sortMode === "oldest") {
      return left.createdSortValue - right.createdSortValue;
    }

    if (sortMode === "delivery-soon") {
      return left.deliverySortValue - right.deliverySortValue;
    }

    return right.createdSortValue - left.createdSortValue;
  });

  const todayTasks = shipmentCards
    .filter((shipment) => shipment.isTodayDelivery)
    .sort((left, right) => left.deliverySortValue - right.deliverySortValue)
    .slice(0, 4);

  const handleResetLocalFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    setSortMode("newest");
  };

  return (
    <CompactDetailLayout>
<CarrierVehiclesShell title="Taşımalarım" description="Taşıma durumlarını, tarihleri ve teslimat adımlarını yönetin."
      headerVariant="compact" motionPreset="operational" cardMotionLimit={6}
      headerActions={<div className="flex flex-wrap items-center gap-3"><InlineHelpTrigger helpKey="my-shipments" /></div>}>
      <ShipmentsWorkspace items={sortedShipments} totalCount={jobs.length} isEnriching={isEnriching} todayTasks={todayTasks}
        isLoading={isLoading} errorMessage={errorMessage} query={searchQuery} filter={activeTab} sort={sortMode}
        onQueryChange={setSearchQuery} onFilterChange={setActiveTab} onSortChange={setSortMode} onReset={handleResetLocalFilters}
        metrics={[
          { label: "Aktif nakliye", value: activeJobCount, description: "Devam eden operasyonlar" },
          { label: "Bugün planlı teslim", value: todayDeliveryCount, description: "Planlanan teslim tarihi bugün" },
          { label: "Gecikme riski", value: delayedShipmentCount, description: "Teslim tarihi geçen açık işler" },
          { label: "Tamamlanan", value: completedJobCount, description: "Tamamlanan taşımalar" },
        ]} />
    </CarrierVehiclesShell>
</CompactDetailLayout>
  );
}
