# Package Home Settings

**Tier Group / Tier System remains outside the locked promotion.** Tier
occupant and Tier Add-on conformance does not change this aggregate Settings
lifecycle.

## Purpose and ownership

Settings is the Package Home Tier workspace's read-and-launch lane. It opens owning drawers and registered creation flows; it owns no draft, endpoint, or save.

Its scope is the focused Package, not one Tier slot. Connections and Settings share connected-record rows and record identity.

Settings makes no relationship: it never assigns a Tier system to a Family, suggests a consumer, grants access during creation, binds a Rate Sheet to a slot, or keeps a second Tier inventory. Family assignment stays in `package-family`; slot binding in the `tier` occupant overview; whole-system Rate Sheet availability in the Tier-instance module of the registered `tier` drawer.

Settings keeps no fixed-slot listing either — the engine above already lists every slot, reports an empty one honestly, and dispatches the same occupant and slot routes.

## Navigation structure

```text
Settings
├── Family Groups (accordion section, open by default)
│   ├── Connected → Connected Family Group → `package-family`
│   └── Pool      → Create Family          → `package-family` ('new')
├── Tier Groups (accordion section, collapsed by default)
│   ├── Connected → Rate Sheet Access      → Tier instance drawer
│   └── Pool      → Create Tier            → `tier` (`tier-register:`)
├── Groups (accordion section, collapsed by default)
│   └── Pool      → read-only group count, no creation
└── Rate Sheets (accordion section, collapsed by default)
    └── Pool      → Create Rate Sheet      → `rate-sheet`
```

One ordered accordion section per Package-owned record type, not the Stations/Tools axis Connections uses. An open section shows every sub-section at once — no inner tab selects only one. Exactly three pool creations total. Groups has no Pool creation or Connected section: a group lives inside `rate_sheets[].groups[]`, with no pool or address outside its parent sheet. Tier Structure has no entry: the fixed slots are the engine's listing.

## Current implementation

Frontend root: `wp-content/plugins/compuzign-platform/resources/ts/package-station/`

- [TierSystemSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx) declares the four record-type groups and their Connected/Pool sections, rendered through [TierAccordionSection.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierAccordionSection.tsx) — the same collapsible-section primitive Connections uses, owning the header button's `aria-expanded`/`aria-controls` and the panel's stable id. `TierLowerDeck` keys Settings by Family, instance, slot, and occupant, so selection resets with context.
- [FocusedTierSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/FocusedTierSettings.tsx) renders the connected Family Group row and the read-only Rate Sheet Access summary (View only; the Family Group offers its own drawer's View/Edit). Slot rows live in the engine: [TierNavigation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierNavigation.tsx) lists every slot and [TierDetailPanel.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierDetailPanel.tsx) offers View/Edit or Configure for an empty slot.
- [TierConnectionRow.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierConnectionRow.tsx) is the one connected-record row both lanes render, and `projectFamilyConnectionRows` in [connectionNavigation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/connectionNavigation.ts) the one derivation behind both scopes. The row travels the deck's existing connection dispatcher into `package-family`, adding no target, intent, or drawer key.
- [tierRateSheetAccessModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierRateSheetAccessModel.ts) is the pure read/edit/save projection. `[]` means all active sheets; limited access must retain one active sheet, and archived/unresolved stored IDs stay visible and removable. `needsReview` is shared by Home and the drawer.
- `tier-instance:{tier_instance_id}` is the strict whole-instance route in [tierDrawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/tierDrawerTypes.ts), resolved by [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx) before occupant fallback into `TierInstanceSettingsHost`.
- [TierSystemContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierSystemContent.tsx), `TIER_SYSTEM_ENTITY`, `tierRateSheetAccessShell`, and `TierRateSheetAccessEditor` implement the readable module → Edit → `InlineEditorShell` cycle for Rate Sheet Access, beside the entity's Overview module. Persistence is `useTierInstances.updateInstance` via footer Apply. See [Tier System Registration](tier-registration.md).
- Pool launchers (Create Family, Create Tier, Create Rate Sheet) dispatch only a `PoolSubject`, mapped to the registered creation intent — `package-family`'s `'new'`, Tier registration's `tier-register:` address ([Tier System Registration](tier-registration.md)), or `rate-sheet`. No Family, slot, access grant, or candidate crosses that edge. Groups carries only the pool's group count, from the same `rateSheets` prop already loaded — no second read.

## Invariants

- Package Home performs no mutation and renders no settings/creation form.
- Settings presents nothing the engine above it already presents; the fixed-slot listing has exactly one implementation.
- Each group is package-scoped, not per-Tier. A per-Tier connection belongs to Connections, and neither lane re-authors the other's rows.
- No new drawer key, action intent, endpoint, or persistence owner exists for Rate Sheet Access or the connected Family Group.
- Every route carries stored IDs, never labels; malformed and missing identities fail closed.
- Connections and Settings reuse one accordion section contract and one connected-record row, the shared station list system, not a second row grammar.
- Styles use existing `--station-*` tokens; no retired disclosure/navigation/selector-card CSS remains.

## Validation

Run `npm run contract:package-tier-workspace`, `npm run contract:drawer-module-entry`, `npm run contract:tier-instance-tool`, `npm run contract:rate-sheet-tool`, `npm run contract:admin-station-css`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Tiers](tiers.md), [Package Station](package-station.md), [Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), and [Drawer System](drawer-system.md).
