"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import InputField from "@/components/InputField";
import LocationAutocompleteField from "@/components/LocationAutocompleteField";
import { ApiClientError } from "@/lib/api/api-client";
import type { SelectedLocation } from "@/lib/api/locations";
import {
  createTransportRequest,
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

const initialForm: CreateTransportRequestForm = {
  tekTasimaIstiyor: false,
  agirlikKg: "",
  hacimM3: "",
  yukTipi: "GENEL",
  tasimaTarihi: "",
  yukDetay: "",
};

export default function CreateTransportRequestPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const [form, setForm] = useState<CreateTransportRequestForm>(initialForm);
  const [baslangicKonum, setBaslangicKonum] = useState<SelectedLocation | null>(
    null
  );
  const [varisKonum, setVarisKonum] = useState<SelectedLocation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;

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
      window.alert("Baslangic ve varis konumunu listeden secmelisin.");
      return;
    }

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
        window.alert(error.message);
      } else {
        window.alert("Istek olusturulurken beklenmeyen bir hata olustu.");
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
    <CustomerTransportRequestsShell title="Yeni tasima istegi olustur">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <LocationAutocompleteField
            label="Baslangic konumu"
            placeholder="Yukleme noktasini ara"
            accessToken={accessToken ?? ""}
            value={baslangicKonum}
            onSelect={setBaslangicKonum}
            disabled={isSubmitting}
          />
          <LocationAutocompleteField
            label="Varis konumu"
            placeholder="Teslim noktasini ara"
            accessToken={accessToken ?? ""}
            value={varisKonum}
            onSelect={setVarisKonum}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
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

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
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

        <div className="space-y-2">
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
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isSubmitting ? "Istek olusturuluyor..." : "Istek olustur"}
          </button>
        </div>
      </form>
    </CustomerTransportRequestsShell>
  );
}
