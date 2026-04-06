"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import InputField from "../../components/InputField";
import { ApiClientError, apiFetch } from "../../lib/api/api-client";

type UserProfile = {
  id: number;
  ad: string;
  soyad: string;
  mail: string;
  kullaniciAdi: string;
  telefonNumarasi: string | null;
  roles: string[];
};

type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  user?: UserProfile;
};

type RegisterFormState = {
  ad: string;
  soyad: string;
  telefonNumarasi: string;
  kullaniciAdi: string;
  mail: string;
  password: string;
};

const initialFormState: RegisterFormState = {
  ad: "",
  soyad: "",
  telefonNumarasi: "",
  kullaniciAdi: "",
  mail: "",
  password: "",
};

function saveSession(auth: AuthTokenResponse) {
  window.localStorage.setItem("nakliye.auth", JSON.stringify(auth));
}

export default function RegisterPage() {
  const [role, setRole] = useState<"MUSTERI" | "NAKLIYECI">("MUSTERI");
  const [form, setForm] = useState<RegisterFormState>(initialFormState);
  const [result, setResult] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setResult(null);

    try {
      const auth = await apiFetch<AuthTokenResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ad: form.ad,
          soyad: form.soyad,
          telefonNumarasi: form.telefonNumarasi || undefined,
          kullaniciAdi: form.kullaniciAdi,
          mail: form.mail,
          password: form.password,
          role,
        }),
      });

      saveSession(auth);
      setResult(auth.user ?? null);
      setForm(initialFormState);
    } catch (submitError) {
      if (submitError instanceof ApiClientError) {
        setError(submitError.message);
      } else {
        setError("Kayit denemesi sirasinda beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField(field: keyof RegisterFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] bg-slate-950 px-8 py-10 text-white shadow-2xl shadow-slate-950/10">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
            Register Demo
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Kayit akisini web uzerinden dogrula.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            Bu form dogrudan <code>/api/v1/auth/register</code> endpointine istek
            atar. Basarili olursa backend response icindeki kullanici profili
            asagida gorunur ve token ciftini tarayicida saklar.
          </p>

          <div className="mt-10 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200">
            <p>Demo kurallari:</p>
            <ul className="space-y-2 text-slate-300">
              <li>Sifre en az 8 karakter olmali.</li>
              <li>Rol olarak sadece MUSTERI veya NAKLIYECI secilebilir.</li>
              <li>Bu fazda arac bilgileri register formuna dahil degil.</li>
            </ul>
          </div>

          <div className="mt-6 text-sm text-slate-300">
            Zaten hesabiniz varsa{" "}
            <Link href="/login" className="font-semibold text-sky-300 underline">
              login sayfasina gecin
            </Link>
            .
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-200/70">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Hesap olustur</h2>
              <p className="mt-2 text-sm text-slate-500">
                Form gonderildiginde backend response burada gorunecek.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("MUSTERI")}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  role === "MUSTERI"
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                Musteri
              </button>
              <button
                type="button"
                onClick={() => setRole("NAKLIYECI")}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  role === "NAKLIYECI"
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                Nakliyeci
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Ad"
                  name="ad"
                  type="text"
                  value={form.ad}
                  onChange={(event) => updateField("ad", event.target.value)}
                  placeholder="Orn: Aykut"
                  required
                />
                <InputField
                  label="Soyad"
                  name="soyad"
                  type="text"
                  value={form.soyad}
                  onChange={(event) => updateField("soyad", event.target.value)}
                  placeholder="Orn: Bugra"
                  required
                />
              </div>

              <InputField
                label="Telefon Numarasi"
                name="telefonNumarasi"
                type="tel"
                value={form.telefonNumarasi}
                onChange={(event) => updateField("telefonNumarasi", event.target.value)}
                placeholder="Opsiyonel"
              />

              <InputField
                label="Kullanici Adi"
                name="kullaniciAdi"
                type="text"
                value={form.kullaniciAdi}
                onChange={(event) => updateField("kullaniciAdi", event.target.value)}
                placeholder="orn: aykutbugra"
                required
              />

              <InputField
                label="E-posta"
                name="mail"
                type="email"
                value={form.mail}
                onChange={(event) => updateField("mail", event.target.value)}
                placeholder="orn: aykut@gmail.com"
                autoComplete="email"
                required
              />

              <InputField
                label="Sifre"
                name="password"
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="En az 8 karakter"
                autoComplete="new-password"
                minLength={8}
                required
              />

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? "Gonderiliyor..." : "Kaydi Tamamla"}
              </button>
            </form>

            {result ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                <p className="font-semibold">Kayit basarili.</p>
                <p className="mt-2">
                  {result.ad} {result.soyad} kaydi backend tarafinda olustu.
                </p>
                <dl className="mt-4 grid gap-2 text-sm text-emerald-950">
                  <div>
                    <dt className="font-medium">Mail</dt>
                    <dd>{result.mail}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Kullanici adi</dt>
                    <dd>{result.kullaniciAdi}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Roller</dt>
                    <dd>{result.roles.join(", ")}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
