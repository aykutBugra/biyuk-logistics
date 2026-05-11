"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CarrierMetricCard from "@/components/CarrierMetricCard";
import CarrierQuickActionsPanel from "@/components/CarrierQuickActionsPanel";
import CarrierVehicleCapacityPanel from "@/components/CarrierVehicleCapacityPanel";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import DashboardActionCard from "@/components/DashboardActionCard";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import EmptyStateCard from "@/components/EmptyStateCard";
import VehicleCard, { type VehicleCardModel } from "@/components/VehicleCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  deleteVehicle,
  getMyVehicles,
  type VehicleListItem,
} from "@/lib/api/vehicles";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import { useConfirm } from "@/lib/confirm/confirm-context";
import {
  formatDimensionsCm,
  formatVolumeM3,
  formatWeightKg,
  getVehicleBodyTypeLabel,
} from "@/lib/logistics";
import { useToast } from "@/lib/toast/toast-context";

type VehicleFilterTab =
  | "all"
  | "available"
  | "reserved"
  | "single-trip"
  | "missing-data";
type VehicleSortMode = "newest" | "plate" | "capacity" | "usage";
type VehicleStatusKey = Exclude<VehicleFilterTab, "all">;

type VehicleViewModel = VehicleCardModel & {
  searchText: string;
  idSortValue: number;
  capacitySortValue: number;
  usageSortValue: number;
  statusKey: VehicleStatusKey;
};

const FILTER_TABS: Array<{
  key: VehicleFilterTab;
  label: string;
}> = [
  { key: "all", label: "Tumu" },
  { key: "available", label: "Musait" },
  { key: "reserved", label: "Rezerve" },
  { key: "single-trip", label: "Tek tasima" },
  { key: "missing-data", label: "Eksik bilgi" },
];

function calculateVehicleUsageRatio(vehicle: VehicleListItem): number {
  const weightBase =
    vehicle.capacitySummary.toplamAgirlikKg > 0
      ? vehicle.capacitySummary.rezerveAgirlikKg /
        vehicle.capacitySummary.toplamAgirlikKg
      : 0;
  const volumeBase =
    vehicle.capacitySummary.toplamHacimM3 &&
    vehicle.capacitySummary.toplamHacimM3 > 0
      ? vehicle.capacitySummary.rezerveHacimM3 /
        vehicle.capacitySummary.toplamHacimM3
      : 0;

  return Math.max(weightBase, volumeBase, 0) * 100;
}

