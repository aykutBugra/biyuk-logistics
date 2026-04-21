"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InputField from "@/components/InputField";
import { ApiClientError, apiFetch } from "@/lib/api/api-client";
import {
  getStoredAuth,
  setStoredAuth,
  type StoredAuth,
} from "@/lib/auth/auth-storage";
import { VEHICLE_BODY_TYPE_OPTIONS } from "@/lib/logistics";

type RegisterRole = "MUSTERI" | "NAKLIYECI";

type RegisterForm = {
  ad: string;
  soyad: string;
  telefonNumarasi: string;
  kullaniciAdi: string;
  mail: string;
  password: string;
  marka: string;
  model: string;
  yil: string;
  plaka: string;
  maksimumAgirlikKg: string;
  maksimumHacimM3: string;
  kasaTipi: string;
  uzunlukCm: string;
  genislikCm: string;
  yukseklikCm: string;
};

const initialForm: RegisterForm = {
  ad: "",
  soyad: "",
  telefonNumarasi: "",
  kullaniciAdi: "",
  mail: "",
  password: "",
  marka: "",
  model: "",
  yil: "",
  plaka: "",
  maksimumAgirlikKg: "",
  maksimumHacimM3: "",
  kasaTipi: "DIGER",
  uzunlukCm: "",
  genislikCm: "",
  yukseklikCm: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RegisterRole>("MUSTERI");
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (getStoredAuth()) {
      router.replace("/");
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch<StoredAuth>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ad: form.ad,
          soyad: form.soyad,
          telefonNumarasi: form.telefonNumarasi.trim() || undefined,
          kullaniciAdi: form.kullaniciAdi,
          mail: form.mail,
          password: form.password,
          role,
          ...(role === "NAKLIYECI"
            ? {
                marka: form.marka,
                model: form.model,
                yil: Number(form.yil),
                plaka: form.plaka,
                maksimumAgirlikKg: Number(form.maksimumAgirlikKg),
                maksimumHacimM3: Number(form.maksimumHacimM3),
                kasaTipi: form.kasaTipi,
                uzunlukCm: form.uzunlukCm ? Number(form.uzunlukCm) : undefined,
                genislikCm: form.genislikCm ? Number(form.genislikCm) : undefined,
                yukseklikCm: form.yukseklikCm ? Number(form.yukseklikCm) : undefined,
              }
            : {}),
        }),
      });

      setStoredAuth(response);
      router.replace("/");
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.message === "Vehicle plate is already in use.") {
          window.alert("Bu plaka zaten aktif bir araca ait.");
          return;
        }

        window.alert(error.message);
      } else if (error instanceof Error) {
        window.alert(error.message);
      } else {
        window.alert("Kayit sirasinda beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-600 font-medium">Yonlendiriliyor...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Bi’yük&apos;e Kayit Ol
          </h2>
        </div>
        <div className="mt-20 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setRole("MUSTERI")}
            disabled={isSubmitting}
            className={`flex-1 rounded-lg border-2 py-2 font-bold transition-all disabled:opacity-60 ${
              role === "MUSTERI"
                ? "border-blue-600 bg-blue-600 text-white shadow-md"
                : "border-blue-600 bg-white text-blue-600"
            }`}
          >
            Musteri
          </button>
          <button
            type="button"
            onClick={() => setRole("NAKLIYECI")}
            disabled={isSubmitting}
            className={`flex-1 rounded-lg border-2 py-2 font-bold transition-all disabled:opacity-60 ${
              role === "NAKLIYECI"
                ? "border-blue-600 bg-blue-600 text-white shadow-md"
                : "border-blue-600 bg-white text-blue-600"
            }`}
          >
            Nakliyeci
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            <InputField
              name="ad"
              label="Ad"
              type="text"
              placeholder="Orn: Mehmet"
              value={form.ad}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <InputField
              name="soyad"
              label="Soyad"
              type="text"
              placeholder="Orn: Akcil"
              value={form.soyad}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <InputField
              name="telefonNumarasi"
              label="Telefon Numarasi"
              type="tel"
              placeholder="Orn: 555 123 45 67"
              value={form.telefonNumarasi}
              onChange={handleChange}
              disabled={isSubmitting}
              required={false}
            />
            <InputField
              name="kullaniciAdi"
              label="Kullanici Adi"
              type="text"
              placeholder="Orn: mehmetakcil73"
              autoComplete="username"
              value={form.kullaniciAdi}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <InputField
              name="mail"
              label="E-posta"
              type="email"
              placeholder="mehmet@example.com"
              autoComplete="email"
              value={form.mail}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <InputField
              name="password"
              label="Sifre"
              type="password"
              placeholder="********"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {role === "NAKLIYECI" ? (
              <>
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 font-semibold tracking-wider text-gray-500">
                      Ilk Arac Kaydi
                    </span>
                  </div>
                </div>
                <InputField
                  name="marka"
                  label="Marka"
                  type="text"
                  placeholder="Orn: Mercedes"
                  value={form.marka}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <InputField
                  name="model"
                  label="Model"
                  type="text"
                  placeholder="Orn: Actros"
                  value={form.model}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <InputField
                  name="yil"
                  label="Yil"
                  type="number"
                  min="1900"
                  max={`${new Date().getFullYear() + 1}`}
                  placeholder="Orn: 2020"
                  value={form.yil}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <InputField
                  name="plaka"
                  label="Plaka No"
                  type="text"
                  placeholder="34 ABC 123"
                  value={form.plaka}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <InputField
                  name="maksimumAgirlikKg"
                  label="Maksimum Agirlik (kg)"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Orn: 18000"
                  value={form.maksimumAgirlikKg}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <InputField
                  name="maksimumHacimM3"
                  label="Maksimum Hacim (m3)"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Orn: 45"
                  value={form.maksimumHacimM3}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700" htmlFor="kasaTipi">
                    Kasa Tipi
                  </label>
                  <select
                    id="kasaTipi"
                    name="kasaTipi"
                    value={form.kasaTipi}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-100"
                  >
                    {VEHICLE_BODY_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <InputField
                    name="uzunlukCm"
                    label="Uzunluk (cm)"
                    type="number"
                    min="1"
                    value={form.uzunlukCm}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required={false}
                  />
                  <InputField
                    name="genislikCm"
                    label="Genislik (cm)"
                    type="number"
                    min="1"
                    value={form.genislikCm}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required={false}
                  />
                  <InputField
                    name="yukseklikCm"
                    label="Yukseklik (cm)"
                    type="number"
                    min="1"
                    value={form.yukseklikCm}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required={false}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Bu ilk arac kaydi, nakliyeci hesabin olusturulurken dogrudan
                  kaydedilir.
                </p>
              </>
            ) : null}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {isSubmitting ? "Kayit Olusturuluyor..." : "Hesap Olustur"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Zaten hesabin var mi?{" "}
            <Link href="/login" className="text-sm font-bold text-blue-600 hover:underline">
              Giris Yap
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
