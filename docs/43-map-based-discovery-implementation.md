# Amac

Bu adimin amaci, `Acik Istekler` ekranini yalnizca kart listesinden cikarip `liste + harita` kesif yuzeyine cevirmekti. Nakliyeci artik ayni veri kumesini hem liste kartlari uzerinden hem de harita ustunde pickup/dropoff noktalarina bakarak okuyabiliyor.

Bu fazda yeni bir routing motoru acilmadi. Harita, mevcut route filtre davranisinin ve canonical koordinat temelinin gorsel katmani olarak kuruldu.

# Bu Adimda Ne Degisti

- `Acik Istekler` liste ekranina yeni bir harita paneli eklendi.
- Harita, o an listede gorunen request kayitlarini pickup ve dropoff marker'lari olarak gosterir hale geldi.
- Route secilmemisse harita genel marker gorunumunde calisir oldu.
- Route secilmisse secili carrier route baslangic/varis marker'lari ve route cizgisi acildi.
- Kart secimi ile harita odagi, marker secimi ile kart vurgusu birbirine baglandi.
- Open requests list response'una harita icin gerekli canonical koordinat alanlari eklendi.
- Browser-side Google Maps JavaScript API entegrasyonu eklendi; backend key ve browser key ayrimi korunarak birlestirilmedi.

# Backend Tarafinda Yapilanlar

Bu fazda backend'e yeni bir map endpointi eklenmedi. Mevcut open requests liste akisi harita icin yeterli olacak sekilde genisletildi.

Genisletilen ana response yuzeyi:

- `apps/api/src/modules/offers/dto/open-request-list-item-response.dto.ts`

Liste response'una su alanlar eklendi:

- `baslangicEnlem`
- `baslangicBoylam`
- `varisEnlem`
- `varisBoylam`

`OpenRequestDetailResponseDto` zaten detay yuzeyinde bu koordinatlari tasiyordu. Liste response'u da ayni koordinatlari tasir hale geldigi icin harita paneli yeni backend collection endpointi istemeden mevcut liste cagrisiyla calisabildi.

Servis tarafinda `OffersService.toOpenRequestListItemResponse(...)` mapping'i bu yeni koordinat alanlarini public response'a tasiyacak sekilde guncellendi.

# Google Maps Browser Entegrasyonu

Harita render'i tamamen browser tarafina tasindi. Bu karar bilincli alindi:

- backend tarafindaki `GOOGLE_MAPS_API_KEY` route metric ve canonical location hesaplari icin aynen korundu
- browser tarafinda yalnizca `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY` kullanildi
- browser tarafinda `Places API` veya `Routes API` acilmadi
- yalnizca `Maps JavaScript API` ile base map, marker ve polyline render edildi

Bu fazda web uygulamasina su paketler eklendi:

- `@googlemaps/js-api-loader`
- `@types/google.maps`

Harita component'i client-only calisir. Key tanimli degilse veya script yuklenemezse liste bozulmaz; harita karti yalnizca non-blocking bir uyari gosterir.

# Web Tarafinda Acilan Yuzey

Yeni ana yuzey:

- `apps/web/src/components/OpenRequestsMapPanel.tsx`

Bu component su sorumluluklari aldi:

- Maps JavaScript API scriptini browser key ile yuklemek
- request marker'larini olusturmak
- secili carrier route start/end marker'larini ve route cizgisini cizmek
- secili request icin pickup -> dropoff baglanti cizgisi cizmek
- secilen request degistiginde harita odagini yeniden ayarlamak

Liste ekranindaki ana entegrasyon:

- `apps/web/src/app/dashboard/acik_istekler/page.tsx`

Bu sayfada:

- secili `carrierRouteId` query param olarak korunmaya devam etti
- route ozet karti korunarak bir de route detail koordinat yuklemesi eklendi
- `selectedRequestId` yalnizca local UI state olarak tutuldu
- kart secimi ile marker secimi birbirine baglandi
- desktop'ta liste ve harita iki kolonlu hale getirildi
- mobilde harita listenin ustune alindi

