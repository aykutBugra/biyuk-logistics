import { apiFetch } from "./api-client";

export type NotificationListItem = {
  id: number;
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

export function getMyNotifications(accessToken: string) {
  return apiFetch<NotificationListItem[]>("/notifications/my", {
    method: "GET",
    accessToken,
  });
}

export function getMyUnreadNotificationCount(accessToken: string) {
  return apiFetch<UnreadNotificationCount>("/notifications/my/unread-count", {
    method: "GET",
    accessToken,
  });
}

export function markNotificationAsRead(
  notificationId: number,
  accessToken: string
) {
  return apiFetch<NotificationListItem>(`/notifications/${notificationId}/read`, {
    method: "POST",
    accessToken,
  });
}

export function markAllNotificationsAsRead(accessToken: string) {
  return apiFetch<MarkAllNotificationsAsReadResult>("/notifications/my/read-all", {
    method: "POST",
    accessToken,
  });
}
