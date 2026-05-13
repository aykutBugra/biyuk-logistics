"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import DashboardShell from "@/components/DashboardShell";
import EmptyStateCard from "@/components/EmptyStateCard";
import OfferThreadDetailLayout from "@/components/OfferThreadDetailLayout";
import StatusBadge from "@/components/StatusBadge";
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
import { useConfirm } from "@/lib/confirm/confirm-context";
import { formatLocationLabel } from "@/lib/logistics";
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

function normalizeStatus(value: string): string {
  return value.trim().toUpperCase();
}

function getOfferStatusLabel(status: string): string {
  switch (normalizeStatus(status)) {
    case "OLUSTURULDU":
      return "Bekliyor";
    case "KABUL_EDILDI":
      return "Kabul edildi";
    case "REDDEDILDI":
      return "Reddedildi";
    case "IPTAL_EDILDI":
      return "Iptal edildi";
    default:
      return status;
  }
}

function getConversationStateLabel(thread: OfferThreadDetail): string {
  if (thread.isClosed) {
    return "Kapali";
  }

  return "Aktif";
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

function getSystemEventLabel(code: string | null): string {
  switch (code) {
    case "OFFER_CREATED":
      return "Teklif";
    case "OFFER_ACCEPTED":
      return "Kabul";
    case "OFFER_REJECTED":
      return "Ret";
    case "THREAD_CLOSED_REQUEST_UNAVAILABLE":
      return "Kapanis";
    default:
      return "Sistem";
  }
}

function getSystemEventClasses(code: string | null): {
  shell: string;
  pill: string;
  icon: string;
} {
  switch (code) {
    case "OFFER_ACCEPTED":
      return {
        shell: "border-emerald-200 bg-emerald-50/80",
        pill: "bg-emerald-100 text-emerald-700",
        icon: "pi pi-check-circle text-emerald-700",
      };
    case "OFFER_REJECTED":
      return {
        shell: "border-red-200 bg-red-50/80",
        pill: "bg-red-100 text-red-700",
        icon: "pi pi-times-circle text-red-700",
      };
    case "THREAD_CLOSED_REQUEST_UNAVAILABLE":
      return {
        shell: "border-amber-200 bg-amber-50/80",
        pill: "bg-amber-100 text-amber-700",
        icon: "pi pi-lock text-amber-700",
      };
    case "OFFER_CREATED":
      return {
        shell: "border-blue-200 bg-blue-50/80",
        pill: "bg-blue-100 text-blue-700",
        icon: "pi pi-send text-blue-700",
      };
    default:
      return {
        shell: "border-slate-200 bg-slate-50/90",
        pill: "bg-slate-100 text-slate-600",
        icon: "pi pi-info-circle text-slate-500",
      };
  }
}

function getLatestMessageAt(messages: OfferThreadMessage[]): string | null {
  if (messages.length === 0) {
    return null;
  }

  return messages[messages.length - 1]?.createdAt ?? null;
}

function getRouteTitle(thread: OfferThreadDetail): string {
  return `${formatLocationLabel(
    thread.baslangicKonumMetni,
    thread.baslangicSehri
  )} -> ${formatLocationLabel(thread.varisKonumMetni, thread.varisSehri)}`;
}

function getBackHref(thread: OfferThreadDetail): string {
  return thread.participantSide === "carrier"
    ? "/dashboard/tekliflerim"
    : `/dashboard/isteklerim/${thread.requestId}`;
}

function OfferThreadContextSurface({
  thread,
  backHref,
  latestMessageAt,
}: {
  thread: OfferThreadDetail;
  backHref: string;
  latestMessageAt: string | null;
}) {
  const conversationStateLabel = getConversationStateLabel(thread);

  return (
    <aside className="app-surface-strong rounded-[1.25rem] border border-slate-200 p-4 shadow-sm md:p-5">
      <div className="space-y-4">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
            Konusma ozeti
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={thread.durum}
              label={getOfferStatusLabel(thread.durum)}
            />
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                thread.isClosed
                  ? "bg-slate-100 text-slate-700 ring-slate-200"
                  : "bg-emerald-50 text-emerald-700 ring-emerald-100"
              }`}
            >
              {conversationStateLabel}
            </span>
            {thread.unreadCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                {thread.unreadCount} okunmamis
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <CustomerInitialsAvatar
            name={thread.karsiTarafAdSoyad}
            fallback={thread.karsiTarafKullaniciAdi}
            imageUrl={thread.karsiTarafProfileImageUrl}
            size="md"
            tone={thread.isClosed ? "slate" : "blue"}
          />

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black text-slate-950">
              {getRouteTitle(thread)}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {thread.karsiTarafAdSoyad}{" "}
              <span className="text-slate-400">@{thread.karsiTarafKullaniciAdi}</span>
            </p>
          </div>
        </div>

        <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50/70 p-4">
          <p className="text-xs font-semibold uppercase text-emerald-700">
            Guncel teklif
          </p>
          <p className="mt-2 text-3xl font-black leading-none text-emerald-700">
            {formatCurrency(thread.fiyat)}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[0.95rem] border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Teklif kaydi
            </p>
            <p className="mt-2 text-lg font-black tracking-tight text-slate-950">
              #{thread.offerId}
            </p>
          </div>

          <div className="rounded-[0.95rem] border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Istek kaydi
            </p>
            <p className="mt-2 text-lg font-black tracking-tight text-slate-950">
              #{thread.requestId}
            </p>
          </div>

          <div className="rounded-[0.95rem] border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Son hareket
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {latestMessageAt ? formatDate(latestMessageAt) : "Hareket bekleniyor"}
            </p>
          </div>

          <div className="rounded-[0.95rem] border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase text-slate-400">
              Konusma durumu
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {thread.isClosed && thread.closedAt
                ? `${conversationStateLabel} - ${formatDate(thread.closedAt)}`
                : `${conversationStateLabel} gorusme`}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <Link href={backHref} className="app-button-secondary w-full justify-center">
            Geri don
          </Link>
        </div>
      </div>
    </aside>
  );
}

function OfferThreadDecisionSurface({
  thread,
  isActingOffer,
  onDecision,
}: {
  thread: OfferThreadDetail;
  isActingOffer: boolean;
  onDecision: (action: "accept" | "reject") => void;
}) {
  return (
    <section className="app-surface rounded-[1.25rem] border border-slate-200 p-4 shadow-sm md:p-5">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-700">
            Teklif karari
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            Mevcut aksiyonlar
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Bu konusma icin izin verilen karar adimlari burada gorunur.
          </p>
        </div>

        <div className="grid gap-3">
          {thread.canAcceptOffer ? (
            <button
              type="button"
              onClick={() => onDecision("accept")}
              disabled={isActingOffer}
              className="app-button-primary app-pressable w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isActingOffer ? "Isleniyor..." : "Kabul Et"}
            </button>
          ) : null}

          {thread.canRejectOffer ? (
            <button
              type="button"
              onClick={() => onDecision("reject")}
              disabled={isActingOffer}
              className="app-pressable inline-flex w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isActingOffer ? "Isleniyor..." : "Reddet"}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function OfferThreadMessageItem({
  message,
}: {
  message: OfferThreadMessage;
}) {
  if (message.type === "SYSTEM_EVENT") {
    const eventClasses = getSystemEventClasses(message.systemEventCode);

    return (
      <div className="flex justify-center">
        <article
          className={`max-w-2xl rounded-[1rem] border px-4 py-3 shadow-sm ${eventClasses.shell}`}
        >
          <div className="flex flex-wrap items-center justify-center gap-2 text-center">
            <i className={`${eventClasses.icon} text-sm`} />
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${eventClasses.pill}`}
            >
              {getSystemEventLabel(message.systemEventCode)}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {formatDate(message.createdAt)}
            </span>
          </div>
          <p className="mt-2 text-center text-sm leading-6 text-slate-700">
            {getSystemEventCopy(message.systemEventCode, message.teklifFiyati)}
          </p>
        </article>
      </div>
    );
  }

  const isCounterOffer = message.type === "COUNTER_OFFER";
  const senderName = message.isMine ? "Sen" : message.senderName ?? "Kullanici";
  const senderHandle = message.senderUsername ? `@${message.senderUsername}` : null;

  return (
    <div className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[min(100%,44rem)] items-end gap-3 ${
          message.isMine ? "flex-row-reverse" : ""
        }`}
      >
        <CustomerInitialsAvatar
          name={message.senderName}
          fallback={message.senderUsername ?? "KN"}
          imageUrl={message.senderProfileImageUrl}
          size="sm"
          tone={message.isMine ? "blue" : isCounterOffer ? "amber" : "slate"}
        />

        <article
          className={`min-w-0 rounded-[1.15rem] border px-4 py-3 shadow-sm ${
            isCounterOffer
              ? "border-emerald-200 bg-emerald-50/70"
              : message.isMine
                ? "border-blue-200 bg-blue-50/75"
                : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{senderName}</p>
            {senderHandle ? (
              <span className="text-xs font-medium text-slate-400">{senderHandle}</span>
            ) : null}
            {isCounterOffer ? (
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                Fiyat revizyonu
              </span>
            ) : null}
          </div>

          {isCounterOffer && message.teklifFiyati !== null ? (
            <div className="mt-3 rounded-[0.9rem] border border-emerald-100 bg-white/80 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase text-emerald-700">
                Guncellenen fiyat
              </p>
              <p className="mt-1.5 text-2xl font-black leading-none text-emerald-700">
                {formatCurrency(message.teklifFiyati)}
              </p>
            </div>
          ) : null}

          {message.text ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {message.text}
            </p>
          ) : null}

          <p className="mt-3 text-[11px] font-semibold uppercase text-slate-400">
            {formatDate(message.createdAt)}
          </p>
        </article>
      </div>
    </div>
  );
}

