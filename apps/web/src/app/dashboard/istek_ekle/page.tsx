"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CustomerTransportRequestsShell from "@/components/CustomerTransportRequestsShell";
import InputField from "@/components/InputField";
import { ApiClientError } from "@/lib/api/api-client";
import {
  createTransportRequest,
  type CreateTransportRequestInput,
} from "@/lib/api/transport-requests";
import { clearStoredAuth } from "@/lib/auth/auth-storage";
import { useCustomerPageAccess } from "@/lib/auth/use-customer-page-access";

type CreateTransportRequestForm = {
  baslangicSehri: string;
  varisSehri: string;
  baslangicEnlem: string;
  baslangicBoylam: string;
  varisEnlem: string;
  varisBoylam: string;
  yukDetay: string;
};

const initialForm: CreateTransportRequestForm = {
  baslangicSehri: "",
  varisSehri: "",
  baslangicEnlem: "",
  baslangicBoylam: "",
  varisEnlem: "",
  varisBoylam: "",
  yukDetay: "",
};

export default function CreateTransportRequestPage() {
  const router = useRouter();
  const { accessToken, status } = useCustomerPageAccess();
  const [form, setForm] = useState<CreateTransportRequestForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting || !accessToken) {
      return;
    }

    setIsSubmitting(true);

    const payload: CreateTransportRequestInput = {
      baslangicSehri: form.baslangicSehri,
      varisSehri: form.varisSehri,
      baslangicEnlem: Number(form.baslangicEnlem),
      baslangicBoylam: Number(form.baslangicBoylam),
      varisEnlem: Number(form.varisEnlem),
      varisBoylam: Number(form.varisBoylam),
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600 font-medium">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <CustomerTransportRequestsShell
      title="Yeni tasima istegi olustur"
      description="Bu ilk fazda konum secici yok. Sehir ve koordinatlari manuel girerek istegi olusturuyorsun."
    >
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              name="baslangicSehri"
              label="Baslangic sehri"
              placeholder="Orn: Istanbul"
              value={form.baslangicSehri}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <InputField
              name="varisSehri"
              label="Varis sehri"
              placeholder="Orn: Ankara"
              value={form.varisSehri}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              name="baslangicEnlem"
              label="Baslangic enlem"
              type="number"
              step="0.000001"
              min="-90"
              max="90"
              placeholder="Orn: 41.008200"
              value={form.baslangicEnlem}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <InputField
              name="baslangicBoylam"
              label="Baslangic boylam"
              type="number"
              step="0.000001"
              min="-180"
              max="180"
              placeholder="Orn: 28.978400"
              value={form.baslangicBoylam}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <InputField
              name="varisEnlem"
              label="Varis enlem"
              type="number"
              step="0.000001"
              min="-90"
              max="90"
              placeholder="Orn: 39.933400"
              value={form.varisEnlem}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <InputField
              name="varisBoylam"
              label="Varis boylam"
              type="number"
              step="0.000001"
              min="-180"
              max="180"
              placeholder="Orn: 32.859700"
              value={form.varisBoylam}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="yukDetay"
              className="block text-sm font-medium text-gray-700"
            >
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
              placeholder="Tasima ihtiyacini kisaca acikla"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Create sonrasi yeni kaydin detay sayfasina yonlendirileceksin.
            </p>
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
