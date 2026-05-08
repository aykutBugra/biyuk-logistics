import PublicRevealGroup from "@/components/PublicRevealGroup";

export default function ContactPage() {
  return (
    <main className="px-4 py-12">
      <PublicRevealGroup rememberKey="public-contact-card" className="mx-auto max-w-4xl">
        <div className="app-surface rounded-[1.25rem] border border-slate-200 p-8 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Iletisim
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Destek ve urun geri bildirimi icin tek kanal
          </h1>
          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
            <p>
              Platformla ilgili soru, hata bildirimi veya urun geri bildirimi icin
              asagidaki kanallari kullanabilirsiniz.
            </p>
            <p>
              <span className="font-semibold text-slate-900">E-posta:</span>{" "}
              destek@biyuk.local
            </p>
            <p>
              <span className="font-semibold text-slate-900">Calisma duzeni:</span>{" "}
              Hafta ici urun ve operasyon sorulari icin duzenli takip edilir.
            </p>
            <p>
              Uygulama buyudukce daha ayrintili destek ve operasyon akislari bu
              alana tasinacak.
            </p>
          </div>
        </div>
      </PublicRevealGroup>
    </main>
  );
}
