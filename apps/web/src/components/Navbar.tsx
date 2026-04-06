import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="shrink-0 flex items-center">
            <Link
              href="/"
              className="text-2xl font-black text-blue-900 tracking-tighter"
            >
              Nakliye Sitesi<span className="text-blue-600">.</span>
            </Link>
          </div>

          {/* Orta Kısım: Menü Linkleri */}
          <div className="hidden md:flex space-x-8 items-center">
            <Link
              href="/"
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
            >
              Ana Sayfa
            </Link>
            <Link
              href="/hakkimizda"
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
            >
              Hakkımızda
            </Link>
            <Link
              href="/iletisim"
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
            >
              İletişim
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-gray-700 hover:text-blue-600 font-semibold px-3 py-2 transition-all"
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-blue-200"
            >
              Kayıt Ol
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
