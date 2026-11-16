"use client";

import type { ChangeEvent, FormEvent } from "react";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthSplitShell from "@/components/AuthSplitShell";
import InputField from "@/components/InputField";
import { ApiClientError, apiFetch } from "@/lib/api/api-client";
import {
  setStoredAuth,
  type StoredAuth,
} from "@/lib/auth/auth-storage";
import { useStoredAuth } from "@/lib/auth/use-stored-auth";
import { formatAccountError } from "@/lib/ui/terminology";

const loginHighlights = [
  "Talep, teklif ve mesaj akislarini tek panelde gor",
  "Hesabınızdaki yetkilere göre doğru panele ulaşın",
  "Bildirim ve operasyon takibini ayni hesapta birlestir",
];

// Login sayfasi kullaniciyi backend auth akisiyle oturuma alir ve dashboard'a yonlendirir.
function LoginPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="app-surface rounded-[1.15rem] px-5 py-4 font-medium text-slate-600">
        Yonlendiriliyor...
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useStoredAuth();
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCheckingAuth = auth !== null;
  const successMessage =
    searchParams?.get("accountDeleted") === "1"
      ? "Hesabınız silindi. İsterseniz yeni bir hesapla tekrar giriş yapabilirsiniz."
      : null;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Zaten oturum varsa login formunu gostermeden dogrudan dashboard'a gecilir.
    if (auth) {
      router.replace("/dashboard");
    }
  }, [auth, router]);

  // Form alanlari degistikce onceki hata mesaji temizlenir.
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setErrorMessage(null);
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  // Email/sifre backend'e gonderilir; gelen token localStorage'a yazilir.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

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
        setErrorMessage(formatAccountError(error));
      } else {
        setErrorMessage("Giriş sırasında beklenmeyen bir hata oluştu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth) {
    return <LoginPageFallback />;
  }

  return (
    <AuthSplitShell
      rememberKey="public-login"
      gridClassName="max-w-6xl lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
      hero={
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-600">
            Bi&apos;yuk
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            Operasyon paneline geri dönün.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Hesabınızdaki yetkilere göre Talep Paneli’ne ve Nakliye Paneli’ne
            erişebilir, işlemlerinizi tek hesapla yönetebilirsiniz.
          </p>

          <div className="mt-8 space-y-3">
            {loginHighlights.map((highlight) => (
              <div
                key={highlight}
                className="app-surface-muted rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-600"
              >
                {highlight}
              </div>
            ))}
          </div>
        </>
      }
      card={
        <div className="max-w-xl">
          <div data-auth-card-step>
            <div className="max-w-xl">
              <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-700">
                Giriş
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
                Hesabınıza giriş yapın
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Kullanıcı adınız veya e-posta adresinizle oturum açabilirsiniz.
              </p>
            </div>
          </div>

          {successMessage ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="app-form-error-banner mt-6 text-sm">
              <p>{errorMessage}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" data-auth-card-step>
            <InputField
              name="identifier"
              label="Kullanıcı adı veya e-posta"
              type="text"
              placeholder="Kullanıcı adınızı veya e-posta adresinizi girin"
              autoComplete="username"
              value={form.identifier}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <InputField
              name="password"
              label="Şifre"
              type="password"
              placeholder="Şifrenizi girin"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              disabled={isSubmitting}
            />

            <div className="flex justify-end">
              <a href="#" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
                Şifremi unuttum
              </a>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="app-button-primary app-form-submit-button app-pressable w-full"
            >
              {isSubmitting ? "Giriş yapılıyor…" : "Giriş yap"}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600" data-auth-card-step>
            Hesabin yok mu?{" "}
            <Link href="/register" className="font-bold text-blue-700 hover:text-blue-800">
              Hesap oluştur
            </Link>
          </p>
        </div>
      }
    />
  );
}
