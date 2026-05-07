# 58 — Remaining Dashboard Surfaces UI Polish

## Objective

Bring the remaining unpolished dashboard surfaces (profile, carrier onboarding, notifications, ratings, conversations) to the same visual level as the already-polished surfaces (home dashboard, open requests, my requests, vehicles, routes) without altering any business logic, API contracts, or backend behavior.

## Scope

**Routes** — already fully polished in the previous turn (doc 58-routes-ui-polish-implementation.md). Not re-touched here.

**This phase covers:**

| File | Surface |
|------|---------|
| `app/dashboard/profil/page.tsx` | Profile |
| `app/dashboard/profil/nakliyeci-rolu-ekle/page.tsx` | Carrier role onboarding |
| `app/dashboard/bildirimler/page.tsx` | Notifications |
| `app/dashboard/puanlarim/page.tsx` | Ratings |
| `app/dashboard/konusmalar/page.tsx` | Conversations list |
| `app/dashboard/konusmalar/teklif/[offerId]/page.tsx` | Conversation thread |

## Implemented UI Changes by Surface

### Profile (`profil/page.tsx`)

- **Loading**: replaced `rounded-3xl` plain-text white card with `DashboardPageSkeleton`.
- **Error**: `rounded-3xl bg-red-50` → `rounded-2xl bg-red-50/60`.
- **Account info card**: `rounded-3xl` → `rounded-2xl`.
- **Role onboarding card**: `rounded-3xl` → `rounded-2xl`.
- **Danger zone card**: `rounded-3xl` → `rounded-2xl`.
- **Auth guard**: `text-slate-600` → `text-slate-500`.

### Carrier Role Onboarding (`profil/nakliyeci-rolu-ekle/page.tsx`)

- **Form card**: `rounded-3xl` → `rounded-2xl`.
- **Submit button**: `disabled:bg-blue-400` → `disabled:opacity-60` (consistent with all polished forms).
- **Auth guard**: `text-slate-600` → `text-slate-500`.

### Notifications (`bildirimler/page.tsx`)

- **Loading**: replaced `rounded-3xl` plain-text white card with `DashboardPageSkeleton`.
- **Error**: `rounded-3xl bg-red-50` → `rounded-2xl bg-red-50/60`.
- **"Tumunu okundu say" action bar**: `rounded-3xl` → `rounded-2xl`.
- **Each notification card**: `rounded-3xl` → `rounded-2xl`.
- **Auth guard**: `text-slate-600` → `text-slate-500`.

### Ratings (`puanlarim/page.tsx`)

- **Loading**: replaced `rounded-3xl` plain-text white card with `DashboardPageSkeleton`.
- **Error**: `rounded-3xl bg-red-50` → `rounded-2xl bg-red-50/60`.
- **`SectionCard` wrapper** (inline sub-component): `rounded-3xl` → `rounded-2xl`.
- **Individual rating route titles**: `"->"` → `→` (unicode arrow).
- **Account overview card**: `rounded-3xl` → `rounded-2xl`.
- **Auth guard**: `text-slate-600` → `text-slate-500`.

### Conversations List (`konusmalar/page.tsx`)

- **Loading**: replaced `rounded-3xl` plain-text white card with `DashboardPageSkeleton`.
- **Error**: `rounded-3xl bg-red-50` → `rounded-2xl bg-red-50/60`.
- **Each thread card**: `rounded-3xl` → `rounded-2xl`.
- **Route title**: `"->"` → `→` (unicode arrow).
- **Auth guard**: `text-slate-600` → `text-slate-500`.

### Conversation Thread (`konusmalar/teklif/[offerId]/page.tsx`)

- **Loading**: replaced `rounded-3xl` plain-text white card with `DashboardPageSkeleton`.
- **Error**: `rounded-3xl bg-red-50` → `rounded-2xl bg-red-50/60`.
- **Header identity card**: `rounded-3xl` → `rounded-2xl`.
- **Route title**: `"->"` → `→` (unicode arrow).
- **Messages container card**: `rounded-3xl` → `rounded-2xl`.
- **"Mesaj gonder" form card**: `rounded-3xl` → `rounded-2xl`.
- **"Karsi teklif ver" form card**: `rounded-3xl` → `rounded-2xl`.
- **Read-only state notice**: `rounded-3xl` → `rounded-2xl`.
- **Auth guard**: `text-slate-600` → `text-slate-500`.

## Loading / Empty / Error State Improvements

| Surface | Before | After |
|---------|--------|-------|
| Profile loading | Plain text in `rounded-3xl` white card | `DashboardPageSkeleton` |
| Notifications loading | Plain text in `rounded-3xl` white card | `DashboardPageSkeleton` |
| Ratings loading | Plain text in `rounded-3xl` white card | `DashboardPageSkeleton` |
| Conversations loading | Plain text in `rounded-3xl` white card | `DashboardPageSkeleton` |
| Thread loading | Plain text in `rounded-3xl` white card | `DashboardPageSkeleton` |
| Profile error | `rounded-3xl bg-red-50` (no opacity) | `rounded-2xl bg-red-50/60` |
| Notifications error | `rounded-3xl bg-red-50` (no opacity) | `rounded-2xl bg-red-50/60` |
| Ratings error | `rounded-3xl bg-red-50` (no opacity) | `rounded-2xl bg-red-50/60` |
| Conversations error | `rounded-3xl bg-red-50` (no opacity) | `rounded-2xl bg-red-50/60` |
| Thread error | `rounded-3xl bg-red-50` (no opacity) | `rounded-2xl bg-red-50/60` |

## Reusable Component Extraction

No new components were extracted in this phase. All existing components (`DashboardPageSkeleton`, `EmptyStateCard`, `SummaryStatCard`) were already reused correctly. The `SectionCard` sub-component inside `puanlarim/page.tsx` was polished in-place without extraction (it is specific to that page and not large enough to warrant a separate file).

## Validation Results

- `npm run lint:web` — exit 0, no warnings.
- `npm run build:web` — exit 0, all surfaces compiled successfully (static and dynamic).

## Deferred Items

- Rich notification navigation UI (currently `router.push(hedefUrl)` — behavior preserved as-is).
- Real-time conversation updates (polling/websocket) — not in scope; existing behavior preserved.
- Rating summary chart / histogram visualization — data is displayed correctly; chart enhancement is a future UX phase.
- Carrier onboarding multi-step wizard — current single-form approach is sufficient; no redesign needed at this time.
- Routes surface (already fully polished in the previous turn).
