"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import Image from "next/image";
import { ApiClientError } from "@/lib/api/api-client";
import {
  deleteVehicleImage,
  uploadVehicleImage,
  type VehicleDetail,
} from "@/lib/api/vehicles";
import { clearStoredAuth } from "@/lib/auth/auth-storage";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

type VehicleImageUploaderProps = {
  accessToken: string;
  vehicle: VehicleDetail;
  onVehicleChange: (vehicle: VehicleDetail) => void;
};

function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return "Yalnizca JPEG, PNG veya WEBP fotograf yukleyebilirsin.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Fotograf boyutu en fazla 5 MB olabilir.";
  }

  return null;
}

export default function VehicleImageUploader({
  accessToken,
  vehicle,
  onVehicleChange,
}: VehicleImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const hasImage = Boolean(vehicle.vehicleImageUrl);

  const handlePickClick = () => {
    if (isBusy) {
      return;
    }

    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file || isBusy) {
      return;
    }

    const validationMessage = validateImageFile(file);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    const formData = new FormData();
    formData.append("image", file, file.name);

    try {
      setIsBusy(true);
      setErrorMessage(null);
      const updatedVehicle = await uploadVehicleImage(
        vehicle.id,
        formData,
        accessToken
      );
      onVehicleChange(updatedVehicle);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        window.location.replace("/login");
        return;
      }

      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Arac fotografi yuklenirken beklenmeyen bir hata olustu."
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async () => {
    if (isBusy || !hasImage) {
      return;
    }

    try {
      setIsBusy(true);
      setErrorMessage(null);
      const updatedVehicle = await deleteVehicleImage(vehicle.id, accessToken);
      onVehicleChange(updatedVehicle);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        window.location.replace("/login");
        return;
      }

      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Arac fotografi kaldirilirken beklenmeyen bir hata olustu."
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="app-surface-strong rounded-[1.35rem] border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-950">Arac fotografi</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Tek ana fotograf. JPEG, PNG veya WEBP, en fazla 5 MB.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-50">
        {vehicle.vehicleImageUrl ? (
          <Image
            src={vehicle.vehicleImageUrl}
            alt={`${vehicle.marka} ${vehicle.model} fotografi`}
            width={640}
            height={360}
            sizes="(min-width: 1280px) 360px, 100vw"
            unoptimized
            className="h-44 w-full object-contain"
          />
        ) : (
          <div className="flex h-32 items-center justify-center text-slate-300">
            <i className="pi pi-truck text-4xl" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePickClick}
          disabled={isBusy}
          className="app-button-secondary app-pressable text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? "Isleniyor..." : hasImage ? "Degistir" : "Fotograf sec"}
        </button>

        {hasImage ? (
          <button
            type="button"
            onClick={() => void handleRemove()}
            disabled={isBusy}
            className="app-pressable inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Kaldir
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => void handleFileChange(event)}
      />

      {errorMessage ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
