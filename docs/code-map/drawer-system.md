# Drawer and Workstation System

## Purpose

Supplies reusable admin navigation, action drawers, schema-driven entity modules, editor shells, and workstation dispatch.

## Ownership

`AdminApp` owns the active workstation and top-level action. `ActionShell` owns drawer navigation, footer, panel mode, and exit guards. Entity schemas own placements and presentation bindings; feature steps own data and mutations. Generic drawer infrastructure must not acquire subsystem-specific persistence.

## Main Entry Points

- [AdminApp.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/AdminApp.tsx) owns active workstation, global action config, refresh keys, and login gate. Use it for top-level admin navigation/state. `AdminShell` routes sidebar workstation switches through an optional surface-registered navigation interceptor (`WorkstationSurfaceProps.setNavigationInterceptor`) so a page with unsaved state can guard navigation with its own confirmation.
- [AdminShell.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/AdminShell.tsx) composes sidebar, topbar, status strip, workstation content, and action overlay. Use it for admin page layout.
- [WorkstationRouter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/WorkstationRouter.tsx) dispatches registry definitions to generic tables or feature workstations. Use it when changing surface realization, not individual workstation content.
- [ActionShell.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/ActionShell.tsx) owns drawer/modal steps, headers, Back/close, footer slots, panel mode, exit guards, and completion. Use it for shared drawer orchestration and navigation contracts.

## UI and Drawers

- [EntityDrawer.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/EntityDrawer.tsx) renders Details/Connections tabs and schema-placed module shells with notification panels and trailing content. Use it for generic entity drawer assembly.
- [DrawerTabs.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/DrawerTabs.tsx) renders shared drawer tab buttons. Use it for tab vocabulary or interaction.
- [InlineEditorShell.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/InlineEditorShell.tsx) supplies editor overlay, Save/Cancel footer, busy/error states, and content framing. Use it for shared form chrome.
- [Workstation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/shell/Workstation.tsx) composes workstation heading, actions, filters, and body slots. Use it for shared workstation layout.
- [usePageManagerShell.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/usePageManagerShell.tsx) mirrors the `ActionShell` exit-guard/footer contract for a mounted dashboard so drawers can open above it without losing manager drafts.
- [serviceManagerDrawers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceManagerDrawers.tsx) contains the focused Service Catalog drawer steps and config builders. Each action is first-level; manager-owned Save means apply to the mounted page draft.
- [serviceDrawerConfig.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/serviceDrawerConfig.ts) owns Service actions; [packageManagerDrawers.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/packageManagerDrawers.ts) owns Tier and Promotion actions. No builder opens a full manager inside a drawer.

## State and Providers

- [workstations.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/workstations.ts) registers workstation IDs, labels, navigation groups, and surface factories. Use it when adding or routing a workstation.
- [types.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/types.ts) defines entity, shell, element, placement, action, and binding contracts. Use it for schema architecture changes.
- [modeContext.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/modeContext.tsx) provides the current table/details/connections/edit viewpoint. Use it for mode-aware rendering context.
- [modeRenderers.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/elements/modeRenderers.tsx) maps element types to table/card/drawer/edit renderers and fallbacks. Use it for shared field presentation.

## Validation

- [mode-renderer-snapshot.mjs](../../wp-content/plugins/compuzign-platform/scripts/mode-renderer-snapshot.mjs)
- [mode-renderers.v1.json](../../wp-content/plugins/compuzign-platform/scripts/__snapshots__/mode-renderers.v1.json)

## Related Code Maps

[Lifecycle](lifecycle-system.md), [Service Catalogue](service-catalogue.md), and [Service Connections](service-connections.md).
