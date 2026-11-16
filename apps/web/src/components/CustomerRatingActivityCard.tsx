"use client";

import Link from "next/link";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import CustomerWorkspaceSignalPill from "@/components/CustomerWorkspaceSignalPill";
import type { RatingListItem } from "@/lib/api/ratings";
import { useOperationalCardMotion } from "@/lib/motion/useOperationalCardMotion";

type CustomerRatingActivityCardProps = {
  item: RatingListItem;
  direction: "given" | "received";
  detailHref: string;
  detailLabel: string;
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRoleContext(value: string): string {
  return value.trim().toUpperCase() === "NAKLIYECI"
    ? "Nakliyeci akisi"
    : "Musteri akisi";
}

function renderStars(score: number) {
  return Array.from({ length: 5 }, (_, index) => {
    const isFilled = index < Math.round(score);

    return (
      <i
        key={`${score}-${index}`}
        className={isFilled ? "pi pi-star-fill" : "pi pi-star"}
        aria-hidden="true"
      />
    );
  });
}

export default function CustomerRatingActivityCard({
  item,
  direction,
  detailHref,
  detailLabel,
}: CustomerRatingActivityCardProps) {
  const { elementRef, motionProps } = useOperationalCardMotion<HTMLElement>();
  const directionTone = direction === "given" ? "blue" : "emerald";
  const directionLabel =
    direction === "given" ? "Sen degerlendirdin" : "Sana degerlendirme geldi";

  return (
    <article
      ref={elementRef}
      data-dashboard-card
      {...motionProps}
      className="rounded-[1.45rem] border border-slate-200 bg-white p-4 shadow-sm transition-colors will-change-transform hover:border-blue-200 md:p-5"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 gap-4">
          <CustomerInitialsAvatar
            name={item.counterpartyName}
            fallback={item.counterpartyUsername}
            tone={direction === "given" ? "blue" : "amber"}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CustomerWorkspaceSignalPill
                tone={directionTone}
                label={directionLabel}
              />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                {formatRoleContext(item.rolBaglami)}
              </span>
            </div>

            <h3 className="mt-3 break-words text-[1.65rem] font-black tracking-tight text-slate-950 [overflow-wrap:anywhere]">
              {item.baslangicSehri} {"→"} {item.varisSehri}
            </h3>

            <p className="mt-2 break-words text-sm text-slate-600 [overflow-wrap:anywhere]">
              {item.counterpartyName}{" "}
              <span className="text-slate-400">@{item.counterpartyUsername}</span>
            </p>

            <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-6 text-slate-500">
              {item.yorum ?? "Bu degerlendirme icin yorum eklenmedi."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:min-w-[240px] xl:items-end">
          <div className="xl:text-right">
            <div className="flex items-center gap-1 text-sm text-amber-500 xl:justify-end">
              {renderStars(item.puanDegeri)}
            </div>
            <p className="mt-2 text-[2.1rem] font-black leading-none tracking-tight text-slate-950">
              {item.puanDegeri} / 5
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {formatDateTime(item.tarih)}
            </p>
          </div>

          <Link href={detailHref} className="app-button-secondary">
            {detailLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
