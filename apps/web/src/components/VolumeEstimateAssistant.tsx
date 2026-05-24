"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import MotionCollapse from "@/components/MotionCollapse";
import { ApiClientError } from "@/lib/api/api-client";
import {
  estimateVolumeFromImages,
  type VolumeEstimateItem,
  type VolumeEstimateResult,
} from "@/lib/api/volume-estimates";

const MAX_IMAGE_COUNT = 3;
const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type PreviewImage = {
  fileName: string;
  fileSizeLabel: string;
  url: string;
};

type VolumeEstimateAssistantProps = {
  accessToken: string;
  action: (value: string) => void;
  disabled: boolean;
  yukTipi: string;
};

const volumeFormatter = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const itemCountFormatter = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 0,
});

const loadTypeLabels: Record<VolumeEstimateItem["loadType"], string> = {
  genel_yuk: "Genel yuk",
  paletli: "Paletli",
  koli: "Koli",
  mobilya: "Mobilya",
  beyaz_esya: "Beyaz esya",
  insaat_malzemesi: "Insaat malzemesi",
  diger: "Diger",
};

const shapeTypeLabels: Record<VolumeEstimateItem["shapeType"], string> = {
  box: "Kutu",
  flat: "Duz",
  cylinder: "Silindir",
  irregular: "Duzensiz",
  bundle: "Demet",
  unknown: "Belirsiz",
};

const sizeClassLabels: Record<VolumeEstimateItem["sizeClass"], string> = {
  small: "Kucuk",
  medium: "Orta",
  large: "Buyuk",
  huge: "Cok buyuk",
};

const spaceProfileLabels: Record<VolumeEstimateItem["spaceProfile"], string> = {
  compact: "Kompakt",
  tall: "Dikey",
  wide: "Genis",
  bulky: "Hacimli",
  long: "Uzun",
  mixed: "Karisik",
};

const placementRiskLabels: Record<VolumeEstimateItem["placementRisk"], string> = {
  low: "Dusuk risk",
  medium: "Orta risk",
  high: "Yuksek risk",
};

const itemConfidenceLabels: Record<VolumeEstimateItem["confidence"], string> = {
  low: "dusuk",
  medium: "orta",
  high: "yuksek",
};

