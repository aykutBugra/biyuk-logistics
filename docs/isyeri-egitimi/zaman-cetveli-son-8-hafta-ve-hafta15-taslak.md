# Zaman Cetveli Son 8 Hafta ve 15. Hafta Rapor Taslağı

## 15. Hafta Haftalık Rapor Taslağı

ÖZET:
Projenin final haftasında arayüz temizliği, teklif/karşı teklif kontrolleri, responsive düzenlemeler, doğrulama testleri ve teslim hazırlıklarını tamamladım.

1. Gerçekleştirilen faaliyetler
• Teklif konuşması ve karşı teklif akışlarını gözden geçirerek kullanıcının kendi oluşturduğu son fiyatı kabul edememesi kuralını kontrol ettim.
• Müşteri ve nakliyeci dashboard ekranlarında gereksiz alanları temizleyip ara sayfaları daha kompakt ve okunabilir hale getirdim.
• Profil, araç, istek, teklif, konuşma ve hacim tahmini ekranlarında spacing, scroll, responsive görünüm ve boş durum kontrolleri yaptım.
• AI destekli hacim tahmini akışında sonuç dili, uyarı notları ve görsel analiz davranışlarını final kullanım senaryolarına göre gözden geçirdim.
• Projenin ana kullanıcı akışlarını lint/build kontrolleri ve manuel senaryolarla test ederek sunum ve teslim hazırlıklarını tamamladım.

2. Çözümler ve/veya kazanımlar
• Teklif karar sürecinde yanlış kabul davranışını engelleyen daha güvenli bir pazarlık akışı elde ettim.
• Dashboard ekranlarını daha sade, tutarlı ve sunumda anlatılabilir hale getirdim.
• Mobil ve masaüstü görünümlerde sayfa taşması, boşluk ve okunabilirlik problemlerini azaltarak kullanıcı deneyimini iyileştirdim.
• Projenin final durumunu rapor, demo akışı ve sunum materyalleriyle teslim edilebilir seviyeye getirdim.

3. Bir sonraki hafta için planlanan çalışmalar
• İşyeri eğitimi süreci tamamlandığı için sonraki hafta için yeni çalışma planı oluşturulmamıştır.
• Proje çıktıları, raporlar ve sunum materyalleri teslim sürecine hazır hale getirilmiştir.

Haftalık Öz Değerlendirme:

## Zaman Cetveli - Son 8 Hafta

