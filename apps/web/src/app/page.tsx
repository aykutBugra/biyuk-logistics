export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900 px-4">
      <div className="text-center space-y-6 max-w-3xl">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-blue-900">
          NakliyeSitesi
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
          Nakliye ilanlarınızı oluşturun gelen en iyi teklifi seçip yükünüzü
          güvenle taşıyın
        </p>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
        <div className="p-6 bg-blue-50 rounded-2xl">
          <h3 className="font-bold text-blue-900 mb-2">Hızlı İlan</h3>
          <p className="text-sm text-gray-600">
            Saniyeler içinde nakliye ilanı oluşturun.
          </p>
        </div>
        <div className="p-6 bg-blue-50 rounded-2xl">
          <h3 className="font-bold text-blue-900 mb-2">Güvenli Ödeme</h3>
          <p className="text-sm text-gray-600">
            İş bitene kadar paranız güvende kalsın.
          </p>
        </div>
      </div>
    </main>
  );
}
