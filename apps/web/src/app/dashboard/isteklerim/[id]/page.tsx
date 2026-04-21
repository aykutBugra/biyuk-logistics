"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import RatingComposerCard from "@/components/RatingComposerCard";
import { ApiClientError } from "@/lib/api/api-client";
import {
  acceptOffer,
  getIncomingOffersForRequest,
  rejectOffer,
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
import {
  formatLocationLabel,
  formatVolumeM3,
  formatWeightKg,
  getCargoTypeLabel,
} from "@/lib/logistics";

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
    case "TAMAMLANDI":
      return {
        title: "Nakliye tamamlandi",
        description:
          "Tasima sureci tamamlandi. Bir sonraki fazda rating gibi kapanis adimlari eklenebilir.",
      };
    default:
      return {
        title: "Bu istek icin anlasma saglandi",
        description: "Nakliye kaydi olustu ve durum bilgisi bu ekrandan takip edilebilir.",
      };
  }
}

export default function TransportRequestDetailPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const params = useParams<{ id: string }>();
  const requestId = Number(params.id);
  const [request, setRequest] = useState<TransportRequestDetail | null>(null);
  const [incomingOffers, setIncomingOffers] = useState<IncomingOfferItem[]>([]);
  const [incomingOffersErrorMessage, setIncomingOffersErrorMessage] = useState<string | null>(
    null
  );
  const [isIncomingOffersLoading, setIsIncomingOffersLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actingOfferId, setActingOfferId] = useState<number | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
      try {
        setIsLoading(true);
        setIsIncomingOffersLoading(true);
        setErrorMessage(null);
        setIncomingOffersErrorMessage(null);

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

          if (offersError instanceof ApiClientError && offersError.status === 404) {
            setIncomingOffers([]);
            return;
          }

          setIncomingOffersErrorMessage(
            offersError instanceof ApiClientError
              ? offersError.message
              : "Gelen teklifler yuklenirken beklenmeyen bir hata olustu."
          );
        } finally {
          if (isMounted) {
            setIsIncomingOffersLoading(false);
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
        setIsIncomingOffersLoading(false);
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

    const isConfirmed = window.confirm(
      "Bu tasima istegini silmek istedigine emin misin?"
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteTransportRequest(request.id, accessToken);
      router.replace("/dashboard/isteklerim");
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
        window.alert("Bu istek bulunamadi.");
        router.replace("/dashboard/isteklerim");
        return;
      }

      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Istek silinirken beklenmeyen bir hata olustu."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOfferDecision = async (offer: IncomingOfferItem, action: "accept" | "reject") => {
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

  const handleCreateRating = async (input: { puanDegeri: number; yorum?: string }) => {
    if (!accessToken || !request?.nakliye || isSubmittingRating) {
      return;
    }

    try {
      setIsSubmittingRating(true);
      await createRatingForJob(request.nakliye.id, input, accessToken);
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
        setReloadKey((currentKey) => currentKey + 1);
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

  const canMutateRequest = Boolean(
    request && request.durum === "OLUSTURULDU" && request.nakliye === null
  );
  const jobStatusCopy = request?.nakliye
    ? getJobStatusCopy(request.nakliye.durum)
    : null;

  return (
    <CustomerTransportRequestsShell title="Istek detayi">
      {isLoading ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 text-gray-600">
          Istek detayi yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Kayit goruntulenemedi</h2>
          <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && request ? (
        <div className="grid gap-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                    {request.durum}
                  </span>
                  <span>#{request.id}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
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
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {formatTransportDate(request.tasimaTarihi)}
                  </span>
                  {request.tekTasimaIstiyor ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                      Tek tasima
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="text-sm text-gray-500">
                  {formatDate(request.olusturmaTarihi)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {canMutateRequest ? (
                    <Link
                      href={`/dashboard/isteklerim/${request.id}/duzenle`}
                      className="inline-flex items-center justify-center rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Duzenle
                    </Link>
                  ) : null}
                  {canMutateRequest ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeleting ? "Siliniyor..." : "Sil"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {request.nakliye ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="text-lg font-bold text-emerald-900">
                {jobStatusCopy?.title}
              </h3>
              <p className="mt-2 text-sm text-emerald-800">
                {jobStatusCopy?.description}
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Yuk detayi</h3>
            <dl className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Yuk tipi</dt>
                <dd>{getCargoTypeLabel(request.yukTipi)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Agirlik</dt>
                <dd>{formatWeightKg(request.agirlikKg)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Hacim</dt>
                <dd>{formatVolumeM3(request.hacimM3)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-gray-900">Tasima tarihi</dt>
                <dd>{formatTransportDate(request.tasimaTarihi)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 md:col-span-2">
                <dt className="font-medium text-gray-900">Tasima tercihi</dt>
                <dd>{request.tekTasimaIstiyor ? "Tek tasima" : "Paylasimli olabilir"}</dd>
              </div>
            </dl>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
              {request.yukDetay}
            </p>
          </div>

          {request.nakliye ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900">Olusan nakliye</h3>
              <dl className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Durum</dt>
                  <dd>{request.nakliye.durum}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Anlasilan fiyat</dt>
                  <dd>{formatCurrency(request.nakliye.anlasilanFiyat)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Nakliyeci</dt>
                  <dd>{request.nakliye.carrierName}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Kullanici adi</dt>
                  <dd>@{request.nakliye.carrierUsername}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Arac plakasi</dt>
                  <dd>{request.nakliye.aracPlaka}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Nakliye kaydi</dt>
                  <dd>#{request.nakliye.id}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Kayit zamani</dt>
                  <dd>{formatDate(request.nakliye.olusturmaTarihi)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Baslangic</dt>
                  <dd>
                    {request.nakliye.baslangicTarihi
                      ? formatDate(request.nakliye.baslangicTarihi)
                      : "Henuz baslamadi"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="font-medium text-gray-900">Teslim</dt>
                  <dd>
                    {request.nakliye.teslimTarihi
                      ? formatDate(request.nakliye.teslimTarihi)
                      : "Henuz tamamlanmadi"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
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

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
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

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Gelen teklifler</h3>

            {isIncomingOffersLoading ? (
              <p className="mt-4 text-sm text-gray-600">Teklifler yukleniyor...</p>
            ) : null}

            {!isIncomingOffersLoading && incomingOffersErrorMessage ? (
              <p className="mt-4 text-sm text-red-700">{incomingOffersErrorMessage}</p>
            ) : null}

            {!isIncomingOffersLoading &&
            !incomingOffersErrorMessage &&
            incomingOffers.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                Bu istek icin henuz teklif yok.
              </p>
            ) : null}

            {!isIncomingOffersLoading &&
            !incomingOffersErrorMessage &&
            incomingOffers.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {incomingOffers.map((offer) => {
                  const canActOnOffer =
                    offer.durum === "OLUSTURULDU" && request.nakliye === null;

                  return (
                    <div
                      key={offer.id}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                              {offer.durum}
                            </span>
                            <span>Teklif #{offer.id}</span>
                            {offer.aracPlaka ? (
                              <span className="rounded-full bg-gray-200 px-2.5 py-1 font-semibold text-gray-700">
                                {offer.aracPlaka}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm font-semibold text-gray-900">
                            {offer.carrierName}
                          </p>
                          <p className="text-sm text-gray-500">
                            @{offer.carrierUsername}
                          </p>
                          {offer.not ? (
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {offer.not}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400">
                              Teklif notu eklenmedi.
                            </p>
                          )}
                        </div>
                        <div className="space-y-3 md:text-right">
                          <div className="text-sm font-semibold text-emerald-700">
                            {formatCurrency(offer.fiyat)}
                          </div>
                          {canActOnOffer ? (
                            <div className="flex flex-wrap gap-2 md:justify-end">
                              <button
                                type="button"
                                onClick={() => handleOfferDecision(offer, "accept")}
                                disabled={actingOfferId !== null}
                                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actingOfferId === offer.id ? "Isleniyor..." : "Kabul Et"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOfferDecision(offer, "reject")}
                                disabled={actingOfferId !== null}
                                className="inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actingOfferId === offer.id ? "Isleniyor..." : "Reddet"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </CustomerTransportRequestsShell>
  );
}
