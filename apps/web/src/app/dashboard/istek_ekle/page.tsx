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
import { CARGO_TYPE_OPTIONS, getCargoTypeLabel } from "@/lib/logistics";
import { PageHeader, Button } from "@/components/ui";
import styles from "@/features/transport-requests/components/request-form.module.css";

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
  eyebrow, title, description, children, className = "", contentClassName = "space-y-5",
}: RequestFormSectionProps) {
  return (
    <section data-dashboard-form-section className={[styles.section, className].join(" ")}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionNumber} aria-hidden="true">{eyebrow}</span>
        <div><h2>{title}</h2><p>{description}</p></div>
      </header>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

function CreateRequestSummaryCard({
  baslangicKonum, varisKonum, form, selectedImages, isSubmitting,
}: {
  baslangicKonum: SelectedLocation | null;
  varisKonum: SelectedLocation | null;
  form: CreateTransportRequestForm;
  selectedImages: RequestImageDraft[];
  isSubmitting: boolean;
}) {
  const origin = baslangicKonum?.sehir ?? baslangicKonum?.konumMetni;
  const destination = varisKonum?.sehir ?? varisKonum?.konumMetni;

  return (
    <aside className={styles.summary}>
      <header><span className="pi pi-file" aria-hidden="true" /><h2>Talep özeti</h2></header>
      <div className={styles.route}>
        <div><span className={styles.originDot} /><div><small>Kalkış</small><strong>{origin || "Konum seçilmedi"}</strong></div></div>
        <div><span className={styles.destinationDot} /><div><small>Varış</small><strong>{destination || "Konum seçilmedi"}</strong></div></div>
      </div>
      <dl className={styles.summaryDetails}>
        <div><dt>Yük tipi</dt><dd>{getCargoTypeLabel(form.yukTipi)}</dd></div>
        <div><dt>Ağırlık</dt><dd>{form.agirlikKg ? form.agirlikKg + " kg" : "—"}</dd></div>
        <div><dt>Hacim</dt><dd>{form.hacimM3 ? form.hacimM3 + " m³" : "—"}</dd></div>
        <div><dt>Tercih edilen tarih</dt><dd>{form.tasimaTarihi ? form.tasimaTarihi.split("-").reverse().join(".") : "—"}</dd></div>
        <div><dt>Taşıma tercihi</dt><dd>{form.tekTasimaIstiyor ? "Tek taşıma" : "Paylaşımlı olabilir"}</dd></div>
        <div><dt>Görseller</dt><dd>{selectedImages.length > 0 ? selectedImages.length + " fotoğraf" : "Eklenmedi"}</dd></div>
      </dl>
      <div data-dashboard-form-submit className={styles.submit}>
        <Button type="submit" variant="primary" loading={isSubmitting} className={styles.submitButton}>
          {isSubmitting ? "Talep oluşturuluyor…" : "Talep oluştur"}
          {!isSubmitting ? <span className="pi pi-arrow-right" aria-hidden="true" /> : null}
        </Button>
        <p>Oluşturduğunuz talebi Taleplerim ekranından takip edebilirsiniz.</p>
      </div>
    </aside>
  );
}

export default function CreateTransportRequestPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const [form, setForm] = useState<CreateTransportRequestForm>(initialForm);

  
  const [baslangicKonum, setBaslangicKonum] =
   useState<SelectedLocation | null>(
    null);
  const [varisKonum, setVarisKonum] = 
  useState<SelectedLocation | null>(null);


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
          console.error("[talep_ekle] Fotoğraf upload hatasi:", uploadError);
        }

        if (uploadFailed) {
          setFormErrorMessage(
            "Talep oluşturuldu ancak fotoğraflar yüklenemedi. Taleplerim > Düzenle ekranindan fotoğraflari ekleyebilirsin."
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
        window.alert("Bu işlem için Talep Paneli erişimi gerekir.");
        router.replace("/");
        return;
      }

      if (error instanceof ApiClientError) {
        setFormErrorMessage(error.message);
      } else {
        setFormErrorMessage("Talep oluşturulurken beklenmeyen bir hata olustu.");
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
      title="Yeni talep"
      pageHeader={<PageHeader title="Yeni talep oluştur" description="Taşıma ihtiyacınızı paylaşın, nakliyecilerden teklif alın." />}
      description="Konum, yuk ve tercih bilgilerini tek kayitta toparla."
      headerVariant="compact"
      motionPreset="form"
    >
      <form
        onSubmit={handleSubmit}
        data-dashboard-form-surface
        className={styles.form}
      >
        {formErrorMessage ? (
          <div data-dashboard-form-error className="app-form-error-banner" role="alert">
            <p className="text-sm font-semibold">Talep oluşturulamadı</p>
            <p className="mt-1 text-sm">{formErrorMessage}</p>
          </div>
        ) : null}

        <div className={styles.layout}>
          <div className={styles.formSheet}>
            <RequestFormSection
              eyebrow="01"
              title="Kalkış ve varış"
              description="Yükün alınacağı ve teslim edileceği konumları listeden seçin."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <LocationAutocompleteField
                  label="Kalkış konumu"
                  placeholder="Yükleme noktasını ara"
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
                  label="Varış konumu"
                  placeholder="Teslim noktasını ara"
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
              eyebrow="02"
              title="Yük ve tarih"
              description="Yükün türünü, ölçülerini ve tercih ettiğiniz tarihi belirtin."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  name="agirlikKg"
                  label="Ağırlık (kg)"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Örn. 1250"
                  value={form.agirlikKg}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <div className={styles.volumeField}>
                  <InputField
                    name="hacimM3"
                    label="Hacim (m³)"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Örn. 12.5"
                    value={form.hacimM3}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  <details className={styles.aiHelper}>
                    <summary>
                      <span className="pi pi-sparkles" aria-hidden="true" />
                      AI ile hacim tahmini <span>İsteğe bağlı</span>
                      <i className="pi pi-angle-down" aria-hidden="true" />
                    </summary>
                    <div className={styles.aiContent}>
                      <VolumeEstimateAssistant
                        embedded
                        accessToken={accessToken ?? ""}
                        action={(value) => setForm((currentForm) => ({ ...currentForm, hacimM3: value }))}
                        disabled={isSubmitting}
                        yukTipi={form.yukTipi}
                      />
                    </div>
                  </details>
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-sm font-semibold text-slate-700"
                    htmlFor="yukTipi"
                  >
                    Yük tipi
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
                  label="Tercih edilen taşıma tarihi"
                  type="date"
                  value={form.tasimaTarihi}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  hint="Kesin alım ve teslim zamanı nakliyeci teklifi sırasında netleşebilir."
                />
              </div>
            </RequestFormSection>

            <RequestFormSection
              eyebrow="03"
              title="Tercihler ve notlar"
              description="Taşıma koşullarını ve yükle ilgili ayrıntıları ekleyin."
            >
              <label className={styles.preference}>
                <span className={styles.checkbox}>
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
                    Tek taşıma istiyorum
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Bu yük başka yüklerle birleştirilmeden, tek taşıma olarak planlansın.
                  </span>
                </span>
              </label>

              <div className="space-y-2">
                <label
                  htmlFor="yukDetay"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Yük detayı
                </label>
                <textarea
                  id="yukDetay"
                  name="yukDetay"
                  required
                  rows={3}
                  value={form.yukDetay}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="Taşıma ihtiyacını, paketleme şeklini veya özel notları açıklayın."
                  className="app-input block min-h-[6rem] resize-y text-sm"
                />
              </div>
            </RequestFormSection>
            <RequestFormSection
              eyebrow="04"
              title="Görseller"
              description="Fotoğraflar yükün daha iyi anlaşılmasına yardımcı olur. Eklemek isteğe bağlıdır."
            >
              <RequestImageUploader embedded disabled={isSubmitting} onChange={setSelectedImages} />
            </RequestFormSection>
          </div>

          <div className={styles.summaryColumn}>
            <CreateRequestSummaryCard
              baslangicKonum={baslangicKonum}
              varisKonum={varisKonum}
              form={form}
              selectedImages={selectedImages}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </form>
    </CustomerTransportRequestsShell>
  );
}
