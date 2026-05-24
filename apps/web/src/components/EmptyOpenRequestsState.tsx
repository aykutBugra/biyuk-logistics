"use client";

import EmptyStateCard from "@/components/EmptyStateCard";

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
    eyebrow: "Kesif",
    title: "Acik istek bulunmuyor",
    description:
      "Su anda teklif vermeye acik bir tasima talebi gorunmuyor. Biraz sonra tekrar kontrol edebilirsin.",
  },
  "no-filter-match": {
    eyebrow: "Filtre sonucu",
    title: "Filtrelere uyan istek yok",
    description:
      "Secili filtreler bu an icin bir sonuc donmuyor. Sehir, hacim veya yuk alanlarini genisletmeyi dene.",
  },
  "no-route-match": {
    eyebrow: "Rota uyumu",
    title: "Secili rotaya uygun istek yok",
    description:
      "Mevcut rota ve sapma araligiyla eslesen bir tasima talebi bulunmuyor. Sapma sinirini genisletebilir veya farkli rota secebilirsin.",
  },
};

export default function EmptyOpenRequestsState({
  mode,
}: EmptyOpenRequestsStateProps) {
  const content = contentMap[mode];

  return (
    <EmptyStateCard
      eyebrow={content.eyebrow}
      title={content.title}
      description={content.description}
    />
  );
}
