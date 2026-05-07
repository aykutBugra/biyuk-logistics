"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import DashboardShell from "@/components/DashboardShell";
import { ApiClientError } from "@/lib/api/api-client";
import {
  createOfferThreadCounterOffer,
  createOfferThreadMessage,
  getOfferThread,
  markOfferThreadAsRead,
  type OfferThreadDetail,
  type OfferThreadMessage,
} from "@/lib/api/offer-threads";
import { acceptOffer, rejectOffer } from "@/lib/api/offers";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useDashboardAccess } from "@/lib/auth/use-dashboard-access";
import { formatLocationLabel } from "@/lib/logistics";

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

function getSystemEventCopy(
  code: string | null,
  teklifFiyati: number | null
): string {
  switch (code) {
    case "OFFER_CREATED":
      return `Ilk teklif olusturuldu: ${formatCurrency(teklifFiyati ?? 0)}`;
    case "OFFER_ACCEPTED":
      return "Teklif kabul edildi.";
    case "OFFER_REJECTED":
      return "Teklif reddedildi.";
    case "THREAD_CLOSED_REQUEST_UNAVAILABLE":
      return "Bu istek baska bir teklifle anlasildigi icin konusma kapatildi.";
    default:
      return "Sistem olayi";
  }
}

function getMessageBody(message: OfferThreadMessage): string {
  switch (message.type) {
    case "TEXT":
      return message.text ?? "";
    case "COUNTER_OFFER":
      return `Karsi teklif: ${formatCurrency(message.teklifFiyati ?? 0)}${
        message.text ? `\n${message.text}` : ""
      }`;
    case "SYSTEM_EVENT":
      return getSystemEventCopy(message.systemEventCode, message.teklifFiyati);
    default:
      return message.text ?? "";
  }
}