# Harita Katmanlari

Bu MVP'de acilan katmanlar:

- secili carrier route baslangic marker'i
- secili carrier route varis marker'i
- secili carrier route geodesic polyline'i
- tum gorunen request'ler icin pickup marker'lari
- tum gorunen request'ler icin dropoff marker'lari
- secili request icin pickup -> dropoff baglanti cizgisi

Bu fazda bilincli olarak acilmayan katmanlar:

- tum request'ler icin tam rota cizgisi
- tum request'ler icin pickup -> dropoff polyline
- cluster
- heatmap
- polygon / area selection
- detail sayfasina ikinci bir harita paneli

Route cizgisi ve secili request cizgisi gercek surus geometry'si ile degil, koordinatlar arasinda geodesic polyline ile cizildi. Bu tercih maliyeti kontrollu tuttu ve browser tarafinda ek `Routes API` kullanimini gereksiz kilmadi.

# Liste ve Harita Senkronizasyonu

Liste ve harita ayni request dizisini source of truth olarak kullanir.

Kurulan senkron davranis:

- route filtresi veya manuel filtreler degisince hem liste hem harita ayni yeni veri kumesine gecer
- kart tiklaninca ilgili request secilir ve harita o request'e odaklanir
- marker tiklaninca ilgili kart secilir ve ekranda gorunur alana scroll edilir
- secili request artik listede yoksa local secim otomatik temizlenir

Bu fazda bilincli olarak eklenmeyen senkron davranislar:

- hover -> marker highlight
- marker hover -> kart hover
- `selectedRequestId` query param'i
- global state store

# Gorsel Dil Kararlari

Harita marker ve cizgi dili sade tutuldu:

- pickup marker: yesil ton
- dropoff marker: turuncu ton
- route baslangici: mavi ton
- route varisi: koyu mavi ton
- secili request marker'lari: daha buyuk stroke / daha guclu vurgu
- secili carrier route cizgisi: mavi
- secili request baglanti cizgisi: koyu ince cizgi

Harita ustunde `UYGUN / SINIRDA` renk kodu acilmadi. Route badge bilgisi listede kaldi; harita spatial katman olarak sade tutuldu.

# Performans ve Maliyet Kararlari

Bu MVP'de pahali geometri cagrilarini acmamak temel karar oldu.

Secilen performans modeli:

- Maps JavaScript API yalnizca harita component'i mount oldugunda client-side yuklenir
- browser tarafinda `Routes API` hic kullanilmaz
- backend tarafinda yeni geometry endpoint'i acilmaz
- her request icin yalnizca pickup ve dropoff marker'i render edilir
- cizgi yalnizca secili carrier route ve secili request icin cizilir

Pagination henuz olmadigi icin harita panelini tasiyan ana sadeleştirmeler bunlar oldu:

- tum request'ler icin polyline yok
- cluster yok
- live route geometry fetch yok
- selected request disinda ekstra cizgi yok

# Test / Kontrol Sonuclari

Bu implementasyon sonrasinda su kontroller calistirildi ve gecti:

- `npm run build:api`
- `npm run lint:api`
- `npm run build:web`
- `npm run lint:web`

Bu sonuc, yeni coordinate response alanlarinin, map component entegrasyonunun ve browser-side loader akisinin derleme ve lint seviyesinde uyumlu oldugunu dogruladi.

# Bilincli Olarak Yapilmayanlar

Bu fazda ozellikle eklenmeyenler:

- browser-side Routes geometry
- tum request'ler icin tam polyline
- cluster / heatmap
- map bounds degistikce otomatik server filtreleme
- harita ustunden teklif verme
- detail sayfasina ikinci map deneyimi
- ranking
- messaging / pazarlik
- suitability'yi discovery'e geri getirme

# Sonraki Mantikli Adim

Bu adimdan sonraki en mantikli buyuk faz ranking olmaktadir. Route filtre davranisi ve spatial kesif artik birlikte calisir durumdadir. Bundan sonraki deger artisi, ayni discovery sonucunu daha iyi siraya koymaktan gelecektir.
