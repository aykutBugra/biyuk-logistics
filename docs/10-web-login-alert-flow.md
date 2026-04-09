# Web Login Alert Flow

Bu adimin amaci, `apps/web` tarafindaki login ekranini yalnizca gorunen bir form olmaktan cikarip gercek backend login akisina baglamaktir.

Bu degisiklikten once login sayfasi:

- statik bir form gorunumu sunuyordu
- `action="/login"` kullaniyordu
- ama repo icinde gercek `POST /auth/login` entegrasyonu yapmiyordu
- basarili girisin ekranda gorunen bir geri bildirimi yoktu

Bu adimdan sonra login sayfasi:

- client-side submit akisi ile calisir
- `POST /api/v1/auth/login` endpoint'ine istek atar
- basarili giriste browser `alert` gosterir
- hatali giriste backend mesajini browser `alert` ile gosterir
- sayfayi yonlendirmez
- donen auth verisini `localStorage` icinde saklar

## Uygulanan Davranis

Login formu artik iki alan uzerinden backend'e baglanir:

- `identifier`
- `password`

Submit sirasinda web tarafi `apiFetch("/auth/login", ...)` ile backend'e JSON body gonderir.

Basarili response gelirse:

- `window.alert("Giris basarili.")` calisir
- login response'u `localStorage["nakliye.auth"]` altina JSON olarak yazilir

Saklanan veri su alanlari icerir:

- `accessToken`
- `refreshToken`
- `tokenType`
- `user`

Hatali response gelirse:

- backend'den donen hata mesaji `ApiClientError` uzerinden yakalanir
- kullaniciya browser alert olarak gosterilir

## Teknik Not

Bu degisiklik tam auth UI sistemi degildir. Bu, web tarafindaki ilk gercek frontend auth entegrasyonudur.

Ozellikle bilincli olarak su davranis secilmistir:

- giris basarili olsa bile yonlendirme yok
- toast yerine klasik browser alert kullaniliyor
- auth state icin ilk adim olarak `localStorage` kullaniliyor

Bu tercihlerin nedeni:

- girisin gercekten calistiginin kullanici tarafinda hemen anlasilmasi
- mevcut yapida minimum kodla ilk auth geri bildiriminin eklenmesi
- sonraki adimlarda dashboard yonlendirmesi, `me` cekme ve navbar auth durumu gibi islerin ustune kolayca insa edilebilmesi

## Etkilenen Dosyalar

- `apps/web/src/app/login/page.tsx`
- `apps/web/src/components/InputField.tsx`
- `docs/10-web-login-alert-flow.md`

## Sonuc

Bu adimdan sonra login sayfasi artik yalnizca bir tasarim ekrani degildir. Gercek backend login akisini cagirir, sonucu kullaniciya gosterir ve sonraki auth entegrasyonlari icin gerekli token bilgisini istemci tarafinda saklar.
