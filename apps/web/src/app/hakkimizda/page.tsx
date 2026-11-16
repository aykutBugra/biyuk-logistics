import PublicRevealGroup from "@/components/PublicRevealGroup";

// Public hakkimizda sayfasi; markanin ne yaptigini ve operasyon yaklasimini anlatir.
export default function AboutPage() {
  return (
    <main className="px-4 py-12">
      <PublicRevealGroup rememberKey="public-about-card" className="mx-auto max-w-4xl">
        <div className="app-surface rounded-[1.25rem] border border-slate-200 p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Hakkimizda
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Nakliye tekliflerini tek yerde bulusturan sade bir akis
          </h1>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
            <p>
              Bi&apos;yuk, musterilerin tasima taleplerini hizli sekilde
              olusturabildigi ve nakliyecilerin bu taleplere dogrudan teklif
              verebildigi sade bir operasyon paneli olarak tasarlandi.
            </p>
            <p>
              Bu urunun odagi; gereksiz karmasa olmadan ilan, teklif, arac ve
              anlasilan is akisini tek yerde toplamak. Mevcut fazda talep
              oluşturma, arac yonetimi, teklif verme ve kabul edilen tekliften
              nakliye kaydi acma akisi destekleniyor.
            </p>
            <p>
              Uygulama gelistikce teklifler, aktif nakliyeler ve sonraki is
              adimlari ayni cizgiyi bozmadan buyutulecek.
            </p>
          </div>
        </div>
      </PublicRevealGroup>
    </main>
  );
}