function resolveVehicleStatus(vehicle: VehicleListItem): {
  key: VehicleStatusKey;
  label: string;
  tone: VehicleCardModel["durumTonu"];
  description: string;
  usageLabel: string;
} {
  if (vehicle.capacitySummary.hesapEksigiVar) {
    return {
      key: "missing-data",
      label: "Eksik bilgi",
      tone: "amber",
      description:
        "Kapasite ozetinin bir kismi eksik kayitlarla hesaplandi. Nihai karar icin detay kaydini kontrol et.",
      usageLabel: "Oran, eksik veri nedeniyle yaklasik okunmali.",
    };
  }

  if (vehicle.capacitySummary.aktifTekTasimaRezervasyonuVar) {
    return {
      key: "single-trip",
      label: "Tek tasima",
      tone: "rose",
      description:
        "Arac uzerinde tek tasima rezervasyonu var. Yeni tekliflerde kapasite kisiti yaratabilir.",
      usageLabel: "Tek tasima kaydi araci operasyonel olarak sinirliyor.",
    };
  }

  if (vehicle.capacitySummary.aktifRezervasyonSayisi > 0) {
    return {
      key: "reserved",
      label: "Rezerve",
      tone: "blue",
      description:
        "Aktif rezervasyonlar bu aracin kapasitesini kullaniyor. Kalan alanla teklif planlanmali.",
      usageLabel: "Rezervasyon yogunlugu bu aracta toplanmis durumda.",
    };
  }

  return {
    key: "available",
    label: "Musait",
    tone: "emerald",
    description:
      "Arac yeni eslesmeler ve teklif planlamasi icin uygun gorunuyor.",
    usageLabel: "Kapasite yeni isler icin serbest.",
  };
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

function Toolbar(props: {
  searchQuery: string;
  activeTab: VehicleFilterTab;
  sortMode: VehicleSortMode;
  totalCount: number;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTabChange: (tab: VehicleFilterTab) => void;
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
            placeholder="Plaka, marka, model veya kasa tipi ara"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
          />
        </div>

        <select
          value={props.sortMode}
          onChange={props.onSortChange}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300"
        >
          <option value="newest">En yeni</option>
          <option value="plate">Plaka A-Z</option>
          <option value="capacity">Kapasite yuksek</option>
          <option value="usage">Kullanim yuksek</option>
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

        <span className="text-sm text-slate-500">
          {props.totalCount} arac goruntuleniyor
        </span>
      </div>
    </section>
  );
}

function FleetNotesPanel() {
  return (
    <SidebarSection
      title="Filo notu"
      description="Kapasite ozetlerinin tutarli olmasi teklif hizi kadar operasyon dogrulugunu da etkiler."
    >
      <div className="space-y-3">
        <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">
            Olculeri eksik birakma
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Boyut ve hacim bilgisi net oldugunda arac secimi ve rezervasyon okumalari daha saglikli olur.
          </p>
        </div>

        <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">
            Tek tasima kayitlarini ayri izle
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Bu isaret yeni teklif kararlarini dogrudan etkiler; listede mavi ve kirmizi yerine operasyon sinyali olarak okunmali.
          </p>
        </div>

        <DashboardActionCard
          href="/dashboard/arac_ekle"
          title="Yeni arac kapasitesi ekle"
          description="Filoya yeni kapasite ekleyerek eslesme alanini genislet."
          variant="default"
        />
      </div>
    </SidebarSection>
  );
}

export default function MyVehiclesPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const confirm = useConfirm();
  const showToast = useToast();
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<VehicleFilterTab>("all");
  const [sortMode, setSortMode] = useState<VehicleSortMode>("newest");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingVehicleId, setDeletingVehicleId] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    let isMounted = true;

    const loadVehicles = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getMyVehicles(accessToken);

        if (!isMounted) {
          return;
        }

        setVehicles(response);
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
            : "Araclar yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadVehicles();

    return () => {
      isMounted = false;
    };
  }, [accessToken, router, status]);

  const handleDelete = async (vehicleId: number) => {
    if (!accessToken || deletingVehicleId !== null) {
      return;
    }

    const isConfirmed = await confirm({
      title: "Araci sil",
      message: "Bu araci silmek istedigine emin misin?",
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
      setDeletingVehicleId(vehicleId);
      await deleteVehicle(vehicleId, accessToken);
      setVehicles((currentVehicles) =>
        currentVehicles.filter((vehicle) => vehicle.id !== vehicleId)
      );
      showToast({
        severity: "success",
        summary: "Arac silindi",
        detail: "Arac filodan kaldirildi.",
      });
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
        setVehicles((currentVehicles) =>
          currentVehicles.filter((vehicle) => vehicle.id !== vehicleId)
        );
        showToast({
          severity: "warn",
          summary: "Arac bulunamadi",
          detail: "Kayit listeden kaldirildi.",
          life: 3200,
          closable: true,
        });
        return;
      }

      showToast({
        severity: "error",
        summary: "Arac silinemedi",
        detail:
          error instanceof ApiClientError
            ? error.message
            : "Arac silinirken beklenmeyen bir hata olustu.",
        life: 3600,
        closable: true,
      });
    } finally {
      setDeletingVehicleId(null);
    }
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  const vehicleCards: VehicleViewModel[] = vehicles.map((vehicle) => {
    const statusModel = resolveVehicleStatus(vehicle);
    const usageRatio = calculateVehicleUsageRatio(vehicle);
    const dimensionsLabel = formatDimensionsCm({
      uzunlukCm: vehicle.uzunlukCm,
      genislikCm: vehicle.genislikCm,
      yukseklikCm: vehicle.yukseklikCm,
    });
    const volumeCapacity =
      vehicle.capacitySummary.toplamHacimM3 ?? vehicle.maksimumHacimM3;
    const chipler: VehicleCardModel["chipler"] = [
      { label: getVehicleBodyTypeLabel(vehicle.kasaTipi) },
      { label: formatWeightKg(vehicle.maksimumAgirlikKg) },
    ];

    if (volumeCapacity !== null) {
      chipler.push({ label: formatVolumeM3(volumeCapacity) });
    }

    chipler.push({ label: `${vehicle.yil} model` });

    if (dimensionsLabel !== "Belirtilmedi") {
      chipler.push({ label: dimensionsLabel, tone: "blue" });
    }

    const searchText = [
      vehicle.plaka,
      vehicle.marka,
      vehicle.model,
      getVehicleBodyTypeLabel(vehicle.kasaTipi),
      String(vehicle.yil),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("tr-TR");

    return {
      id: vehicle.id,
      plaka: vehicle.plaka,
      aracEtiketi: `Arac #${vehicle.id}`,
      baslik: `${vehicle.marka} ${vehicle.model}`,
      durumEtiketi: statusModel.label,
      durumTonu: statusModel.tone,
      durumAciklamasi: statusModel.description,
      chipler,
      kapasiteOzeti: [
        {
          label: "Rezerve agirlik",
          value: formatWeightKg(vehicle.capacitySummary.rezerveAgirlikKg),
        },
        {
          label: "Kalan agirlik",
          value: formatWeightKg(vehicle.capacitySummary.kalanAgirlikKg),
        },
        {
          label: "Rezerve hacim",
          value: formatVolumeM3(vehicle.capacitySummary.rezerveHacimM3),
        },
        {
          label: "Kalan hacim",
          value: formatVolumeM3(vehicle.capacitySummary.kalanHacimM3),
        },
      ],
      operasyonOzeti: [
        {
          label: "Aktif rezervasyon",
          value: String(vehicle.capacitySummary.aktifRezervasyonSayisi),
        },
        {
          label: "Tek tasima rezerv.",
          value: vehicle.capacitySummary.aktifTekTasimaRezervasyonuVar
            ? "Var"
            : "Yok",
        },
        {
          label: "Kalan agirlik",
          value: formatWeightKg(vehicle.capacitySummary.kalanAgirlikKg),
        },
        {
          label: "Kalan hacim",
          value: formatVolumeM3(vehicle.capacitySummary.kalanHacimM3),
        },
      ],
      kullanimOrani: usageRatio,
      kullanimEtiketi: statusModel.usageLabel,
      uyariMesaji: vehicle.capacitySummary.hesapEksigiVar
        ? "Kapasite ozeti eksik kayitlar nedeniyle yaklasik gosteriliyor."
        : null,
      detailHref: `/dashboard/araclarim/${vehicle.id}`,
      editHref: `/dashboard/araclarim/${vehicle.id}/duzenle`,
      searchText,
      idSortValue: vehicle.id,
      capacitySortValue:
        vehicle.maksimumAgirlikKg * 1000 + (vehicle.maksimumHacimM3 ?? 0),
      usageSortValue: usageRatio,
      statusKey: statusModel.key,
    };
  });

  const totalWeightCapacity = vehicles.reduce(
    (total, vehicle) => total + vehicle.capacitySummary.toplamAgirlikKg,
    0
  );
  const totalReservedWeight = vehicles.reduce(
    (total, vehicle) => total + vehicle.capacitySummary.rezerveAgirlikKg,
    0
  );
  const totalVolumeCapacity = vehicles.reduce(
    (total, vehicle) =>
      total + (vehicle.capacitySummary.toplamHacimM3 ?? vehicle.maksimumHacimM3 ?? 0),
    0
  );
  const totalActiveReservations = vehicles.reduce(
    (total, vehicle) => total + vehicle.capacitySummary.aktifRezervasyonSayisi,
    0
  );

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("tr-TR");
  const filteredVehicles = vehicleCards.filter((vehicle) => {
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      vehicle.searchText.includes(normalizedSearchQuery);

    if (!matchesSearch) {
      return false;
    }

    switch (activeTab) {
      case "available":
        return vehicle.statusKey === "available";
      case "reserved":
        return vehicle.statusKey === "reserved";
      case "single-trip":
        return vehicle.statusKey === "single-trip";
      case "missing-data":
        return vehicle.statusKey === "missing-data";
      default:
        return true;
    }
  });

  const sortedVehicles = [...filteredVehicles].sort((left, right) => {
    if (sortMode === "plate") {
      return left.plaka.localeCompare(right.plaka, "tr");
    }

    if (sortMode === "capacity") {
      return right.capacitySortValue - left.capacitySortValue;
    }

    if (sortMode === "usage") {
      return right.usageSortValue - left.usageSortValue;
    }

    return right.idSortValue - left.idSortValue;
  });

  const featuredVehicle =
    [...vehicles].sort((left, right) => {
      const usageDifference =
        calculateVehicleUsageRatio(right) - calculateVehicleUsageRatio(left);

      if (usageDifference !== 0) {
        return usageDifference;
      }

      const reservationDifference =
        right.capacitySummary.aktifRezervasyonSayisi -
        left.capacitySummary.aktifRezervasyonSayisi;

      if (reservationDifference !== 0) {
        return reservationDifference;
      }

      return right.id - left.id;
    })[0] ?? null;

  const handleResetLocalFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    setSortMode("newest");
  };

  return (
    <CarrierVehiclesShell
      title="Araclarim"
      description="Filondaki araclari, kapasite durumlarini ve aktif rezervasyonlari buradan takip et."
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={6}
      headerActions={
        <Link
          href="/dashboard/arac_ekle"
          className="app-pressable inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <i className="pi pi-plus text-xs" />
          Yeni arac ekle
        </Link>
      }
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
        <div className="space-y-6">
          <div
            data-dashboard-stats
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
          >
            <CarrierMetricCard
              label="Toplam arac"
              value={vehicles.length}
              hint="Kayitli filo"
              tone="blue"
              icon={<i className="pi pi-truck text-lg" />}
            />
            <CarrierMetricCard
              label="Toplam agirlik"
              value={formatWeightKg(totalWeightCapacity)}
              hint="Tanimli yuk kapasitesi"
              tone="violet"
              icon={<i className="pi pi-box text-lg" />}
            />
            <CarrierMetricCard
              label="Rezerve agirlik"
              value={formatWeightKg(totalReservedWeight)}
              hint="Mevcut rezervasyon kullanimi"
              tone="amber"
              icon={<i className="pi pi-lock text-lg" />}
            />
            <CarrierMetricCard
              label="Toplam hacim"
              value={formatVolumeM3(totalVolumeCapacity)}
              hint="Kullanilabilir hacim kapasitesi"
              tone="emerald"
              icon={<i className="pi pi-clone text-lg" />}
            />
            <CarrierMetricCard
              label="Aktif rezervasyon"
              value={totalActiveReservations}
              hint="Takip edilen acik kayitlar"
              tone="blue"
              icon={<i className="pi pi-calendar text-lg" />}
            />
          </div>

          {vehicles.length === 0 ? (
            <div data-dashboard-primary>
              <EmptyStateCard
                title="Filonda henuz arac yok"
                description="Ilk aracini eklediginde kapasite ozetlerini ve aktif rezervasyon durumunu burada goreceksin."
                actionHref="/dashboard/arac_ekle"
                actionLabel="Ilk araci ekle"
              />
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <Toolbar
                  searchQuery={searchQuery}
                  activeTab={activeTab}
                  sortMode={sortMode}
                  totalCount={sortedVehicles.length}
                  onSearchChange={(event) => setSearchQuery(event.target.value)}
                  onTabChange={setActiveTab}
                  onSortChange={(event) =>
                    setSortMode(event.target.value as VehicleSortMode)
                  }
                />

                <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-[1.55rem] font-black tracking-tight text-slate-950">
                            Filo kayitlari
                          </h2>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {sortedVehicles.length}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Tum araclarini kapasite kullanimi ve rezervasyon sinyalleriyle birlikte tek listede oku.
                        </p>
                      </div>

                      {totalActiveReservations > 0 ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          {totalActiveReservations} aktif rezervasyon
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-5 md:p-6">
                    {sortedVehicles.length === 0 ? (
                      <div className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50/70 p-6">
                        <p className="text-base font-semibold text-slate-900">
                          Bu filtrelerle eslesen arac bulunamadi
                        </p>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                          Plaka, marka veya durum sekmesini degistirerek tum filo kayitlarini tekrar gorebilirsin.
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
                        {sortedVehicles.map((vehicle) => (
                          <VehicleCard
                            key={vehicle.id}
                            vehicle={vehicle}
                            isDeleting={deletingVehicleId === vehicle.id}
                            onDelete={() => void handleDelete(vehicle.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <CarrierQuickActionsPanel />
                <CarrierVehicleCapacityPanel vehicle={featuredVehicle} />
                <FleetNotesPanel />
              </div>
            </div>
          )}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
