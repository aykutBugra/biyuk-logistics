import { apiFetch } from "./api-client";

export type JobListItem = {
  id: number;
  requestId: number;
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
  durum: string;
  anlasilanFiyat: number;
  olusturmaTarihi: string;
  baslangicTarihi: string | null;
  teslimTarihi: string | null;
  baslangicSehri: string;
  varisSehri: string;
  baslangicEnlem: number;
  baslangicBoylam: number;
  varisEnlem: number;
  varisBoylam: number;
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
};

export function getMyJobs(accessToken: string) {
  return apiFetch<JobListItem[]>("/jobs/my", {
    method: "GET",
    accessToken,
  });
}

export function getJobDetail(jobId: number, accessToken: string) {
  return apiFetch<JobDetail>(`/jobs/${jobId}`, {
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
