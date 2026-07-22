# Admin Station Drawer

The Admin Station has one entity-agnostic drawer shell. Package Family, Category, Service, Tier, and Rate Sheet row provide registered record compositions inside it, and three registered creation surfaces (Package Family, Rate Sheet setup, Rate Sheet group) serve the Tier Workspace Settings tab; none creates another shell or imports Command Centre routing.

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

- `stations/drawers/drawerTypes.ts` — `DrawerTemplateKey` (`package-family | category | service | tier | rate-sheet-row` plus the `package-family-create | rate-sheet-setup | rate-sheet-group-create` creation keys), opaque `StationRecordId`, opening mode, footer/guard bridge props.
- `stations/drawers/drawerRegistry.tsx` — the declarative registrations plus load-time well-formedness guard.
- `shell/drawer/AdminStationDrawerContext.tsx` — one open record and the originating wall refresh handle.
- `shell/drawer/AdminStationDrawer.tsx` — the single shell and close path.
- `stations/packageFamily/PackageFamilyDrawerContent.tsx` — string `group_id` host adapter; resolves current/archive/trash projections and mounts the neutral composition. `PackageFamilyCreateDrawerHost.tsx` wires the creation endpoint command into the neutral create form.
- `stations/serviceCategory/CategoryDrawerHost.tsx` — numeric Category id adapter plus assigned-Service projection.
- `stations/serviceSurface/ServiceDrawerHost.tsx` — numeric Service id adapter.
- `stations/tierSurface/TierDrawerHost.tsx` — stable string `occupant_id` adapter; rejects foreign id shapes rather than coercing them.
- `stations/packageTierWorkspace/RateSheetRowDrawerHost.tsx` — string Rate Sheet row `item_id` adapter; resolves exactly one sheet row plus relationship/group provenance, platform status, and the Tiers currently selecting the row, and passes `usePackageStation.updateRateSheetRow` into the neutral composition. `RateSheetSetupDrawerHost.tsx` supplies its own fresh sheet summary and the live eligible relationship rows alongside `initialiseRateSheet`; `RateSheetGroupCreateDrawerHost.tsx` wires `createRateSheetGroup`. Creation surfaces ignore the dispatched recordId.

## Shared mature compositions

The shell adapters mount these host-neutral implementations from `resources/ts/entity-drawers/`:

- `package-family/PackageFamilyDrawerContent.tsx` (and `PackageFamilyCreateContent.tsx`)
- `category/CategoryDrawerContent.tsx`
- `service/ServiceDrawerContent.tsx`
- `tier/TierDrawerContent.tsx`
- `rate-sheet-row/RateSheetRowDrawerContent.tsx` — a real `EntityDrawer` composition over the `RATE_SHEET_ROW_ENTITY` manifest (`schema/entities/rateSheetRow.ts` + `schema/bindings/rateSheetRow.tsx`): Overview places Row Overview + Commercial Terms read modules, Connections places Source & Provenance + Connection Status; only Commercial Terms edits (`editors/RateSheetRowEditor.tsx` — unit price / per / quantity / group), dirty-guarded close, saved state without auto-close.
- `rate-sheet/RateSheetSetupContent.tsx` — the stage-driven singleton setup (pure `rateSheetSetupModel.ts`): form previews the eligible rows the manager commit materialises, success is an explicit in-drawer state, and a configured sheet yields a passive already-configured state so a stale wall button can never restart setup. `rate-sheet/RateSheetGroupCreateContent.tsx` — the sheet-group creation form.

All use `drawer-kit/EntityDrawer.tsx`, schema placements, `ModuleStatusPill`, `ModuleNotificationPanel`, `InlineEditorShell`, module `ActionFooter`, and the shared record-level `EntityActionFooter`/`CanonicalEntityFooter`. `EntityDrawer.editing` replaces only the active module with its editor; sibling modules remain readable. Command Centre mounts the same compositions through thin `StepContext → EntityDrawerHostBridge` adapters.

Category mutations stay in `useCategoryStation`; Package Family mutations stay in `usePackageFamilyStation`; Service and Tier retain `useServiceStation` / `usePackageStation`. Presentation components call no endpoints.

## Identity and refresh invariants

- Package Family: native string `group_id`.
- Category and Service: native numeric ids.
- Tier: stable string `occupant_id`, never the reassignable slot.
- Rate Sheet row: the row's own string `item_id` — never a Tier `occupant_id`, slot id, or relationship `source_item_id`; guarded by [rate-sheet-row-drawer-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/rate-sheet-row-drawer-contract.ts).
- No adapter parses, stringifies, or numerically coerces an id.
- Compositions advance local records from mutation responses; `onSaved` refreshes only the wall that opened the drawer, avoiding body flashes.

## Styling

Both pages enqueue `dist/css/drawer-kit.css`. Shared component rules live in `resources/css/modules/drawer-kit.css`; `.cz-admin-station`-scoped host adaptations apply the newer shell/module/editor treatment without changing Command Centre. Admin-only overlay chrome remains in `admin-station/styles/admin-station.css`.

Browser runtime remains unverified where no WordPress runtime is available.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, `npm run contract:rate-sheet-row-drawer`, and `npm run docs:check`.

## Related Code Maps

[Entity Drawer Recovery](entity-drawer-recovery.md), [Cards](admin-station-cards.md), [Categories](categories.md), [Package Manager](package-manager.md), [Styles](admin-station-styles.md).
