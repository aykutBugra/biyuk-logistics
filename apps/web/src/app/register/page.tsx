"use client";

import { useState } from "react";
import InputField from "../../components/InputField";
export default function RegisterPage() {
  const [role, setRole] = useState("kullanici");
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            NakliyeSitesi'ne Kayıt Ol
          </h2>
        </div>
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
          <button
            onClick={() => setRole("kullanici")}
            className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all ${
              role === "kullanici"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-blue-600 border-blue-600"
            }`}
          >
            Kullanıcı
          </button>
          <button
            onClick={() => setRole("nakliyeci")}
            className={`flex-1 py-2 rounded-lg font-bold border-2 transition-all ${
              role === "nakliyeci"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-blue-600 border-blue-600"
            }`}
          >
            Nakliyeci
          </button>
        </div>
        <form className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
            <InputField label="Ad" type="text" placeholder="Örn: Ahmet" />
            <InputField label="Soyad" type="text" placeholder="Örn: Yılmaz" />
            <InputField
              label="Telefon Numarası"
              type="tel"
              placeholder="Örn: 555 123 45 67"
            />
            <InputField
              label="Kullanıcı Adı"
              type="text"
              placeholder="Örn: ahmetyilmaz"
            />
            <InputField
              label="E-posta"
              type="email"
              placeholder="ahmet@example.com"
            />
            <InputField label="Şifre" type="password" placeholder="••••••••" />
            {role === "nakliyeci" && (
              <>
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500 font-semibold tracking-wider">
                      Araç ve Bilgileri
                    </span>
                  </div>
                </div>
                <InputField
                  label="Marka"
                  type="text"
                  placeholder="Örn: Mercedes, Volvo"
                />
                <InputField
                  label="Model"
                  type="text"
                  placeholder="Örn: Actros, FH"
                />
                <InputField label="Yıl" type="text" placeholder="Örn: 2020" />
                <InputField
                  label="Plaka No"
                  type="text"
                  placeholder="34 ABC 123"
                />
                <InputField
                  label="Kapasite"
                  type="text"
                  placeholder="Örn: 20 ton, 25 ton"
                />
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Hesap Oluştur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
