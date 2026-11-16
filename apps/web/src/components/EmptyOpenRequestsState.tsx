"use client";

import { EmptyState } from "@/components/ui";

export type EmptyOpenRequestsStateMode =
  | "no-results"
  | "no-filter-match"
  | "no-route-match";

type EmptyOpenRequestsStateProps = {
  mode: EmptyOpenRequestsStateMode;
};

const contentMap: Record<
  EmptyOpenRequestsStateMode,
  { eyebrow: string; title: string; description: string }
> = {
  "no-results": {
    eyebrow: "Keşif",
    title: "Açık talep bulunmuyor",
    description:
      "Şu anda teklif almaya açık bir taşıma talebi bulunmuyor. Daha sonra tekrar kontrol edebilirsiniz.",
  },
  "no-filter-match": {
    eyebrow: "Filtre sonucu",
    title: "Filtrelere uyan talep yok",
    description:
      "Seçili filtrelere uygun sonuç bulunamadı. Şehir, hacim veya yük filtrelerini genişletmeyi deneyin.",
  },
  "no-route-match": {
    eyebrow: "Rota uyumu",
    title: "Seçili rotaya uygun talep yok",
    description:
      "Mevcut rota ve sapma aralığıyla eşleşen talep bulunamadı. Sapma sınırını genişletebilir veya farklı bir rota seçebilirsiniz.",
  },
};

export default function EmptyOpenRequestsState({
  mode,
}: EmptyOpenRequestsStateProps) {
  const content = contentMap[mode];

  return (
    <EmptyState
      icon="pi pi-box"
      title={content.title}
      description={content.description}
    />
  );
}
