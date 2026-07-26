# Drawer and Station System

## Responsibility split

The drawer system separates coordination, hosting, rendering, and persistence:

- **Station Manager** owns the open drawer contract, registration/resolution, record identity, and intent coordination.
- **Admin Station** owns the generic drawer shell and presentation/control chrome.
- **Owning Stations** register drawer adapters and own their compositions, validation, lifecycle, and saves.
- **Drawer Kit** supplies entity-neutral schema renderers and interaction primitives; it owns no records.

[drawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/drawerTypes.ts) defines `DrawerMode`, `DrawerSize`, open string keys, and content props. [drawerTemplates.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/registry/drawerTemplates.ts) registers and resolves templates. [AdminStationDrawer.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/shell/drawer/AdminStationDrawer.tsx) hosts the resolved contract, applies its declared `size` as a generic width modifier, and delegates `recordId`, mode, close, footer, close guard, and originating-wall refresh. See [Admin Station Drawer](admin-station-drawer.md) for the size capability.

## Shared Drawer Kit

- [EntityDrawer.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/EntityDrawer.tsx) renders placements, notifications, trailing content, and one edit session.
- [entityDrawerHost.ts](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/entityDrawerHost.ts) defines the host-neutral close/footer/guard/mutation bridge.
- [InlineEditorShell.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/InlineEditorShell.tsx) owns Save/Cancel, dirty confirmation, validation, loading, and errors.
- [EntityActionFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/EntityActionFooter.tsx) and [CanonicalEntityFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/CanonicalEntityFooter.tsx) provide footer grammar and lifecycle mapping.
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

Required consequences:

- **No explanation block above modules.** The empty module and pill are the guidance.
- **No entry-state editor**, including empty or not-yet-created records.
- **Status stays in the pill vocabulary.** `settled` / `not-configured` are transitions, not statuses.
- **Disabled is a user action, never a parent-lifecycle derivation.** It requires the explicit per-record signal written by the owning control.
- **Editor and Edit action come as a pair.**
- **One footer at a time.** While `InlineEditorShell` owns Save/Cancel the drawer withdraws its own.
- **Cancel returns to the readable module**; Close leaves.
- **Create surfaces render the record's own module**, never copied fields.

Enforced by `npm run contract:drawer-module-entry`, which executes each rule and reads the compositions for the wiring they need, and by `node scripts/module-state-snapshot.mjs`, which pins every exported rule's `{ status, notes }`. Surfaces under it: empty Tier slots ([Tiers](tiers.md)), whole-instance Tier Rate Sheet access ([Package Home Settings](package-settings.md)), Tier registration ([Tier System Registration](tier-registration.md)), Family creation, and the Rate Sheet pool ([Rate Sheet](rate-sheet.md)).

Recorded divergences are not precedent: Category modules and an absent `tierInclusionConnectionModule` relationship may derive Disabled.

## Domain compositions and adapters

- `package-station/drawer/{package-family,tier}/` and `drawer/{schema,editors}/` are Package-owned. Their registered adapters are [PackageFamilyDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageFamily/PackageFamilyDrawerContent.tsx) and [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx). The Tier host strictly distinguishes whole-instance `tier-instance:{instance}`, occupant `tier-instance:{instance}:{occupant}`, and empty-slot `tier-slot:{instance}:{slot}` routes; all reuse the registered `tier` key.
- `service-station/drawer/` is Service-owned; [ServiceDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/ServiceDrawerHost.tsx) is its registered adapter.
- `entity-drawers/category/` and `entity-drawers/schema/` remain Category residue hosted through Admin Station's [CategoryDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/serviceCategory/CategoryDrawerHost.tsx).
- [drawerChrome.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/shared/drawerChrome.ts) remains genuinely shared close/lifecycle/dialog coordination.

Controllers render no JSX; presentation calls no endpoints. Native identities pass through Station Manager unchanged.

## Validation

Run `node scripts/mode-renderer-snapshot.mjs`, `node scripts/module-state-snapshot.mjs`, `npm run contract:drawer-module-entry`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Station Manager](station-manager.md), [Admin Station Drawer](admin-station-drawer.md), [Entity Drawer Compositions](entity-drawer-recovery.md), and [Lifecycle](lifecycle-system.md).