| Hafta | Tarih | Çalıştığı Bölüm | Öğrencinin Çalıştığı Konular |
|---|---|---|---|
| 8. Hafta | 30/03/2026 – 03/04/2026 | Web geliştirme ekibi | Monorepo yapısı kurulmuş, frontend ve backend sorumlulukları ayrılmıştır. NestJS backend çekirdeği, REST API yaklaşımı, global validation, config yapısı, health endpoint ve Prisma altyapısı hazırlanmıştır. PostgreSQL veritabanı için kullanıcı, rol, araç, istek, teklif, nakliye ve puanlama tablolarını içeren temel şema oluşturulmuştur. |
| 9. Hafta | 06/04/2026 – 10/04/2026 | Web geliştirme ekibi | Auth, users ve roles modülleri geliştirilmiş; register, login, me ve refresh akışları çalışır hale getirilmiştir. Şifre hashleme, duplicate kontrolü, DTO validation, JWT strategy, JwtAuthGuard ve role-based erişim kontrolleri uygulanmıştır. Backend auth çekirdeği lint/build ve endpoint kontrolleriyle doğrulanmıştır. |
| 10. Hafta | 13/04/2026 – 17/04/2026 | Web geliştirme ekibi | Araç, taşıma isteği, teklif ve nakliye modülleri geliştirilmiştir. Araç ekleme/listeleme/güncelleme/silme, taşıma isteği oluşturma ve teklif verme süreçleri tamamlanmıştır. Dashboard tarafında araçlarım, isteklerim, açık istekler, tekliflerim, gelen teklifler ve nakliyelerim sayfaları API ile entegre edilmiştir. |
| 11. Hafta | 20/04/2026 – 24/04/2026 | Web geliştirme ekibi | Google Places ve Google Routes entegrasyonu taşıma isteği akışına eklenmiştir. Başlangıç ve varış konumları için provider, placeId, şehir-ilçe, koordinat ve konum metni alanları canonical yapıya alınmıştır. Konum seçimi, rota mesafesi ve tahmini süre hesaplama işlemleri istek oluşturma/güncelleme ekranlarıyla entegre edilmiştir. |
| 12. Hafta | 27/04/2026 – 01/05/2026 | Web geliştirme ekibi | Rota bazlı açık istek keşfi, harita destekli listeleme ve rota uyumu bilgileri geliştirilmiştir. Açık isteklerde ek mesafe, ek süre ve rota bağlamı gösterilmiş; teklif konuşmaları, karşı teklif akışı, araç kapasite rezervasyonu ve AI destekli hacim tahmini gibi karar destek özellikleri projeye eklenmiştir. |
| 13. Hafta | 04/05/2026 – 08/05/2026 | Web geliştirme ekibi | Dashboard bilgi mimarisi rol bazlı hale getirilmiş, müşteri/nakliyeci/çift rollü kullanıcı ve admin yönlendirmeleri düzenlenmiştir. İlk kullanım onboarding akışı ve genel bakış ekranı geliştirilmiş; isteklerim, gelen teklifler, tekliflerim, araçlarım, rotalarım, profil, bildirimler, puanlarım ve konuşmalar sayfalarında UI tutarlılığı artırılmıştır. |
| 14. Hafta | 11/05/2026 – 15/05/2026 | Web geliştirme ekibi | Taşıma isteği fotoğrafları, profil fotoğrafı ve araç fotoğrafı yükleme/kaldırma/gösterme akışları tamamlanmıştır. Görsel dosya doğrulama, medya işleme ve public URL üzerinden gösterim altyapısı kullanılmıştır. AI destekli hacim tahmini, teklif, mesajlaşma ve dashboard akışları birlikte kontrol edilerek genel test ve sunum hazırlıkları yapılmıştır. |
| 15. Hafta | 18/05/2026 – 22/05/2026 | Web geliştirme ekibi | Final UI temizliği, gereksiz alanların kaldırılması, ara sayfaların kompakt hale getirilmesi ve responsive/spacing/scroll kontrolleri yapılmıştır. Teklif konuşması ve karşı teklif karar kuralları gözden geçirilmiş; lint/build doğrulamaları, ana kullanıcı senaryoları, final raporları ve sunum materyalleri teslim süreci için hazırlanmıştır. |

## Kopyala-Yapıştır Düz Metin Formatı

8. Hafta  
Tarih: 30/03/2026 – 03/04/2026  
Çalıştığı Bölüm: Web geliştirme ekibi  
Öğrencinin Çalıştığı Konular:  
Monorepo yapısı kurulmuş, frontend ve backend sorumlulukları ayrılmıştır. NestJS backend çekirdeği, REST API yaklaşımı, global validation, config yapısı, health endpoint ve Prisma altyapısı hazırlanmıştır. PostgreSQL veritabanı için kullanıcı, rol, araç, istek, teklif, nakliye ve puanlama tablolarını içeren temel şema oluşturulmuştur.

9. Hafta  
Tarih: 06/04/2026 – 10/04/2026  
Çalıştığı Bölüm: Web geliştirme ekibi  
Öğrencinin Çalıştığı Konular:  
Auth, users ve roles modülleri geliştirilmiş; register, login, me ve refresh akışları çalışır hale getirilmiştir. Şifre hashleme, duplicate kontrolü, DTO validation, JWT strategy, JwtAuthGuard ve role-based erişim kontrolleri uygulanmıştır. Backend auth çekirdeği lint/build ve endpoint kontrolleriyle doğrulanmıştır.

