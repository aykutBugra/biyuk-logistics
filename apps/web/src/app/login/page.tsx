"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import InputField from "@/components/InputField";
import { ApiClientError, apiFetch } from "@/lib/api/api-client";

const AUTH_STORAGE_KEY = "nakliye.auth";

//LoginResponse, giriş işlemi sonucunda API'den dönen yanıtın yapısını temsil eden bir 
//türdür. Bu tür, accessToken, refreshToken, tokenType ve isteğe bağlı olarak user bilgilerini içerir
type LoginResponse = {
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

//Page bileşeni, kullanıcıların giriş yapmalarını sağlayan bir form içerir. Form, kullanıcı adı veya e-posta
//adresi ve şifre alanlarını içerir. Kullanıcı formu gönderdiğinde, API'ye bir POST isteği gönderilir ve başarılı
//bir yanıt alındığında token bilgileri localStorage'a kaydedilir. Ayrıca, kullanıcıya girişin başarılı olduğunu 
//bildiren bir mesaj gösterilir. Hata durumunda ise uygun hata mesajları gösterilir.

export default function Page() {
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
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
      const response = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: form.identifier,
          password: form.password,
        }),
      });


      //Giriş başarılı olduğunda, alınan token bilgilerini localStorage'a kaydeder ve kullanıcıya bir başarı mesajı gösterir
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response));
      //window.alert, kullanıcıya girişin başarılı olduğunu bildiren bir mesaj gösterir
      window.alert("Giris basarili.");
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
