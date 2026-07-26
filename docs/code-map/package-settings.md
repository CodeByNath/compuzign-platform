# Package Home Settings

## Purpose and ownership

Settings is the third lane of the Package Home Tier workspace lower deck. It is a read-and-launch surface: it summarises the exact Tier system focused above, opens configuration in the drawer that owns it, and launches the existing Package Manager creation drawers. Package Home owns no settings draft, validation, endpoint, or save.

Settings makes no relationship. It never assigns a Tier system to a Family, suggests a consumer, grants access during creation, binds a Rate Sheet to a slot, or keeps a second Tier inventory. Family assignment remains in the `package-family` capability module; slot binding remains in the `tier` occupant overview; whole-system Rate Sheet availability belongs to the Tier-instance module in the registered `tier` drawer.

## Navigation structure

```text
Settings
├── Focused Tier System (selector)
│   ├── Access (tab)          → Rate Sheet Access summary → Tier instance drawer
│   └── Tier Structure (tab)  → Fixed Tier Slots          → Tier occupant/slot drawer
└── Package Manager (selector)
    ├── Families (tab)        → Create Family             → `package-family-create`
    ├── Tiers (tab)           → Create Tier               → `tier-register:`
    └── Rate Sheets (tab)     → Create Rate Sheet         → `rate-sheet`
```

Groups has no entry: a group is stored inside `rate_sheets[].groups[]`, so it has no independent pool or address outside its parent Rate Sheet.

## Current implementation

Frontend root: `wp-content/plugins/compuzign-platform/resources/ts/package-station/`

- [TierSystemSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx) declares the two categories and their valid nested tabs. [TierTabSet.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierTabSet.tsx) supplies selector, tab, panel, ARIA, and keyboard behavior shared with Connections. `TierLowerDeck` keys Settings by Family, instance, slot, and occupant so selection resets with workspace context.
- [FocusedTierSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/FocusedTierSettings.tsx) renders a read-only Rate Sheet Access summary and the five fixed slots in the compact row grammar. Access offers View only. Occupied slots offer View/Edit to their existing occupant route; empty slots offer Configure through the existing slot route.
- [tierRateSheetAccessModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierRateSheetAccessModel.ts) is the pure read/edit/save projection. `[]` means all active sheets. Limited access must retain one active sheet; archived and unresolved stored IDs remain visible and removable. `needsReview` is shared by Home and the drawer.
- `tier-instance:{tier_instance_id}` is the strict whole-instance route in [tierDrawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/tierDrawerTypes.ts). [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx) resolves it before occupant fallback and mounts `TierInstanceSettingsHost`.
- [TierInstanceSettingsContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierInstanceSettingsContent.tsx), `TIER_INSTANCE_ENTITY`, `tierRateSheetAccessShell`, and `TierRateSheetAccessEditor` implement the readable module → Edit → `InlineEditorShell` cycle. Persistence remains `useTierInstances.updateInstance`; success refreshes Rate Sheets and the originating wall.
- Package Manager launchers dispatch only a `PoolSubject`. `PackageTierWorkspace.dispatchPoolIntent` maps it to the existing registered creation intent. No Family, slot, access grant, or candidate crosses that edge.

## Invariants

- Package Home performs no mutation and renders no settings or creation form.
- No new drawer key, action intent, endpoint, or persistence owner exists for Rate Sheet Access.
- Every route carries stored IDs, never labels; malformed and missing identities fail closed.
- Connections and Settings reuse one local tab contract and one compact row grammar.
- Styles use existing `--station-*` tokens; no component theme overrides or retired disclosure/navigation selectors remain.

## Validation

Run `npm run contract:package-tier-workspace`, `npm run contract:drawer-module-entry`, `npm run contract:tier-instance-tool`, `npm run contract:rate-sheet-tool`, `npm run contract:admin-station-css`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Tiers](tiers.md), [Package Station](package-station.md), [Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), and [Drawer System](drawer-system.md).
