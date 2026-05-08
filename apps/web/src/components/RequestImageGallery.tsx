"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type { OpenOfferRequestImage } from "@/lib/api/offers";

type RequestImageGalleryProps = {
  images: OpenOfferRequestImage[];
  primaryImageId?: number | null;
};

export default function RequestImageGallery({
  images,
  primaryImageId = null,
}: RequestImageGalleryProps) {
  const initialImageId = useMemo(() => {
    return (
      primaryImageId ??
      images.find((image) => image.isPrimary)?.id ??
      images[0]?.id ??
      null
    );
  }, [images, primaryImageId]);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(initialImageId);

  useEffect(() => {
    setSelectedImageId(initialImageId);
  }, [initialImageId]);

  const selectedImage =
    images.find((image) => image.id === selectedImageId) ?? images[0] ?? null;

  if (!selectedImage) {
    return (
      <section className="app-surface rounded-[1.15rem] border border-slate-200 p-5 text-sm text-slate-500">
        Bu istek icin henuz fotograf yuklenmemis.
      </section>
    );
  }

  return (
    <section className="app-surface rounded-[1.15rem] border border-slate-200 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
            Fotograf galerisi
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">
            Yuke ait fotograflar
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {images.length} fotograf
        </span>
      </div>

      <div className="space-y-3">
        <div className="overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-100">
          <img
            src={selectedImage.url}
            alt={`Istek gorseli ${selectedImage.id}`}
            className="h-[17rem] w-full object-cover md:h-[24rem]"
          />
        </div>

        {images.length > 1 ? (
          <div className="grid grid-cols-4 gap-2 md:grid-cols-6 xl:grid-cols-8">
            {images.map((image) => {
              const isSelected = image.id === selectedImage.id;

              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImageId(image.id)}
                  className={`relative overflow-hidden rounded-xl border transition ${
                    isSelected
                      ? "border-blue-400 ring-2 ring-blue-100"
                      : "border-slate-200 hover:border-blue-200"
                  }`}
                >
                  <img
                    src={image.thumbnailUrl}
                    alt={`Istek kucuk gorsel ${image.id}`}
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                  {image.isPrimary ? (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                      Ana
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
