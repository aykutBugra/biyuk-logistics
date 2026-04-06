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

function saveSession(auth: AuthTokenResponse) {
  window.localStorage.setItem("nakliye.auth", JSON.stringify(auth));
}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setProfile(null);

    try {
      const auth = await apiFetch<AuthTokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      saveSession(auth);

      const currentUser = await apiFetch<UserProfile>("/auth/me", {
        accessToken: auth.accessToken,
      });

      setProfile(currentUser);
    } catch (submitError) {
      if (submitError instanceof ApiClientError) {
        setError(submitError.message);
      } else {
        setError("Giris sirasinda beklenmeyen bir hata olustu.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 sm:px-6">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-white backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">
            Login Demo
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Giris yap ve auth zincirini dogrula.
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Bu sayfa once <code>/auth/login</code> cagirir, sonra ayni access token
            ile <code>/auth/me</code> endpointini vurarak oturumu dogrular.
          </p>

          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-sm text-slate-300">
            <p className="font-semibold text-white">Kullanım</p>
            <ul className="mt-3 space-y-2">
              <li>Identifier alanina mail veya kullanici adi yazabilirsiniz.</li>
              <li>Basarili giris sonrasi profil verisi asagida gorunur.</li>
              <li>Token cifti demo amaciyla tarayicida saklanir.</li>
            </ul>
          </div>

          <div className="mt-6 text-sm text-slate-300">
            Hesabiniz yoksa{" "}
            <Link href="/register" className="font-semibold text-amber-300 underline">
              register sayfasinda olusturun
            </Link>
            .
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-8 shadow-2xl shadow-slate-950/15">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Giris yap</h2>
              <p className="mt-2 text-sm text-slate-500">
                Mail veya kullanici adi ile backend auth akisini test edin.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <InputField
                label="Mail veya kullanici adi"
                name="identifier"
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="orn: aykut@gmail.com veya aykut"
                autoComplete="username"
                required
              />

              <InputField
                label="Sifre"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sifrenizi girin"
                autoComplete="current-password"
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
                className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-200"
              >
                {isSubmitting ? "Giris yapiliyor..." : "Giris Yap"}
              </button>
            </form>

            {profile ? (
              <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-950">
                <p className="font-semibold">Giris ve me kontrolu basarili.</p>
                <dl className="mt-4 grid gap-2">
                  <div>
                    <dt className="font-medium">Ad Soyad</dt>
                    <dd>
                      {profile.ad} {profile.soyad}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium">Mail</dt>
                    <dd>{profile.mail}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Kullanici adi</dt>
                    <dd>{profile.kullaniciAdi}</dd>
                  </div>
                  <div>
                    <dt className="font-medium">Roller</dt>
                    <dd>{profile.roles.join(", ")}</dd>
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
