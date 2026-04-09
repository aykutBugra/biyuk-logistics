"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import InputField from "@/components/InputField";
import { ApiClientError, apiFetch } from "@/lib/api/api-client";

const AUTH_STORAGE_KEY = "nakliye.auth";

type RegisterRole = "kullanici" | "nakliyeci";

type RegisterForm = {
  ad: string;
  soyad: string;
  telefonNumarasi: string;
  kullaniciAdi: string;
  mail: string;
  password: string;
};

type RegisterResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  user?: {
    id: number;
    ad: string;
    soyad: string;
    mail: string;
    kullaniciAdi: string;
    telefonNumarasi: string | null;
    roles: string[];
  };
};

const initialForm: RegisterForm = {
  ad: "",
  soyad: "",
  telefonNumarasi: "",
  kullaniciAdi: "",
  mail: "",
  password: "",
};

export default function RegisterPage() {
  const [role, setRole] = useState<RegisterRole>("kullanici");
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const response = await apiFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ad: form.ad,
          soyad: form.soyad,
          telefonNumarasi: form.telefonNumarasi.trim() || undefined,
          kullaniciAdi: form.kullaniciAdi,
          mail: form.mail,
          password: form.password,
          role,
        }),
      });

      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response));
      window.alert("Kayit basarili. Oturum acildi.");
    } catch (error) {
      if (error instanceof ApiClientError) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Nakliye Sitesi'ne Kayit Ol
          </h2>
        </div>
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
          <button
            type="button"
            onClick={() => setRole("kullanici")}
            disabled={isSubmitting}
            className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all disabled:opacity-60 ${
              role === "kullanici"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-blue-600 border-blue-600"
            }`}
          >
            Kullanici
          </button>
          <button
            type="button"
            onClick={() => setRole("nakliyeci")}
            disabled={isSubmitting}
            className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all disabled:opacity-60 ${
              role === "nakliyeci"
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
            {role === "nakliyeci" && (
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
                  label="Marka"
                  type="text"
                  placeholder="Orn: Mercedes, Volvo"
                  disabled={isSubmitting}
                  required={false}
                />
                <InputField
                  label="Model"
                  type="text"
                  placeholder="Orn: Actros, FH"
                  disabled={isSubmitting}
                  required={false}
                />
                <InputField
                  label="Yil"
                  type="text"
                  placeholder="Orn: 2020"
                  disabled={isSubmitting}
                  required={false}
                />
                <InputField
                  label="Plaka No"
                  type="text"
                  placeholder="34 ABC 123"
                  disabled={isSubmitting}
                  required={false}
                />
                <InputField
                  label="Kapasite"
                  type="text"
                  placeholder="Orn: 20 ton, 25 ton"
                  disabled={isSubmitting}
                  required={false}
                />
                <p className="text-sm text-gray-500">
                  Nakliyeci arac bilgileri sonraki adimda kaydedilecektir.
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
