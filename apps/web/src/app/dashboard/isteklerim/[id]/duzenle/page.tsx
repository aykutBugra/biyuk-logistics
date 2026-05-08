"use client";

/* eslint-disable @next/next/no-img-element */

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import InputField from "@/components/InputField";
import LocationAutocompleteField from "@/components/LocationAutocompleteField";
import RequestImageUploader, {
  type RequestImageDraft,
} from "@/components/RequestImageUploader";
import { ApiClientError } from "@/lib/api/api-client";
import type { SelectedLocation } from "@/lib/api/locations";
import {
  deleteTransportRequestImage,
  getTransportRequestDetail,
  setPrimaryTransportRequestImage,
  updateTransportRequest,
  uploadTransportRequestImages,
  type TransportRequestDetail,
  type TransportRequestImage,
  type UpdateTransportRequestInput,
} from "@/lib/api/transport-requests";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCustomerPageAccess } from "@/lib/auth/use-customer-page-access";
import { CARGO_TYPE_OPTIONS, formatLocationLabel } from "@/lib/logistics";

type UpdateTransportRequestForm = {
  tekTasimaIstiyor: boolean;
  agirlikKg: string;
  hacimM3: string;
  yukTipi: string;
  tasimaTarihi: string;
  yukDetay: string;
};

const initialForm: UpdateTransportRequestForm = {
  tekTasimaIstiyor: false,
  agirlikKg: "",
  hacimM3: "",
  yukTipi: "GENEL",
  tasimaTarihi: "",
  yukDetay: "",
};

function toSelectedLocation(
  request: TransportRequestDetail,
  direction: "baslangic" | "varis"
): SelectedLocation | null {
  const provider =
    direction === "baslangic" ? request.baslangicProvider : request.varisProvider;
  const placeId =
    direction === "baslangic" ? request.baslangicPlaceId : request.varisPlaceId;

  if (!provider || !placeId) {
    return null;
  }

  return {
    provider,
    placeId,
    konumMetni:
      direction === "baslangic"
        ? formatLocationLabel(request.baslangicKonumMetni, request.baslangicSehri)
        : formatLocationLabel(request.varisKonumMetni, request.varisSehri),
    sehir:
      direction === "baslangic"
        ? request.normalizeBaslangicSehir || request.baslangicSehri
        : request.normalizeVarisSehir || request.varisSehri,
    ilce:
      direction === "baslangic"
        ? request.normalizeBaslangicIlce
        : request.normalizeVarisIlce,
    lat: direction === "baslangic" ? request.baslangicEnlem : request.varisEnlem,
    lng:
      direction === "baslangic" ? request.baslangicBoylam : request.varisBoylam,
  };
}