function OfferThreadMessagesSurface({
  thread,
}: {
  thread: OfferThreadDetail;
}) {
  return (
    <section className="app-surface-strong rounded-[1.25rem] border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-slate-950">Mesaj akisi</h2>
          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {thread.messages.length}
          </span>
        </div>
        <p className="text-sm leading-5 text-slate-500">
          Mesajlar, sistem hareketleri ve fiyat revizyonlari tek akis icinde tutulur.
        </p>
      </div>

      <div className="p-4 md:p-5">
        {thread.messages.length === 0 ? (
          <EmptyStateCard
            eyebrow="Mesaj kutusu"
            title="Henuz mesaj yok"
            description="Mesaj veya fiyat guncellemesi oldugunda konusma akisi burada gorunecek."
          />
        ) : (
          <div className="space-y-3">
            {thread.messages.map((message) => (
              <OfferThreadMessageItem key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function OfferThreadComposerSurface({
  messageDraft,
  onChange,
  isSendingMessage,
}: {
  messageDraft: string;
  onChange: (value: string) => void;
  isSendingMessage: boolean;
}) {
  return (
    <section className="app-surface-strong rounded-[1.25rem] border border-slate-200 p-4 shadow-sm md:p-5">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-700">
            Yeni mesaj
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            Mesaj gonder
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Bu teklif baglaminda yalnizca ilgili tarafla yazisirsin.
          </p>
        </div>

        <textarea
          value={messageDraft}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className="app-input block min-h-[7rem] w-full resize-y text-sm"
          placeholder="Mesajini yaz..."
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSendingMessage || !messageDraft.trim()}
            className="app-button-primary app-pressable min-w-[11rem] justify-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSendingMessage ? "Gonderiliyor..." : "Mesaj gonder"}
          </button>
        </div>
      </div>
    </section>
  );
}

function OfferThreadCounterOfferSurface({
  counterOfferAmount,
  counterOfferNote,
  onAmountChange,
  onNoteChange,
  isSendingCounterOffer,
}: {
  counterOfferAmount: string;
  counterOfferNote: string;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  isSendingCounterOffer: boolean;
}) {
  return (
    <section className="app-surface rounded-[1.25rem] border border-slate-200 p-4 shadow-sm md:p-5">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase text-emerald-700">
            Pazarlik
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            Karsi teklif ver
          </h2>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Yeni fiyatini ve varsa kisa notunu akisa ekle.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="counterOfferAmount"
              className="block text-sm font-semibold text-slate-700"
            >
              Yeni fiyat
            </label>
            <input
              id="counterOfferAmount"
              type="number"
              min="0.01"
              step="0.01"
              value={counterOfferAmount}
              onChange={(event) => onAmountChange(event.target.value)}
              className="app-input mt-2 block w-full text-sm"
              placeholder="Orn: 18500"
            />
          </div>

          <div>
            <label
              htmlFor="counterOfferNote"
              className="block text-sm font-semibold text-slate-700"
            >
              Not
            </label>
            <textarea
              id="counterOfferNote"
              value={counterOfferNote}
              onChange={(event) => onNoteChange(event.target.value)}
              rows={3}
              className="app-input mt-2 block min-h-[6rem] w-full resize-y text-sm"
              placeholder="Opsiyonel not"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSendingCounterOffer || !counterOfferAmount.trim()}
          className="app-pressable inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSendingCounterOffer ? "Gonderiliyor..." : "Karsi teklif gonder"}
        </button>
      </div>
    </section>
  );
}

function OfferThreadReadOnlyNotice() {
  return (
    <section className="app-surface rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-4 shadow-sm md:p-5">
      <p className="text-xs font-semibold uppercase text-slate-500">
        Konusma durumu
      </p>
      <h2 className="mt-1 text-lg font-black text-slate-950">
        Bu konusma read-only
      </h2>
      <p className="mt-2 text-sm leading-5 text-slate-600">
        Yeni mesaj veya karsi teklif gonderilemez. Onceki akis ve sistem
        hareketleri mesaj listesinde gorunmeye devam eder.
      </p>
    </section>
  );
}

export default function OfferThreadDetailPage() {
  const router = useRouter();
  const params = useParams<{ offerId: string }>();
  const offerId = Number(params.offerId);
  const confirm = useConfirm();
  const showToast = useToast();
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

    const confirmed = await confirm({
      title: action === "accept" ? "Teklifi kabul et" : "Teklifi reddet",
      message:
        action === "accept"
          ? "Bu teklifi kabul etmek istedigine emin misin?"
          : "Bu teklifi reddetmek istedigine emin misin?",
      tone: action === "reject" ? "danger" : "default",
      confirmLabel: action === "accept" ? "Kabul Et" : "Reddet",
      cancelLabel: "Vazgec",
      defaultFocus: action === "reject" ? "reject" : "accept",
      dismissableMask: action !== "reject",
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsActingOffer(true);

      if (action === "accept") {
        await acceptOffer(thread.offerId, accessToken);
        showToast({
          severity: "success",
          summary: "Teklif kabul edildi",
          detail: "Nakliye kaydi olusturuldu.",
        });
      } else {
        await rejectOffer(thread.offerId, accessToken);
        showToast({
          severity: "info",
          summary: "Teklif reddedildi",
          detail: "Teklif durumu guncellendi.",
        });
      }

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

      showToast({
        severity: "error",
        summary: "Teklif guncellenemedi",
        detail:
          error instanceof ApiClientError
            ? error.message
            : "Teklif karari verilirken beklenmeyen bir hata olustu.",
        life: 3600,
        closable: true,
      });
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
      showToast({
        severity: "error",
        summary: "Mesaj gonderilemedi",
        detail:
          error instanceof ApiClientError
            ? error.message
            : "Mesaj gonderilirken beklenmeyen bir hata olustu.",
        life: 3600,
        closable: true,
      });
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
      showToast({
        severity: "warn",
        summary: "Gecersiz tutar",
        detail: "Gecerli bir karsi teklif tutari gir.",
        life: 3200,
        closable: true,
      });
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
      showToast({
        severity: "error",
        summary: "Karsi teklif gonderilemedi",
        detail:
          error instanceof ApiClientError
            ? error.message
            : "Karsi teklif gonderilirken beklenmeyen bir hata olustu.",
        life: 3600,
        closable: true,
      });
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

  const latestMessageAt = thread ? getLatestMessageAt(thread.messages) : null;
  const canShowComposer = Boolean(thread?.canSendMessage);
  const canShowCounterOffer = Boolean(thread?.canSendCounterOffer);
  const isReadOnly = Boolean(thread) && !canShowComposer && !canShowCounterOffer;

  return (
    <DashboardShell
      title="Teklif konusmasi"
      description={
        isCarrierWorkspace
          ? "Teklif akisini, fiyat pazarligini ve operasyon kararlarini tek detay ekraninda yonet."
          : "Teklif akisini, mesajlasmayi ve karar adimlarini tek detay ekraninda takip et."
      }
      headerVariant="compact"
      motionPreset="operational"
      cardMotionLimit={4}
    >
      {isLoading ? <DashboardPageSkeleton /> : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && thread ? (
        <OfferThreadDetailLayout
          summary={
            <OfferThreadContextSurface
              thread={thread}
              backHref={getBackHref(thread)}
              latestMessageAt={latestMessageAt}
            />
          }
          timeline={
            <>
              <OfferThreadMessagesSurface thread={thread} />

              {canShowComposer ? (
                <form onSubmit={handleSendMessage}>
                  <OfferThreadComposerSurface
                    messageDraft={messageDraft}
                    onChange={setMessageDraft}
                    isSendingMessage={isSendingMessage}
                  />
                </form>
              ) : null}

              {isReadOnly ? <OfferThreadReadOnlyNotice /> : null}
            </>
          }
          actions={
            thread.canAcceptOffer || thread.canRejectOffer || canShowCounterOffer ? (
              <>
              {thread.canAcceptOffer || thread.canRejectOffer ? (
                <OfferThreadDecisionSurface
                  thread={thread}
                  isActingOffer={isActingOffer}
                  onDecision={(action) => {
                    void handleOfferDecision(action);
                  }}
                />
              ) : null}

              {canShowCounterOffer ? (
                <form onSubmit={handleSendCounterOffer}>
                  <OfferThreadCounterOfferSurface
                    counterOfferAmount={counterOfferAmount}
                    counterOfferNote={counterOfferNote}
                    onAmountChange={setCounterOfferAmount}
                    onNoteChange={setCounterOfferNote}
                    isSendingCounterOffer={isSendingCounterOffer}
                  />
                </form>
              ) : null}
              </>
            ) : null
          }
        />
      ) : null}
    </DashboardShell>
  );
}
