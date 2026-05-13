import { apiFetch } from "./api-client";
import type { UserProfile } from "./users";

export type DashboardIntroRole = "customer" | "carrier";

export function deleteMyAccount(accessToken: string) {
  return apiFetch<void>("/auth/me", {
    method: "DELETE",
    accessToken,
  });
}

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

export function uploadMyProfileImage(formData: FormData, accessToken: string) {
  return apiFetch<UserProfile>("/auth/me/profile-image", {
    method: "POST",
    accessToken,
    body: formData,
  });
}

export function deleteMyProfileImage(accessToken: string) {
  return apiFetch<UserProfile>("/auth/me/profile-image", {
    method: "DELETE",
    accessToken,
  });
}
