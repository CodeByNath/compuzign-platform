# Admin Station Drawer

The Admin Station has one entity-agnostic drawer shell. Package Family, Category, Service, and Tier provide registered compositions inside it; none creates another shell or imports Command Centre routing.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/`

## Runtime chain

```text
card/carousel action with native record id
  → StationSurfaceHost resolves action intent + drawerTemplateKey
  → AdminStationDrawerContext stores { key, recordId, opening mode }
  → AdminStationDrawer resolves the declarative registry
  → entity host adapter resolves its own record
  → shared entity composition renders Overview / Connections + modules
  → successful mutation reports onSaved
  → only the originating wall refetches
```

The shell owns header, scrolling body, footer slot, backdrop/Escape/header close, focus restore, scroll lock, and the close guard. It never switches on entity type.

## Authoritative files

- `station-manager/drawerTypes.ts` — open string `DrawerTemplateKey`, opening mode, and footer/guard bridge props.
- `station-manager/recordIdentity.ts` — opaque native `StationRecordId` contract.
- `station-manager/registry/drawerTemplates.ts` — drawer registration/resolution; unknown keys preserve the shell's unresolved-drawer behavior.
- `admin-station/register.ts`, `service-station/register.ts`, and `package-station/register.ts` — the owning Stations register Category, Service, Package Family, and Tier drawer contracts.
- `shell/drawer/AdminStationDrawerContext.tsx` — one open record and the originating wall refresh handle.
- `shell/drawer/AdminStationDrawer.tsx` — the single shell and close path.
- `resources/ts/package-station/surface/packageFamily/PackageFamilyDrawerContent.tsx` — string `group_id` host adapter; resolves current/archive/trash projections and mounts the neutral composition.
- `stations/serviceCategory/CategoryDrawerHost.tsx` — numeric Category id adapter plus assigned-Service projection.
- `service-station/surface/ServiceDrawerHost.tsx` — numeric Service id adapter.
- `resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx` — stable string `occupant_id` adapter; rejects foreign id shapes rather than coercing them.

## Shared mature compositions

The shell adapters mount these owner-local host-neutral implementations:

- `package-station/drawer/package-family/PackageFamilyDrawerContent.tsx`
- `entity-drawers/category/CategoryDrawerContent.tsx`
- `service-station/drawer/ServiceDrawerContent.tsx`
- `package-station/drawer/tier/TierDrawerContent.tsx`

All use `drawer-kit/EntityDrawer.tsx`, schema placements, `ModuleStatusPill`, `ModuleNotificationPanel`, `InlineEditorShell`, module `ActionFooter`, and the shared record-level `EntityActionFooter`/`CanonicalEntityFooter`. `EntityDrawer.editing` replaces only the active module with its editor; sibling modules remain readable.

Category mutations stay in `useCategoryStation`; Package Family and Tier mutations stay in Package Station's `usePackageFamilyStation` / `usePackageStation`; Service retains `useServiceStation`. Presentation components call no endpoints.

## Identity and refresh invariants

- Package Family: native string `group_id`.
- Category and Service: native numeric ids.
- Tier: stable string `occupant_id`, never the reassignable slot.
- No adapter parses, stringifies, or numerically coerces an id.
- Compositions advance local records from mutation responses; `onSaved` refreshes only the wall that opened the drawer, avoiding body flashes.

## Styling

Both pages enqueue `dist/css/drawer-kit.css`. Shared component rules live in `resources/css/modules/drawer-kit.css`; `.cz-admin-station`-scoped host adaptations apply the newer shell/module/editor treatment without changing Command Centre. Admin-only overlay chrome remains in `admin-station/styles/admin-station.css`.

Browser runtime remains unverified where no WordPress runtime is available.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Entity Drawer Recovery](entity-drawer-recovery.md), [Cards](admin-station-cards.md), [Categories](categories.md), [Package Manager](package-manager.md), [Styles](admin-station-styles.md).