10. Hafta  
Tarih: 13/04/2026 – 17/04/2026  
Çalıştığı Bölüm: Web geliştirme ekibi  
Öğrencinin Çalıştığı Konular:  
Araç, taşıma isteği, teklif ve nakliye modülleri geliştirilmiştir. Araç ekleme/listeleme/güncelleme/silme, taşıma isteği oluşturma ve teklif verme süreçleri tamamlanmıştır. Dashboard tarafında araçlarım, isteklerim, açık istekler, tekliflerim, gelen teklifler ve nakliyelerim sayfaları API ile entegre edilmiştir.

11. Hafta  
Tarih: 20/04/2026 – 24/04/2026  
Çalıştığı Bölüm: Web geliştirme ekibi  
Öğrencinin Çalıştığı Konular:  
Google Places ve Google Routes entegrasyonu taşıma isteği akışına eklenmiştir. Başlangıç ve varış konumları için provider, placeId, şehir-ilçe, koordinat ve konum metni alanları canonical yapıya alınmıştır. Konum seçimi, rota mesafesi ve tahmini süre hesaplama işlemleri istek oluşturma/güncelleme ekranlarıyla entegre edilmiştir.

12. Hafta  
Tarih: 27/04/2026 – 01/05/2026  
Çalıştığı Bölüm: Web geliştirme ekibi  
Öğrencinin Çalıştığı Konular:  
Rota bazlı açık istek keşfi, harita destekli listeleme ve rota uyumu bilgileri geliştirilmiştir. Açık isteklerde ek mesafe, ek süre ve rota bağlamı gösterilmiş; teklif konuşmaları, karşı teklif akışı, araç kapasite rezervasyonu ve AI destekli hacim tahmini gibi karar destek özellikleri projeye eklenmiştir.

13. Hafta  
Tarih: 04/05/2026 – 08/05/2026  
Çalıştığı Bölüm: Web geliştirme ekibi  
Öğrencinin Çalıştığı Konular:  
Dashboard bilgi mimarisi rol bazlı hale getirilmiş, müşteri/nakliyeci/çift rollü kullanıcı ve admin yönlendirmeleri düzenlenmiştir. İlk kullanım onboarding akışı ve genel bakış ekranı geliştirilmiş; isteklerim, gelen teklifler, tekliflerim, araçlarım, rotalarım, profil, bildirimler, puanlarım ve konuşmalar sayfalarında UI tutarlılığı artırılmıştır.

14. Hafta  
Tarih: 11/05/2026 – 15/05/2026  
Çalıştığı Bölüm: Web geliştirme ekibi  
Öğrencinin Çalıştığı Konular:  
Taşıma isteği fotoğrafları, profil fotoğrafı ve araç fotoğrafı yükleme/kaldırma/gösterme akışları tamamlanmıştır. Görsel dosya doğrulama, medya işleme ve public URL üzerinden gösterim altyapısı kullanılmıştır. AI destekli hacim tahmini, teklif, mesajlaşma ve dashboard akışları birlikte kontrol edilerek genel test ve sunum hazırlıkları yapılmıştır.

15. Hafta  
Tarih: 18/05/2026 – 22/05/2026  
Çalıştığı Bölüm: Web geliştirme ekibi  
Öğrencinin Çalıştığı Konular:  
Final UI temizliği, gereksiz alanların kaldırılması, ara sayfaların kompakt hale getirilmesi ve responsive/spacing/scroll kontrolleri yapılmıştır. Teklif konuşması ve karşı teklif karar kuralları gözden geçirilmiş; lint/build doğrulamaları, ana kullanıcı senaryoları, final raporları ve sunum materyalleri teslim süreci için hazırlanmıştır.

## Kontrol Listesi

- [ ] 8–15. haftalar sadece web/nakliye projesini kapsıyor mu?
- [ ] 15. hafta 18/05/2026 – 22/05/2026 aralığına göre yazıldı mı?
- [ ] 15. hafta haftalık raporu 1 sayfaya sığacak uzunlukta mı?
- [ ] Zaman cetveli metinleri kısa ve tabloya uygun mu?
- [ ] Uydurma teknoloji veya yapılmamış iş var mı?
- [ ] Dil haftalık raporda 1. tekil, zaman cetvelinde resmi/edilgen mi?
