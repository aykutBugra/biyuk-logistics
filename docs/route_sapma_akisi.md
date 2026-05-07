Route Sapma Filtresi Akış Şeması
Kısa Özet
Nakliyecinin girdiği maksimumSapmaKm, doğrudan SQL’de çalışan bir filtre değil. Sistem önce normal açık istek havuzunu çıkarıyor, sonra seçili rota varsa her istek için iki aşamalı route evaluation yapıyor:

kuşbakışı alt sınır ön elemesi
gerçek Google rota metriği ile nihai karar
Listeye sadece MATCH olanlar giriyor.

Akış
1. Nakliyeci rota oluşturur
Kaynak:

carrier-routes.service.ts (line 47)
carrier-routes.service.ts (line 235)
Yapılanlar:

başlangıç ve varış canonical konuma çözülür
LocationsService.getRouteMetrics(...) çağrılır
rota için şunlar kaydedilir:
baslangicEnlem/boylam
varisEnlem/boylam
rotaMesafeMetre
rotaSureSaniye
maksimumSapmaKm
Not:

burada kaydedilen rotaMesafeMetre kuşbakışı değil, gerçek yol metriğidir
2. Nakliyeci Açık İstekler ekranında rota seçer
Kaynak:

offers.service.ts (line 83)
Yapılanlar:

carrierRouteId query’den gelir
seçili route CarrierRoutesService.getMineById(...) ile okunur
route hazır değilse hata verilir
3. Önce normal discovery havuzu çekilir
Kaynak:

offers.repository.ts (line 216)
offers.repository.ts (line 988)
Burada çalışan filtreler:

silinmemiş istek
kendi isteği değil
nakliyeye dönüşmemiş
durum ISTEK / OLUSTURULDU
manuel filtreler:
başlangıç şehri
varış şehri
tek taşıma
min/max ağırlık
min/max hacim
yük tipi
taşıma tarihi
Yani route filtresi bundan sonra devreye girer.

4. Route evaluator çalışır
Kaynak:

open-request-route-aware-evaluator.service.ts (line 97)
Bu evaluator her request için şu karar setinden birini üretir:

MATCH
OUTSIDE_ROUTE_FILTER
UNAVAILABLE_DATA
UNAVAILABLE_ROUTE_SERVICE
5. Efektif sapma limiti belirlenir
Kaynak:

open-request-route-aware-evaluator.service.ts (line 247)
Kural:

route üstünde maksimumSapmaKm varsa onu kullan
yoksa default 20 km
6. Kuşbakışı ön eleme yapılır
Kaynak:

open-request-route-aware-evaluator.service.ts (line 119)
open-request-route-aware-evaluator.service.ts (line 273)
Formül:

start -> pickup -> dropoff -> end kuşbakışı toplamı
eksi start -> end kuşbakışı ana rota
Kod karşılığı:

calculateLowerBoundExtraMeters(...)
haversineDistanceMeters(...)
Bu aşamanın amacı:

bariz alakasız kayıtları Google rota çağrısı yapmadan elemek
Buffer:

10 km
Kaynak:
open-request-route-aware-evaluator.service.ts (line 44)
Kural:

eğer kuşbakışı alt sınır maksimumSapmaKm + 10 km üstündeyse direkt OUTSIDE_ROUTE_FILTER
Bu aşama yalnızca ön elemedir. Nihai karar değildir.

7. Exact route hesabı yapılır
Kaynak:

open-request-route-aware-evaluator.service.ts (line 147)
locations.service.ts (line 39)
google-route.engine.ts (line 39)
Google’a sorulan rota:

start -> pickup -> dropoff -> end
Yani:

origin = nakliyecinin rota başlangıcı
destination = nakliyecinin rota varışı
waypoints = request pickup + request dropoff
Buradaki metrik:

Google Routes computeRoutes
gerçek sürüş rotası metriği
8. Extra sapma hesaplanır
Kaynak:

open-request-route-aware-evaluator.service.ts (line 170)
Formül:

extraMesafeMetre = max(0, yeniToplamRota - anaRota)
extraSureSaniye = max(0, yeniToplamSure - anaRotaSuresi)
Yani sistemin sorduğu şey:

“Bu yükü araya alırsam ana rotama kaç metre / kaç saniye ekleniyor?”
9. Nihai filtre burada verilir
Kaynak:

open-request-route-aware-evaluator.service.ts (line 177)
Kural:

extraMesafeMetre > maksimumSapmaKm * 1000 ise OUTSIDE_ROUTE_FILTER
değilse MATCH
Yani açık istekler ekranında görünmek için gerçek koşul:

extraMesafeMetre <= maksimumSapmaKm
10. Sadece MATCH olanlar ekranda kalır
Kaynak:

offers.service.ts (line 114)
Servis katmanı:

evaluator sonuçlarını toplar
MATCH olmayanları listeden çıkarır
kalanlara rotaUyumu nesnesini ekler
Gebze -> Bolu Örneği
Senaryo:

nakliyeci rotası: İstanbul -> Ankara
istek: Gebze -> Bolu
sapma limiti: örnek 100 km
Sistem şunu yapar:

önce Gebze -> Bolu request’i normal discovery havuzuna girer
kuşbakışı alt sınır hesaplanır:
İstanbul -> Gebze
Gebze -> Bolu
Bolu -> Ankara
toplam
eksi İstanbul -> Ankara
bu alt sınır çok büyük değilse exact hesap aşamasına geçer
Google’a gerçek rota sorulur:
İstanbul -> Gebze -> Bolu -> Ankara
bundan ana rota çıkarılır:
extraMesafeMetre = route(İstanbul, Gebze, Bolu, Ankara) - route(İstanbul, Ankara)
çıkan ek mesafe 100 km altındaysa istek görünür
üstündeyse görünmez
Yani sistem “şehir aynı koridorda mı?” diye bakmıyor. Şuna bakıyor:

“Bu yükü araya alırsam gerçek rotam ne kadar uzuyor?”
Etiket Mantığı
Listeye kaldıktan sonra etiket üretilir:
Kaynak:

open-request-route-aware-evaluator.service.ts (line 255)
Kural:

UYGUN: extra km, limitin ilk %80’i içindeyse
SINIRDA: %80 - %100 arasıysa
UYGUN_DEGIL: limit üstüyse
Ama pratikte route seçili listede UYGUN_DEGIL çoğunlukla görünmez. Çünkü limit üstündekiler zaten filtre dışına düşer.

En Net Cevap
Bu sistemde rota sapma hesabı:

yalnızca kuşbakışı ile yapılmıyor
yalnızca şehir bazlı yapılmıyor
asıl olarak gerçek yol metriği ile yapılıyor
Kuşbakışı hesap sadece:

gereksiz Google çağrılarını azaltan ön eleme
Gerçek liste kararı ise:

start -> pickup -> dropoff -> end
gerçek Google rota metriği
eksi ana rota
extraMesafeMetre <= maksimumSapmaKm
Varsayımlar ve Sabitler
default sapma limiti: 20 km
coarse prefilter buffer: 10 km
uygun etiketi eşiği: limitin %80’i
route filtresi yalnızca carrierRouteId seçildiyse çalışır
route seçilmezse yalnızca normal discovery filtreleri çalışır