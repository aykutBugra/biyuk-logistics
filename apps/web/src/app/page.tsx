import Link from "next/link";
import HomeCustomerActions from "@/components/HomeCustomerActions";
import PublicRevealGroup from "@/components/PublicRevealGroup";

// Public ana sayfa; giris yapmadan once platformun temel akislarini ve CTA'lari gosterir.
export default function Home() {
  const workflowSteps = [
    {
      title: "Talep oluştur",
      description:
        "Musteri yuk bilgisi ve rota ile tasima talebini tek formdan yayinlar.",
    },
    {
      title: "Teklifleri degerlendir",
      description:
        "Nakliyeciler uygun talepleri gorur, teklif verir ve musteri en uygun secimi yapar.",
    },
    {
      title: "Nakliyeyi takip et",
      description:
        "Anlasilan is resmi nakliye kaydina donusur; durumlar panelde okunur kalir.",
    },
  ];

  const platformHighlights = [
    "Talep ve nakliye için aynı hesapta bağlantılı paneller",
    "Teklif, mesaj ve bildirim akislarini ayni panelde toparlayan sistem",
    "Rota, arac ve is hazirligini gorunur kilan dashboard yapisi",
  ];

  const heroStats = [
    { label: "Akis", value: "3 adimda" },
    { label: "İş akışı", value: "Talep → Teklif → Taşıma" },
    { label: "Odak", value: "Tek panel" },
  ];

  return (
    <main className="px-4 pb-18 pt-10 text-slate-950 md:pb-24 md:pt-14">
      <div className="mx-auto max-w-6xl space-y-8">
        <PublicRevealGroup rememberKey="public-home-hero">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-stretch">
            <div className="app-surface-strong rounded-[1.3rem] p-7 md:p-8">
              <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-700">
                Tasima operasyon platformu
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.32em] text-blue-600">
                Bi&apos;yuk
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
                Talep, teklif ve nakliye operasyonunu ayni akis icinde yonet.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
                Bi&apos;yük, musterilerin taşıma taleplerini oluşturup gelen teklifleri
                degerlendirdigi; nakliyecilerin ise açık talepleri kesfedip
                anlasilan nakliyeleri yonettigi daha okunakli bir operasyon merkezi
                olarak kurgulandi.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="app-button-primary app-pressable">
                  Hemen basla
                </Link>
                <Link href="/login" className="app-button-secondary app-pressable">
                  Giris yap
                </Link>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
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

            <div className="app-surface flex flex-col justify-between rounded-[1.3rem] border border-slate-200 p-7 md:p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
                  Bugun platformda
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
                  Rol bazli ama kopuk olmayan operasyon
                </h2>
                <div className="mt-6 space-y-3 text-sm leading-6 text-slate-600">
                  {platformHighlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="app-surface-muted rounded-xl border border-slate-200 px-4 py-3"
                    >
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Mevcut urun halkasi
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Talep oluştur, teklif ver, teklifi kabul et ve resmi nakliye
                  kaydini ayni urun dili içinde takip et.
                </p>
              </div>
            </div>
          </section>
        </PublicRevealGroup>

        <HomeCustomerActions />

        <PublicRevealGroup rememberKey="public-home-product" delay={0.08}>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="app-surface rounded-[1.25rem] border border-slate-200 p-6 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
                Urun omurgasi
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Sayfalar once ortak dille konusmali
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                Tasarim dili netlestiginde dashboard kartlari, auth akislari ve daha
                sonra eklenecek yardimci bilesenler ayni yuzey ve hiyerarsi
                kurallarina oturur.
              </p>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              {workflowSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="app-surface rounded-[1.15rem] border border-slate-200 p-6"
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
        </PublicRevealGroup>
      </div>
    </main>
  );
}
