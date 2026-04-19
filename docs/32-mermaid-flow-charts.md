# Mermaid Flow Charts

## Amaç

Bu dokuman, projede bugune kadar gercekten uygulanmis ana akislari sunumda kullanilabilir Mermaid diagramlarla ozetler. Odak; MUSTERI ve NAKLIYECI akislarini, tekliften nakliyeye gecisi, nakliye lifecycle'ini ve rating mantigini temiz bicimde gostermektir.

```mermaid
flowchart TD
    A[Bi'yuk mevcut urun akislari] --> B[Musteri akisi]
    A --> C[Nakliyeci akisi]
    A --> D[Tekliften nakliyeye gecis]
    A --> E[Nakliye yasam dongusu]
    A --> F[Rating akisi]
    A --> G[Genel sistem ozeti]
```

## Musteri Akisi

Bu chart, musterinin sistemde request olusturmasindan tamamlanan nakliye icin rating vermesine kadar olan mevcut akisi gosterir. Burada sadece urunde gercekten acik olan adimlar vardir; mesajlasma veya canli pazarlik gibi sonraki fazlar dahil edilmemistir.

```mermaid
flowchart TD
    A[Giris veya Kayit] --> B[Istek olustur]
    B --> C[Isteklerim]
    C --> D[Istek detayi]
    D --> E[Gelen teklifleri gor]
    E --> F{Teklif karari}
    F -->|Reddet| G[Teklif REDDEDILDI]
    G --> E
    F -->|Kabul Et| H[Request ANLASILDI]
    H --> I[Nakliye olusur]
    I --> J[Is durumu request detayinda gorunur]
    J --> K{Nakliye durumu}
    K -->|OLUSTURULDU| J
    K -->|BASLATILDI| J
    K -->|TAMAMLANDI| L[Nakliyeciyi puanla]
```

## Nakliyeci Akisi

Bu chart, nakliyecinin kayit sirasindaki ilk arac mantigindan teklif verme ve isi tamamlama sonrasi musteriye rating verme adimina kadar olan gercek urun akisini gosterir. `teklif_ver` bagimsiz bir ana akis olarak degil, acik istek detayindaki teklif adimi olarak temsil edilir.

```mermaid
flowchart TD
    A[Giris veya Kayit] --> B{Rol}
    B -->|NAKLIYECI| C[Ilk arac zorunlu olusturulur]
    C --> D[Araclarim]
    D --> E[Acik istekler]
    E --> F[Istek detayi]
    F --> G[Arac secerek teklif ver]
    G --> H[Tekliflerim]
    H --> I{Teklif sonucu}
    I -->|Reddedildi| H
    I -->|Kabul edildi| J[Nakliyelerim]
    J --> K[Nakliye detayi]
    K --> L[Isi baslat]
    L --> M[Isi tamamla]
    M --> N[Musteriyi puanla]
```

## Tekliften Nakliyeye Gecis

Bu diagram, bir request uzerindeki teklifin musteri karariyla nasil resmi `Nakliye` kaydina donustugunu gosterir. Kabul edilmeyen teklif kendi basina kapanirken, kabul edilen teklif request durumunu ve diger acik teklifleri de etkiler.

```mermaid
sequenceDiagram
    participant M as Musteri
    participant T as Nakliyeci
    participant O as Offers
    participant J as Jobs

    M->>O: Request zaten acik
    T->>O: Teklif verir (arac secili)
    O-->>M: Gelen teklif gorunur
    M->>O: Kabul Et veya Reddet

    alt Musteri reddeder
        O-->>T: Teklif REDDEDILDI
    else Musteri kabul eder
        O->>O: Secilen teklif KABUL_EDILDI
        O->>O: Diger acik teklifler REDDEDILDI
        O->>O: Request ANLASILDI
        O->>J: Nakliye OLUSTURULDU
        J-->>T: Nakliyelerim ekraninda gorunur
        J-->>M: Request detayinda job ozeti gorunur
    end
```

## Nakliye Yasam Dongusu

Bu chart, job lifecycle icindeki resmi durum gecislerini gosterir. Musteri bu akista read-only gorunurluge sahiptir; aksiyon sahibi olan taraf nakliyecidir.

```mermaid
stateDiagram-v2
    [*] --> OLUSTURULDU: Teklif kabul edildi
    OLUSTURULDU --> BASLATILDI: Nakliyeci isi baslatir
    BASLATILDI --> TAMAMLANDI: Nakliyeci isi tamamlar
    TAMAMLANDI --> [*]

    note right of OLUSTURULDU
      Musteri durumu gorur
      Nakliyeci baslatma aksiyonuna sahiptir
    end note

    note right of BASLATILDI
      Musteri read-only izler
      Nakliyeci tamamla aksiyonuna sahiptir
    end note

    note right of TAMAMLANDI
      Iki taraf icin rating kapisi acilir
    end note
```

## Rating Akisi

Rating, yalnizca tamamlanmis nakliye ustunden acilir ve iki tarafli calisir. Ayrica ayni nakliyede ayni yon icin ikinci rating engellenir; profil ozeti de bu is bazli kayitlardan turetilir.

```mermaid
flowchart TD
    A[Nakliye TAMAMLANDI] --> B{Kim rating verebilir?}
    B --> C[Musteri -> Nakliyeci]
    B --> D[Nakliyeci -> Musteri]
    C --> E[1-5 puan ve opsiyonel yorum]
    D --> F[1-5 puan ve opsiyonel yorum]
    E --> G{Ayni yon icin rating var mi?}
    F --> H{Ayni yon icin rating var mi?}
    G -->|Evet| I[Duplicate rating engeli]
    H -->|Evet| I
    G -->|Hayir| J[Puan kaydi olusur]
    H -->|Hayir| J
    J --> K[Verdigim ve Aldigim Puanlar]
    K --> L[Profil ozeti: ortalama ve adet]
```

## Genel Sistem Ozeti

Bu overview, sistemin bugunku cekirdek domain halkalarini kisa ve sade bicimde gosterir. Notification katmani burada ana akis degil, destekleyici sinyal katmani olarak yanda tutulur.

```mermaid
flowchart TD
    A[Musteri request olusturur] --> B[Nakliyeci aktif arac ile teklif verir]
    B --> C[Musteri teklif karari verir]
    C -->|Reddet| D[Teklif kapanir]
    C -->|Kabul| E[Nakliye olusur]
    E --> F[Job lifecycle]
    F --> G[Rating]

    B -. bildirim .-> H[In-app notifications]
    C -. bildirim .-> H
    F -. bildirim .-> H
    G -. bildirim .-> H
```

## Notlar

Bu chart'lar mevcut kod ve en guncel akisa dayanir; eski docs ile celisen noktalarda bugunku uygulama esas alinmistir. Bilincli olarak sonraki faz ozellikleri ana diyagramlara sokulmamistir.

```mermaid
flowchart LR
    A[Bu dokumanin kapsami] --> B[Dahil]
    A --> C[Bilerek disarida]

    B --> B1[Request]
    B --> B2[Vehicle]
    B --> B3[Offer]
    B --> B4[Offer acceptance]
    B --> B5[Job lifecycle]
    B --> B6[Rating]
    B --> B7[In-app notifications]

    C --> C1[Mesajlasma]
    C --> C2[Canli pazarlik]
    C --> C3[Websocket push]
    C --> C4[Email veya SMS]
    C --> C5[Rota sapmasi]
    C --> C6[Gelismis filtreleme]
    C --> C7[Admin moderasyon]
```
