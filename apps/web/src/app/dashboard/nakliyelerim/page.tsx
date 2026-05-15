"use client";

import type { ChangeEvent, ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import CustomerMetricCard from "@/components/CustomerMetricCard";
import DashboardActionCard from "@/components/DashboardActionCard";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import InlineHelpTrigger from "@/components/InlineHelpTrigger";
import MyShipmentCard, {
  type MyShipmentCardModel,
} from "@/components/MyShipmentCard";
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

const FILTER_TABS: Array<{
  key: ShipmentFilterTab;
  label: string;
}> = [
  { key: "all", label: "Tumu" },
  { key: "active", label: "Aktif" },
  { key: "on-road", label: "Yolda" },
  { key: "completed", label: "Tamamlanan" },
];

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}

function isActiveJobStatus(status: string): boolean {
  const normalizedStatus = normalizeStatus(status);
  return normalizedStatus === "OLUSTURULDU" || normalizedStatus === "BASLATILDI";
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

  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(parsedDate);
}

function parsePlanningDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
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
    chips.push({ label: planningDate, tone: "blue" as const });
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
          : normalizedStatus === "TAMAMLANDI"
            ? ("complete" as const)
            : ("pending" as const),
    },
    {
      label: "Teslim edildi",
      timestamp: formatDateTime(detail?.teslimTarihi ?? job.teslimTarihi),
      state:
        normalizedStatus === "TAMAMLANDI"
          ? ("complete" as const)
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
    case "TAMAMLANDI":
      return "Teslimat basariyla tamamlandi ve kayit kapanisa hazir.";
    default:
      return "Teklif kabul edildi. Cikis ve operasyon hazirligi devam ediyor.";
  }
}