export default function OfferThreadDetailPage() {
  const router = useRouter();
  const params = useParams<{ offerId: string }>();
  const offerId = Number(params.offerId);
  const { accessToken, isCarrierWorkspace, status } =
    useDashboardAccess("shared-business");
  const [thread, setThread] = useState<OfferThreadDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messageDraft, setMessageDraft] = useState("");
  const [counterOfferAmount, setCounterOfferAmount] = useState("");
  const [counterOfferNote, setCounterOfferNote] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSendingCounterOffer, setIsSendingCounterOffer] = useState(false);
  const [isActingOffer, setIsActingOffer] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    if (!Number.isInteger(offerId) || offerId <= 0) {
      setErrorMessage("Gecersiz teklif numarasi.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadThread = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getOfferThread(offerId, accessToken);

        if (!isMounted) {
          return;
        }

        setThread(response);

        if (response.hasUnread) {
          void markOfferThreadAsRead(offerId, accessToken)
            .then(() => {
              if (!isMounted) {
                return;
              }

              setThread((currentThread) =>
                currentThread
                  ? { ...currentThread, hasUnread: false, unreadCount: 0 }
                  : currentThread
              );
            })
            .catch(() => {
              // non-blocking
            });
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
          setErrorMessage("Bu konusma bulunamadi.");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Konusma yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadThread();

    return () => {
      isMounted = false;
    };
  }, [accessToken, offerId, reloadKey, router, status]);

  const handleOfferDecision = async (action: "accept" | "reject") => {
    if (!accessToken || !thread || isActingOffer) {
      return;
    }

    const confirmed = window.confirm(
      action === "accept"
        ? "Bu teklifi kabul etmek istedigine emin misin?"
        : "Bu teklifi reddetmek istedigine emin misin?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsActingOffer(true);

      if (action === "accept") {
        await acceptOffer(thread.offerId, accessToken);
        window.alert("Teklif kabul edildi ve nakliye olusturuldu.");
      } else {
        await rejectOffer(thread.offerId, accessToken);
        window.alert("Teklif reddedildi.");
      }

      setReloadKey((currentKey) => currentKey + 1);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        router.replace("/login");
        return;
      }

      if (error instanceof ApiClientError && error.status === 403) {
        router.replace("/");
        return;
      }

      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Teklif karari verilirken beklenmeyen bir hata olustu."
      );
      setReloadKey((currentKey) => currentKey + 1);
    } finally {
      setIsActingOffer(false);
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !thread || isSendingMessage || !messageDraft.trim()) {
      return;
    }

    try {
      setIsSendingMessage(true);
      await createOfferThreadMessage(
        thread.offerId,
        { mesaj: messageDraft.trim() },
        accessToken
      );
      setMessageDraft("");
      setReloadKey((currentKey) => currentKey + 1);
    } catch (error) {
      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Mesaj gonderilirken beklenmeyen bir hata olustu."
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendCounterOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !thread || isSendingCounterOffer) {
      return;
    }

    const parsedAmount = Number(counterOfferAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      window.alert("Gecerli bir karsi teklif tutari gir.");
      return;
    }

    try {
      setIsSendingCounterOffer(true);
      await createOfferThreadCounterOffer(
        thread.offerId,
        {
          fiyat: parsedAmount,
          mesaj: counterOfferNote.trim() || undefined,
        },
        accessToken
      );
      setCounterOfferAmount("");
      setCounterOfferNote("");
      setReloadKey((currentKey) => currentKey + 1);
    } catch (error) {
      window.alert(
        error instanceof ApiClientError
          ? error.message
          : "Karsi teklif gonderilirken beklenmeyen bir hata olustu."
      );
    } finally {
      setIsSendingCounterOffer(false);
    }
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="font-medium text-slate-500">Yukleniyor...</p>
      </div>
    );
  }

  return (
    <DashboardShell
      title="Teklif konusmasi"
      description={
        isCarrierWorkspace
          ? "Teklif akisini, fiyat pazarligini ve nakliye kararlarini nakliyeci baglaminda yonet."
          : "Teklif akisini, fiyat pazarligini ve karar adimlarini musteri baglaminda yonet."
      }
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && thread ? (
        <div className="grid gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      thread.isClosed
                        ? "bg-slate-100 text-slate-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {thread.isClosed ? "Kapali" : "Aktif"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Teklif #{thread.offerId}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Istek #{thread.requestId}
                  </span>
                </div>

                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  {formatLocationLabel(
                    thread.baslangicKonumMetni,
                    thread.baslangicSehri
                  )}{" "}
                  →{" "}
                  {formatLocationLabel(thread.varisKonumMetni, thread.varisSehri)}
                </h2>

                <p className="text-sm text-slate-600">
                  {thread.karsiTarafAdSoyad}{" "}
                  <span className="text-slate-500">
                    @{thread.karsiTarafKullaniciAdi}
                  </span>
                </p>
              </div>

              <div className="flex min-w-[250px] flex-col items-start gap-3 lg:items-end">
                <p className="text-3xl font-black tracking-tight text-emerald-700">
                  {formatCurrency(thread.fiyat)}
                </p>
                {thread.closedAt ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {formatDate(thread.closedAt)}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link
                    href={
                      thread.participantSide === "carrier"
                        ? "/dashboard/tekliflerim"
                        : `/dashboard/isteklerim/${thread.requestId}`
                    }
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Geri don
                  </Link>
                  {thread.canAcceptOffer ? (
                    <button
                      type="button"
                      onClick={() => void handleOfferDecision("accept")}
                      disabled={isActingOffer}
                      className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isActingOffer ? "Isleniyor..." : "Kabul Et"}
                    </button>
                  ) : null}
                  {thread.canRejectOffer ? (
                    <button
                      type="button"
                      onClick={() => void handleOfferDecision("reject")}
                      disabled={isActingOffer}
                      className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isActingOffer ? "Isleniyor..." : "Reddet"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              {thread.messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-2xl border p-4 ${
                    message.type === "SYSTEM_EVENT"
                      ? "border-slate-200 bg-slate-50"
                      : message.isMine
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {message.type === "SYSTEM_EVENT"
                          ? "Sistem"
                          : message.senderName ?? "Kullanici"}
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {getMessageBody(message)}
                      </p>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {formatDate(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {thread.canSendMessage ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <form
                onSubmit={handleSendMessage}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-950">
                      Mesaj gonder
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Bu teklif baglaminda sadece ilgili tarafla yazisirsin.
                    </p>
                  </div>

                  <textarea
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    rows={5}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Mesajini yaz..."
                  />

                  <button
                    type="submit"
                    disabled={isSendingMessage || !messageDraft.trim()}
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSendingMessage ? "Gonderiliyor..." : "Mesaj gonder"}
                  </button>
                </div>
              </form>

              <form
                onSubmit={handleSendCounterOffer}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-950">
                      Karsi teklif ver
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Yeni fiyat teklifini akisa yaz ve teklif tutarini guncelle.
                    </p>
                  </div>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={counterOfferAmount}
                    onChange={(event) => setCounterOfferAmount(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Yeni fiyat"
                  />

                  <textarea
                    value={counterOfferNote}
                    onChange={(event) => setCounterOfferNote(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Opsiyonel not"
                  />

                  <button
                    type="submit"
                    disabled={isSendingCounterOffer || !counterOfferAmount.trim()}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSendingCounterOffer
                      ? "Gonderiliyor..."
                      : "Karsi teklif gonder"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 shadow-sm">
              Bu konusma read-only durumda. Yeni mesaj veya karsi teklif gonderilemez.
            </div>
          )}
        </div>
      ) : null}
    </DashboardShell>
  );
}
