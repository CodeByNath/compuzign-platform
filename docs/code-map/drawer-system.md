# Drawer and Station System

## Responsibility split

The drawer system separates coordination, hosting, rendering, and persistence:

- **Station Manager** owns the open drawer contract, registration/resolution, record identity, and intent coordination.
- **Admin Station** owns the generic drawer shell and presentation/control chrome.
- **Owning Stations** register drawer adapters and own their compositions, validation, lifecycle, and saves.
- **Drawer Kit** supplies entity-neutral schema renderers and interaction primitives; it owns no records.

[drawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/drawerTypes.ts) defines `DrawerMode`, open string keys, and content props. [drawerTemplates.ts](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/registry/drawerTemplates.ts) registers and resolves templates. [AdminStationDrawer.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/shell/drawer/AdminStationDrawer.tsx) hosts the resolved contract and delegates `recordId`, mode, close, footer, close guard, and originating-wall refresh.

## Shared Drawer Kit

- [EntityDrawer.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/EntityDrawer.tsx) renders Overview/Connections placement, notifications, trailing content, and one module edit session.
- [entityDrawerHost.ts](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/entityDrawerHost.ts) defines the host-neutral close/footer/guard/mutation bridge.
- [InlineEditorShell.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/InlineEditorShell.tsx) owns Save/Cancel, dirty-cancel confirmation, validation, loading, and error chrome.
- [EntityActionFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/EntityActionFooter.tsx) and [CanonicalEntityFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/CanonicalEntityFooter.tsx) provide record-footer grammar and canonical lifecycle mapping.
- [schema/types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/schema/types.ts) and `schema/{elements,shells}` define neutral entity, binding, placement, action, and edit-session contracts.

## Domain compositions and adapters

- `package-station/drawer/{package-family,tier}/` and `drawer/{schema,editors}/` are Package-owned. Their registered adapters are [PackageFamilyDrawerContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageFamily/PackageFamilyDrawerContent.tsx) and [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx).
- `service-station/drawer/` is Service-owned; [ServiceDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/ServiceDrawerHost.tsx) is its registered adapter.
- `entity-drawers/category/` and `entity-drawers/schema/` remain Category residue hosted through Admin Station's [CategoryDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/serviceCategory/CategoryDrawerHost.tsx).
- [drawerChrome.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/shared/drawerChrome.ts) remains genuinely shared close/lifecycle/dialog coordination.

Controllers render no JSX; presentation calls no endpoints. Native identities pass through Station Manager unchanged: Package Family and Tier IDs are strings, Category and Service IDs are numeric.

## Validation

Run `node scripts/mode-renderer-snapshot.mjs`, `node scripts/module-state-snapshot.mjs`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Station Manager](station-manager.md), [Admin Station Drawer](admin-station-drawer.md), [Entity Drawer Compositions](entity-drawer-recovery.md), and [Lifecycle](lifecycle-system.md).
