import { apiFetch } from "./api-client";

export type UserProfile = {
  id: number;
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  profileImageUrl?: string;
  customerIntroDismissedAt: string | null;
  carrierIntroDismissedAt: string | null;
  roles: string[];
  businessRoles: ("MUSTERI" | "NAKLIYECI")[];
  isAdmin: boolean;
};

export function getUsers(accessToken: string) {
  return apiFetch<UserProfile[]>("/users", {
    method: "GET",
    accessToken,
  });
}
