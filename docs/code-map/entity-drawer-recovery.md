# Entity Drawer Compositions

The mature Package Family, Category, Service, and Tier drawers are host-neutral compositions mounted by the Admin Station.

Roots:

- `wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/` — generic renderer and interaction kit.
- `wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/` — entity compositions, controllers, manifests, bindings, and editors.

## Layers

```text
                 Admin Station shell adapter
                             ↓
                   EntityDrawerHostBridge
                             ↓
                 entity DrawerContent composition
                             ↓
             authoritative station hook / REST boundary
```

`EntityDrawerHostBridge` carries only `close`, `setFooter`, `setCloseGuard`, and optional `onMutationComplete`. Controllers coordinate state and actions without JSX; presentation calls no endpoints.

## Shared kit

- `EntityDrawer.tsx` — schema placement, Overview/Connections, notification accordion, and per-module `editing` session. Only the named module enters edit mode; siblings remain readable.
- `schema/{types,elements,shells,...}` — entity/shell/action/placement contracts and the two shell archetypes.
- `ui/ModuleStatusPill.tsx` and `ui/ModuleNotificationPanel.tsx` — the single pill/panel renderers, including the Admin Station card visual variant.
- `InlineEditorShell.tsx` — shared Save/Cancel, dirty cancel confirmation, validation disable, loading, and error chrome.
- `ActionFooter.tsx` — module actions.
- `EntityActionFooter.tsx` and `CanonicalEntityFooter.tsx` — one record-level footer grammar and canonical lifecycle mapping.

## Entity compositions

- `entity-drawers/category/` — Category Overview, assigned-Service Connections, group membership, draft/publish/enable/archive/trash/restore/delete, dialogs and close guard.
- `entity-drawers/package-family/` — Family Overview, Services/Rate Sheet/Tier dependency Connections, draft/revert/settle/publish and full lifecycle. `hooks/usePackageFamilyStation.ts` is the authoritative client write boundary. The Admin Station mounts this composition; creation remains its own first-level create form.
- `entity-drawers/service/` — Overview, Included Features, FAQs, pricing Connections, lifecycle, guarded pending/new-draft exits. `useServiceDrawerController` coordinates the focused hooks `useServiceModuleEditing`, `useServiceLifecycle`, and `useServiceExitFlow`; its return contract is the drawer's public shape.
- `entity-drawers/tier/` — tier cards, Overview/Features/FAQs, service Connections, occupant bin, restore conflicts, swap/retarget, publish and enable/disable. `useTierDrawerController` coordinates `useTierModuleEditing`, `useTierBinTravel`, and the pure `tierDetailModel.ts` (home of `slotOccupied`, re-exported by the controller).
- `entity-drawers/shared/` — cross-entity coordination machinery: `drawerChrome.ts` (guarded close, lifecycle runner, auto-dismiss, outside-click dismiss — Service/Category/Package Family; Tier deliberately keeps `window.confirm`), `rateSheetLabels.ts`, `tierOccupants.ts`, `serviceDrawerShared.ts`.
- `entity-drawers/schema/` — shared manifests/bindings for the neutral drawer compositions.

## Bundle and style boundary

The Admin Station is the sole JS entry mounting these compositions and imports no `StepContext`. It enqueues `resources/css/modules/drawer-kit.css`; Admin Station adaptations are root-scoped.

## Identity

Package Family keeps `group_id` (string), Category/Service keep numeric ids, and Tier keeps `occupant_id` (string). Host adapters reject mismatched shapes; no identity conversion is permitted.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, `node scripts/module-state-snapshot.mjs`, and `npm run docs:check`.

## Related Code Maps

[Admin Station Drawer](admin-station-drawer.md), [Drawer System](drawer-system.md), [Categories](categories.md), [Package Manager](package-manager.md), [Tiers](tiers.md).
