# Package Home Settings

**Tier Group / Tier System remains outside the locked promotion.** Tier
occupant and Add-on conformance does not change this Settings lifecycle.

## Purpose and ownership

Settings is the Package Home Tier workspace's read-and-launch lane: it opens owning drawers and creation flows, owning no draft, endpoint, or save. Its scope is the focused Package, not one Tier slot; it shares connected-record rows and record identity with Connections.

Settings makes no relationship: it never assigns a Tier system to a Family, suggests a consumer, grants access during creation, or binds a Rate Sheet to a slot. Family assignment stays in `package-family`; slot binding in the `tier` occupant overview; Rate Sheet availability in the registered `tier` drawer's Tier-instance module.

It keeps no fixed-slot listing either — the engine above lists every slot, reports an empty one honestly, and dispatches the same routes.

## Navigation structure

```text
Settings
├── Family Groups (accordion section, open by default)
│   ├── toolbar: [Focused|All|Active|Pending|Disabled] [+ New Family] → `package-family` ('new')
│   └── Connected → (no heading text) → `package-family`
├── Tier Groups (accordion section, collapsed by default)
│   ├── toolbar: [Focused|All|Active|Pending|Disabled] [+ New Tier Group] → `tier` (`tier-register:`)
│   └── (no heading text) → parent Tier Group pool list → Tier instance drawer
└── Rate Sheets (accordion section, collapsed by default)
    ├── toolbar: [Focused|All|Active|Pending|Disabled] [+ New Rate Sheet] → `rate-sheet`
    └── (no heading text) → read-only Rate Sheet Group count, no creation
```

One ordered accordion section per Package-owned record type, not Connections' Stations/Tools axis. An open section shows every sub-section at once — no inner tab selects one. Exactly three pool creations. Groups is not a fourth section: a group lives inside `rate_sheets[].groups[]`, with no pool or address outside its sheet, so its read-only count reports inside Rate Sheets. Tier Structure has no entry: fixed slots are the engine's listing. Every sub-section and note carries no heading text (`SettingsSection.hideHeading`). Every group carries a top-of-panel toolbar (`SettingsGroup.toolbar`): a status filter plus its pool creation, relabelled `+ New Family` / `+ New Tier Group` / `+ New Rate Sheet`. The retired `PoolLauncher` is gone.

Family Groups and Tier Groups both default to `All` — the complete Package Family / parent Tier Group pool, focused record first, the rest in existing stable order. `Focused` narrows to that one record; `Active`/`Pending`/`Disabled` filter the same pool by the record's own lifecycle state, where a Tier Group's `draft` is its Pending. Rate Sheets' filter stays presentational.

## Current implementation

Frontend root: `wp-content/plugins/compuzign-platform/resources/ts/package-station/`

- [TierSystemSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx) declares the three record-type groups and their sections, rendered through [TierAccordionSection.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierAccordionSection.tsx) — Connections' collapsible primitive, owning `aria-expanded`/`aria-controls` and the panel's stable id. `TierLowerDeck` keys Settings by Family, instance, slot, and occupant, so selection resets with context.
- [FocusedTierSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/FocusedTierSettings.tsx) renders the Family Group list and the parent Tier Group pool list (`TierGroupPoolSummary`, View only; the Family Group offers View/Edit). Its `RateSheetAccessSummary` is retained but unrendered: Tier Groups lists parent records, not one child access policy. Slot rows live in the engine: [TierNavigation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierNavigation.tsx) lists them and [TierDetailPanel.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierDetailPanel.tsx) offers View/Edit or Configure.
- [TierConnectionRow.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierConnectionRow.tsx) is the one row every list renders — Family Group, Tier Group, Group, Rate Sheet — each branching into its own columns over one shared identity/status-pill/`StationSplitAction` grammar, from `projectFamilyConnectionRows` and `projectTierGroupConnectionRows` in [connectionNavigation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/connectionNavigation.ts). A Family row travels the deck's connection dispatcher into `package-family`; a Tier Group row's `tier-instance` target resolves through the whole-instance route, never an occupant or slot.
- [tierRateSheetAccessModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierRateSheetAccessModel.ts) is the pure read/edit/save projection. `[]` means all active sheets; limited access retains one active sheet, and archived/unresolved IDs stay visible and removable.
- `tier-instance:{tier_instance_id}` is the strict whole-instance route in [tierDrawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/tierDrawerTypes.ts), resolved by [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx) before occupant fallback.
- [TierSystemContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierSystemContent.tsx) implements the module → Edit → `InlineEditorShell` cycle for Rate Sheet Access, persisted by `useTierInstances.updateInstance` via footer Apply. See [Tier System Registration](tier-registration.md).
- Pool launchers dispatch only a `PoolSubject` — `package-family`'s `'new'`, `tier-register:`, or `rate-sheet`. No Family, slot, access grant, or candidate crosses that edge.

## Invariants

- Package Home performs no mutation and renders no settings/creation form.
- Settings presents nothing the engine already presents; the fixed-slot listing has one implementation.
- Each group is package-scoped, not per-Tier. Neither lane re-authors the other's rows.
- No new drawer key, action intent, endpoint, or persistence owner exists for these lists.
- Every route carries stored IDs, never labels; malformed identities fail closed.
- Both lanes reuse one accordion contract and one connected-record row, not a second grammar.
- Styles use existing `--station-*` tokens; no retired selector-card CSS remains.

## Validation

From the plugin root: `npm run contract:tier-settings`, `npm run contract:package-tier-workspace-shell`, `npm run contract:drawer-module-entry`, `npm run contract:tier-instance-tool`, `npm run contract:rate-sheet-tool`, `npm run contract:admin-station-css`, `npx tsc --noEmit`, `npm run build`, `npm run docs:check`.

## Related Code Maps

[Tiers](tiers.md), [Package Station](package-station.md), [Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), and [Drawer System](drawer-system.md).
