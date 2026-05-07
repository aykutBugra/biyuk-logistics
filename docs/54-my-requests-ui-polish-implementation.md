# My Requests UI Polish — Implementation Report

## Objective

Upgrade the customer-facing "My Requests" surface (`isteklerim` list and `isteklerim/[id]` detail) from a prototype-grade rendering to a production-quality operational page. No business logic, API contract, or backend changes were made.

---

## Scope

| File | Change type |
|---|---|
| `apps/web/src/components/StatusBadge.tsx` | Modified — added optional `label` prop |
| `apps/web/src/components/MyRequestCard.tsx` | New file |
| `apps/web/src/app/dashboard/isteklerim/page.tsx` | Modified — full card extraction, loading/error states, header action |
| `apps/web/src/app/dashboard/isteklerim/[id]/page.tsx` | Modified — color system, StatusBadge, loading/error states |

Shell components and all other pages were not touched.

---

## Implemented UI Changes

### List page (`isteklerim/page.tsx`)

- Replaced ~80 lines of inline card JSX with `<MyRequestCard>` per request item.
- Replaced a plain-text loading string inside a card div with `<DashboardPageSkeleton>`.
- Error state updated from unstyled to `rounded-2xl border border-red-200 bg-red-50/60 p-6 text-sm text-red-700`.
- Status-check guard changed from `bg-gray-50 text-gray-600` to `bg-slate-50 text-slate-500`.
- Added "Yeni istek" quick-add `Link` button and `InlineHelpTrigger` to `headerActions` via `CustomerTransportRequestsShell`.
- All existing data flow (fetch, delete, state management) preserved exactly.

### Detail page (`isteklerim/[id]/page.tsx`)

- All `gray-*` Tailwind classes replaced with `slate-*` throughout.
- Request header now renders `<StatusBadge status={request.durum} label={...} />` instead of a raw status string inside a manually styled span.
- Each incoming offer row now renders `<StatusBadge status={offer.durum} label={...} />` instead of raw `offer.durum` text.
- "Konusmaya git" link visually distinguished as ghost-blue button (`rounded-xl border-blue-200`).
- "Kabul Et" is solid emerald primary; "Reddet" is text-only red, de-emphasised.
- Loading state replaced with `<DashboardPageSkeleton>` (also used inside the "Gelen teklifler" section).
- Error state updated to `rounded-2xl border-red-200 bg-red-50/60` with `text-red-800` heading.
- Status-check guard changed to `bg-slate-50 text-slate-500`.
- All accept/reject/delete/rating logic preserved without modification.

---

## StatusBadge Change

Added an optional `label?: string` prop to `apps/web/src/components/StatusBadge.tsx`.

```typescript
type StatusBadgeProps = {
  status: string;
  label?: string;
};
```

When `label` is provided it is rendered in place of the raw `status` value. The `status` value still exclusively drives the color class logic via `getBadgeClasses`. All existing consumers that do not pass `label` are unaffected — they continue to render the raw status string.

---

## MyRequestCard Extraction

New presentational component at `apps/web/src/components/MyRequestCard.tsx`.

Props:

```typescript
type MyRequestCardProps = {
  request: TransportRequestListItem;
  isDeleting: boolean;
  onDelete: (id: number) => void;
};
```

Three-zone structure:

- **Zone 1 (top):** `StatusBadge` with Turkish label + `#id` pill (slate-100) + compact creation date aligned right.
- **Zone 2 (middle):** `text-xl font-black` route heading → cargo chips row (`yukTipi`, `agirlikKg`, `hacimM3`, `tasimaTarihi`, `tekTasimaIstiyor`) → `line-clamp-2` cargo description.
- **Zone 3 (bottom):** Next-step hint text (derived from `durum`, `text-xs text-slate-500`) on the left; action buttons on the right.

Action button hierarchy:
- **Detay** — `bg-blue-600 text-white rounded-xl` (solid primary, `Link`)
- **Duzenle** — `border border-blue-200 text-blue-700 rounded-xl` (ghost secondary, `Link`)
- **Sil** — `text-red-600 text-sm font-semibold` (text-only destructive, de-emphasised `button`)

The card root is a plain `div` — no parent `onClick` or navigation wrapping. All interactions go through explicit buttons and links.

Status label helper and next-step hint helper are local functions inside `MyRequestCard.tsx`, not shared globally (per plan scope).

---

## Loading / Error State Improvements

| Surface | Before | After |
|---|---|---|
| List — auth guard | `bg-gray-50 text-gray-600` plain div | `bg-slate-50 text-slate-500` centered paragraph |
| List — data loading | `rounded-3xl` plain text card | `<DashboardPageSkeleton>` |
| List — error | Unstyled `rounded-3xl` div | `rounded-2xl border-red-200 bg-red-50/60 text-red-700` |
| Detail — auth guard | `bg-gray-50 text-gray-600` | `bg-slate-50 text-slate-500` |
| Detail — data loading | `bg-white border-gray-100 text-gray-600` plain text card | `<DashboardPageSkeleton>` |
| Detail — error | `bg-white border-gray-100` unstyled | `rounded-2xl border-red-200 bg-red-50/60` with `text-red-800` heading |
| Detail — offers loading | `text-gray-600` paragraph | `<DashboardPageSkeleton>` wrapped in `mt-4` div |
| Detail — offers empty | `text-gray-600` | `text-slate-500` |

---

## Validation Results

Both checks passed with zero warnings or errors after all changes were applied:

```
npm run lint:web   → exit 0
npm run build:web  → exit 0, all routes compiled
```

All dashboard routes including `/dashboard/isteklerim` and `/dashboard/isteklerim/[id]` appeared in the build output as expected.

---

## Deferred Items

The following items are intentionally out of scope for this phase, consistent with the approved plan:

- **Offer count hints on list cards** — `TransportRequestListItem` does not include an `incomingOfferCount` field; adding it requires a backend API change.
- **Accept/Reject modal UX** — `window.confirm` / `window.alert` pattern is retained; a modal-based flow is deferred to a future phase.
- **Pagination or filtering** on the list page.
- **Request timeline / status history view.**
- **Edit page (`isteklerim/[id]/duzenle`) polish** — separate scope.
- **New request form (`istek_ekle`) polish** — separate scope.
- **Global `StatusBadge` label migration** — the `label` prop is available but only `MyRequestCard` and the detail page use the label helper in this phase; other consumers (`OpenRequestCard`, etc.) are not touched.
