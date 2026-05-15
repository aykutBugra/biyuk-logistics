"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import DashboardPageSkeleton from "@/components/DashboardPageSkeleton";
import DashboardShell from "@/components/DashboardShell";
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

// ─── formatters ──────────────────────────────────────────────────────────────

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

function getRouteTitle(thread: OfferThreadDetail): string {
  return `${formatLocationLabel(
    thread.baslangicKonumMetni,
    thread.baslangicSehri
  )} → ${formatLocationLabel(thread.varisKonumMetni, thread.varisSehri)}`;
}

function getBackHref(thread: OfferThreadDetail): string {
  return thread.participantSide === "carrier"
    ? "/dashboard/tekliflerim"
    : `/dashboard/isteklerim/${thread.requestId}`;
}

function getLatestMessageAt(messages: OfferThreadMessage[]): string | null {
  if (messages.length === 0) return null;
  return messages[messages.length - 1]?.createdAt ?? null;
}

// ─── system event helpers ─────────────────────────────────────────────────────

type EventStyle = { row: string; icon: string; pill: string };

function getSystemEventStyle(code: string | null): EventStyle {
  switch (code) {
    case "OFFER_ACCEPTED":
      return {
        row: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
        icon: "pi pi-check-circle",
        pill: "bg-emerald-100 text-emerald-700",
      };
    case "OFFER_REJECTED":
      return {
        row: "border-red-200 bg-red-50/80 text-red-700",
        icon: "pi pi-times-circle",
        pill: "bg-red-100 text-red-700",
      };
    case "THREAD_CLOSED_REQUEST_UNAVAILABLE":
      return {
        row: "border-amber-200 bg-amber-50/80 text-amber-700",
        icon: "pi pi-lock",
        pill: "bg-amber-100 text-amber-700",
      };
    case "OFFER_CREATED":
      return {
        row: "border-blue-200 bg-blue-50/80 text-blue-700",
        icon: "pi pi-send",
        pill: "bg-blue-100 text-blue-700",
      };
    default:
      return {
        row: "border-slate-200 bg-slate-50/90 text-slate-600",
        icon: "pi pi-info-circle",
        pill: "bg-slate-100 text-slate-600",
      };
  }
}

function getSystemEventLabel(code: string | null): string {
  switch (code) {
    case "OFFER_CREATED":
      return "Teklif olusturuldu";
    case "OFFER_ACCEPTED":
      return "Teklif kabul edildi";
    case "OFFER_REJECTED":
      return "Teklif reddedildi";
    case "THREAD_CLOSED_REQUEST_UNAVAILABLE":
      return "Konusma kapatildi";
    default:
      return "Sistem olayi";
  }
}

function getSystemEventDetail(
  code: string | null,
  teklifFiyati: number | null
): string | null {
  if (code === "OFFER_CREATED" && teklifFiyati !== null) {
    return formatCurrency(teklifFiyati);
  }
  if (code === "THREAD_CLOSED_REQUEST_UNAVAILABLE") {
    return "Bu istek baska bir teklifle anlasilda.";
  }
  return null;
}

// ─── message items ────────────────────────────────────────────────────────────

function SystemEventRow({ message }: { message: OfferThreadMessage }) {
  const style = getSystemEventStyle(message.systemEventCode);
  const label = getSystemEventLabel(message.systemEventCode);
  const detail = getSystemEventDetail(
    message.systemEventCode,
    message.teklifFiyati
  );

  return (
    <div className="flex justify-center py-0.5">
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${style.row}`}
      >
        <i className={`${style.icon} text-xs`} />
        <span className="font-semibold">{label}</span>
        {detail ? (
          <>
            <span className="opacity-50">·</span>
            <span>{detail}</span>
          </>
        ) : null}
        <span className="opacity-50">·</span>
        <span className="opacity-75">{formatDate(message.createdAt)}</span>
      </div>
    </div>
  );
}

function ChatMessageBubble({ message }: { message: OfferThreadMessage }) {
  const isCounterOffer = message.type === "COUNTER_OFFER";
  const isMine = message.isMine;
  const senderName = isMine ? "Sen" : (message.senderName ?? "Kullanici");

  const bubbleColors = isCounterOffer
    ? "border-emerald-200 bg-emerald-50/80"
    : isMine
      ? "border-blue-200 bg-blue-50/80"
      : "border-slate-200 bg-white";

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[min(85%,22rem)] items-end gap-1.5 ${isMine ? "flex-row-reverse" : ""}`}
      >
        <CustomerInitialsAvatar
          name={message.senderName}
          fallback={message.senderUsername ?? "KN"}
          imageUrl={message.senderProfileImageUrl}
          size="xs"
          tone={isMine ? "blue" : isCounterOffer ? "amber" : "slate"}
        />

        <article
          className={`min-w-0 rounded-2xl border px-3 py-2.5 shadow-sm ${bubbleColors}`}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-800">
              {senderName}
            </span>
            {message.senderUsername && !isMine ? (
              <span className="text-[10px] text-slate-400">
                @{message.senderUsername}
              </span>
            ) : null}
            {isCounterOffer ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Fiyat revizyonu
              </span>
            ) : null}
          </div>

          {isCounterOffer && message.teklifFiyati !== null ? (
            <p className="mt-1.5 text-xl font-black leading-none text-emerald-700">
              {formatCurrency(message.teklifFiyati)}
            </p>
          ) : null}

          {message.text ? (
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-slate-700">
              {message.text}
            </p>
          ) : null}

          <p className="mt-1.5 text-[10px] text-slate-400">
            {formatDate(message.createdAt)}
          </p>
        </article>
      </div>
    </div>
  );
}

