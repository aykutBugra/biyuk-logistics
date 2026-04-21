import HomeCustomerActions from "@/components/HomeCustomerActions";

export default function Home() {
  const workflowSteps = [
    {
      title: "Istek olustur",
      description:
        "Musteri yuk bilgisi ve rota ile tasima talebini tek formdan yayinlar.",
    },
    {
      title: "Teklifleri degerlendir",
      description:
        "Nakliyeciler uygun istekleri gorur, teklif verir ve musteri en uygun secimi yapar.",
    },
    {
      title: "Nakliyeyi takip et",
      description:
        "Anlasilan is resmi nakliye kaydina donusur; durumlar panelde okunur kalir.",
    },
  ];

 
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-14 text-slate-950 md:py-18">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
              Bi’yük
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              Bi’yük ile istek, teklif ve nakliye yonetimini tek yerde tut.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
              Bi’yük, musterilerin tasima taleplerini olusturup gelen teklifleri
              degerlendirdigi; nakliyecilerin ise acik istekleri kesfedip
              anlasilan nakliyeleri yonettigi sade bir operasyon akisi sunar.
            </p>
          </div>

          <div className="rounded-[2rem] border border-blue-200 bg-linear-to-br from-blue-600 to-blue-700 p-8 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
              Bugun platformda
            </p>
            <h2 className="mt-4 text-2xl font-black tracking-tight">
              Mevcut urun halkasi
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-6 text-blue-50">
              <p>Istek olustur, teklif ver, teklifi kabul et ve resmi nakliye kaydini takip et.</p>
              <p>Hem musteri hem nakliyeci kendi akisina uygun dashboard giris noktasi gorur.</p>
              <p>Acik istekler sayfasi gelecekteki kesif listesinin ilk iskeleti olarak hazirlanir.</p>
            </div>
          </div>
        </section>

        <HomeCustomerActions />

        <section className="grid gap-4 md:grid-cols-3">
          {workflowSteps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Adim 0{index + 1}
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                {step.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {step.description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
