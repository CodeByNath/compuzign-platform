# Drawer and Station System

## Purpose and ownership

Supplies reusable drawer navigation, schema-driven modules, status/notification presentation, inline editors, module actions, record lifecycle footers, and host bridges. Generic infrastructure owns no entity persistence.

Command Centre `ActionShell` and Admin Station `AdminStationDrawer` are separate hosts. Package Family, Category, Service, and Tier drawer presentation lives in shared host-neutral compositions.

## Shared drawer kit

- [entityDrawerHost.ts](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/entityDrawerHost.ts) — `EntityDrawerHostBridge`: close, footer slot, close guard, mutation notification.
- [EntityDrawer.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/EntityDrawer.tsx) — Overview/Connections tabs, schema placements, notification accordion, trailing content, and one optional module edit session. The edited module switches to `InlineEditorShell`; siblings remain readable.
- [DrawerTabs.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/DrawerTabs.tsx) — fixed Overview/Connections vocabulary.
- [InlineEditorShell.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/InlineEditorShell.tsx) — Save/Cancel, dirty cancel confirmation, validation disable, loading/error states.
- [ActionFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/ActionFooter.tsx) — module action descriptors.
- [EntityActionFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/EntityActionFooter.tsx) — the single record-footer renderer; [CanonicalEntityFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/CanonicalEntityFooter.tsx) maps canonical lifecycle states onto it.
- [ModuleStatusPill.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/ui/ModuleStatusPill.tsx) and [ModuleNotificationPanel.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/ui/ModuleNotificationPanel.tsx) — shared drawer/card status and note renderers.
- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/schema/types.ts) and `schema/{elements,shells}` — entity, shell, placement, binding, action, and edit-session contracts.

## Shared entity compositions

`resources/ts/entity-drawers/{package-family,category,service,tier}/` contains each composition, controller, footer/dialog presentation, and types. `entity-drawers/schema/` and `entity-drawers/editors/` contain their neutral manifests/bindings/editors.

Controllers render no JSX. Presentation calls no endpoints. Writes remain in `usePackageFamilyStation`, `useCategoryStation`, `useServiceStation`, and `usePackageStation`.

## Host adapters

- Command Centre: `components/admin/stations/{CategoryViewStep,ServiceViewStep,ServiceTierStep}.tsx` and existing Package Family editing in `components/admin/relations/serviceManagerDrawers.tsx` map `StepContext` onto the bridge.
- Admin Station: adapters under `admin-station/stations/{packageFamily,serviceCategory,serviceSurface,tierSurface}/` resolve native ids and mount the same compositions inside one shell.

## Styling

`resources/css/modules/drawer-kit.css` is one build entry loaded by both pages. Admin Station adaptations are `.cz-admin-station` scoped, so Command Centre presentation remains intact.

## Validation

- [mode-renderer-snapshot.mjs](../../wp-content/plugins/compuzign-platform/scripts/mode-renderer-snapshot.mjs)
- [module-state-snapshot.mjs](../../wp-content/plugins/compuzign-platform/scripts/module-state-snapshot.mjs)

## Related Code Maps

[Admin Station Drawer](admin-station-drawer.md), [Entity Drawer Compositions](entity-drawer-recovery.md), [Lifecycle](lifecycle-system.md).
