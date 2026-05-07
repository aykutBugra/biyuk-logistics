export type OnerilenTeklifGirdileri = {
  rotaMesafeMetre: number | null;
  agirlikKg: number | null;
  hacimM3: number | null;
  aracMaksimumHacimM3?: number | null;
  tekTasimaIstiyor?: boolean | null;
};

export type OnerilenTeklifÇiktilari = {
  onerilenFiyat: number;
  km: number;
  hacimEsdegerKg: number;
  faturalanabilirYukKg: number;
  hesaplananHacimM3: number;
  kalemler: {
    tabanUcret: number;
    kmMaliyeti: number;
    yukMaliyeti: number;
  };
};

const TABAN_UCRET = 1000;
const KM_BASI_MALIYET = 20;
const HACIM_KG_ESDEGERI = 250;
const KG_BASI_MALIYET = 1;

function yuvarlaFiyat(tutar: number): number {
  return Math.round(tutar / 50) * 50;
}

function getHesaplananHacimM3(
  hacimM3: number,
  tekTasimaIstiyor?: boolean | null,  //tek taşıma istiyor mu kontrol eder
  aracMaksimumHacimM3?: number | null   //tek taşımaysa aracın tüm hacmi baz alınır
): number {
  if (!tekTasimaIstiyor) {  //tek taşıma istenmiyorsa yükün kendi hacmini döndür
    return hacimM3;
  }

  //nullish coalescing. aracMAksimum varsa onu kullan null veya undefined ise 0 kullan 
  const aracHacmiM3 = Math.max(aracMaksimumHacimM3 ?? 0, 0);

  // Tek tasimada aracin tam kapasitesi kiralaniyormus gibi davran.
  return Math.max(hacimM3, aracHacmiM3);
}



export function TeklifFiyatÖnerisiHesaplama(
  input: OnerilenTeklifGirdileri  //dışardan veri alıyoruz inpu adında
): OnerilenTeklifÇiktilari | null { //fonk dönüş tipi
  //mesafe verisi geçerli mi kontrolü . 
  if (input.rotaMesafeMetre == null || input.rotaMesafeMetre <= 0) {
    return null;
  }

  const km = input.rotaMesafeMetre / 1000;

  //  "??" : null veya undefined ise sağ tarafı kullan . 
  const agirlikKg = Math.max(input.agirlikKg ?? 0, 0);  
  const hacimM3 = Math.max(input.hacimM3 ?? 0, 0);
  const hesaplananHacimM3 = getHesaplananHacimM3(
    hacimM3,
    input.tekTasimaIstiyor,
    input.aracMaksimumHacimM3
  );

  const hacimEsdegerKg = hesaplananHacimM3 * HACIM_KG_ESDEGERI;
  const faturalanabilirYukKg = Math.max(agirlikKg, hacimEsdegerKg);

  const tabanUcret = TABAN_UCRET;
  const kmMaliyeti = km * KM_BASI_MALIYET;
  const yukMaliyeti = faturalanabilirYukKg * KG_BASI_MALIYET;
  const onerilenFiyat = yuvarlaFiyat(tabanUcret + kmMaliyeti + yukMaliyeti);

  return {
    onerilenFiyat,
    km,
    hacimEsdegerKg,
    faturalanabilirYukKg,
    hesaplananHacimM3,
    kalemler: {
      tabanUcret,
      kmMaliyeti,
      yukMaliyeti,
    },
  };
}
