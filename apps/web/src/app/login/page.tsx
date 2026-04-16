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

export default function Page() {
  const router = useRouter();
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
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
      const response = await apiFetch<StoredAuth>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: form.identifier,
          password: form.password,
        }),
      });

      setStoredAuth(response);
      router.replace("/");
    } catch (error) {
      if (error instanceof ApiClientError) {
        window.alert(error.message);
      } else {
        window.alert("Giris sirasinda beklenmeyen bir hata olustu.");
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Nakliye Sitesine Giris Yap
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <InputField
              name="identifier"
              label="KullaniciAdi/Email"
              type="text"
              placeholder="Lutfen kullanici adinizi veya e-posta adresinizi girin"
              autoComplete="username"
              value={form.identifier}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <InputField
              name="password"
              label="Sifre"
              type="password"
              placeholder="Lutfen sifrenizi girin"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end">
            <a href="#" className="text-sm text-blue-600 hover:underline">
              Sifremi Unuttum
            </a>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-blue-200"
          >
            {isSubmitting ? "Giris Yapiliyor..." : "Giris Yap"}
          </button>
          <p className="text-center text-gray-600 text-sm mt-6">
            Hesabiniz yok mu?{" "}
            <Link
              href="/register"
              className="text-sm text-blue-600 font-bold hover:underline"
            >
              Hesap Olustur
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
