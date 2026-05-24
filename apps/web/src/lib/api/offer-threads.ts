"use client";

import { apiFetch } from "./api-client";

export type OfferThreadMessage = {
  id: string;
  type: "TEXT" | "COUNTER_OFFER" | "SYSTEM_EVENT";
  text: string | null;
  teklifFiyati: number | null;
  systemEventCode: string | null;
  createdAt: string;
  senderUserId: string | null;
  senderName: string | null;
  senderUsername: string | null;
  senderProfileImageUrl?: string;
  isMine: boolean;
  attachments: OfferThreadMessageAttachment[];
};

export type OfferThreadMessageAttachment = {
  id: string;
  url: string;
  thumbnailUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  originalFileName: string;
  createdAt: string;
};

export type OfferThreadShipment = {
  id: string;
  durum: string;
  olusturmaTarihi: string;
  baslangicTarihi: string | null;
  teslimBildirimTarihi: string | null;
  teslimTarihi: string | null;
  planlananAlimTarihi: string | null;
  tahminiTeslimTarihi: string | null;
};

export type OfferThreadSummary = {
  id: string;
  offerId: string;
  requestId: string;
  participantSide: "customer" | "carrier";
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  karsiTarafId: string;
  karsiTarafAdSoyad: string;
  karsiTarafKullaniciAdi: string;
  karsiTarafProfileImageUrl?: string;
  fiyat: number;
  planlananAlimTarihi: string | null;
  tahminiTeslimTarihi: string | null;
  durum: string;
  isClosed: boolean;
  closedAt: string | null;
  hasUnread: boolean;
  unreadCount: number;
  lastMessageSummary: string | null;
  lastMessageAt: string | null;
};

export type OfferThreadDetail = {
  id: string;
  offerId: string;
  requestId: string;
  participantSide: "customer" | "carrier";
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  karsiTarafId: string;
  karsiTarafAdSoyad: string;
  karsiTarafKullaniciAdi: string;
  karsiTarafProfileImageUrl?: string;
  fiyat: number;
  planlananAlimTarihi: string | null;
  tahminiTeslimTarihi: string | null;
  durum: string;
  isClosed: boolean;
  closedAt: string | null;
  hasUnread: boolean;
  unreadCount: number;
  canSendMessage: boolean;
  canSendCounterOffer: boolean;
  canAcceptOffer: boolean;
  canRejectOffer: boolean;
  canMarkDelivered: boolean;
  canConfirmDelivery: boolean;
  lastPriceActorSide: "customer" | "carrier";
  shipment: OfferThreadShipment | null;
  messages: OfferThreadMessage[];
};

export type MarkOfferThreadReadResponse = {
  lastReadMessageId: string | null;
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
export function getOfferThread(offerId: string, accessToken: string) {
  return apiFetch<OfferThreadDetail>(`/offer-threads/offers/${offerId}`, {
    method: "GET",
    accessToken,
  });
}

// Serbest metin mesajı gönderir; başarılı olunca UI thread'i yeniden fetch eder.
export function createOfferThreadMessage(
  offerId: string,
  input: { mesaj: string },
  accessToken: string
) {
  return apiFetch<OfferThreadMessage>(`/offer-threads/offers/${offerId}/messages`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function createOfferThreadImageMessage(
  offerId: string,
  formData: FormData,
  accessToken: string
) {
  return apiFetch<OfferThreadMessage>(
    `/offer-threads/offers/${offerId}/image-messages`,
    {
      method: "POST",
      accessToken,
      body: formData,
    }
  );
}

// Yeni fiyat önerisini message stream'e COUNTER_OFFER olarak yazar ve backend'de
// teklifin güncel fiyat özetini de değiştirir.
export function createOfferThreadCounterOffer(
  offerId: string,
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
export function markOfferThreadAsRead(offerId: string, accessToken: string) {
  return apiFetch<MarkOfferThreadReadResponse>(
    `/offer-threads/offers/${offerId}/read`,
    {
      method: "POST",
      accessToken,
    }
  );
}