export default function EditTransportRequestPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const params = useParams<{ id: string }>();
  const requestId = Number(params.id);

  const [form, setForm] = useState<UpdateTransportRequestForm>(initialForm);
  const [baslangicKonum, setBaslangicKonum] = useState<SelectedLocation | null>(null);
  const [varisKonum, setVarisKonum] = useState<SelectedLocation | null>(null);
  const [legacyRouteHint, setLegacyRouteHint] = useState<{
    baslangic: string | null;
    varis: string | null;
  }>({ baslangic: null, varis: null });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [locationValidationActive, setLocationValidationActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo management state
  const [existingImages, setExistingImages] = useState<TransportRequestImage[]>([]);
  const [pendingImages, setPendingImages] = useState<RequestImageDraft[]>([]);
  const [imageActionError, setImageActionError] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [settingPrimaryImageId, setSettingPrimaryImageId] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "ready" || !accessToken) {
      if (status === "checking") {
        setIsLoading(true);
      }
      return;
    }

    if (!Number.isInteger(requestId) || requestId <= 0) {
      setErrorMessage("Gecersiz istek numarasi.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadRequest = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await getTransportRequestDetail(requestId, accessToken);

        if (!isMounted) {
          return;
        }

        setForm({
          tekTasimaIstiyor: response.tekTasimaIstiyor,
          agirlikKg: String(response.agirlikKg ?? ""),
          hacimM3: String(response.hacimM3 ?? ""),
          yukTipi: response.yukTipi,
          tasimaTarihi: response.tasimaTarihi ?? "",
          yukDetay: response.yukDetay,
        });
        setBaslangicKonum(toSelectedLocation(response, "baslangic"));
        setVarisKonum(toSelectedLocation(response, "varis"));
        setLegacyRouteHint({
          baslangic: response.baslangicPlaceId
            ? null
            : formatLocationLabel(response.baslangicKonumMetni, response.baslangicSehri),
          varis: response.varisPlaceId
            ? null
            : formatLocationLabel(response.varisKonumMetni, response.varisSehri),
        });
        // Load existing images
        setExistingImages(response.images ?? []);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiClientError && error.status === 401) {
          clearStoredAuth();
          router.replace("/login");
          return;
        }

        if (error instanceof ApiClientError && error.status === 403) {
          router.replace("/");
          return;
        }

        if (error instanceof ApiClientError && error.status === 404) {
          setErrorMessage("Bu istek bulunamadi.");
          return;
        }

        setErrorMessage(
          error instanceof ApiClientError
            ? error.message
            : "Istek bilgileri yuklenirken beklenmeyen bir hata olustu."
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      }
    };

    void loadRequest();

    return () => {
      isMounted = false;
    };
  }, [accessToken, requestId, router, status]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setSubmitErrorMessage(null);
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;

    setSubmitErrorMessage(null);
    setForm((currentForm) => ({
      ...currentForm,
      [name]: checked,
    }));
  };

  // Immediate image actions (no form save needed)
  const handleDeleteImage = useCallback(
    async (imageId: number) => {
      if (!accessToken || deletingImageId !== null || settingPrimaryImageId !== null) {
        return;
      }

      setDeletingImageId(imageId);
      setImageActionError(null);

      try {
        const updated = await deleteTransportRequestImage(requestId, imageId, accessToken);
        setExistingImages(updated.images ?? []);
      } catch (error) {
        console.error("[edit] Gorsel silme hatasi:", error);
        setImageActionError(
          error instanceof ApiClientError ? error.message : "Gorsel silinemedi."
        );
      } finally {
        setDeletingImageId(null);
      }
    },
    [accessToken, requestId, deletingImageId, settingPrimaryImageId]
  );

  const handleSetPrimaryImage = useCallback(
    async (imageId: number) => {
      if (!accessToken || deletingImageId !== null || settingPrimaryImageId !== null) {
        return;
      }

      setSettingPrimaryImageId(imageId);
      setImageActionError(null);

      try {
        const updated = await setPrimaryTransportRequestImage(
          requestId,
          imageId,
          accessToken
        );
        setExistingImages(updated.images ?? []);
      } catch (error) {
        console.error("[edit] Ana fotograf ayarlama hatasi:", error);
        setImageActionError(
          error instanceof ApiClientError ? error.message : "Ana fotograf ayarlanamadi."
        );
      } finally {
        setSettingPrimaryImageId(null);
      }
    },
    [accessToken, requestId, deletingImageId, settingPrimaryImageId]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      isSubmitting ||
      !accessToken ||
      !Number.isInteger(requestId) ||
      requestId <= 0
    ) {
      return;
    }

    if (!baslangicKonum || !varisKonum) {
      setLocationValidationActive(true);
      return;
    }

    setSubmitErrorMessage(null);
    setIsSubmitting(true);

    const payload: UpdateTransportRequestInput = {
      baslangicKonum: {
        provider: baslangicKonum.provider,
        placeId: baslangicKonum.placeId,
        sessionToken: baslangicKonum.sessionToken,
      },
      varisKonum: {
        provider: varisKonum.provider,
        placeId: varisKonum.placeId,
        sessionToken: varisKonum.sessionToken,
      },
      tekTasimaIstiyor: form.tekTasimaIstiyor,
      agirlikKg: Number(form.agirlikKg),
      hacimM3: Number(form.hacimM3),
      yukTipi: form.yukTipi,
      tasimaTarihi: form.tasimaTarihi,
      yukDetay: form.yukDetay,
    };

    try {
      const response = await updateTransportRequest(requestId, payload, accessToken);

      // Upload any newly selected images
      if (pendingImages.length > 0) {
        const formData = new FormData();
        const primaryIndex = pendingImages.findIndex((img) => img.isPrimary);

        pendingImages.forEach((img) => formData.append("images", img.file));
        if (primaryIndex >= 0) {
          formData.append("primaryIndex", String(primaryIndex));
        }

        let uploadFailed = false;

        try {
          await uploadTransportRequestImages(requestId, formData, accessToken);
        } catch (uploadError) {
          uploadFailed = true;
          console.error("[edit] Fotograf upload hatasi:", uploadError);
        }

        if (uploadFailed) {
          setSubmitErrorMessage(
            "Degisiklikler kaydedildi ancak yeni fotograflar yuklenemedi. Sayfayi yenileyip tekrar deneyebilirsin."
          );
          setIsSubmitting(false);
          return;
        }
      }

      router.replace(`/dashboard/isteklerim/${response.id}`);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        clearStoredAuth();
        window.alert("Oturum gecersiz. Lutfen yeniden giris yapin.");
        router.replace("/login");
        return;
      }

      if (error instanceof ApiClientError && error.status === 403) {
        window.alert("Bu islem icin yetkin yok.");
        router.replace("/");
        return;
      }

      if (error instanceof ApiClientError && error.status === 404) {
        window.alert(error.message);
        router.replace("/dashboard/isteklerim");
        return;
      }

      if (error instanceof ApiClientError) {
        setSubmitErrorMessage(error.message);
      } else {
        setSubmitErrorMessage("Istek guncellenirken beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const imageActionsDisabled =
    isSubmitting || deletingImageId !== null || settingPrimaryImageId !== null;

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="font-medium text-gray-600">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <CustomerTransportRequestsShell
      title="Istek duzenle"
      headerVariant="compact"
      motionPreset="form"
    >
      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-gray-600 shadow-sm">
          Istek bilgileri yukleniyor...
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Kayit duzenlenemedi</h2>
          <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <form
          onSubmit={handleSubmit}
          data-dashboard-form-surface
          className="app-form-surface app-surface-strong space-y-6"
        >
          {submitErrorMessage ? (
            <div data-dashboard-form-error className="app-form-error-banner" role="alert">
              <p className="text-sm font-semibold">Degisiklikler kaydedilemedi</p>
              <p className="mt-1 text-sm">{submitErrorMessage}</p>
            </div>
          ) : null}

          <div data-dashboard-form-section className="grid gap-4 md:grid-cols-2">
            <LocationAutocompleteField
              label="Baslangic konumu"
              placeholder="Yukleme noktasini ara"
              accessToken={accessToken ?? ""}
              value={baslangicKonum}
              onSelect={(value) => {
                setBaslangicKonum(value);
                setSubmitErrorMessage(null);
              }}
              legacyHint={legacyRouteHint.baslangic}
              disabled={isSubmitting}
              invalid={locationValidationActive && !baslangicKonum}
              validationMessage={
                locationValidationActive && !baslangicKonum
                  ? "Listeden bir baslangic konumu sec."
                  : null
              }
            />
            <LocationAutocompleteField
              label="Varis konumu"
              placeholder="Teslim noktasini ara"
              accessToken={accessToken ?? ""}
              value={varisKonum}
              onSelect={(value) => {
                setVarisKonum(value);
                setSubmitErrorMessage(null);
              }}
              legacyHint={legacyRouteHint.varis}
              disabled={isSubmitting}
              invalid={locationValidationActive && !varisKonum}
              validationMessage={
                locationValidationActive && !varisKonum
                  ? "Listeden bir varis konumu sec."
                  : null
              }
            />
          </div>

          <div data-dashboard-form-section className="grid gap-4 md:grid-cols-2">
            <InputField
              name="agirlikKg"
              label="Agirlik (kg)"
              type="number"
              min="0.01"
              step="0.01"
              value={form.agirlikKg}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <InputField
              name="hacimM3"
              label="Hacim (m3)"
              type="number"
              min="0.01"
              step="0.01"
              value={form.hacimM3}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="yukTipi">
                Yuk tipi
              </label>
              <select
                id="yukTipi"
                name="yukTipi"
                value={form.yukTipi}
                onChange={handleChange}
                disabled={isSubmitting}
                className="app-input block text-sm"
              >
                {CARGO_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <InputField
              name="tasimaTarihi"
              label="Tasima tarihi"
              type="date"
              value={form.tasimaTarihi}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <label
            data-dashboard-form-section
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              name="tekTasimaIstiyor"
              checked={form.tekTasimaIstiyor}
              onChange={handleCheckboxChange}
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              <span className="block font-semibold text-slate-900">
                Tek tasima istiyorum
              </span>
              <span className="block text-xs text-slate-500">
                Bu yukun baska yuklerle birlestirilmeden tasinmasini ister.
              </span>
            </span>
          </label>

          <div data-dashboard-form-section className="space-y-2">
            <label htmlFor="yukDetay" className="block text-sm font-medium text-gray-700">
              Yuk detayi
            </label>
            <textarea
              id="yukDetay"
              name="yukDetay"
              required
              rows={5}
              value={form.yukDetay}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="Tasima ihtiyacini, paketleme seklini veya ozel notlari acikla."
              className="app-input block min-h-[9rem] resize-y text-sm"
            />
          </div>

          {/* ── Photo management section ──────────────────────── */}
          <div
            data-dashboard-form-section
            className="space-y-4 rounded-[1.85rem] border border-slate-200/80 bg-white px-5 py-5 md:px-6 md:py-6"
          >
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
                Fotograflar
              </p>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Yuk fotograflari
              </h2>
            </div>

            {imageActionError ? (
              <p className="text-sm font-medium text-rose-700">{imageActionError}</p>
            ) : null}

            {/* Existing images */}
            {existingImages.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mevcut fotograflar
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {existingImages.map((image) => {
                    const isDeleting = deletingImageId === image.id;
                    const isSettingPrimary = settingPrimaryImageId === image.id;
                    const busy = isDeleting || isSettingPrimary;

                    return (
                      <article
                        key={image.id}
                        className={`overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white shadow-sm transition ${busy ? "opacity-60" : ""}`}
                      >
                        <div className="relative aspect-[4/3] bg-slate-100">
                          <img
                            src={image.thumbnailUrl}
                            alt={`Fotograf ${image.id}`}
                            className="h-full w-full object-cover"
                          />
                          {image.isPrimary ? (
                            <span className="absolute left-3 top-3 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                              Ana fotograf
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2 px-4 py-4">
                          {!image.isPrimary ? (
                            <button
                              type="button"
                              onClick={() => void handleSetPrimaryImage(image.id)}
                              disabled={imageActionsDisabled}
                              className="app-button-secondary px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSettingPrimary ? "Ayarlaniyor..." : "Ana fotograf yap"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void handleDeleteImage(image.id)}
                            disabled={imageActionsDisabled}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleting ? "Siliniyor..." : "Kaldir"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Henuz fotograf eklenmemis.</p>
            )}

            {/* New image picker */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Yeni fotograf ekle
              </p>
              <RequestImageUploader
                disabled={isSubmitting}
                onChange={setPendingImages}
              />
            </div>
          </div>
          {/* ────────────────────────────────────────────────── */}

          <div
            data-dashboard-form-submit
            className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <button
              type="submit"
              disabled={isSubmitting}
              className="app-button-primary app-form-submit-button app-pressable text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Istek guncelleniyor..." : "Degisiklikleri kaydet"}
            </button>
          </div>
        </form>
      ) : null}
    </CustomerTransportRequestsShell>
  );
}
