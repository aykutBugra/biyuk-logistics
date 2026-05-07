"use client";

import { apiFetch } from "./api-client";

export type OfferThreadMessage = {
  id: number;
  type: "TEXT" | "COUNTER_OFFER" | "SYSTEM_EVENT";
  text: string | null;
  teklifFiyati: number | null;
  systemEventCode: string | null;
  createdAt: string;
  senderUserId: number | null;
  senderName: string | null;
  senderUsername: string | null;
  isMine: boolean;
};

export type OfferThreadSummary = {
  id: number;
  offerId: number;
  requestId: number;
  participantSide: "customer" | "carrier";
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  karsiTarafId: number;
  karsiTarafAdSoyad: string;
  karsiTarafKullaniciAdi: string;
  fiyat: number;
  durum: string;
  isClosed: boolean;
  closedAt: string | null;
  hasUnread: boolean;
  unreadCount: number;
  lastMessageSummary: string | null;
  lastMessageAt: string | null;
};

export type OfferThreadDetail = {
  id: number;
  offerId: number;
  requestId: number;
  participantSide: "customer" | "carrier";
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  karsiTarafId: number;
  karsiTarafAdSoyad: string;
  karsiTarafKullaniciAdi: string;
  fiyat: number;
  durum: string;
  isClosed: boolean;
  closedAt: string | null;
  hasUnread: boolean;
  unreadCount: number;
  canSendMessage: boolean;
  canSendCounterOffer: boolean;
  canAcceptOffer: boolean;
  canRejectOffer: boolean;
  messages: OfferThreadMessage[];
};

export type MarkOfferThreadReadResponse = {
  lastReadMessageId: number | null;
  unreadCount: number;
};

// Konuşma listesi ekranı her açıldığında çağrılan temel thread özet endpoint'i.
export function getMyOfferThreads(
  accessToken: string,
  input?: { as?: "customer" | "carrier" }
) {
  const path = input?.as ? `/offer-threads/my?as=${input.as}` : "/offer-threads/my";

  return apiFetch<OfferThreadSummary[]>(path, {
    method: "GET",
    accessToken,
  });
}

// Tek bir offer konuşmasının tüm stream'ini çeker. Ekran websocket yerine bu endpoint'i
// tekrar çağırarak güncel veriyi alır.
export function getOfferThread(offerId: number, accessToken: string) {
  return apiFetch<OfferThreadDetail>(`/offer-threads/offers/${offerId}`, {
    method: "GET",
    accessToken,
  });
}

// Serbest metin mesajı gönderir; başarılı olunca UI thread'i yeniden fetch eder.
export function createOfferThreadMessage(
  offerId: number,
  input: { mesaj: string },
  accessToken: string
) {
  return apiFetch<OfferThreadMessage>(`/offer-threads/offers/${offerId}/messages`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

// Yeni fiyat önerisini message stream'e COUNTER_OFFER olarak yazar ve backend'de
// teklifin güncel fiyat özetini de değiştirir.
export function createOfferThreadCounterOffer(
  offerId: number,
  input: { fiyat: number; mesaj?: string },
  accessToken: string
) {
  return apiFetch<OfferThreadMessage>(
    `/offer-threads/offers/${offerId}/counter-offers`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    }
  );
}

// Thread açıldığında son mesajı okundu saymak için participant last-read pointer'ını ilerletir.
export function markOfferThreadAsRead(offerId: number, accessToken: string) {
  return apiFetch<MarkOfferThreadReadResponse>(
    `/offer-threads/offers/${offerId}/read`,
    {
      method: "POST",
      accessToken,
    }
  );
}
