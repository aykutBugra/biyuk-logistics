# My Offers UI Polish — Implementation Report

## Objective

Upgrade the carrier-facing My Offers page (`tekliflerim`) from a prototype flat list to a production-quality offer tracking and follow-up surface. No business logic, API contracts, or backend changes were made.

---

## Scope

| File | Change type |
|---|---|
| `apps/web/src/components/MyOfferCard.tsx` | New file |
| `apps/web/src/app/dashboard/tekliflerim/page.tsx` | Modified |

`StatusBadge.tsx` was not modified — the `label` prop added in doc-54 was sufficient.

No `[id]` detail page exists under `tekliflerim/` — out of scope.

---

## Implemented UI Changes

### Page (`tekliflerim/page.tsx`)

- Removed all inline offer card JSX (~45 lines) and replaced with `<MyOfferCard>`.
- Replaced plain-text loading card (`rounded-3xl border-slate-200 bg-white`) with `<DashboardPageSkeleton>`.
- Error state updated from `rounded-3xl bg-red-50` to `rounded-2xl border border-red-200 bg-red-50/60 text-red-700`.
- Added `description` prop to `CarrierVehiclesShell`: "Verdigin teklifleri, her birinin mevcut durumunu ve musteri yanitlarini buradan takip et."
- Summary stat card label changed from "Acik teklif" to "Beklemede" — matches the new Turkish status label convention.
- Empty state description improved: now explains the path to create a first offer.
- Status-check guard updated to use `<p>` instead of bare `<div>` for text.
- Removed unused `Link`, `StatusBadge`, and `formatCurrency` imports from the page (all moved into `MyOfferCard`).
- All existing data flow preserved exactly.

---

## Status / Price / Action Hierarchy Decisions

### Status labels

`StatusBadge` is now used with a Turkish `label` prop inside `MyOfferCard`:

| Raw status | Displayed label |
|---|---|
| OLUSTURULDU | Beklemede |
| KABUL_EDILDI | Kabul edildi |
| REDDEDILDI | Reddedildi |
| IPTAL_EDILDI | Iptal edildi |

The color logic in `StatusBadge` continues to read from `status`, unchanged.

### Next-step hints

A small `text-xs text-slate-500` hint line is derived from `durum` with no API change:

| Status | Hint |
|---|---|
| OLUSTURULDU | Musteri yanitini bekliyor |
| KABUL_EDILDI | Teklif kabul edildi, nakliye akisi basliyor |
| REDDEDILDI | Bu teklif reddedildi |
| IPTAL_EDILDI | Bu teklif iptal edildi |

### Price

Price is rendered as `text-2xl font-black text-emerald-700` in the header row, right-aligned. It was previously at the same scale in the right column but separated from the status info; now it is visually anchored to the card's top-right corner for immediate scanning.

### Action hierarchy

| Action | Style | Notes |
|---|---|---|
| Konusmaya git | `border-blue-200 text-blue-700 rounded-xl` (ghost primary) | Main follow-up action — always shown |
| Istek Detayi | `border-slate-200 text-slate-600 rounded-xl` (ghost tertiary) | New — links to `acik_istekler/[requestId]` |

`OfferItem` has no withdraw/cancel endpoint in the current API — no destructive action is possible or needed. If a future API phase adds cancellation, the card can accept an `onCancel` prop.

### Resolved offer de-emphasis

Cards with `REDDEDILDI` or `IPTAL_EDILDI` status render with:
- `border-slate-100` (lighter border)
- `opacity-75` (visually de-emphasized without hiding)

This lets the carrier distinguish active/waiting offers from closed ones at a glance.

---

## Loading / Empty / Error State Improvements

| Surface | Before | After |
|---|---|---|
| Auth guard | `min-h-screen bg-slate-50` unstyled `<div>` | `<p className="font-medium text-slate-500">` |
| Data loading | `rounded-3xl border-slate-200 bg-white` plain text card | `<DashboardPageSkeleton>` |
| Error state | `rounded-3xl border-red-200 bg-red-50` | `rounded-2xl border border-red-200 bg-red-50/60 text-red-700` |
| Empty state description | "Ilk teklifini verdiginde burada goreceksin." | Improved: explains path to first offer |

---

## Reusable Component Extraction

### `MyOfferCard.tsx`

New presentational component with a clear three-zone structure:

**Header row:**
- `StatusBadge` with Turkish label + `Teklif #id` pill + `Istek #id` pill (left)
- Price `text-2xl font-black text-emerald-700` (right)

**Body:**
- Route heading: `text-xl font-black text-slate-950` with `→` unicode arrow, city names only (matching `OfferItem` data shape)
- Vehicle chip: `aracPlaka` as `bg-slate-100` pill, or "Arac bilgisi yok" faded pill if absent
- Note: `line-clamp-2 text-sm text-slate-500`, or "Teklif notu eklenmedi." if absent

**Footer:**
- Left: next-step hint `text-xs text-slate-500`
- Right: "Konusmaya git" (ghost blue) + "Istek Detayi" (ghost slate)

Props:

```typescript
type MyOfferCardProps = {
  offer: OfferItem;
};
```

No callbacks — `OfferItem` has no mutable actions available in the current API. The component is fully presentational.

---

## Validation Results

Both checks passed with zero warnings or errors:

```
npm run lint:web   → exit 0
npm run build:web  → exit 0, all routes compiled
```

`/dashboard/tekliflerim` appears in the build output as a static prerendered route.

---

## Deferred Items

- **Withdraw / cancel offer action**: `OfferItem` has no cancel/withdraw endpoint in the current API layer. If added in a future phase, `MyOfferCard` can accept an `onCancel` callback prop.
- **`[id]` detail page for individual offers**: does not exist in the current codebase. A dedicated offer detail page is deferred.
- **Cargo context on offer cards**: `OfferItem` does not include cargo fields (`agirlikKg`, `hacimM3`, `yukTipi`). Showing cargo chips would require a backend API change.
- **Offer count badge in sidebar**: surfacing pending offer count in navigation requires a shared polling/data layer. Deferred.
- **Grouping by request**: `OfferItem[]` is a flat list; grouping under a request header requires either a backend aggregate endpoint or a client reshape. Deferred.
