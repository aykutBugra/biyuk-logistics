"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import CustomerInitialsAvatar from "@/components/CustomerInitialsAvatar";
import { ApiClientError } from "@/lib/api/api-client";
import {
  deleteMyProfileImage,
  uploadMyProfileImage,
} from "@/lib/api/auth";
import type { UserProfile } from "@/lib/api/users";
import {
  clearStoredAuth,
  mergeStoredAuthUser,
  type StoredAuthUser,
} from "@/lib/auth/auth-storage";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

type ProfileImageUploaderProps = {
  accessToken: string;
  user: StoredAuthUser;
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

function syncProfileUser(user: UserProfile) {
  mergeStoredAuthUser(user);
}

export default function ProfileImageUploader({
  accessToken,
  user,
}: ProfileImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const displayName = `${user.ad} ${user.soyad}`.trim() || user.kullaniciAdi;
  const hasImage = Boolean(user.profileImageUrl);

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
      const updatedUser = await uploadMyProfileImage(formData, accessToken);
      syncProfileUser(updatedUser);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        window.location.replace("/login");
        return;
      }

      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Profil fotografi yuklenirken beklenmeyen bir hata olustu."
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
      const updatedUser = await deleteMyProfileImage(accessToken);
      syncProfileUser(updatedUser);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        window.location.replace("/login");
        return;
      }

      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Profil fotografi kaldirilirken beklenmeyen bir hata olustu."
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="rounded-[1.35rem] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <CustomerInitialsAvatar
            name={displayName}
            fallback={user.kullaniciAdi}
            imageUrl={user.profileImageUrl}
            size="lg"
            tone="blue"
          />
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-950">Profil fotografi</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              JPEG, PNG veya WEBP. En fazla 5 MB.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
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