function Toolbar(props: {
  searchQuery: string;
  activeTab: ShipmentFilterTab;
  sortMode: ShipmentSortMode;
  totalCount: number;
  isRefreshingDetails: boolean;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTabChange: (tab: ShipmentFilterTab) => void;
  onSortChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <section className="app-surface rounded-[1.15rem] border border-slate-200 p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="relative">
          <i className="pi pi-search pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
          <input
            type="search"
            value={props.searchQuery}
            onChange={props.onSearchChange}
            placeholder="Rota, musteri veya yuk ara"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
          />
        </div>

        <select
          value={props.sortMode}
          onChange={props.onSortChange}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300"
        >
          <option value="newest">En yeni</option>
          <option value="oldest">En eski</option>
          <option value="delivery-soon">Teslim tarihi yakin</option>
        </select>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => props.onTabChange(tab.key)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                props.activeTab === tab.key
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{props.totalCount} nakliye goruntuleniyor</span>
          {props.isRefreshingDetails ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              Operasyon detaylari yenileniyor
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SidebarSection(props: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm md:p-6">
      <h2 className="text-[1.45rem] font-black tracking-tight text-slate-950">
        {props.title}
      </h2>
      {props.description ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{props.description}</p>
      ) : null}
      <div className="mt-5">{props.children}</div>
    </section>
  );
}

function TodayTasksPanel(props: { tasks: ShipmentViewModel[] }) {
  return (
    <SidebarSection
      title="Bugunku gorevler"
      description="Bugun teslimati planlanan operasyonlari hizli ac."
    >
      {props.tasks.length === 0 ? (
        <div className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50/70 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Bugun icin planli teslimat yok
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Planlanan tarihli kayitlar detail enrichment geldikce burada listelenecek.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {props.tasks.map((task) => (
            <Link
              key={task.id}
              href={task.detailHref}
              className="block rounded-[1rem] border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-950">{task.rotaBaslik}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {task.planlananTeslimat ?? "Tarih bekleniyor"}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  {task.sinyalEtiketi}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SidebarSection>
  );
}

export default function MyJobsPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [threads, setThreads] = useState<OfferThreadSummary[]>([]);
  const [jobDetailsById, setJobDetailsById] = useState<Record<number, JobDetail | null>>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ShipmentFilterTab>("all");
  const [sortMode, setSortMode] = useState<ShipmentSortMode>("newest");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
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
      setIsEnriching(false);
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
    const planningDate = parsePlanningDate(detail?.tasimaTarihi ?? null);
    const isDelayed =
      planningDate !== null &&
      planningDate.getTime() < todayStart.getTime() &&
      !isCompletedJobStatus(job.durum);
    const signal = buildShipmentSignal(job.durum, isDelayed);
    const conversationThread =
      threadByConversationKey.get(`${job.requestId}-${job.counterpartyId}`) ?? null;
    const plannedDeliveryLabel = formatPlanningDate(detail?.tasimaTarihi ?? null);
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
      planlananTeslimat: plannedDeliveryLabel,
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
    <CarrierVehiclesShell
      title="Nakliyelerim"
      description="Yuruttugun aktif tasimalari, teslimat adimlarini ve tamamlanan isleri buradan yonet."
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={6}
      headerActions={<InlineHelpTrigger helpKey="my-shipments" />}
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div
          data-dashboard-primary
          className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="space-y-4">
          <div
            data-dashboard-stats
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <CustomerMetricCard
              label="Aktif nakliye"
              value={activeJobCount}
              hint="Devam eden operasyon"
              tone="blue"
              icon={<i className="pi pi-truck text-lg" />}
            />
            <CustomerMetricCard
              label="Bugun teslimat"
              value={todayDeliveryCount}
              hint="Planlanan teslimat sayisi"
              tone="amber"
              icon={<i className="pi pi-calendar text-lg" />}
            />
            <CustomerMetricCard
              label="Tamamlanan"
              value={completedJobCount}
              hint="Basariyla kapanan isler"
              tone="emerald"
              icon={<i className="pi pi-check-circle text-lg" />}
            />
            <CustomerMetricCard
              label="Sorun / gecikme"
              value={delayedShipmentCount}
              hint="Takip gerektiren kayitlar"
              tone="violet"
              icon={<i className="pi pi-exclamation-triangle text-lg" />}
            />
          </div>

          {jobs.length === 0 ? (
            <div data-dashboard-primary>
              <EmptyStateCard
                title="Henuz aktif nakliye yok"
                description="Teklifin kabul edildiginde burada goreceksin."
                actionHref="/dashboard/acik_istekler"
                actionLabel="Acik istekleri incele"
              />
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <Toolbar
                  searchQuery={searchQuery}
                  activeTab={activeTab}
                  sortMode={sortMode}
                  totalCount={sortedShipments.length}
                  isRefreshingDetails={isEnriching}
                  onSearchChange={(event) => setSearchQuery(event.target.value)}
                  onTabChange={setActiveTab}
                  onSortChange={(event) =>
                    setSortMode(event.target.value as ShipmentSortMode)
                  }
                />

                <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950">
                            Tum nakliyeler
                          </h2>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {sortedShipments.length}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Aktif ve tamamlanan operasyonlari teslim akisiyla birlikte tek listede oku.
                        </p>
                      </div>

                      {todayDeliveryCount > 0 ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {todayDeliveryCount} bugun teslimat
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-5 md:p-6">
                    {sortedShipments.length === 0 ? (
                      <div className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50/70 p-6">
                        <p className="text-base font-semibold text-slate-900">
                          Bu filtrelerle eslesen nakliye bulunamadi
                        </p>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                          Aramayi, durum sekmesini veya siralamayi degistirerek operasyon gorunumunu genisletebilirsin.
                        </p>
                        <button
                          type="button"
                          onClick={handleResetLocalFilters}
                          className="app-button-secondary mt-5"
                        >
                          Filtreleri temizle
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {sortedShipments.map((shipment) => (
                          <MyShipmentCard key={shipment.id} shipment={shipment} />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <TodayTasksPanel tasks={todayTasks} />

                <SidebarSection
                  title="Hizli islemler"
                  description="Mevcut nakliyeci akislarini kisa yoldan ac."
                >
                  <div className="grid gap-3">
                    <DashboardActionCard
                      href="/dashboard/acik_istekler"
                      title="Acik istekleri incele"
                      variant="quiet"
                    />
                    <DashboardActionCard
                      href="/dashboard/rotalarim"
                      title="Rotalarimi gor"
                      variant="quiet"
                    />
                    <DashboardActionCard
                      href="/dashboard/araclarim"
                      title="Araclarimi yonet"
                      variant="quiet"
                    />
                    <DashboardActionCard
                      href="/dashboard/konusmalar"
                      title="Konusmalari ac"
                      variant="quiet"
                    />
                  </div>
                </SidebarSection>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
