"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import StatusBadge from "@/components/StatusBadge";
import { ApiClientError } from "@/lib/api/api-client";
import {
  acceptOffer,
  getMyIncomingOffers,
  rejectOffer,
  type MyIncomingOfferItem,
} from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCustomerPageAccess } from "@/lib/auth/use-customer-page-access";
import {
  formatLocationLabel,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function MyIncomingOffersPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const [offers, setOffers] = useState<MyIncomingOfferItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingOfferId, setActingOfferId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    let isMounted = true;

    const loadOffers = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getMyIncomingOffers(accessToken);

        if (!isMounted) {
          return;
        }

        setOffers(response);
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
            : "Gelen teklifler yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadOffers();

    return () => {
      isMounted = false;
    };
  }, [accessToken, reloadKey, router, status]);

  const handleOfferDecision = async (
    offer: MyIncomingOfferItem,
    action: "accept" | "reject"
  ) => {
    if (!accessToken || actingOfferId !== null) {
      return;
    }

    const confirmMessage =
      action === "accept"
        ? "Bu teklifi kabul etmek istedigine emin misin?"
        : "Bu teklifi reddetmek istedigine emin misin?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setActingOfferId(offer.id);

      if (action === "accept") {
        await acceptOffer(offer.id, accessToken);
        window.alert("Teklif kabul edildi ve nakliye olusturuldu.");
      } else {
        await rejectOffer(offer.id, accessToken);
        window.alert("Teklif reddedildi.");
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
        window.alert("Bu teklif artik bulunamiyor.");
        setReloadKey((currentKey) => currentKey + 1);
        return;
      }

      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Teklif karari verilirken beklenmeyen bir hata olustu."
      );
      setReloadKey((currentKey) => currentKey + 1);
    } finally {
      setActingOfferId(null);
    }
  };

  if (status !== "ready") {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="font-medium text-slate-600">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <CustomerTransportRequestsShell title="Gelen Teklifler">
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Gelen teklifler yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && offers.length === 0 ? (
        <EmptyStateCard
          title="Bekleyen teklif yok"
          description="Yeni teklifler burada listelenecek."
          actionHref="/dashboard/isteklerim"
          actionLabel="Isteklerime git"
        />
      ) : null}

      {!isLoading && !errorMessage && offers.length > 0 ? (
        <div className="grid gap-4">
          {offers.map((offer) => (
            <article
              key={offer.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-200"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <StatusBadge status={offer.durum} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Teklif #{offer.id}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Istek #{offer.requestId}
                    </span>
                    {offer.aracPlaka ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {offer.aracPlaka}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      {formatLocationLabel(
                        offer.baslangicKonumMetni,
                        offer.baslangicSehri
                      )}{" "}
                      {"->"}{" "}
                      {formatLocationLabel(offer.varisKonumMetni, offer.varisSehri)}
                    </h2>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {getCargoTypeLabel(offer.yukTipi)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {formatWeightKg(offer.agirlikKg)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {formatVolumeM3(offer.hacimM3)}
                      </span>
                      {offer.tekTasimaIstiyor ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-100">
                          Tek tasima
                        </span>
                      ) : null}
                      {offer.tasimaTarihi ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          {offer.tasimaTarihi}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {offer.carrierName}
                    </p>
                    <p className="text-sm text-slate-500">@{offer.carrierUsername}</p>
                    <p className="max-w-3xl text-sm leading-6 text-slate-600">
                      {offer.not ?? "Teklif notu eklenmedi."}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-[230px] flex-col items-start gap-3 lg:items-end">
                  <p className="text-2xl font-black tracking-tight text-emerald-700">
                    {formatCurrency(offer.fiyat)}
                  </p>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Link
                      href={`/dashboard/isteklerim/${offer.requestId}`}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Istek Detayi
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleOfferDecision(offer, "accept")}
                      disabled={actingOfferId !== null}
                      className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actingOfferId === offer.id ? "Isleniyor..." : "Kabul Et"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleOfferDecision(offer, "reject")}
                      disabled={actingOfferId !== null}
                      className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actingOfferId === offer.id ? "Isleniyor..." : "Reddet"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </CustomerTransportRequestsShell>
  );
}
