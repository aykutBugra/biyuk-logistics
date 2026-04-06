# Nakliye App Monorepo

Bu repo iki uygulamadan oluşur:

- `apps/web`: Next.js frontend
- `apps/api`: Nest.js backend

## Çalıştırma

Frontend:

```bash
npm run dev:web
```

Backend:

```bash
npm run dev:api
```

Tam build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Prisma client üretimi:

```bash
npm run prisma:generate
```

## Mimari

- Next.js yalnızca UI ve HTTP API client katmanıdır.
- Nest.js auth, validation, business logic ve DB erişim katmanıdır.
- Prisma şeması backend tarafında `apps/api/prisma` altında tutulur.
