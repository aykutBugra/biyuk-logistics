"use client";

import { useState, type FormEvent } from "react";
import type { CreateRatingInput, SubmittedRating } from "@/lib/api/ratings";

type RatingComposerCardProps = {
  eyebrow?: string;
  title: string;
  description: string;
  shipmentStatus: string;
  pendingDescription: string;
  canRateCounterparty: boolean;
  mySubmittedRating: SubmittedRating | null;
  isSubmitting: boolean;
  onSubmit: (input: CreateRatingInput) => Promise<void> | void;
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function RatingComposerCard({
  eyebrow,
  title,
  description,
  shipmentStatus,
  pendingDescription,
  canRateCounterparty,
  mySubmittedRating,
  isSubmitting,
  onSubmit,
}: RatingComposerCardProps) {
  const [puanDegeri, setPuanDegeri] = useState<number | null>(null);
  const [yorum, setYorum] = useState("");
  const isCompleted = shipmentStatus.trim().toUpperCase() === "TAMAMLANDI";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!puanDegeri || isSubmitting) {
      return;
    }

    await onSubmit({
      puanDegeri,
      yorum: yorum.trim() ? yorum.trim() : undefined,
    });
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="mt-2 text-lg font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>

      {mySubmittedRating ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              {mySubmittedRating.puanDegeri} / 5
            </span>
            <span className="text-sm text-emerald-800">
              Gonderildi: {formatDateTime(mySubmittedRating.tarih)}
            </span>
          </div>
          <p className="mt-3 text-sm text-emerald-900">
            {mySubmittedRating.yorum ?? "Bu puan icin yorum eklenmedi."}
          </p>
        </div>
      ) : null}

      {!mySubmittedRating && canRateCounterparty ? (
        <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
          <div>
            <p className="text-sm font-semibold text-gray-900">Puan</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((value) => {
                const isActive = puanDegeri === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPuanDegeri(value)}
                    className={`inline-flex min-w-11 items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-gray-900">Yorum</span>
            <textarea
              value={yorum}
              onChange={(event) => setYorum(event.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Istersen kisa bir yorum ekleyebilirsin."
              className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <button
            type="submit"
            disabled={!puanDegeri || isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Gonderiliyor..." : "Puani Gonder"}
          </button>
        </form>
      ) : null}

      {!mySubmittedRating && !canRateCounterparty ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          {isCompleted
            ? "Bu is icin puanlama su anda kullanilabilir degil."
            : pendingDescription}
        </div>
      ) : null}
    </div>
  );
}