function formatDetectedItems(items: VolumeEstimateItem[]): string {
  if (items.length === 0) {
    return "Model belirgin bir urun listesi cikarimlayamadi.";
  }

  return items
    .map(
      (item) => `${item.label} x${itemCountFormatter.format(item.estimatedCount)}`
    )
    .join(", ");
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getItemConfidenceClasses(confidence: VolumeEstimateItem["confidence"]) {
  if (confidence === "high") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (confidence === "medium") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

export default function VolumeEstimateAssistant({
  accessToken,
  action,
  disabled,
  yukTipi,
}: VolumeEstimateAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [estimate, setEstimate] = useState<VolumeEstimateResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  useEffect(() => {
    const nextPreviewImages = selectedFiles.map((file) => ({
      fileName: file.name,
      fileSizeLabel: formatFileSize(file.size),
      url: URL.createObjectURL(file),
    }));

    setPreviewImages(nextPreviewImages);

    return () => {
      for (const previewImage of nextPreviewImages) {
        URL.revokeObjectURL(previewImage.url);
      }
    };
  }, [selectedFiles]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (nextFiles.length === 0) {
      setSelectedFiles([]);
      setEstimate(null);
      setErrorMessage(null);
      return;
    }

    if (nextFiles.length > MAX_IMAGE_COUNT) {
      setErrorMessage(`En fazla ${MAX_IMAGE_COUNT} gorsel secebilirsin.`);
      return;
    }

    for (const file of nextFiles) {
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        setErrorMessage("Sadece JPG, PNG veya WEBP gorseller kabul edilir.");
        return;
      }

      if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
        setErrorMessage("Her bir gorsel en fazla 5 MB olabilir.");
        return;
      }
    }

    setSelectedFiles(nextFiles);
    setEstimate(null);
    setErrorMessage(null);
  };

  const handleEstimate = async () => {
    if (disabled || isEstimating) {
      return;
    }

    if (selectedFiles.length === 0) {
      setErrorMessage("Tahmin uretmek icin en az bir gorsel secmelisin.");
      return;
    }

    setIsEstimating(true);
    setErrorMessage(null);

    try {
      const response = await estimateVolumeFromImages({
        accessToken,
        description,
        images: selectedFiles,
        yukTipi,
      });

      setEstimate(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Hacim tahmini su anda olusturulamadi.");
      }
    } finally {
      setIsEstimating(false);
    }
  };

  const handleApply = () => {
    if (!estimate) {
      return;
    }

    action(String(estimate.recommendedHacimM3));
};

  return (
    <div className="app-surface-muted rounded-[1.1rem] border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-lg space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
            AI hacim yardimi
          </p>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              Fotograflardan m3 onerisi al
            </p>
            <p className="text-xs leading-5 text-slate-600">
              Hacim alanini doldururken ikincil bir destek olarak kullan; sonucu
              istersen form gonderilmeden once duzenleyebilirsin.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((currentValue) => !currentValue)}
          aria-expanded={isOpen}
          disabled={disabled}
          className="app-button-secondary app-pressable shrink-0 px-3.5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isOpen ? "Paneli gizle" : "Goruntuyle tahmin et"}
        </button>
      </div>

      <MotionCollapse isOpen={isOpen} className="mt-4">
        <div
          data-dashboard-form-conditional
          className="space-y-4 border-t border-slate-200 pt-4"
        >
          <div className="rounded-[1rem] border border-dashed border-slate-300 bg-white p-4">
            <div className="space-y-2">
              <label
                htmlFor="volume-estimate-images"
                className="block text-sm font-semibold text-slate-700"
              >
                Gorseller
              </label>
              <input
                id="volume-estimate-images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={disabled || isEstimating}
                onChange={handleFileChange}
                className="block w-full rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
              />
              <p className="text-xs text-slate-500">
                En fazla 3 gorsel; her biri icin 5 MB limit uygulanir.
              </p>
              {selectedFiles.length > 0 ? (
                <p className="text-xs font-medium text-slate-600">
                  {selectedFiles.length} gorsel secildi:{" "}
                  {selectedFiles.map((file) => file.name).join(", ")}
                </p>
              ) : null}
            </div>
          </div>

          {previewImages.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {previewImages.map((previewImage) => (
                <div
                  key={previewImage.url}
                  className="overflow-hidden rounded-[0.95rem] border border-slate-200 bg-white"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    <Image
                      src={previewImage.url}
                      alt={previewImage.fileName}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-1 px-3 py-2.5">
                    <p className="truncate text-xs font-medium text-slate-800">
                      {previewImage.fileName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {previewImage.fileSizeLabel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-2">
            <label
              htmlFor="volume-estimate-description"
              className="block text-sm font-semibold text-slate-700"
            >
              Kisa aciklama (opsiyonel)
            </label>
            <textarea
              id="volume-estimate-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={disabled || isEstimating}
              placeholder="Orn: 6 koli, 1 camasir makinesi ve 1 koltuk."
              className="app-input block min-h-[6rem] resize-y bg-white text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleEstimate}
              disabled={disabled || isEstimating}
              className="app-button-secondary app-pressable px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEstimating ? "Tahmin uretiliyor..." : "Tahmini tasima hacmi uret"}
            </button>
            <span className="text-xs text-slate-500">
              Son degeri uygulamadan once istersen elle guncelleyebilirsin.
            </span>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          {estimate ? (
            <div className="space-y-4 rounded-[1rem] border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Tahmini tasima hacmi
                  </p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {volumeFormatter.format(estimate.recommendedHacimM3)} m3
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{estimate.summary}</p>
                </div>
                <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      estimate.confidenceLevel === "YUKSEK"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : estimate.confidenceLevel === "ORTA"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                >
                  Guven: {estimate.confidenceLevel.toLowerCase()}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tahmini aralik
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {volumeFormatter.format(estimate.minHacimM3)} -{" "}
                    {volumeFormatter.format(estimate.maxHacimM3)} m3
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tespit edilen urunler
                  </p>
                  <p className="mt-1 text-sm text-slate-900">
                    {formatDetectedItems(estimate.items)}
                  </p>
                </div>
              </div>

              {estimate.items.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Analiz kalemleri
                  </p>
                  <div className="mt-3 space-y-3">
                    {estimate.items.map((item, index) => (
                      <div
                        key={`${item.label}-${item.loadType}-${index}`}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {item.label} x{itemCountFormatter.format(item.estimatedCount)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {loadTypeLabels[item.loadType]} / {shapeTypeLabels[item.shapeType]} /{" "}
                              {sizeClassLabels[item.sizeClass]} / {spaceProfileLabels[item.spaceProfile]} /{" "}
                              {placementRiskLabels[item.placementRisk]} /{" "}
                              {item.stackable ? "Istiflenebilir" : "Istiflenemez"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.fragile ? "Hassas" : "Dayanikli"} /{" "}
                              {item.disassemblable
                                ? "Parcali tasinabilir"
                                : "Tek parca tasinir"}
                            </p>
                          </div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getItemConfidenceClasses(
                              item.confidence
                            )}`}
                          >
                            Guven: {itemConfidenceLabels[item.confidence]}
                          </span>
                        </div>
                        {item.notes.length > 0 ? (
                          <p className="mt-2 text-xs text-slate-600">{item.notes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {estimate.cautionNotes.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Dikkat notlari
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-800">
                    {estimate.cautionNotes.map((note) => (
                      <li key={note}>- {note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={disabled}
                  className="app-button-primary app-pressable px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Hacim alanina uygula
                </button>
                <span className="text-xs text-slate-500">
                  Bu sonuc gorsel yorum ve tasima kurallarina dayali tahmindir; formu
                  gondermeden once son degeri degistirebilirsin.
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </MotionCollapse>
    </div>
  );
}
