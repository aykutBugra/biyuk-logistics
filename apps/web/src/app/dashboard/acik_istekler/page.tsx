"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CarrierVehiclesShell from "@/components/CarrierVehiclesShell";
import CitySelectField from "@/components/CitySelectField";
import CollectionToolbar from "@/components/CollectionToolbar";
import EmptyStateCard from "@/components/EmptyStateCard";
import StatusBadge from "@/components/StatusBadge";
import SummaryStatCard from "@/components/SummaryStatCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  getOpenOfferRequests,
  type OpenOfferRequestFilters,
  type OpenOfferRequestListItem,
} from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCarrierPageAccess } from "@/lib/auth/use-carrier-page-access";
import {
  CARGO_TYPE_OPTIONS,
  formatLocationLabel,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
  hasActiveFilters,
} from "@/lib/logistics";
import { TURKEY_CITY_OPTIONS } from "@/lib/turkey-cities";

type DiscoveryFilterForm = {
  baslangicSehir: string;
  varisSehir: string;
  tekTasimaIstiyor: "all" | "true" | "false";
  minAgirlikKg: string;
  maxAgirlikKg: string;
  minHacimM3: string;
  maxHacimM3: string;
  yukTipi: string;
  tasimaTarihi: string;
};

const initialFilters: DiscoveryFilterForm = {
  baslangicSehir: "",
  varisSehir: "",
  tekTasimaIstiyor: "all",
  minAgirlikKg: "",
  maxAgirlikKg: "",
  minHacimM3: "",
  maxHacimM3: "",
  yukTipi: "",
  tasimaTarihi: "",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toApiFilters(values: DiscoveryFilterForm): OpenOfferRequestFilters {
  return {
    baslangicSehir: values.baslangicSehir.trim() || undefined,
    varisSehir: values.varisSehir.trim() || undefined,
    tekTasimaIstiyor:
      values.tekTasimaIstiyor === "all"
        ? undefined
        : values.tekTasimaIstiyor === "true",
    minAgirlikKg: values.minAgirlikKg ? Number(values.minAgirlikKg) : undefined,
    maxAgirlikKg: values.maxAgirlikKg ? Number(values.maxAgirlikKg) : undefined,
    minHacimM3: values.minHacimM3 ? Number(values.minHacimM3) : undefined,
    maxHacimM3: values.maxHacimM3 ? Number(values.maxHacimM3) : undefined,
    yukTipi: values.yukTipi || undefined,
    tasimaTarihi: values.tasimaTarihi || undefined,
  };
}

export default function OpenTransportRequestsPage() {
  const router = useRouter();
  const { accessToken, status } = useCarrierPageAccess();
  const [filters, setFilters] = useState<DiscoveryFilterForm>(initialFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<DiscoveryFilterForm>(initialFilters);
  const [requests, setRequests] = useState<OpenOfferRequestListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    let isMounted = true;

    const loadRequests = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getOpenOfferRequests(
          accessToken,
          toApiFilters(appliedFilters)
        );

        if (!isMounted) {
          return;
        }

        setRequests(response);
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
            : "Acik istekler yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadRequests();

    return () => {
      isMounted = false;
    };
  }, [accessToken, appliedFilters, router, status]);

  const handleFilterChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  };

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="font-medium text-gray-600">Yukleniyor...</div>
      </div>
    );
  }

  const alreadyOfferedCount = requests.filter((request) => request.alreadyOffered).length;
  const freshOpportunityCount = requests.length - alreadyOfferedCount;
  const filtersActive = hasActiveFilters({
    ...appliedFilters,
    tekTasimaIstiyor:
      appliedFilters.tekTasimaIstiyor === "all"
        ? ""
        : appliedFilters.tekTasimaIstiyor,
  });

  return (
    <CarrierVehiclesShell title="Acik istekler">
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Acik istekler yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryStatCard label="Acik istek" value={requests.length} />
            <SummaryStatCard label="Yeni firsat" value={freshOpportunityCount} />
            <SummaryStatCard label="Takip ettigin" value={alreadyOfferedCount} />
          </div>

          <CollectionToolbar
            title="Filtreler"
            countLabel={`${requests.length} acik istek`}
            hint={filtersActive ? "Filtreler aktif" : "Tum kayitlar"}
          />

          <form
            onSubmit={handleApplyFilters}
            className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4"
          >
            <CitySelectField
              id="baslangicSehir"
              label="Baslangic sehri"
              options={TURKEY_CITY_OPTIONS}
              placeholder="Il sec"
              value={filters.baslangicSehir}
              onChange={(value) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  baslangicSehir: value,
                }))
              }
            />
            <CitySelectField
              id="varisSehir"
              label="Varis sehri"
              options={TURKEY_CITY_OPTIONS}
              placeholder="Il sec"
              value={filters.varisSehir}
              onChange={(value) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  varisSehir: value,
                }))
              }
            />
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="tekTasimaIstiyor">
                Tek tasima
              </label>
              <select
                id="tekTasimaIstiyor"
                name="tekTasimaIstiyor"
                value={filters.tekTasimaIstiyor}
                onChange={handleFilterChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Hepsi</option>
                <option value="true">Sadece tek tasima</option>
                <option value="false">Paylasimli olabilir</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="yukTipi">
                Yuk tipi
              </label>
              <select
                id="yukTipi"
                name="yukTipi"
                value={filters.yukTipi}
                onChange={handleFilterChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Tum tipler</option>
                {CARGO_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="minAgirlikKg">
                Min agirlik (kg)
              </label>
              <input
                id="minAgirlikKg"
                name="minAgirlikKg"
                type="number"
                min="0"
                step="0.01"
                value={filters.minAgirlikKg}
                onChange={handleFilterChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="maxAgirlikKg">
                Max agirlik (kg)
              </label>
              <input
                id="maxAgirlikKg"
                name="maxAgirlikKg"
                type="number"
                min="0"
                step="0.01"
                value={filters.maxAgirlikKg}
                onChange={handleFilterChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="minHacimM3">
                Min hacim (m3)
              </label>
              <input
                id="minHacimM3"
                name="minHacimM3"
                type="number"
                min="0"
                step="0.01"
                value={filters.minHacimM3}
                onChange={handleFilterChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="maxHacimM3">
                Max hacim (m3)
              </label>
              <input
                id="maxHacimM3"
                name="maxHacimM3"
                type="number"
                min="0"
                step="0.01"
                value={filters.maxHacimM3}
                onChange={handleFilterChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="tasimaTarihi">
                Tasima tarihi
              </label>
              <input
                id="tasimaTarihi"
                name="tasimaTarihi"
                type="date"
                value={filters.tasimaTarihi}
                onChange={handleFilterChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex items-end gap-2 xl:col-span-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Filtreleri uygula
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Temizle
              </button>
            </div>
          </form>
        </>
      ) : null}

      {!isLoading && !errorMessage && requests.length === 0 ? (
        <EmptyStateCard
          title="Uygun istek bulunmuyor"
          description={
            filtersActive
              ? "Bu filtrelerle eslesen bir tasima talebi yok. Filtreleri gevsetip tekrar deneyebilirsin."
              : "Su anda teklif vermeye acik bir tasima talebi yok. Yeni kayitlar geldiginde burada gorunecek."
          }
        />
      ) : null}

      {!isLoading && !errorMessage && requests.length > 0 ? (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-200"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <StatusBadge status={request.durum} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Istek #{request.id}
                    </span>
                    {request.alreadyOffered ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                        Teklif verdin
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      {formatLocationLabel(
                        request.baslangicKonumMetni,
                        request.baslangicSehri
                      )}{" "}
                      {"->"}{" "}
                      {formatLocationLabel(
                        request.varisKonumMetni,
                        request.varisSehri
                      )}
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
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-100">
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

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Yuk ozeti
                    </p>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 line-clamp-3">
                      {request.yukDetay}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-[220px] flex-col gap-4 lg:items-end">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {formatDate(request.olusturmaTarihi)}
                  </p>
                  <Link
                    href={`/dashboard/acik_istekler/${request.id}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    Detay ve Teklif
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </CarrierVehiclesShell>
  );
}
