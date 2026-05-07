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

const loginHighlights = [
  "Talep, teklif ve mesaj akislarini tek panelde gor",
  "Rolune gore dogru dashboard giris noktasina yonlen",
  "Bildirim ve operasyon takibini ayni hesapta birlestir",
];

export default function Page() {
  const router = useRouter();
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    setSuccessMessage(
      searchParams.get("accountDeleted") === "1"
        ? "Hesabin silindi. Istersen yeni bir hesapla tekrar giris yapabilirsin."
        : null
    );

    if (getStoredAuth()) {
      router.replace("/dashboard");
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
      router.replace("/dashboard");
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
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="app-surface rounded-3xl px-5 py-4 font-medium text-slate-600">
          Yonlendiriliyor...
        </div>
      </div>
    );
  }

  return (
    <main className="px-4 py-10 md:py-14">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="app-hero-surface rounded-[2rem] p-8 text-white md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-100">
            Bi'yuk
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            Operasyon paneline geri don.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-blue-50/90">
            Giris yaptiginda musteri ve nakliyeci akislarini ayni urun dili
            icinde yonetmeye devam edersin.
          </p>

          <div className="mt-8 space-y-3">
            {loginHighlights.map((highlight) => (
              <div
                key={highlight}
                className="rounded-2xl border border-white/16 bg-white/10 px-4 py-3 text-sm leading-6 backdrop-blur"
              >
                {highlight}
              </div>
            ))}
          </div>
        </section>

        <section className="app-surface-strong rounded-[2rem] p-8 md:p-10">
          <div className="max-w-xl">
            <div className="inline-flex rounded-full border border-blue-200/80 bg-blue-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-700">
              Giris
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
              Hesabina giris yap
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Kullanici adin veya e-posta adresinle oturum acabilirsin.
            </p>

            {successMessage ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <InputField
                name="identifier"
                label="Kullanici adi veya e-posta"
                type="text"
                placeholder="Lutfen kullanici adinizi veya e-posta adresinizi girin"
                autoComplete="username"
                value={form.identifier}
                onChange={handleChange}
                disabled={isSubmitting}
              />
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

              <div className="flex justify-end">
                <a href="#" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                  Sifremi unuttum
                </a>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="app-button-primary w-full"
              >
                {isSubmitting ? "Giris yapiliyor..." : "Giris Yap"}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-600">
              Hesabin yok mu?{" "}
              <Link href="/register" className="font-bold text-blue-700 hover:text-blue-800">
                Hesap olustur
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
