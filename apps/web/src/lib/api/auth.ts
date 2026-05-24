import { apiFetch } from "./api-client";
import type { UserProfile } from "./users";

export type DashboardIntroRole = "customer" | "carrier";

// Kullanici kendi hesabini kapatmak istediginde auth endpoint'ine gider.
export function deleteMyAccount(accessToken: string) {
  return apiFetch<void>("/auth/me", {
    method: "DELETE",
    accessToken,
  });
}

// Dashboard tanitim karti bir kez kapatilinca backend profilde ilgili rol icin saklanir.
export function dismissMyDashboardIntro(
  accessToken: string,
  role: DashboardIntroRole
) {
  return apiFetch<UserProfile>("/auth/me/dashboard-intro", {
    method: "PATCH",
    accessToken,
    body: JSON.stringify({ role }),
  });
}

// Profil fotografi dosya oldugu icin JSON yerine FormData ile gonderilir.
export function uploadMyProfileImage(formData: FormData, accessToken: string) {
  return apiFetch<UserProfile>("/auth/me/profile-image", {
    method: "POST",
    accessToken,
    body: formData,
  });
}

// Profil fotografini kaldirinca backend guncel UserProfile cevabini geri dondurur.
export function deleteMyProfileImage(accessToken: string) {
  return apiFetch<UserProfile>("/auth/me/profile-image", {
    method: "DELETE",
    accessToken,
  });
}