// ─── message feed ─────────────────────────────────────────────────────────────

function MessageFeed({ thread }: { thread: OfferThreadDetail }) {
  return (
    <section className="app-surface-strong rounded-[1.25rem] border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        <h2 className="text-sm font-bold text-slate-950">Mesaj akisi</h2>
        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
          {thread.messages.length}
        </span>
      </div>

      <div className="p-4">
        {thread.messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400">
            Henuz mesaj yok.
          </p>
        ) : (
          <div className="space-y-2">
            {thread.messages.map((message) =>
              message.type === "SYSTEM_EVENT" ? (
                <SystemEventRow key={message.id} message={message} />
              ) : (
                <ChatMessageBubble key={message.id} message={message} />
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── negotiation actions panel ────────────────────────────────────────────────

type ActiveAction = "counterOffer" | "message" | null;

function NegotiationActionsPanel({
  thread,
  isActingOffer,
  isSendingMessage,
  isSendingCounterOffer,
  messageDraft,
  counterOfferAmount,
  counterOfferNote,
  isAwaitingCounterparty,
  isReadOnly,
  activeAction,
  onDecision,
  onMessageDraftChange,
  onCounterAmountChange,
  onCounterNoteChange,
  onSendMessage,
  onSendCounterOffer,
  onToggleAction,
}: {
  thread: OfferThreadDetail;
  isActingOffer: boolean;
  isSendingMessage: boolean;
  isSendingCounterOffer: boolean;
  messageDraft: string;
  counterOfferAmount: string;
  counterOfferNote: string;
  isAwaitingCounterparty: boolean;
  isReadOnly: boolean;
  activeAction: ActiveAction;
  onDecision: (action: "accept" | "reject") => void;
  onMessageDraftChange: (value: string) => void;
  onCounterAmountChange: (value: string) => void;
  onCounterNoteChange: (value: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onSendCounterOffer: (event: FormEvent<HTMLFormElement>) => void;
  onToggleAction: (action: "counterOffer" | "message") => void;
}) {
  const hasAnyAction =
    thread.canAcceptOffer ||
    thread.canRejectOffer ||
    thread.canSendCounterOffer ||
    thread.canSendMessage;

  if (isReadOnly) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
        <p className="text-xs font-semibold text-slate-500">
          Bu konusma kapatildi. Yeni mesaj gonderilemez.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isAwaitingCounterparty ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5">
          <i className="pi pi-clock mt-0.5 text-xs text-amber-600" />
          <p className="text-xs font-medium text-amber-800">
            {thread.participantSide === "customer"
              ? "Karsi teklifin nakliyeci yanitini bekliyor."
              : "Karsi teklifin musteri yanitini bekliyor."}
          </p>
        </div>
      ) : null}

      {thread.canAcceptOffer ? (
        <button
          type="button"
          onClick={() => onDecision("accept")}
          disabled={isActingOffer}
          className="app-button-primary app-pressable w-full justify-center py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isActingOffer ? "Isleniyor..." : "Kabul Et"}
        </button>
      ) : null}

      {thread.canRejectOffer ? (
        <button
          type="button"
          onClick={() => onDecision("reject")}
          disabled={isActingOffer}
          className="app-pressable inline-flex w-full items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isActingOffer ? "Isleniyor..." : "Reddet"}
        </button>
      ) : null}

      {thread.canSendCounterOffer ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onToggleAction("counterOffer")}
            className={`app-pressable inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              activeAction === "counterOffer"
                ? "border-slate-300 bg-slate-100 text-slate-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            <i
              className={`text-xs ${activeAction === "counterOffer" ? "pi pi-times" : "pi pi-sync"}`}
            />
            {activeAction === "counterOffer" ? "Iptal" : "Karsi teklif ver"}
          </button>

          {activeAction === "counterOffer" ? (
            <form onSubmit={onSendCounterOffer} className="space-y-2">
              <input
                id="counterOfferAmount"
                type="number"
                min="0.01"
                step="0.01"
                value={counterOfferAmount}
                onChange={(e) => onCounterAmountChange(e.target.value)}
                className="app-input block w-full text-sm"
                placeholder="Yeni fiyat (TL)"
              />
              <textarea
                id="counterOfferNote"
                value={counterOfferNote}
                onChange={(e) => onCounterNoteChange(e.target.value)}
                rows={2}
                className="app-input block w-full resize-none text-sm"
                placeholder="Opsiyonel not..."
              />
              <button
                type="submit"
                disabled={
                  isSendingCounterOffer || !counterOfferAmount.trim()
                }
                className="app-pressable inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingCounterOffer ? "Gonderiliyor..." : "Gonder"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {thread.canSendMessage ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onToggleAction("message")}
            className={`app-pressable inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              activeAction === "message"
                ? "border-slate-300 bg-slate-100 text-slate-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <i
              className={`text-xs ${activeAction === "message" ? "pi pi-times" : "pi pi-comment"}`}
            />
            {activeAction === "message" ? "Iptal" : "Mesaj yaz"}
          </button>

          {activeAction === "message" ? (
            <form onSubmit={onSendMessage} className="space-y-2">
              <textarea
                value={messageDraft}
                onChange={(e) => onMessageDraftChange(e.target.value)}
                rows={3}
                className="app-input block w-full resize-none text-sm"
                placeholder="Mesajini yaz..."
              />
              <button
                type="submit"
                disabled={isSendingMessage || !messageDraft.trim()}
                className="app-button-primary app-pressable w-full justify-center py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingMessage ? "Gonderiliyor..." : "Gonder"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {!hasAnyAction && !isAwaitingCounterparty ? (
        <p className="text-xs text-slate-400">Bekleyen aksiyon yok.</p>
      ) : null}
    </div>
  );
}

// ─── compact side panel ───────────────────────────────────────────────────────

function NegotiationSidePanel({
  thread,
  backHref,
  latestMessageAt,
  isActingOffer,
  isSendingMessage,
  isSendingCounterOffer,
  messageDraft,
  counterOfferAmount,
  counterOfferNote,
  isAwaitingCounterparty,
  isReadOnly,
  activeAction,
  onDecision,
  onMessageDraftChange,
  onCounterAmountChange,
  onCounterNoteChange,
  onSendMessage,
  onSendCounterOffer,
  onToggleAction,
}: {
  thread: OfferThreadDetail;
  backHref: string;
  latestMessageAt: string | null;
  isActingOffer: boolean;
  isSendingMessage: boolean;
  isSendingCounterOffer: boolean;
  messageDraft: string;
  counterOfferAmount: string;
  counterOfferNote: string;
  isAwaitingCounterparty: boolean;
  isReadOnly: boolean;
  activeAction: ActiveAction;
  onDecision: (action: "accept" | "reject") => void;
  onMessageDraftChange: (value: string) => void;
  onCounterAmountChange: (value: string) => void;
  onCounterNoteChange: (value: string) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onSendCounterOffer: (event: FormEvent<HTMLFormElement>) => void;
  onToggleAction: (action: "counterOffer" | "message") => void;
}) {
  const conversationState = thread.isClosed ? "Kapali" : "Aktif gorusme";

  return (
    <aside className="app-surface-strong rounded-[1.25rem] border border-slate-200 p-4 shadow-sm">
      <div className="space-y-4">
        {/* Header: counterpart + route */}
        <div className="flex items-start gap-3">
          <CustomerInitialsAvatar
            name={thread.karsiTarafAdSoyad}
            fallback={thread.karsiTarafKullaniciAdi}
            imageUrl={thread.karsiTarafProfileImageUrl}
            size="sm"
            tone={thread.isClosed ? "slate" : "blue"}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-950">
              {getRouteTitle(thread)}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {thread.karsiTarafAdSoyad}{" "}
              <span className="text-slate-400">
                @{thread.karsiTarafKullaniciAdi}
              </span>
            </p>
          </div>
        </div>

        {/* Current price */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            Guncel teklif
          </p>
          <p className="mt-1 text-2xl font-black leading-none text-emerald-700">
            {formatCurrency(thread.fiyat)}
          </p>
        </div>

        {/* Meta info */}
        <dl className="space-y-1.5">
          <div className="flex items-center justify-between">
            <dt className="text-xs text-slate-400">Teklif durumu</dt>
            <dd>
              <StatusBadge
                status={thread.durum}
                label={getOfferStatusLabel(thread.durum)}
              />
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-xs text-slate-400">Konusma</dt>
            <dd className="text-xs font-semibold text-slate-700">
              {conversationState}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-xs text-slate-400">Son hareket</dt>
            <dd className="text-xs font-semibold text-slate-700">
              {latestMessageAt ? formatDate(latestMessageAt) : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-xs text-slate-400">Teklif #</dt>
            <dd className="text-xs font-semibold text-slate-700">
              {thread.offerId}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-xs text-slate-400">Istek #</dt>
            <dd className="text-xs font-semibold text-slate-700">
              {thread.requestId}
            </dd>
          </div>
        </dl>

        {/* Action section */}
        <div className="border-t border-slate-100 pt-3">
          <NegotiationActionsPanel
            thread={thread}
            isActingOffer={isActingOffer}
            isSendingMessage={isSendingMessage}
            isSendingCounterOffer={isSendingCounterOffer}
            messageDraft={messageDraft}
            counterOfferAmount={counterOfferAmount}
            counterOfferNote={counterOfferNote}
            isAwaitingCounterparty={isAwaitingCounterparty}
            isReadOnly={isReadOnly}
            activeAction={activeAction}
            onDecision={onDecision}
            onMessageDraftChange={onMessageDraftChange}
            onCounterAmountChange={onCounterAmountChange}
            onCounterNoteChange={onCounterNoteChange}
            onSendMessage={onSendMessage}
            onSendCounterOffer={onSendCounterOffer}
            onToggleAction={onToggleAction}
          />
        </div>

        {/* Back link */}
        <div className="border-t border-slate-100 pt-3">
          <Link
            href={backHref}
            className="app-button-secondary w-full justify-center text-sm"
          >
            Geri don
          </Link>
        </div>
      </div>
    </aside>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

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
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

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

        if (!isMounted) return;

        setThread(response);

        if (response.hasUnread) {
          void markOfferThreadAsRead(offerId, accessToken)
            .then(() => {
              if (!isMounted) return;
              setThread((current) =>
                current
                  ? { ...current, hasUnread: false, unreadCount: 0 }
                  : current
              );
            })
            .catch(() => {
              // non-blocking
            });
        }
      } catch (error) {
        if (!isMounted) return;

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
        if (isMounted) setIsLoading(false);
      }
    };

    void loadThread();

    return () => {
      isMounted = false;
    };
  }, [accessToken, offerId, reloadKey, router, status]);

  const handleOfferDecision = async (action: "accept" | "reject") => {
    if (!accessToken || !thread || isActingOffer) return;

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

    if (!confirmed) return;

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

      setReloadKey((k) => k + 1);
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
      setReloadKey((k) => k + 1);
    } finally {
      setIsActingOffer(false);
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken || !thread || isSendingMessage || !messageDraft.trim())
      return;

    try {
      setIsSendingMessage(true);
      await createOfferThreadMessage(
        thread.offerId,
        { mesaj: messageDraft.trim() },
        accessToken
      );
      setMessageDraft("");
      setActiveAction(null);
      setReloadKey((k) => k + 1);
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

  const handleSendCounterOffer = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!accessToken || !thread || isSendingCounterOffer) return;

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
      setActiveAction(null);
      setReloadKey((k) => k + 1);
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

  const handleToggleAction = (action: "counterOffer" | "message") => {
    setActiveAction((current) => (current === action ? null : action));
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
  const isAwaitingCounterparty = Boolean(
    thread &&
      !thread.isClosed &&
      !thread.canAcceptOffer &&
      !thread.canRejectOffer &&
      (canShowComposer || canShowCounterOffer)
  );

  return (
    <DashboardShell
      title="Teklif konusmasi"
      description={
        isCarrierWorkspace
          ? "Teklif akisini ve fiyat pazarligini buradan yonet."
          : "Teklif akisini ve karar adimlarini buradan takip et."
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
        <div
          data-dashboard-primary
          className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start"
        >
          {/* Right panel — appears first on mobile so users see context/actions immediately */}
          <div className="xl:sticky xl:top-4 xl:col-start-2 xl:row-start-1">
            <NegotiationSidePanel
              thread={thread}
              backHref={getBackHref(thread)}
              latestMessageAt={latestMessageAt}
              isActingOffer={isActingOffer}
              isSendingMessage={isSendingMessage}
              isSendingCounterOffer={isSendingCounterOffer}
              messageDraft={messageDraft}
              counterOfferAmount={counterOfferAmount}
              counterOfferNote={counterOfferNote}
              isAwaitingCounterparty={isAwaitingCounterparty}
              isReadOnly={isReadOnly}
              activeAction={activeAction}
              onDecision={(action) => {
                void handleOfferDecision(action);
              }}
              onMessageDraftChange={setMessageDraft}
              onCounterAmountChange={setCounterOfferAmount}
              onCounterNoteChange={setCounterOfferNote}
              onSendMessage={handleSendMessage}
              onSendCounterOffer={handleSendCounterOffer}
              onToggleAction={handleToggleAction}
            />
          </div>

          {/* Left column — message feed */}
          <div className="xl:col-start-1 xl:row-start-1">
            <MessageFeed thread={thread} />
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
