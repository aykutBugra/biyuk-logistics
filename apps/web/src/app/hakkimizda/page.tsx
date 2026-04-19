export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Hakkimizda
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-blue-950">
          Nakliye tekliflerini tek yerde bulusturan sade bir akis
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
          <p>
            NakliyeSitesi, musterilerin tasima taleplerini hizli sekilde
            olusturabildigi ve nakliyecilerin bu taleplere dogrudan teklif
            verebildigi sade bir operasyon paneli olarak tasarlandi.
          </p>
          <p>
            Bu urunun odagi; gereksiz karmasa olmadan ilan, teklif, arac ve
            anlasilan is akisini tek yerde toplamak. Mevcut fazda istek
            olusturma, arac yonetimi, teklif verme ve kabul edilen tekliften
            nakliye kaydi acma akisi destekleniyor.
          </p>
          <p>
            Uygulama gelistikce teklifler, aktif nakliyeler ve sonraki is
            adimlari ayni cizgiyi bozmadan buyutulecek.
          </p>
        </div>
      </div>
    </main>
  );
}
