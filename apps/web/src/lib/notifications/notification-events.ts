"use client";

const NOTIFICATIONS_CHANGE_EVENT = "biyuk-notifications-change";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// Bildirim okundu/degisti aksiyonundan sonra topbar ve sayfalarin sayaclarini tazelemesini saglar.
export function emitNotificationsChanged() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGE_EVENT));
}

// Bildirim degisim event'ini dinleyen hook/component icin unsubscribe fonksiyonu dondurur.
export function subscribeToNotificationChanges(
  callback: () => void
): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const handleEvent = () => {
    callback();
  };

  window.addEventListener(NOTIFICATIONS_CHANGE_EVENT, handleEvent);

  return () => {
    window.removeEventListener(NOTIFICATIONS_CHANGE_EVENT, handleEvent);
  };
}
