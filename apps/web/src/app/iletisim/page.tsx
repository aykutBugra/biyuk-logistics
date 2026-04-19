export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-4xl rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Iletisim
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-blue-950">
          Destek ve urun geri bildirimi icin tek kanal
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-gray-600">
          <p>
            Platformla ilgili soru, hata bildirimi veya urun geri bildirimi icin
            asagidaki kanallari kullanabilirsiniz.
          </p>
          <p>
            <span className="font-semibold text-gray-900">E-posta:</span>{" "}
            destek@nakliyesitesi.local
          </p>
          <p>
            <span className="font-semibold text-gray-900">Calisma duzeni:</span>{" "}
            Hafta ici urun ve operasyon sorulari icin duzenli takip edilir.
          </p>
          <p>
            Uygulama buyudukce daha ayrintili destek ve operasyon akislari bu
            alana tasinacak.
          </p>
        </div>
      </div>
    </main>
  );
}
