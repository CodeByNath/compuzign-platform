# Admin Station Drawer

The Admin Station has one entity-agnostic drawer shell. Package Family, Category, Service, Tier, and Package capability assignment adapters resolve through it; none creates another shell or imports Command Centre routing.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

## Runtime chain

```text
card/carousel action with native record id
  → StationSurfaceHost resolves action intent + drawerTemplateKey
  → AdminStationDrawerContext stores { key, recordId, opening mode, optional context }
  → AdminStationDrawer resolves the declarative registry
  → entity host adapter resolves its own record
  → shared entity composition renders Overview / Connections + modules
  → successful mutation reports onSaved
  → only the originating wall refetches
```

The shell owns header, scrolling body, footer slot, backdrop/Escape/header close, focus restore, scroll lock, and the close guard. It never switches on entity type.

## Authoritative files

- `stations/drawers/drawerTypes.ts` — registered keys (`package-family | category | service | tier | package-capability`), opaque identity/context, opening mode, footer/guard bridge props.
- `stations/drawers/drawerRegistry.tsx` — the declarative registrations plus load-time well-formedness guard.
- `shell/drawer/AdminStationDrawerContext.tsx` — one open record and the originating wall refresh handle.
- `shell/drawer/AdminStationDrawer.tsx` — the single shell and close path.
- `stations/packageFamily/PackageFamilyDrawerContent.tsx` — string `group_id` host adapter; resolves current/archive/trash projections and mounts the neutral composition.
- `stations/serviceCategory/CategoryDrawerHost.tsx` — numeric Category id adapter plus assigned-Service projection.
- `stations/serviceSurface/ServiceDrawerHost.tsx` — numeric Service id adapter.
- `stations/tierSurface/TierDrawerHost.tsx` — stable string `occupant_id` adapter for existing records; create mode receives owner identity plus Service/slot mutation context.
- `stations/packageCapabilities/PackageCapabilityDrawerHost.tsx` — Package-owned assignment adapter; no Tier lifecycle logic.

## Shared mature compositions

The shell adapters mount these host-neutral implementations from `resources/ts/entity-drawers/`:

- `package-family/PackageFamilyDrawerContent.tsx`
- `category/CategoryDrawerContent.tsx`
- `service/ServiceDrawerContent.tsx`
- `tier/TierDrawerContent.tsx`

All use `drawer-kit/EntityDrawer.tsx`, schema placements, `ModuleStatusPill`, `ModuleNotificationPanel`, `InlineEditorShell`, module `ActionFooter`, and the shared record-level `EntityActionFooter`/`CanonicalEntityFooter`. `EntityDrawer.editing` replaces only the active module with its editor; sibling modules remain readable. Command Centre mounts the same compositions through thin `StepContext → EntityDrawerHostBridge` adapters.

Category mutations stay in `useCategoryStation`; Package Family mutations stay in `usePackageFamilyStation`; Service and Tier retain `useServiceStation` / `usePackageStation`. Presentation components call no endpoints.

## Identity and refresh invariants

- Package Family: native string `group_id`.
- Category and Service: native numeric ids.
- Tier: stable string `occupant_id`, never the reassignable slot.
- Tier creation: no occupant identity exists yet; owner identity opens the registered adapter and `slotId` remains mutation context until Tier authority creates an occupant.
- No adapter parses, stringifies, or numerically coerces an id.
- Compositions advance local records from mutation responses; `onSaved` refreshes only the wall that opened the drawer, avoiding body flashes.

## Styling

Both pages enqueue `dist/css/drawer-kit.css`. Shared component rules live in `resources/css/modules/drawer-kit.css`; `.cz-admin-station`-scoped host adaptations apply the newer shell/module/editor treatment without changing Command Centre. Admin-only overlay chrome remains in `admin-station/styles/admin-station.css`.

Browser runtime remains unverified where no WordPress runtime is available.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Entity Drawer Recovery](entity-drawer-recovery.md), [Cards](admin-station-cards.md), [Categories](categories.md), [Package Manager](package-manager.md), [Styles](admin-station-styles.md).
