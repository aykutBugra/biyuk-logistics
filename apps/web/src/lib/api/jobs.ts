import { apiFetch } from "./api-client";
import type { RatingContext } from "./ratings";

export type JobListItem = {
  id: number;
  requestId: number;
  participantSide: "customer" | "carrier";
  baslangicSehri: string;
  varisSehri: string;
  anlasilanFiyat: number;
  aracPlaka: string;
  durum: string;
  olusturmaTarihi: string;
  baslangicTarihi: string | null;
  teslimTarihi: string | null;
  counterpartyId: number;
  counterpartyName: string;
  counterpartyUsername: string;
};

export type JobDetail = {
  id: number;
  requestId: number;
  participantSide: "customer" | "carrier";
  durum: string;
  anlasilanFiyat: number;
  olusturmaTarihi: string;
  baslangicTarihi: string | null;
  teslimTarihi: string | null;
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
    id: number;
    name: string;
    username: string;
  };
  customer: {
    id: number;
    name: string;
    username: string;
  };
  vehicle: {
    id: number;
    plaka: string;
    marka: string;
    model: string;
    isArchived: boolean;
  };
  canStart: boolean;
  canComplete: boolean;
  ratingContext: RatingContext;
};

type JobAudience = "customer" | "carrier";

function withAudience(path: string, audience?: JobAudience): string {
  if (!audience) {
    return path;
  }

  return `${path}?as=${audience}`;
}

export function getMyJobs(accessToken: string, audience?: JobAudience) {
  return apiFetch<JobListItem[]>(withAudience("/jobs/my", audience), {
    method: "GET",
    accessToken,
  });
}

export function getJobDetail(
  jobId: number,
  accessToken: string,
  audience?: JobAudience
) {
  return apiFetch<JobDetail>(withAudience(`/jobs/${jobId}`, audience), {
    method: "GET",
    accessToken,
  });
}

export function startJob(jobId: number, accessToken: string) {
  return apiFetch<JobDetail>(`/jobs/${jobId}/start`, {
    method: "POST",
    accessToken,
  });
}

export function completeJob(jobId: number, accessToken: string) {
  return apiFetch<JobDetail>(`/jobs/${jobId}/complete`, {
    method: "POST",
    accessToken,
  });
}
