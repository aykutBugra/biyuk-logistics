"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import type { OpenOfferRequestImage } from "@/lib/api/offers";
import styles from "./request-gallery.module.css";

type RequestImageGalleryProps = {
  images: OpenOfferRequestImage[];
  primaryImageId?: string | null;
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

  return (
    <RequestImageGalleryContent
      key={initialImageId ?? "empty"}
      images={images}
      initialImageId={initialImageId}
    />
  );
}

function RequestImageGalleryContent({
  images,
  initialImageId,
}: {
  images: OpenOfferRequestImage[];
  initialImageId: string | null;
}) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(initialImageId);

  const selectedImage =
    images.find((image) => image.id === selectedImageId) ?? images[0] ?? null;

  if (!selectedImage) {
    return (
      <section className="app-surface rounded-[1.15rem] border border-slate-200 p-5 text-sm text-slate-500">
        Bu talep için henüz fotoğraf yüklenmemiş.
      </section>
    );
  }

  return (
    <section className={styles.gallery} aria-label="Yük fotoğrafları">
      <div className={styles.header}>
        <h2>Yük fotoğrafları</h2>
        <span>{images.length} fotoğraf</span>
      </div>

      <div className={styles.body}>
        <div className={styles.preview}>
          <img
            src={selectedImage.url}
            alt={`Yük fotoğrafı ${images.indexOf(selectedImage) + 1}`}
          />
        </div>

        {images.length > 1 ? (
          <div className={styles.thumbnails}>
            {images.map((image, index) => {
              const isSelected = image.id === selectedImage.id;

              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImageId(image.id)}
                  aria-label={`${index + 1}. yük fotoğrafını göster`}
                  aria-pressed={isSelected}
                  className={styles.thumbnail}
                >
                  <img
                    src={image.thumbnailUrl}
                    alt=""
                  />
                  {image.isPrimary ? (
                    <span>Ana</span>
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
