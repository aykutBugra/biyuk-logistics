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
  kapasite: string;
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
  kapasite: "",
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

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
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
                kapasite: Number(form.kapasite),
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
        <div className="text-gray-600 font-medium">Yönlendiriliyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Bi’yük'e Kayit Ol
          </h2>
        </div>
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
          <button
            type="button"
            onClick={() => setRole("MUSTERI")}
            disabled={isSubmitting}
            className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all disabled:opacity-60 ${
              role === "MUSTERI"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-blue-600 border-blue-600"
            }`}
          >
            Musteri
          </button>
          <button
            type="button"
            onClick={() => setRole("NAKLIYECI")}
            disabled={isSubmitting}
            className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all disabled:opacity-60 ${
              role === "NAKLIYECI"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-blue-600 border-blue-600"
            }`}
          >
            Nakliyeci
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
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
            {role === "NAKLIYECI" && (
              <>
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500 font-semibold tracking-wider">
                      Arac ve Bilgileri
                    </span>
                  </div>
                </div>
                <InputField
                  name="marka"
                  label="Marka"
                  type="text"
                  placeholder="Orn: Mercedes, Volvo"
                  value={form.marka}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <InputField
                  name="model"
                  label="Model"
                  type="text"
                  placeholder="Orn: Actros, FH"
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
                  name="kapasite"
                  label="Kapasite"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Orn: 20"
                  value={form.kapasite}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-gray-500">
                  Bu ilk arac kaydi, nakliyeci hesabin olusturulurken dogrudan kaydedilir.
                </p>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              {isSubmitting ? "Kayit Olusturuluyor..." : "Hesap Olustur"}
            </button>
          </div>

          <p className="text-center text-gray-600 text-sm mt-6">
            Zaten hesabin var mi?{" "}
            <Link
              href="/login"
              className="text-sm text-blue-600 font-bold hover:underline"
            >
              Giris Yap
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
