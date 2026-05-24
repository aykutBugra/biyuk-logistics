export type DashboardHelpKey =
  | "dashboard-home"
  | "dashboard-home-customer"
  | "dashboard-home-carrier"
  | "dashboard-home-shared"
  | "open-requests"
  | "incoming-offers"
  | "my-requests"
  | "my-offers"
  | "my-shipments"
  | "routes"
  | "offer-create"
  | "add-carrier-role";

export type DashboardHelpContent = {
  title: string;
  description: string;
  bullets?: string[];
};

// Inline yardim aciklamalari endpoint'ten degil, UI icindeki sabit icerikten okunur.
export const DASHBOARD_HELP_CONTENT: Record<
  DashboardHelpKey,
  DashboardHelpContent
> = {
  "dashboard-home": {
    title: "Genel Bakış",
    description:
      "Bu ekran günlük operasyonuna hızlı başlamak için hazırlandı.",
    bullets: [
      "Ortak alanlar her iki rolde de sabit kalır.",
      "Müşteri ve nakliyeci tarafı arasında üstteki seçimle geçiş yapabilirsin.",
      "Kartlar seni ilgili iş akışına doğrudan götürür.",
    ],
  },
  "dashboard-home-customer": {
    title: "Talep ve teklifler",
    description:
      "Bu bölümde taşıma talebi açar, gelen teklifleri değerlendirir ve anlaşılmış işleri izlersin.",
    bullets: [
      "İsteklerim aktif taleplerini toplar.",
      "Gelen Teklifler karar vermen gereken fiyatları gösterir.",
    ],
  },
  "dashboard-home-carrier": {
    title: "Keşif ve operasyon",
    description:
      "Bu bölümde uygun işleri bulur, tekliflerini takip eder ve aktif taşımaları yönetirsin.",
    bullets: [
      "Açık İstekler yeni iş keşfi için kullanılır.",
      "Rota ve araç hazırlığı görünürlüğünü güçlendirir.",
    ],
  },
  "dashboard-home-shared": {
    title: "Ortak alanlar",
    description:
      "Konuşmalar, bildirimler, profil ve puanlar her rolde aynı yerden açılır.",
  },
  "open-requests": {
    title: "Açık İstekler",
    description:
      "Bu sayfa nakliyeci tarafında teklif verebileceğin taşıma taleplerini listeler.",
    bullets: [
      "Rota seçersen liste seçili hat ve sapma sınırına göre daralır.",
      "Yeni fırsat sayısı henüz teklif vermediğin kayıtları özetler.",
      "Detay ve Teklif ile tam kayda geçip fiyat oluşturursun.",
    ],
  },
  "incoming-offers": {
    title: "Gelen Teklifler",
    description:
      "Bu sayfa müşteri tarafında gelen teklifleri karşılaştırıp karar vermek için kullanılır.",
    bullets: [
      "Kabul ettiğinde teklif nakliyeye dönüşür.",
      "Konuşmaya git ile fiyat veya detay pazarlığını sürdürebilirsin.",
    ],
  },
  "my-requests": {
    title: "İsteklerim",
    description:
      "İsteklerim, açtığın taşıma taleplerini ve her birinin güncel durumunu toplu olarak gösterir.",
    bullets: [
      "Açık istekler henüz teklif beklediğini gösterir.",
      "Anlaşılmış işlerde teklif kabul edilmiş ve operasyon başlamıştır.",
      "Detay sayfasından tekliflere ve konuşmalara geçebilirsin.",
    ],
  },
  "my-offers": {
    title: "Tekliflerim",
    description:
      "Tekliflerim, verdiğin teklifleri ve güncel durumlarını tek listede toplar.",
    bullets: [
      "Müşteri kabul ederse teklif otomatik olarak nakliyeye dönüşür.",
      "Açık teklifler henüz yanıt beklediğini gösterir.",
      "Konuşmaya git ile pazarlığı aynı akışta sürdürebilirsin.",
    ],
  },
  "my-shipments": {
    title: "Nakliyelerim",
    description:
      "Nakliyelerim, anlaşmaya dönüşmüş aktif ve tamamlanan taşıma işlerini gösterir.",
    bullets: [
      "Aktif nakliyeler süren operasyonları listeler.",
      "Tamamlanan işlerde puan verebilir veya süreci gözden geçirebilirsin.",
      "Her nakliye detayından ilgili teklif ve konuşmaya ulaşabilirsin.",
    ],
  },
  routes: {
    title: "Rotalarım",
    description:
      "Rotaların kayıtlı taşıma hatlarını tutar ve sana uygun işleri daha görünür hale getirir.",
    bullets: [
      "Rota once ana guzergah olarak tanimlanir, sonra Acik Istekler ekraninda secilerek kullanilir.",
      "Sapma limiti rota kaydina degil, Acik Istekler kesif ekranindaki aktif filtreye baglidir.",
    ],
  },
  "offer-create": {
    title: "Teklif ver",
    description:
      "Teklif verirken uygun aracı, fiyatı ve gerekiyorsa kısa notunu eklersin.",
    bullets: [
      "Seçili rota varsa sayfa rota uyumunu da gösterir.",
      "Teklif oluştuktan sonra takibi Tekliflerim ve Konuşmalar üzerinden sürer.",
    ],
  },
  "add-carrier-role": {
    title: "Nakliyeci rolü ekle",
    description:
      "Bu akış mevcut müşteri hesabını genişletir, ikinci bir hesap açmaz.",
    bullets: [
      "İlk araç başarıyla oluşturulmadan nakliyeci rolü aktifleşmez.",
      "İşlem tamamlanınca nakliyeci rehberi bir kez gösterilir, sonra normal ana ekran açılır.",
    ],
  },
};
