"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type ChangeEvent } from "react";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_COUNT = 10;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type RequestImageDraft = {
  id: string;
  file: File;
  previewUrl: string;
  isPrimary: boolean;
};

type Props = {
  disabled?: boolean;
  embedded?: boolean;
  onChange: (images: RequestImageDraft[]) => void;
};

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fingerprint(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

export default function RequestImageUploader({ disabled = false, embedded = false, onChange }: Props) {
  const [images, setImages] = useState<RequestImageDraft[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Track created object URLs so we can revoke them on unmount
  const revokeListRef = useRef<string[]>([]);

  useEffect(() => {
    const revokeList = revokeListRef.current;

    return () => {
      revokeList.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function commit(nextImages: RequestImageDraft[]) {
    setImages(nextImages);
    onChange(nextImages);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;

    // Convert to plain array BEFORE resetting the input value.
    // Some browsers clear the FileList in-place when value is reset,
    // which would make the reference empty.
    const files: File[] = input.files ? Array.from(input.files) : [];

    // Reset so the same file can be selected again later
    input.value = "";

    if (files.length === 0) return;

    const remaining = MAX_IMAGE_COUNT - images.length;

    if (remaining <= 0) {
      setErrorMessage(`En fazla ${MAX_IMAGE_COUNT} fotograf ekleyebilirsin.`);
      return;
    }

    const existingPrints = new Set(images.map((img) => fingerprint(img.file)));
    const nextDrafts: RequestImageDraft[] = [];
    const errors: string[] = [];
    let dupeCount = 0;

    for (const file of files.slice(0, remaining)) {
      if (!ALLOWED_TYPES.has(file.type)) {
        errors.push(`${file.name}: yalnizca JPEG, PNG veya WEBP kabul edilir.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`${file.name}: dosya 5 MB sinirini asiyor.`);
        continue;
      }
      const fp = fingerprint(file);
      if (existingPrints.has(fp)) {
        dupeCount++;
        continue;
      }
      existingPrints.add(fp);
      const previewUrl = URL.createObjectURL(file);
      revokeListRef.current.push(previewUrl);
      nextDrafts.push({ id: newId(), file, previewUrl, isPrimary: false });
    }

    if (nextDrafts.length === 0) {
      if (dupeCount > 0 && errors.length === 0) {
        setErrorMessage("Secilen dosyalar zaten listede mevcut.");
      } else {
        setErrorMessage(errors[0] ?? "Gecerli fotograf bulunamadi.");
      }
      return;
    }

    setErrorMessage(
      errors[0] ?? (dupeCount > 0 ? "Bazi dosyalar zaten listede oldugu icin atildi." : null)
    );

    const hasPrimary = images.some((img) => img.isPrimary);
    const merged = [...images, ...nextDrafts];
    const nextImages = hasPrimary
      ? merged
      : merged.map((img, i) => ({ ...img, isPrimary: i === 0 }));

    commit(nextImages);
  }

  function handleRemove(id: string) {
    const target = images.find((img) => img.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);

    const remaining = images.filter((img) => img.id !== id);
    const nextImages =
      remaining.length === 0 || remaining.some((img) => img.isPrimary)
        ? remaining
        : remaining.map((img, i) => ({ ...img, isPrimary: i === 0 }));

    commit(nextImages);
  }

  function handleSetPrimary(id: string) {
    commit(images.map((img) => ({ ...img, isPrimary: img.id === id })));
  }

  const isAtMax = images.length >= MAX_IMAGE_COUNT;

  return (
    <section aria-label="Yük fotoğrafları" className={embedded ? "min-w-0" : "app-surface-strong rounded-[1.85rem] border border-slate-200/80 px-5 py-5 md:px-6 md:py-6"}>
      {!embedded ? (
      <div className="mb-4 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
          Fotograf
        </p>
        <h2 className="text-xl font-black tracking-tight text-slate-950">
          Yuk fotograflari
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          Fotograf eklemek zorunlu degil. Ilk eklenen fotograf otomatik ana fotograf olur.
        </p>
      </div>

      ) : null}
      <div className="space-y-4">
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[1.35rem] border border-dashed px-5 py-6 text-center transition ${
            disabled || isAtMax
              ? "cursor-not-allowed border-slate-200 bg-slate-50/40 opacity-60"
              : "border-slate-300 bg-slate-50/80 hover:border-blue-300 hover:bg-blue-50/40"
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm">
            <i className="pi pi-images text-base" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {isAtMax ? `Maksimum ${MAX_IMAGE_COUNT} fotograf eklendi` : "Fotograf sec"}
          </span>
          <span className="text-xs leading-5 text-slate-500">
            JPEG, PNG veya WEBP · Foto basina en fazla 5 MB · Toplam en fazla {MAX_IMAGE_COUNT}{" "}
            fotograf
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={disabled || isAtMax}
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>

        {errorMessage ? (
          <p role="alert" className="text-sm font-medium text-amber-700">
            {errorMessage}
          </p>
        ) : null}

        {images.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image) => (
              <article
                key={image.id}
                className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white shadow-sm"
              >
                <div className="relative aspect-[4/3] bg-slate-100 p-2">
                  <img
                    src={image.previewUrl}
                    alt={image.file.name}
                    className="h-full w-full rounded-[0.95rem] object-contain"
                  />
                  {image.isPrimary ? (
                    <span className="absolute left-3 top-3 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                      Ana fotograf
                    </span>
                  ) : null}
                </div>

                <div className="space-y-3 px-4 py-4">
                  <div className="space-y-0.5">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                      {image.file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(image.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!image.isPrimary ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(image.id)}
                        disabled={disabled}
                        className="app-button-secondary px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Ana fotograf yap
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleRemove(image.id)}
                      disabled={disabled}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Kaldir
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
            Henuz fotograf secilmedi.
          </div>
        )}
      </div>
    </section>
  );
}
