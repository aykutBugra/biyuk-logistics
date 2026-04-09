# Projenin Güncel Dizin Özeti

Bu dosya, projenin mevcut monorepo yapısını kısa ve okunabilir biçimde özetlemek için hazırlanmıştır. Amaç, hangi klasörün ne işe yaradığını hızlıca gösterebilmektir.

## Üst Seviye Yapı

```text
nakliye-app/
├─ apps/
│  ├─ web/
│  └─ api/
├─ docs/
├─ .vscode/
├─ package.json
├─ package-lock.json
├─ .env
├─ .gitignore
├─ README.md
├─ AGENTS.md
└─ workspace.d.ts
```

## Kök Dizin

- `apps/`: Monorepo içindeki uygulamaları taşır.
- `docs/`: süreç notları, mimari kararlar ve faz bazlı açıklamalar burada tutulur.
- `.vscode/`: editör ayarları ve Tailwind CSS custom data tanımları burada tutulur.
- `package.json`: workspace tanımı ve kök seviyedeki ortak scriptler burada yer alır.
- `.env`: yerel çalışma ortamı değişkenleri için kök dosya.
- `workspace.d.ts`: workspace tipiyle ilgili yardımcı tanımlar.

## apps/web

Frontend uygulaması Next.js tabanlıdır.

```text
apps/web/
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ dashboard/
│  │  ├─ hakkimizda/
│  │  ├─ iletisim/
│  │  ├─ login/
│  │  ├─ register/
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components/
│  └─ lib/
├─ .next/
├─ package.json
└─ next.config.mjs
```

### apps/web içeriği

- `public/`: statik asset dosyaları.
- `src/app/`: Next App Router sayfaları ve layout yapısı.
- `src/app/dashboard/`: dashboard altındaki sayfalar.
- `src/app/login/`: web login ekranı.
- `src/app/register/`: web register ekranı.
- `src/app/globals.css`: global stil dosyası.
- `src/components/`: tekrar kullanılabilir UI bileşenleri.
- `src/lib/`: yardımcı istemci kodları ve API erişim katmanı.
- `.next/`: Next.js build/dev çıktısı, kaynak kod değildir.

## apps/api

Backend uygulaması NestJS tabanlıdır.

```text
apps/api/
├─ prisma/
│  └─ migrations/
├─ src/
│  ├─ common/
│  ├─ config/
│  ├─ infrastructure/
│  └─ modules/
│     ├─ auth/
│     ├─ jobs/
│     ├─ notifications/
│     ├─ offers/
│     ├─ ratings/
│     ├─ roles/
│     ├─ transport-requests/
│     ├─ users/
│     └─ vehicles/
├─ dist/
├─ package.json
├─ nest-cli.json
└─ prisma.config.ts
```

### apps/api içeriği

- `prisma/`: veritabanı şeması ve migration dosyaları.
- `src/common/`: ortak decorator, guard, constant ve type tanımları.
- `src/config/`: env ve uygulama config dosyaları.
- `src/infrastructure/`: altyapı seviyesi servisler, örneğin Prisma bağlantısı.
- `src/modules/`: iş alanlarına ayrılmış backend modülleri.
- `src/modules/auth/`: register, login, refresh, me akışı.
- `src/modules/users/`: kullanıcı okuma/yazma ve kullanıcı profili tarafı.
- `src/modules/roles/`: rol çözümleme ve rol endpointleri.
- `src/modules/vehicles/`, `transport-requests/`, `offers/`, `jobs/`, `ratings/`, `notifications/`: ileriki domain alanları için modül iskeletleri.
- `dist/`: Nest build çıktısı, kaynak kod değildir.

## docs

Dokümantasyon klasörü faz bazlı ilerliyor:

```text
docs/
├─ 00-js-to-ts-migration.md
├─ 01-backend-architecture-plan.md
├─ 02-nest-backend-bootstrap.md
├─ 03-auth-users-roles-foundation.md
├─ 03-current-state-explanation.md
├─ 04-process-summary-so-far.md
├─ 05-register-login-ready.md
└─ 06-project-directory-summary.md
```

### docs içeriği

- `00`: JS -> TS geçiş notları.
- `01`: backend mimari planı.
- `02`: Nest backend bootstrap özeti.
- `03`: auth/users/roles foundation notları.
- `04`: o ana kadar gelinen sürecin özeti.
- `05`: register + login hazır auth aşaması.
- `06`: mevcut dizin yapısının özeti.

## Kısa Mimari Not

Bu yapı tek `src` altında birleşik bir frontend-backend dizini yerine, iki ayrı uygulama mantığıyla kurulmuştur:

- `apps/web/src`: sadece frontend kaynak kodu
- `apps/api/src`: sadece backend kaynak kodu

Bu yaklaşımın nedeni:

- Next.js ve NestJS'nin farklı çalışma modeli kullanması
- deploy ve build süreçlerinin ayrı olması
- frontend ve backend sorumluluklarının karışmaması
- ileride ortak kod gerekirse bunu `shared` benzeri ayrı bir alana taşıyabilme esnekliği sağlaması

## Kaynak Kod Olmayan Klasörler

Aşağıdaki klasörler kaynak kod değil, çalışma çıktısı veya bağımlılık dizinidir:

- `node_modules/`
- `apps/web/.next/`
- `apps/api/dist/`

Bu klasörler uygulamanın mantığını temsil etmez; build veya package manager tarafından üretilir.
