import Link from "next/link";
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

  const platformHighlights = [
    "Musteri ve nakliyeci icin ayri ama baglantili operasyon ekranlari",
    "Teklif, mesaj ve bildirim akislarini ayni panelde toparlayan sistem",
    "Rota, arac ve is hazirligini gorunur kilan dashboard yapisi",
  ];

  const heroStats = [
    { label: "Akis", value: "3 adimda" },
    { label: "Taraf", value: "Musteri + Nakliyeci" },
    { label: "Odak", value: "Tek panel" },
  ];

  return (
    <main className="px-4 pb-18 pt-10 text-slate-950 md:pb-24 md:pt-14">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-stretch">
          <div className="app-surface-strong rounded-[2rem] p-8 md:p-10">
            <div className="inline-flex rounded-full border border-blue-200/80 bg-blue-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-700">
              Tasima operasyon platformu
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.32em] text-blue-600">
              Bi'yuk
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              Talep, teklif ve nakliye operasyonunu ayni akis icinde yonet.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
              Bi'yuk, musterilerin tasima taleplerini olusturup gelen teklifleri
              degerlendirdigi; nakliyecilerin ise acik istekleri kesfedip
              anlasilan nakliyeleri yonettigi daha okunakli bir operasyon
              merkezi olarak kurgulandi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="app-button-primary">
                Hemen basla
              </Link>
              <Link href="/login" className="app-button-secondary">
                Giris yap
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200/80 bg-white/72 px-4 py-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-xl font-black tracking-tight text-slate-950">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="app-hero-surface flex flex-col justify-between rounded-[2rem] p-8 text-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
                Bugun platformda
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-tight">
                Rol bazli ama kopuk olmayan operasyon
              </h2>
              <div className="mt-6 space-y-3 text-sm leading-6 text-blue-50">
                {platformHighlights.map((highlight) => (
                  <div
                    key={highlight}
                    className="rounded-2xl border border-white/16 bg-white/10 px-4 py-3 backdrop-blur"
                  >
                    {highlight}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/14 bg-slate-950/18 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-100">
                Mevcut urun halkasi
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-50/90">
                Istek olustur, teklif ver, teklifi kabul et ve resmi nakliye
                kaydini ayni urun dili icinde takip et.
              </p>
            </div>
          </div>
        </section>

        <HomeCustomerActions />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="app-surface rounded-[2rem] p-6 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
              Urun omurgasi
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              Sayfalar once ortak dille konusmali
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
              Tasarim dili netlestiginde dashboard kartlari, auth akislari ve
              daha sonra eklenecek PrimeReact bilesenleri ayni yuzey ve hiyerarsi
              kurallarina oturur.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="app-surface rounded-[1.75rem] p-6 transition hover:-translate-y-0.5"
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
          </div>
        </section>
      </div>
    </main>
  );
}
