# Drawer and Station System

## Responsibility split

The drawer system separates coordination, hosting, rendering, and persistence:

- **Station Manager** owns the open drawer contract, registration/resolution, record identity, and intent coordination.
- **Admin Station** owns the generic drawer shell and presentation/control chrome.
- **Owning Stations** register drawer adapters and own their compositions, validation, lifecycle, and saves.
- **Drawer Kit** supplies entity-neutral schema renderers and interaction primitives; it owns no records.

[drawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/drawerTypes.ts) defines `DrawerMode`, `DrawerSize`, open string keys, and content props. [drawerTemplates.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/registry/drawerTemplates.ts) registers and resolves templates. [AdminStationDrawer.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/shell/drawer/AdminStationDrawer.tsx) hosts the resolved contract, applies its declared `size` as a generic width modifier, and delegates `recordId`, mode, close, footer, close guard, and originating-wall refresh. See [Admin Station Drawer](admin-station-drawer.md) for the size capability.

## Shared Drawer Kit

- [EntityDrawer.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/EntityDrawer.tsx) renders Overview/Connections placement, notifications, trailing content, and one module edit session.
- [entityDrawerHost.ts](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/entityDrawerHost.ts) defines the host-neutral close/footer/guard/mutation bridge.
- [InlineEditorShell.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/InlineEditorShell.tsx) owns Save/Cancel, dirty-cancel confirmation, validation, loading, and error chrome.
- [EntityActionFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/EntityActionFooter.tsx) and [CanonicalEntityFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/CanonicalEntityFooter.tsx) provide record-footer grammar and canonical lifecycle mapping.
- [schema/types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/schema/types.ts) and `schema/{elements,shells}` define neutral entity, binding, placement, action, and edit-session contracts.

## Module entry contract

Platform-wide, for every drawer that presents modules. A drawer opens on its **Overview screen**, never in an editor:

```text
drawer opens readable
  → the module renders, even with nothing in it
  → it carries its own pill from the 5-state vocabulary (empty ⇒ Pending)
  → the pill opens that module's notification panel, which states what is missing
  → the module offers Edit
  → only Edit opens the module's inline editor
```

Consequences that are not optional:

- **No explanation block above the modules.** An empty module plus its pill is the guidance; prose above it duplicates the pill and drifts from it.
- **No entry-state editor** — not for an empty record, nor one that does not exist yet. A creation drawer opens readable too, so creation intents register `mode: 'view'`.
- **Status stays in the pill vocabulary.** `settled` / `not-configured` are module *transition* values; reaching Pending through the unknown-status fallback in [presentation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/schema/presentation.ts) is missing the contract, not following it.
- **Disabled is a user action, never a derivation.** A module reads Disabled only from the explicit per-record signal the footer's enable/disable control writes (`tier.enabled`, `PackageManagerItem.disabled`). Never from a record that was simply never activated: a Package Family has no `draft` state, so never-activated and switched-off both store `disabled`, and the module reads **Pending** while the footer keeps the action. Reference: `resolveOverviewStatus`, which never returns Disabled.
- **Editor and Edit action come as a pair** — an editor with no Edit can only be entered on arrival.
- **One footer at a time.** While `InlineEditorShell` owns Save/Cancel the drawer withdraws its own.
- **Cancel returns to the readable module**; leaving is the footer's Close.
- **A create surface renders the record's own module**, never a second copy of its fields.

Enforced by `npm run contract:drawer-module-entry`, which executes each rule and reads the compositions for the wiring they need, and by `node scripts/module-state-snapshot.mjs`, which pins every exported rule's `{ status, notes }`. Surfaces under it: empty Tier slots ([Tiers](tiers.md)), Tier registration ([Tier System Registration](tier-registration.md)), Family creation, and the Rate Sheet pool ([Rate Sheet](rate-sheet.md)).

Two rules still derive Disabled and are **recorded divergences, not precedent**: the Category modules (a deliberate S6 blueprint decision — "the category is deliberately off, not awaiting first publish") and `tierInclusionConnectionModule`, where an absent relationship reads Disabled with no action offered. Do not copy either into a new module.

## Domain compositions and adapters

- `package-station/drawer/{package-family,tier}/` and `drawer/{schema,editors}/` are Package-owned. Their registered adapters are [PackageFamilyDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageFamily/PackageFamilyDrawerContent.tsx) and [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx).
- `service-station/drawer/` is Service-owned; [ServiceDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/ServiceDrawerHost.tsx) is its registered adapter.
- `entity-drawers/category/` and `entity-drawers/schema/` remain Category residue hosted through Admin Station's [CategoryDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/serviceCategory/CategoryDrawerHost.tsx).
- [drawerChrome.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/shared/drawerChrome.ts) remains genuinely shared close/lifecycle/dialog coordination.

Controllers render no JSX; presentation calls no endpoints. Native identities pass through Station Manager unchanged: Package Family and Tier IDs are strings, Category and Service IDs are numeric.

## Validation

Run `node scripts/mode-renderer-snapshot.mjs`, `node scripts/module-state-snapshot.mjs`, `npm run contract:drawer-module-entry`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Station Manager](station-manager.md), [Admin Station Drawer](admin-station-drawer.md), [Entity Drawer Compositions](entity-drawer-recovery.md), and [Lifecycle](lifecycle-system.md).
