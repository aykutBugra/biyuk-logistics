import HomeCustomerActions from "@/components/HomeCustomerActions";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-gray-900">
      <div className="max-w-3xl space-y-6 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-blue-900 md:text-7xl">
          NakliyeSitesi
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600 md:text-xl">
          Nakliye ilanlarinizi olusturun, gelen en iyi teklifi secip yukunuzu
          guvenle tasiyin.
        </p>
      </div>

      <HomeCustomerActions />

      <div className="mt-20 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
        <div className="rounded-2xl bg-blue-50 p-6">
          <h3 className="mb-2 font-bold text-blue-900">Hizli Ilan</h3>
          <p className="text-sm text-gray-600">
            Saniyeler icinde nakliye ilani olusturun.
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-6">
          <h3 className="mb-2 font-bold text-blue-900">Guvenli Odeme</h3>
          <p className="text-sm text-gray-600">
            Is bitene kadar paraniz guvende kalsin.
          </p>
        </div>
      </div>
    </main>
  );
}
