# Entity Drawer Compositions

The mature Package Family, Category, Service, and Tier drawers are host-neutral compositions shared by Command Centre and Admin Station.

Roots:

- `wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/` — generic renderer and interaction kit.
- `wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/` — entity compositions, controllers, manifests, bindings, and editors.

## Layers

```text
Command Centre ActionShell adapter       Admin Station shell adapter
                 ↘                        ↙
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

- `entity-drawers/category/` — Category Overview, assigned-Service Connections, group membership, draft/publish/enable/archive/trash/restore/delete, dialogs and close guard. `components/admin/stations/CategoryViewStep.tsx` is now a thin adapter.
- `entity-drawers/package-family/` — Family Overview, Services/Rate Sheet/Tier dependency Connections, draft/revert/settle/publish and full lifecycle. `hooks/usePackageFamilyStation.ts` is the authoritative client write boundary. Existing Command Centre editing mounts this composition; creation remains its own first-level create form.
- `entity-drawers/service/` — Overview, Included Features, FAQs, pricing Connections, lifecycle, guarded pending/new-draft exits.
- `entity-drawers/tier/` — tier cards, Overview/Features/FAQs, service Connections, occupant bin, restore conflicts, swap/retarget, publish and enable/disable.
- `entity-drawers/schema/` — shared manifests/bindings. The Command Centre Category manifest extends the neutral drawer manifest with table/travel placements rather than duplicating drawer schema.

## Bundle and style boundary

Admin Station imports no `components/admin` module and no `StepContext`. Both JS entries import the same neutral modules, emitted as shared Rollup chunks. Both pages enqueue `resources/css/modules/drawer-kit.css`; Admin Station adaptations are root-scoped, preserving Command Centre styling.

## Identity

Package Family keeps `group_id` (string), Category/Service keep numeric ids, and Tier keeps `occupant_id` (string). Host adapters reject mismatched shapes; no identity conversion is permitted.

## Related Code Maps

[Admin Station Drawer](admin-station-drawer.md), [Drawer System](drawer-system.md), [Categories](categories.md), [Package Manager](package-manager.md), [Tiers](tiers.md).
