"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import InputField from "@/components/InputField";
import LocationAutocompleteField from "@/components/LocationAutocompleteField";
import RequestImageUploader, {
  type RequestImageDraft,
} from "@/components/RequestImageUploader";
import VolumeEstimateAssistant from "@/components/VolumeEstimateAssistant";
import { ApiClientError } from "@/lib/api/api-client";
import type { SelectedLocation } from "@/lib/api/locations";
import {
  createTransportRequest,
  uploadTransportRequestImages,
  type CreateTransportRequestInput,
} from "@/lib/api/transport-requests";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCustomerPageAccess } from "@/lib/auth/use-customer-page-access";
import { CARGO_TYPE_OPTIONS } from "@/lib/logistics";

type CreateTransportRequestForm = {
  tekTasimaIstiyor: boolean;
  agirlikKg: string;
  hacimM3: string;
  yukTipi: string;
  tasimaTarihi: string;
  yukDetay: string;
};

type RequestFormSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

const initialForm: CreateTransportRequestForm = {
  tekTasimaIstiyor: false,
  agirlikKg: "",
  hacimM3: "",
  yukTipi: "GENEL",
  tasimaTarihi: "",
  yukDetay: "",
};

function RequestFormSection({
  eyebrow,
  title,
  description,
  children,
  className = "",
  contentClassName = "space-y-5",
}: RequestFormSectionProps) {
  return (
    <section
      data-dashboard-form-section
      className={`app-surface-strong rounded-[1.85rem] border border-slate-200/80 px-5 py-5 md:px-6 md:py-6 ${className}`.trim()}
    >
      <div className="mb-5 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
          {eyebrow}
        </p>
        <div className="space-y-1">
          <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>

      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export default function CreateTransportRequestPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const [form, setForm] = useState<CreateTransportRequestForm>(initialForm);
  const [baslangicKonum, setBaslangicKonum] = useState<SelectedLocation | null>(
    null
  );
  const [varisKonum, setVarisKonum] = useState<SelectedLocation | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [locationValidationActive, setLocationValidationActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<RequestImageDraft[]>([]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setFormErrorMessage(null);
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;

    setFormErrorMessage(null);
    setForm((currentForm) => ({
      ...currentForm,
      [name]: checked,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || !accessToken) {
      return;
    }

    if (!baslangicKonum || !varisKonum) {
      setLocationValidationActive(true);
      return;
    }

    setFormErrorMessage(null);
    setIsSubmitting(true);

    const payload: CreateTransportRequestInput = {
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
      const response = await createTransportRequest(payload, accessToken);

      if (selectedImages.length > 0) {
        const formData = new FormData();
        const primaryIndex = selectedImages.findIndex((image) => image.isPrimary);

        selectedImages.forEach((image) => {
          formData.append("images", image.file);
        });

        if (primaryIndex >= 0) {
          formData.append("primaryIndex", String(primaryIndex));
        }

        let uploadFailed = false;

        try {
          await uploadTransportRequestImages(response.id, formData, accessToken);
        } catch (uploadError) {
          uploadFailed = true;
          console.error("[istek_ekle] Fotograf upload hatasi:", uploadError);
        }

        if (uploadFailed) {
          setFormErrorMessage(
            "Istek olusturuldu ancak fotograflar yuklenemedi. Isteklerim > Duzenle ekranindan fotograflari ekleyebilirsin."
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
        window.alert("Bu sayfa yalnizca musteri hesabi icin kullanilabilir.");
        router.replace("/");
        return;
      }

      if (error instanceof ApiClientError) {
        setFormErrorMessage(error.message);
      } else {
        setFormErrorMessage("Istek olusturulurken beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="font-medium text-gray-600">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <CustomerTransportRequestsShell
      title="Yeni tasima istegi olustur"
      description="Konum, yuk ve tercih bilgilerini tek kayitta toparla."
      headerVariant="compact"
      motionPreset="form"
    >
      <form
        onSubmit={handleSubmit}
        data-dashboard-form-surface
        className="mx-auto max-w-5xl space-y-5"
      >
        {formErrorMessage ? (
          <div data-dashboard-form-error className="app-form-error-banner" role="alert">
            <p className="text-sm font-semibold">Form gonderilemedi</p>
            <p className="mt-1 text-sm">{formErrorMessage}</p>
          </div>
        ) : null}

        <RequestFormSection
          eyebrow="Konum"
          title=""
          description=""
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <LocationAutocompleteField
              label="Baslangic konumu"
              placeholder="Yukleme noktasini ara"
              accessToken={accessToken ?? ""}
              value={baslangicKonum}
              onSelect={(value) => {
                setBaslangicKonum(value);
                setFormErrorMessage(null);
              }}
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
                setFormErrorMessage(null);
              }}
              disabled={isSubmitting}
              invalid={locationValidationActive && !varisKonum}
              validationMessage={
                locationValidationActive && !varisKonum
                  ? "Listeden bir varis konumu sec."
                  : null
              }
            />
          </div>
        </RequestFormSection>

        <RequestFormSection
          eyebrow="Yuk"
          title=""
          description=""
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                name="agirlikKg"
                label="Agirlik (kg)"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Orn: 1250"
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
                placeholder="Orn: 12.5"
                value={form.hacimM3}
                onChange={handleChange}
                disabled={isSubmitting}
              />

              <div className="space-y-2">
                <label
                  className="block text-sm font-semibold text-slate-700"
                  htmlFor="yukTipi"
                >
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

            <VolumeEstimateAssistant
              accessToken={accessToken ?? ""}
              disabled={isSubmitting}
              yukTipi={form.yukTipi}
              onApplyEstimate={(value) =>
                setForm((currentForm) => ({
                  ...currentForm,
                  hacimM3: value,
                }))
              }
            />
          </div>
        </RequestFormSection>

        <RequestFormSection
          eyebrow="Tercih"
          title=""
          description=""
          contentClassName=""
        >
          <label className="group flex items-start gap-4 rounded-[1.45rem] border border-slate-200/80 bg-slate-50/80 px-4 py-4 md:items-center">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm md:mt-0">
              <input
                type="checkbox"
                name="tekTasimaIstiyor"
                checked={form.tekTasimaIstiyor}
                onChange={handleCheckboxChange}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                Tek tasima istiyorum
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Bu yuk baska yuklerle birlestirilmeden, tek tasima olarak planlansin.
              </span>
            </span>
          </label>
        </RequestFormSection>

        <RequestFormSection
          eyebrow="Not"
          title=""
          description=""
        >
          <div className="space-y-2">
            <label
              htmlFor="yukDetay"
              className="block text-sm font-semibold text-slate-700"
            >
              Yuk detayi
            </label>
            <textarea
              id="yukDetay"
              name="yukDetay"
              required
              rows={4}
              value={form.yukDetay}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="Tasima ihtiyacini, paketleme seklini veya ozel notlari acikla."
              className="app-input block min-h-[8.5rem] resize-y text-sm"
            />
          </div>
        </RequestFormSection>

        <RequestImageUploader
          disabled={isSubmitting}
          onChange={setSelectedImages}
        />

        <section
          data-dashboard-form-section
          className="app-surface-strong rounded-[1.85rem] border border-slate-200/80 px-5 py-5 md:px-6 md:py-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">
                Form aksiyonu
              </p>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Istek kaydini yayinlamaya hazirsin
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                Kayit tamamlandiginda gelen teklifleri Isteklerim ekranindan takip
                edersin.
              </p>
            </div>

            <div
              data-dashboard-form-submit
              className="flex w-full items-center justify-start lg:w-auto lg:justify-end"
            >
              <button
                type="submit"
                disabled={isSubmitting}
                className="app-button-primary app-form-submit-button app-pressable min-w-[13rem] text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Istek olusturuluyor..." : "Istek olustur"}
              </button>
            </div>
          </div>
        </section>
      </form>
    </CustomerTransportRequestsShell>
  );
}
