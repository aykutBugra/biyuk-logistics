# 58 — Routes UI Polish Implementation

## Objective

Turn the carrier route-management flow (list, detail, create, edit) into a clean production surface that communicates route identity, key metrics, deviation readiness, and clear actions — consistent with the polished dashboard shell language established in previous phases.

## Scope

- `apps/web/src/app/dashboard/rotalarim/page.tsx` — route list
- `apps/web/src/app/dashboard/rotalarim/[id]/page.tsx` — route detail
- `apps/web/src/app/dashboard/rotalarim/yeni/page.tsx` — route create
- `apps/web/src/app/dashboard/rotalarim/[id]/duzenle/page.tsx` — route edit
- `apps/web/src/components/RouteCard.tsx` — new reusable route card component

No backend, API contract, or business-logic changes were made.

## Implemented UI Changes

### Route List (`rotalarim/page.tsx`)

- Replaced plain-text loading with `DashboardPageSkeleton`.
- Replaced `rounded-3xl` error div with `rounded-2xl border-red-200 bg-red-50/60 text-red-700`.
- Moved "Yeni rota tanimla" CTA from an inline panel into `headerActions` alongside `InlineHelpTrigger`, consistent with the vehicles list page.
- Removed the redundant "Planlanan hatlar" info panel (it added no value and created duplicate route-count display).
- Replaced inline route JSX with `<RouteCard />`.
- Auth guard: `bg-gray-50 text-gray-600` → `bg-slate-50 text-slate-500`.
- Preserved summary stat cards (total, deviation-defined, metrics-ready counts).

### Route Card (`RouteCard.tsx` — new component)

Four-zone layout:

1. **Header zone**: `Rota #id` blue pill, planned-date slate pill, amber deviation chip (conditional), emerald "Mesafe hazir" chip (conditional when both distance and duration are non-null).
2. **Title**: `origin → destination` using `formatLocationLabel`, `font-black tracking-tight text-slate-950`, unicode `→`.
3. **Metrics zone**: Distance + duration chips in `bg-slate-100`.
4. **Action zone**: Creation timestamp (muted), `Detay` (border-slate) + `Duzenle` (border-blue) buttons with `rounded-xl`.

### Route Detail (`rotalarim/[id]/page.tsx`)

- Auth guard: `bg-gray-50` → `bg-slate-50`.
- Loading: replaced plain-text div with `DashboardPageSkeleton`.
- Error: `border-gray-100 bg-white` → `border-red-200 bg-red-50/60 text-red-700` with a bold sub-heading.
- Identity header card: `border-gray-100` → `border-slate-200`; title `font-bold` → `font-black tracking-tight`; `"->"` → `→`; creation date moved below title as muted `text-xs text-slate-400`.
- "Rotayi Duzenle" button: `rounded-lg` → `rounded-xl border-blue-200`.
- "Rotayi Sil": changed from `rounded-lg border-red-200 bg-white` button to a text-only `text-red-600 hover:text-red-800` button, consistent with previous polish phases.
- Metric cards (Mesafe / Sure / Max sapma): `border-gray-100` → `border-slate-200`; label `text-sm` → `text-xs uppercase tracking-[0.24em]`.
- Location detail cards: `border-gray-100 text-gray-*` → `border-slate-200 text-slate-*`.

### Route Create (`rotalarim/yeni/page.tsx`)

- Auth guard: `bg-gray-50` → `bg-slate-50`.
- Form card: `border-gray-100` → `border-slate-200`.
- Info hint box: `border-slate-200 bg-slate-50` (was already correct for content, updated `rounded-2xl` → `rounded-xl` to match inner cards).
- Footer border: `border-gray-100` → `border-slate-200`.
- Submit button: `rounded-lg` → `rounded-xl`; `disabled:bg-blue-400` → `disabled:opacity-60`.

### Route Edit (`rotalarim/[id]/duzenle/page.tsx`)

- Auth guard: `bg-gray-50` → `bg-slate-50`.
- Loading: plain-text div → `DashboardPageSkeleton`.
- Error: `border-gray-100 bg-white text-gray-*` → `border-red-200 bg-red-50/60 text-red-700` with bold sub-heading.
- Form card: `border-gray-100` → `border-slate-200`.
- Footer border: `border-gray-100` → `border-slate-200`.
- Submit button: `rounded-lg` → `rounded-xl`; `disabled:bg-blue-400` → `disabled:opacity-60`.
- Added `description` prop to `CarrierVehiclesShell` to clarify the user is editing an existing route.

## Loading / Empty / Error State Improvements

| Surface | Before | After |
|---------|--------|-------|
| List loading | Plain text in white card | `DashboardPageSkeleton` |
| Detail loading | Plain text in `border-gray-100` card | `DashboardPageSkeleton` |
| Edit loading | Plain text in `border-gray-100` card | `DashboardPageSkeleton` |
| List error | `bg-red-50 text-red-700` (no border) | `border-red-200 bg-red-50/60` |
| Detail error | `border-gray-100 bg-white` plain card | `border-red-200 bg-red-50/60 text-red-700` |
| Edit error | `border-gray-100 bg-white` plain card | `border-red-200 bg-red-50/60 text-red-700` |
| List empty | `EmptyStateCard` (already used, preserved) | Preserved, CTA consistent with headerActions |

## Reusable Component Extraction

**`RouteCard.tsx`** — new presentational-only component.

- Props: `{ route: CarrierRouteListItem }`.
- No data fetching or business logic inside.
- Four-zone structure matches the card language established in `VehicleCard`, `MyRequestCard`, `IncomingOfferCard`, and `MyOfferCard`.

## Validation Results

- `npm run lint:web` — exit 0, no warnings.
- `npm run build:web` — exit 0, all route pages compiled successfully (static + dynamic).

## Deferred Items

- Route map visualization (requires map integration, out of scope).
- Route-aware discovery flow polish (separate phase).
- Inline help content for the `routes` help key (content already wired via `InlineHelpTrigger helpKey="routes"`; copy expansion is a separate content task).
- Delete confirmation modal (currently uses `window.confirm`; UI-level modal is a future enhancement).
