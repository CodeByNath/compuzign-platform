# Package Home Settings

## Purpose and ownership

Settings is the third lane of the Package Home Tier workspace lower deck: a read-and-launch surface. It summarises the whole focus the Family Group leads, opens configuration in the drawer that owns it, and launches the mature drawers' own new-record identities. Package Home owns no draft, validation, endpoint, or save, creation included — the owning drawer's footer holds Create.

Its scope is the focus, not one Tier slot inside it: Connections reads what the focused **Tier** connects to, Settings what the focused **Package** is. Both name the same two categories, Stations and Tools, and render the same rows, so one record reports one identity, status, and target either way.

Settings makes no relationship: it never assigns a Tier system to a Family, suggests a consumer, grants access during creation, binds a Rate Sheet to a slot, or keeps a second Tier inventory. Family assignment stays in the `package-family` capability module; slot binding in the `tier` occupant overview; whole-system Rate Sheet availability in the Tier-instance module of the registered `tier` drawer.

Settings keeps no fixed-slot listing either — the engine above already lists every slot, reports an empty one honestly, and dispatches the same occupant and slot routes.

## Navigation structure

```text
Settings
├── Focused Package (selector)
│   ├── Stations (tab)       → Connected Family Group    → `package-family`
│   └── Tools (tab)          → Rate Sheet Access         → Tier instance drawer
└── Package Manager (selector)
    ├── Stations (tab)       → Create Family             → `package-family` ('new')
    │                        → Create Tier               → `tier` (`tier-instance:new`)
    └── Tools (tab)          → Create Rate Sheet         → `rate-sheet`
```

Each selector holds exactly two sections, Package Manager exactly three creations. Groups has no entry: a group lives inside `rate_sheets[].groups[]`, with no pool or address outside its parent sheet. Tier Structure has no entry: the fixed slots are the engine's listing.

## Current implementation

Frontend root: `wp-content/plugins/compuzign-platform/resources/ts/package-station/`

- [TierSystemSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx) declares the two categories and their Stations/Tools sections. [TierTabSet.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierTabSet.tsx) supplies selector, tab, panel, ARIA, and keyboard behavior. `TierLowerDeck` keys Settings by Family, instance, slot, and occupant, so selection resets with context.
- [FocusedTierSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/FocusedTierSettings.tsx) renders the connected Stations list and the read-only Rate Sheet Access summary. Access offers View only; the connected Family Group offers the View/Edit its own drawer supports. Slot rows live in the engine: [TierNavigation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierNavigation.tsx) lists every slot and [TierDetailPanel.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierDetailPanel.tsx) offers an occupant's View/Edit or an empty slot's Configure.
- [TierConnectionRow.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierConnectionRow.tsx) is the one connected-record row both lanes render, and `projectFamilyConnectionRows` in [connectionNavigation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/connectionNavigation.ts) the one derivation behind both scopes. The row travels the deck's existing connection dispatcher into the `package-family` drawer, adding no target, intent, or drawer key.
- [tierRateSheetAccessModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierRateSheetAccessModel.ts) is the pure read/edit/save projection. `[]` means all active sheets. Limited access must retain one active sheet; archived and unresolved stored IDs remain visible and removable. `needsReview` is shared by Home and the drawer.
- `tier-instance:{tier_instance_id}` is the strict whole-instance route in [tierDrawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/tierDrawerTypes.ts). [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx) resolves it before occupant fallback and mounts `TierInstanceSettingsHost`.
- [TierInstanceSettingsContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierInstanceSettingsContent.tsx), `TIER_INSTANCE_ENTITY`, `tierRateSheetAccessShell`, and `TierRateSheetAccessEditor` implement the readable module → Edit → `InlineEditorShell` cycle. Persistence remains `useTierInstances.updateInstance`; success refreshes Rate Sheets and the originating wall.
- Package Manager launchers dispatch only a `PoolSubject`, mapped to the registered creation intent — `package-family`'s `'new'`, `tier`'s `tier-instance:new` ([Tier System Creation](tier-registration.md)), or `rate-sheet`. No Family, slot, access grant, or candidate crosses that edge; each drawer owns its own new-record state and Create.

## Invariants

- Package Home performs no mutation and renders no settings/creation form.
- Settings presents nothing the engine above it already presents; the fixed-slot listing has exactly one implementation.
- The focused category is package-scoped. A per-Tier connection belongs to Connections, and neither lane re-authors the other's rows.
- No new drawer key, action intent, endpoint, or persistence owner exists for Rate Sheet Access or the connected Family Group.
- Every route carries stored IDs, never labels; malformed and missing identities fail closed.
- Connections and Settings reuse one local tab contract and one connected-record row; their rows are the shared station list system, not a second row grammar.
- Styles use existing `--station-*` tokens; no component theme overrides or retired disclosure/navigation selectors remain.

## Validation

Run `npm run contract:package-tier-workspace`, `npm run contract:drawer-module-entry`, `npm run contract:tier-instance-tool`, `npm run contract:rate-sheet-tool`, `npm run contract:admin-station-css`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Tiers](tiers.md), [Package Station](package-station.md), [Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), and [Drawer System](drawer-system.md).
