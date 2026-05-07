"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InputField from "@/components/InputField";
import VehicleFormFields from "@/components/VehicleFormFields";
import { ApiClientError, apiFetch } from "@/lib/api/api-client";
import {
  getStoredAuth,
  setStoredAuth,
  setStoredDashboardWorkspaceMode,
  type StoredAuth,
} from "@/lib/auth/auth-storage";
import {
  initialVehicleFormState,
  toCreateVehicleInput,
  type VehicleFormState,
} from "@/lib/vehicles/vehicle-form";

type RegisterRole = "MUSTERI" | "NAKLIYECI";

type AccountRegisterForm = {
  ad: string;
  soyad: string;
  telefonNumarasi: string;
  kullaniciAdi: string;
  mail: string;
  password: string;
};

type RegisterErrorState =
  | {
      kind: "duplicate-email";
      message: string;
    }
  | {
      kind: "generic";
      message: string;
    }
  | null;

const initialAccountForm: AccountRegisterForm = {
  ad: "",
  soyad: "",
  telefonNumarasi: "",
  kullaniciAdi: "",
  mail: "",
  password: "",
};

const roleDescriptions: Record<RegisterRole, string> = {
  MUSTERI: "Tasima talebi ac, teklifleri topla ve karar ver.",
  NAKLIYECI: "Ilk aracinla birlikte teklif ve operasyon akisina gir.",
};

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RegisterRole>("MUSTERI");
  const [accountForm, setAccountForm] = useState<AccountRegisterForm>(initialAccountForm);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(initialVehicleFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [errorState, setErrorState] = useState<RegisterErrorState>(null);

  useEffect(() => {
    if (getStoredAuth()) {
      router.replace("/dashboard/profil");
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  const handleAccountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setErrorState(null);
    setAccountForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleVehicleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setErrorState(null);
    setVehicleForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleRoleChange = (nextRole: RegisterRole) => {
    if (isSubmitting) {
      return;
    }

    setErrorState(null);
    setRole(nextRole);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorState(null);

    try {
      const response = await apiFetch<StoredAuth>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ad: accountForm.ad,
          soyad: accountForm.soyad,
          telefonNumarasi: accountForm.telefonNumarasi.trim() || undefined,
          kullaniciAdi: accountForm.kullaniciAdi,
          mail: accountForm.mail,
          password: accountForm.password,
          role,
          ...(role === "NAKLIYECI" ? toCreateVehicleInput(vehicleForm) : {}),
        }),
      });

      setStoredDashboardWorkspaceMode(role === "NAKLIYECI" ? "carrier" : "customer");
      setStoredAuth(response);
      router.replace("/dashboard");
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.message === "Mail is already in use.") {
          setErrorState({
            kind: "duplicate-email",
            message:
              "Bu e-posta ile zaten bir hesabin var. Ikinci kez kayit olmak yerine giris yapip Profilim ekranindan nakliyeci rolunu ekleyebilirsin.",
          });
          return;
        }

        if (error.message === "Username is already in use.") {
          setErrorState({
            kind: "generic",
            message: "Bu kullanici adi zaten kullaniliyor. Lutfen farkli bir kullanici adi sec.",
          });
          return;
        }

        if (error.message === "Vehicle plate is already in use.") {
          setErrorState({
            kind: "generic",
            message: "Bu plaka zaten aktif bir araca ait.",
          });
          return;
        }

        setErrorState({
          kind: "generic",
          message: error.message,
        });
      } else if (error instanceof Error) {
        setErrorState({
          kind: "generic",
          message: error.message,
        });
      } else {
        setErrorState({
          kind: "generic",
          message: "Kayit sirasinda beklenmeyen bir hata olustu.",
        });
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
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
        <section className="app-hero-surface rounded-[2rem] p-8 text-white md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-100">
            Bi'yuk
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            Tek hesapla operasyon akisini kur.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-blue-50/90">
            Musteri olarak baslayabilir veya ilk aracinla dogrudan nakliyeci
            akisina girebilirsin. Ileride ayni hesapta iki rolu de yonetirsin.
          </p>

          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-white/16 bg-white/10 px-4 py-3 text-sm leading-6 backdrop-blur">
              Musteri hesabinda talep, teklif ve anlasilan is takibi acilir.
            </div>
            <div className="rounded-2xl border border-white/16 bg-white/10 px-4 py-3 text-sm leading-6 backdrop-blur">
              Nakliyeci kaydi ilk aracinla birlikte rota, teklif ve operasyon
              akislarini etkinlestirir.
            </div>
          </div>
        </section>

        <section className="app-surface-strong rounded-[2rem] p-8 md:p-10">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-blue-200/80 bg-blue-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-700">
              Kayit
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
              Hesabini olustur
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Once giris modunu sec, sonra temel hesap bilgilerini doldur.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {(["MUSTERI", "NAKLIYECI"] as RegisterRole[]).map((option) => {
                const isActive = role === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleRoleChange(option)}
                    disabled={isSubmitting}
                    className={`rounded-[1.4rem] border px-5 py-4 text-left transition ${
                      isActive
                        ? "border-blue-300 bg-blue-50 text-blue-900 shadow-sm"
                        : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
                    }`}
                  >
                    <p className="text-sm font-bold">
                      {option === "MUSTERI" ? "Musteri" : "Nakliyeci"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {roleDescriptions[option]}
                    </p>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {errorState ? (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    errorState.kind === "duplicate-email"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  <p>{errorState.message}</p>
                  {errorState.kind === "duplicate-email" ? (
                    <p className="mt-3">
                      <Link href="/login" className="font-semibold text-blue-700 hover:underline">
                        Giris yap
                      </Link>{" "}
                      ve sonra{" "}
                      <span className="font-semibold">Profilim &gt; Nakliyeci rolunu ekle</span>{" "}
                      akisini kullan.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  name="ad"
                  label="Ad"
                  type="text"
                  placeholder="Orn: Mehmet"
                  value={accountForm.ad}
                  onChange={handleAccountChange}
                  disabled={isSubmitting}
                />
                <InputField
                  name="soyad"
                  label="Soyad"
                  type="text"
                  placeholder="Orn: Akcil"
                  value={accountForm.soyad}
                  onChange={handleAccountChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  name="telefonNumarasi"
                  label="Telefon numarasi"
                  type="tel"
                  placeholder="Orn: 555 123 45 67"
                  value={accountForm.telefonNumarasi}
                  onChange={handleAccountChange}
                  disabled={isSubmitting}
                  required={false}
                />
                <InputField
                  name="kullaniciAdi"
                  label="Kullanici adi"
                  type="text"
                  placeholder="Orn: mehmetakcil73"
                  autoComplete="username"
                  value={accountForm.kullaniciAdi}
                  onChange={handleAccountChange}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  name="mail"
                  label="E-posta"
                  type="email"
                  placeholder="mehmet@example.com"
                  autoComplete="email"
                  value={accountForm.mail}
                  onChange={handleAccountChange}
                  disabled={isSubmitting}
                />
                <InputField
                  name="password"
                  label="Sifre"
                  type="password"
                  placeholder="********"
                  autoComplete="new-password"
                  value={accountForm.password}
                  onChange={handleAccountChange}
                  disabled={isSubmitting}
                />
              </div>

              {role === "NAKLIYECI" ? (
                <div className="rounded-[1.6rem] border border-slate-200 bg-white/70 p-5">
                  <VehicleFormFields
                    values={vehicleForm}
                    onChange={handleVehicleChange}
                    disabled={isSubmitting}
                    sectionTitle="Ilk Arac Kaydi"
                    sectionHint="Bu arac basariyla kaydedildiginde hesabin musteri + nakliyeci olarak acilir."
                  />
                </div>
              ) : null}

              <button type="submit" disabled={isSubmitting} className="app-button-primary w-full">
                {isSubmitting ? "Kayit olusturuluyor..." : "Hesap olustur"}
              </button>

              <p className="text-sm text-slate-600">
                Zaten hesabin var mi?{" "}
                <Link href="/login" className="font-bold text-blue-700 hover:text-blue-800">
                  Giris Yap
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
