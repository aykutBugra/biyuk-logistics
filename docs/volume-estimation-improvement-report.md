# SpaceProfile-Driven Volume Estimation Improvement Report

## Problem

Ilk shape-based versiyon, onceki dogrudan `m3` ureten akisa gore daha kontrolluydu; ancak hala su sinirlara sahipti:

- temel hacim karari agirlikli olarak `shapeType + sizeClass` uzerinden veriliyordu
- urun bazli numeric override listesi buyumeye acikti
- ayni kategori icindeki farkli tasima davranislari ayni band icine fazla kolay dusuyordu
- sistem uzun vadede "urun kutuphanesi"ne donusme riski tasiyordu

Bu nedenle yeni surumun ana hedefi, urun adindan cok tasima davranisina dayali, daha genel ve daha surdurulebilir bir hacim onerisi sistemi kurmaktir.

## Neden Sonsuz Override Surdurulebilir Degil

Tasima alaninda tum esya turleri icin tek tek numeric override yazmak pratik degildir.

- dunya genelindeki tasinabilir esya cesidi cok genistir
- ayni urun farkli paketleme, sokum durumu ve yerlestirme riski ile farkli hacim davranisi gosterebilir
- urun label'lari gorselden her zaman kesin cikmaz
- sistem override'a ne kadar bagimli olursa, yeni yuk tiplerinde o kadar hizli bozulur

Bu nedenle override artik ana motor degil, sadece sinirli sayida yuksek etkili fallback olarak kullanilir.

## Yeni Mimari

Akis degismedi:

1. `POST /volume-estimates` backend'e gorsel, `description?` ve `yukTipi?` alir
2. OpenAI yalnizca structured transport analysis JSON dondurur
3. Backend merge, deterministic hacim hesabi ve caution note uretir
4. UI sonucu "tahmini tasima hacmi onerisi" olarak gosterir

LLM artik fiziksel olcu veya `m3` uretmez. Yalnizca tasima karakteri analizi verir.

## Structured Analysis Schema

```json
{
  "items": [
    {
      "label": "string",
      "loadType": "genel_yuk|paletli|koli|mobilya|beyaz_esya|insaat_malzemesi|diger",
      "shapeType": "box|flat|cylinder|irregular|bundle|unknown",
      "sizeClass": "small|medium|large|huge",
      "estimatedCount": 1,
      "stackable": false,
      "confidence": "low|medium|high",
      "fragile": false,
      "disassemblable": false,
      "spaceProfile": "compact|tall|wide|bulky|long|mixed",
      "placementRisk": "low|medium|high",
      "notes": "string"
    }
  ],
  "overallConfidence": "low|medium|high",
  "warnings": []
}
```

Prompt ilkeleri:

- kesin fiziksel olcu uydurma
- `m3` sayisi uretme
- ayni esyanin farkli acilarini ayri item sayma
- gorunmeyen esya uydurma
- label kesin degilse genel tasima tanimi kullan
- urunun tasima davranisina odaklan

## SpaceProfile Tabanli Hacim Mantigi

Ana base band tablosu artik `spaceProfile + sizeClass` ile belirlenir:

- `compact`: kutu, kompakt paket, siki yerlesen yuk
- `tall`: dikey hacim kaplayan yuk
- `wide`: yatay yayilan yuk
- `bulky`: sekilsiz ama iri ve yer kaplayan yuk
- `long`: uzun eksenli yuk
- `mixed`: karisik veya belirsiz tasima profili

`shapeType` artik ana eksen degil; ikincil deterministic modifier olarak kullanilir.

Base band secildikten sonra backend su katmanlari uygular:

1. `shapeType` recommended/width modifier
2. `loadType` hybrid bias veya pallet floor
3. `stackable`, `disassemblable`, `fragile`, `placementRisk` modifier'lari
4. confidence'e gore width genisletme/daraltma

Bu yapi urun adina bagli kalmadan tasima davranisina dayali hacim onerisi uretir.

## Modifier Mantigi

Deterministic modifier mantigi su amaclarla kuruldu:

- `stackable=true`: daha verimli yerlestirme varsayimi ile width daralir, recommended hafif iner
- `disassemblable=true`: parcali tasima potansiyeli nedeniyle recommended duser
- `fragile=true`: istifleme avantajlari sinirlanir, recommended hafif yukselir
- `placementRisk=high`: arac icinde yerlestirme kaybi ihtimali nedeniyle recommended artar
- `confidence=low`: min/max araligi belirgin sekilde genisler

Bu sistem fiziksel olcu yapmaz; tasima planlamasina donuk efektif hacim onerisi uretir.

## Merge Policy

Duplicate suppression key:

- `normalized(label) + loadType + sizeClass + spaceProfile`

Bu sayede ayni label'a sahip ama farkli tasima profiline sahip kalemler gereksiz yere merge edilmez.

Merge sirasinda:

- `estimatedCount` icin `max`
- `confidence` icin en dusuk
- `placementRisk` icin en yuksek
- `shapeType` icin en konservatif secim kullanilir
- `fragile/disassemblable` catisma durumlari warning'e doner

Ayni merge grubunda `shapeType` farkliysa merge yine yapilir ama konservatif `shapeType` secilerek caution note uretilir.

## Label Override Artik Fallback

Numeric override tamamen kaldirilmadi; ancak ana hesap motoru olmaktan cikarildi.

Direct numeric fallback sadece sinirli urunlerde korunur:

- buzdolabi
- camasir makinesi
- bulasik makinesi
- kurutma makinesi
- 3'lu/uclu koltuk
- L koltuk

`gardrop|dolap` icin numeric override yerine semantic fallback uygulanir:

- minimum `spaceProfile=tall`
- minimum `placementRisk=medium`

Numeric override item'larda override band korunur. `fragile`, `placementRisk`, `disassemblable` gibi sinyaller bandi agresif degistirmez; oncelikle caution note uretir. Yalniz confidence width araligi genisletebilir veya daraltabilir.

## Public Response ve UI Dili

Top-level response korunur:

- `recommendedHacimM3`
- `minHacimM3`
- `maxHacimM3`
- `confidenceLevel`
- `summary`
- `detectedItems`
- `cautionNotes`
- `items[]`

`items[]` additive olarak genisletildi ve artik su alanlari da tasir:

- `fragile`
- `disassemblable`
- `spaceProfile`
- `placementRisk`

UI dili "kesin hacim" yerine "tahmini tasima hacmi onerisi" tonuna cekildi.

## Bilinen Sinirlar

- tek gorselden kesin fiziksel hacim olculemez
- sistem tasima planlamasi icin efektif hacim onerisi verir
- `description` backend'de ayri parse edilmez; yalnizca LLM analizine yardimci olur
- override fallback'ler minimumda tutulsa da hala belirli yaygin urunlerde kullanilir
- yeni test framework eklenmemistir; dogrulama build/lint ve manuel senaryolar uzerinden yapilir

## Manuel Test Onerileri

- `buzdolabi` -> `tall + beyaz_esya`, override band korunur
- `camasir/bulasik/kurutma makinesi` -> override band korunur, low confidence width genisler
- `gardrop/dolap` -> semantic tall fallback
- `yatak` -> `wide + mobilya`
- `6 koli` -> `compact/mixed + stackable`
- `paletli yuk` -> pallet floor
- `boru/merdiven` -> `long`
- `karisik goruntu` -> `mixed + low confidence`
- `disassemblable mobilya` -> recommended duser
- `fragile item` -> hacim agresif dusmez, caution note eklenir
