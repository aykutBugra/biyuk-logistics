# Dashboard Home + Turkish Copy Cleanup

## Objective
Giriş sonrası görülen dashboard ana ekranını daha kompakt, daha tutarlı ve daha doğal Türkçe ürün diliyle çalışan bir yüzeye dönüştürmek.

## Scope
- Dashboard ana ekranı
- Ana ekranda görünen ortak alanlar
- Çift rollü kullanıcı için müşteri ve nakliyeci alanı geçişi
- Home’a bağlı kompakt header ve yardım yüzeyleri
- Dokunulan dosyalardaki görünür Türkçe kopya

## Dashboard home layout changes
- Büyük beyaz hero başlık kartı kaldırıldı, ana ekran `compact` header düzenine alındı.
- Ana ekran başlığı `Genel Bakış` olarak sabitlendi.
- Header açıklaması tek kısa satır mantığına indirildi.
- Home kartları ve özet istatistik yüzeyleri daha sıkı yoğunluğa çekildi.
- Ortak alan bölümü daha kısa kopya ve daha düşük dikey boşlukla korundu.

## Dual-role home change
- Çift rollü kullanıcıda müşteri ve nakliyeci blokları artık alt alta tam açık render edilmiyor.
- Ortak alanların altına segmentli bir `İş alanı` geçiş yüzeyi eklendi.
- Segment seçenekleri `Müşteri` ve `Nakliyeci`.
- Aktif segment mevcut saklanan workspace mode’u izliyor.
- Segment değiştiğinde yalnızca ilgili iş alanı görünür kalıyor.

## Turkish copy cleanup decisions
- Dokunulan home, sidebar, topbar, yardım ve onboarding kopyaları düzgün Türkçe karakterlerle yeniden yazıldı.
- `Dashboard`, `workspace`, `Mikro yardım` gibi robotik veya karışık dil içeren görünür ifadeler kaldırıldı.
- Home başlıkları daha doğal ürün diline çekildi:
  - `Genel Bakış`
  - `Ortak alanlar`
  - `Talep ve teklifler`
  - `Keşif ve operasyon`
- Yardım ve operasyon kartı açıklamaları kısaltıldı; kartların kendi başlıklarının daha fazla konuşması sağlandı.

## Help wording cleanup
- Yardım düğmesi `Yardım` olarak bırakıldı.
- Yardım paneli üst etiketi `Bu bölüm hakkında` olarak değiştirildi.
- Home ile ilgili yardım içerikleri daha kısa ve daha doğal Türkçe ile yeniden yazıldı.

## Validation results
- `npm run lint:web`
- `npm run build:web`

İki komut da başarılı tamamlandı.

## Files changed
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/components/DashboardActionCard.tsx`
- `apps/web/src/components/DashboardHomeSection.tsx`
- `apps/web/src/components/DashboardIntroPanel.tsx`
- `apps/web/src/components/DashboardSegmentedWorkspaceView.tsx`
- `apps/web/src/components/DashboardShell.tsx`
- `apps/web/src/components/DashboardShellFrame.tsx`
- `apps/web/src/components/DashboardSidebar.tsx`
- `apps/web/src/components/DashboardTopbar.tsx`
- `apps/web/src/components/InlineHelpTrigger.tsx`
- `apps/web/src/components/SummaryStatCard.tsx`
- `apps/web/src/lib/dashboard/help-content.ts`
- `apps/web/src/lib/dashboard/navigation.ts`
- `apps/web/src/lib/dashboard/use-home-data.ts`

## Deferred items
- Discovery ve list sayfalarının context-rail yapısına taşınması
- Açık istekler sayfasında harita toggle standardı
- Detail, form, inbox ve account archetype refactor fazları
- GSAP veya hareket sistemi
