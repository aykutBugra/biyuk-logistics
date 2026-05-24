import { apiFetch } from "./api-client";
import type { RatingContext } from "./ratings";

export type JobListItem = {
  id: string;
  requestId: string;
  participantSide: "customer" | "carrier";
  baslangicSehri: string;
  varisSehri: string;
  anlasilanFiyat: number;
  aracPlaka: string;
  durum: string;
  olusturmaTarihi: string;
  baslangicTarihi: string | null;
  teslimBildirimTarihi: string | null;
  teslimTarihi: string | null;
  planlananAlimTarihi: string | null;
  tahminiTeslimTarihi: string | null;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyUsername: string;
};

export type JobDetail = {
  id: string;
  requestId: string;
  participantSide: "customer" | "carrier";
  durum: string;
  anlasilanFiyat: number;
  olusturmaTarihi: string;
  baslangicTarihi: string | null;
  teslimBildirimTarihi: string | null;
  teslimTarihi: string | null;
  planlananAlimTarihi: string | null;
  tahminiTeslimTarihi: string | null;
  baslangicSehri: string;
  varisSehri: string;
  baslangicKonumMetni: string | null;
  varisKonumMetni: string | null;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
  tekTasimaIstiyor: boolean;
  agirlikKg: number | null;
  hacimM3: number | null;
  yukTipi: string;
  tasimaTarihi: string | null;
  yukDetay: string;
  carrier: {
    id: string;
    name: string;
    username: string;
  };
  customer: {
    id: string;
    name: string;
    username: string;
  };
  vehicle: {
    id: string;
    plaka: string;
    marka: string;
    model: string;
    isArchived: boolean;
  };
  canStart: boolean;
  canMarkDelivered: boolean;
  canConfirmDelivery: boolean;
  canComplete: boolean;
  ratingContext: RatingContext;
};

type JobAudience = "customer" | "carrier";

// Cift role sahip kullanicida ayni job listesini hangi taraftan actigimizi query ile belirtir.
function withAudience(path: string, audience?: JobAudience): string {
  if (!audience) {
    return path;
  }

  return `${path}?as=${audience}`;
}

// Nakliyelerim ekraninda musteri/nakliyeci rolune gore ilgili isleri listeler.
export function getMyJobs(accessToken: string, audience?: JobAudience) {
  return apiFetch<JobListItem[]>(withAudience("/jobs/my", audience), {
    method: "GET",
    accessToken,
  });
}

// Detay ekraninda is akisi, taraf bilgileri ve puanlama context'i birlikte gelir.
export function getJobDetail(
  jobId: string,
  accessToken: string,
  audience?: JobAudience
) {
  return apiFetch<JobDetail>(withAudience(`/jobs/${jobId}`, audience), {
    method: "GET",
    accessToken,
  });
}

// Nakliyeci isi yola cikti olarak baslatir; backend durum gecisini kontrol eder.
export function startJob(jobId: string, accessToken: string) {
  return apiFetch<JobDetail>(`/jobs/${jobId}/start`, {
    method: "POST",
    accessToken,
  });
}

export function completeJob(jobId: string, accessToken: string) {
  return apiFetch<JobDetail>(`/jobs/${jobId}/complete`, {
    method: "POST",
    accessToken,
  });
}

export function markJobDelivered(jobId: string, accessToken: string) {
  return apiFetch<JobDetail>(`/jobs/${jobId}/delivered`, {
    method: "POST",
    accessToken,
  });
}

export function confirmJobDelivery(jobId: string, accessToken: string) {
  return apiFetch<JobDetail>(`/jobs/${jobId}/confirm-delivery`, {
    method: "POST",
    accessToken,
  });
}
