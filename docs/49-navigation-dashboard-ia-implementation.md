# Navigation / Dashboard IA Implementation

## Summary

This phase implemented the role-aware navigation and dashboard information architecture without a visual redesign.

Key outcomes:

- `Panelim` now resolves through `/dashboard` for every authenticated user.
- Dashboard navigation moved from hardcoded per-shell menus to a single registry-driven model.
- Shared pages now use one unified dashboard shell instead of switching between separate customer/carrier shells.
- `/dashboard` now behaves as a real workspace home:
  - customer overview
  - carrier overview
  - dual-role chooser when no active workspace is selected
  - admin-only redirect to `/dashboard/admin`
- Minimal admin navigation surface was added:
  - `/dashboard/admin`
  - `/dashboard/admin/kullanicilar`

## Implemented Changes

### Unified dashboard shell

- Added a central navigation registry under `apps/web/src/lib/dashboard/navigation.ts`
- Added a new config-driven `DashboardShell`
- Updated `DashboardShellFrame` to render active nav state from resolved navigation metadata
- Rewired `CustomerTransportRequestsShell` and `CarrierVehiclesShell` to use the unified shell internally

### Workspace-aware navigation

- `getDashboardHref()` now routes authenticated users to `/dashboard`
- Shared pages remain under existing URLs, but navigation and active item selection now depend on:
  - current roles
  - current workspace mode
  - current pathname
- Hidden task routes now resolve to a visible parent nav item through registry match rules

### `/dashboard` home behavior

- Customer users now see a customer overview
- Carrier users now see a carrier overview
- Dual-role users without active workspace still see a chooser
- Dual-role users with workspace selected now see the overview for that workspace
- Admin-only users are redirected to `/dashboard/admin`
- Admin + business users keep business workspace home and get admin entry points inside the shell

### Shared/account/admin surfaces

- Shared business pages moved to the new shell:
  - conversations
  - conversation detail
  - ratings
- Shared account pages moved to the new shell:
  - notifications
  - profile
- Added admin pages:
  - admin overview
  - users list

### Supporting changes

- Added `apps/web/src/lib/api/users.ts`
- Enabled admin access to notification inbox endpoints so admin-only users can use the shared account notifications page
- Redirected legacy `/dashboard/paun_ver` to `/dashboard/puanlarim`

## Verification

Executed successfully:

- `npm run lint:web`
- `npm run build:web`
- `npm run lint:api`
- `npm run build:api`
- `npm run test:api`

## Notes

- No migration was generated in this phase.
- This phase intentionally stopped at information architecture and structural UI behavior.
- PrimeReact styling, full visual system work, and a larger admin backoffice remain for later phases.
