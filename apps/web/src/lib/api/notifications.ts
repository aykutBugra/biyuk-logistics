import { apiFetch } from "./api-client";

export type NotificationListItem = {
  id: string;
  tip: string;
  baslik: string;
  mesaj: string;
  hedefUrl: string | null;
  isRead: boolean;
  okunmaTarihi: string | null;
  olusturmaTarihi: string;
};

export type UnreadNotificationCount = {
  unreadCount: number;
};

export type MarkAllNotificationsAsReadResult = {
  updatedCount: number;
};

// Bildirimler sayfasi kullanicinin tum sistem bildirimlerini buradan ceker.
export function getMyNotifications(accessToken: string) {
  return apiFetch<NotificationListItem[]>("/notifications/my", {
    method: "GET",
    accessToken,
  });
}

// Topbar ve dashboard rozetleri icin okunmamis bildirim sayisi hafif endpoint'ten gelir.
export function getMyUnreadNotificationCount(accessToken: string) {
  return apiFetch<UnreadNotificationCount>("/notifications/my/unread-count", {
    method: "GET",
    accessToken,
  });
}

// Tek bildirime tiklaninca sadece o kayit okundu olarak isaretlenir.
export function markNotificationAsRead(
  notificationId: string,
  accessToken: string
) {
  return apiFetch<NotificationListItem>(`/notifications/${notificationId}/read`, {
    method: "POST",
    accessToken,
  });
}

// Bildirimler ekranindaki toplu okundu aksiyonu kac kaydin guncellendigini dondurur.
export function markAllNotificationsAsRead(accessToken: string) {
  return apiFetch<MarkAllNotificationsAsReadResult>("/notifications/my/read-all", {
    method: "POST",
    accessToken,
  });
}
