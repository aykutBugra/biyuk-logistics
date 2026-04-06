import Link from "next/link";
import InputField from "@/components/InputField";
export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Nakliye Sitesine Giriş Yap
          </h2>
        </div>
        <form action="/login" method="POST" className="space-y-6">
          <div className="space-y-2">
            <InputField
              label="KullanıcıAdı/Email/Telefon"
              type="text"
              placeholder="Lütfen kullanıcı adınızı, e-posta adresinizi veya telefon numaranızı girin "
            />
          </div>
          <div className="space-y-2">
            <InputField
              label="Şifre"
              type="password"
              placeholder="Lütfen şifrenizi girin"
            />
          </div>
          <div className="flex justify-end">
            <a href="#" className="text-sm text-blue-600 hover:underline">
              Şifremi Unuttum
            </a>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-blue-200"
          >
            Giriş Yap
          </button>
          <p className="text-center text-gray-600 text-sm mt-6">
            Hesabınız yok mu?{" "}
            <Link
              href="/register"
              className="text-sm text-blue-600 font-bold hover:underline"
            >
              Hesap Oluştur
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
