# Package Home Settings

**Tier Group / Tier System remains outside the locked promotion.** Tier
occupant and Add-on conformance does not change this Settings lifecycle.

## Purpose and ownership

Settings is the Package Home Tier workspace's read-and-launch lane: it opens owning drawers and creation flows, owning no draft, endpoint, or save. Its scope is the focused Package, not one Tier slot; it shares connected-record rows and identity with Connections.

Settings makes no relationship: it never assigns a Tier system to a Family, suggests a consumer, grants access at creation, or binds a Rate Sheet to a slot. Family assignment stays in `package-family`; slot binding in the `tier` occupant overview; Rate Sheet availability in the registered `tier` drawer's Tier-instance module.

It keeps no fixed-slot listing either — the engine above lists every slot, reports an empty one honestly, and dispatches the same routes.

## Navigation structure

```text
Settings
├── Family Groups (accordion section, open by default)
│   ├── toolbar: [Focused|All|Active|Pending|Disabled] [+ Family Group] → `package-family` ('new')
│   └── Connected → (no heading text) → `package-family`
├── Tier Groups (accordion section, collapsed by default)
│   ├── toolbar: [Focused|All|Active|Pending|Disabled] [+ Tier Group] → `tier` (`tier-register:`)
│   └── (no heading text) → parent Tier Group pool list → Tier instance drawer
└── Rate Sheets (accordion section, collapsed by default)
    ├── toolbar: [Focused|All|Active|Pending|Disabled] [+ Rate Sheet]
    └── standalone Rate Sheet rows → `rate-sheet` using the loaded native key behind the visible `CZPRC`
```

One ordered accordion section per Package-owned record type, not Connections' Stations/Tools axis. Exactly three pool creations. Groups is not a fourth section: each group is edited and summarised inside its owning Rate Sheet. Tier Structure has no entry: fixed slots are the engine's listing. All three toolbars share one control system, a status filter plus the pool launcher; Rate Sheets carries no search field or Tier Group dropdown.

All three default to `All` — the complete pool, focused record(s) first, existing stable order after. `Focused` narrows to the connected/parent record for Family/Tier Groups, or to the sheets the focused parent Tier Group's `allowed_rate_sheet_ids` allows — the same projection `TierSystemContent.tsx`'s Rate Sheet Access module authors. `Active`/`Disabled` filter by lifecycle state, mapping stored `archived` to Disabled without changing storage. `Pending` reads a Tier Group's `draft`; a Rate Sheet has none persisted, so it reports empty.

## Current implementation

Frontend root: `wp-content/plugins/compuzign-platform/resources/ts/package-station/`

- [TierSystemSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx) declares the three record-type groups and their sections, rendered through [TierAccordionSection.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierAccordionSection.tsx) — Connections' collapsible primitive, owning `aria-expanded`/`aria-controls` and the panel's stable id. `TierLowerDeck` keys Settings by Family, instance, slot, and occupant, so selection resets with context.
- [FocusedTierSettings.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/FocusedTierSettings.tsx) renders Family, Tier Group, and standalone Rate Sheet pools through the shared connected-record row. Slot rows remain in the engine.
- [TierConnectionRow.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierConnectionRow.tsx) is the one row every list renders — Family Group, Tier Group, Group, Rate Sheet — each branching into its own columns over one shared identity/status-pill/`StationSplitAction` grammar, from `projectFamilyConnectionRows` and `projectTierGroupConnectionRows` in [connectionNavigation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/packageTierWorkspace/connectionNavigation.ts). A Family row travels the deck's connection dispatcher into `package-family`; a Tier Group row's `tier-instance` target resolves through the whole-instance route, never an occupant or slot.
- [tierRateSheetAccessModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierRateSheetAccessModel.ts) is the pure read/edit/save projection. Access is explicit: `[]` means none configured yet, never every active sheet. Every active sheet stays an offered candidate regardless of how many are allowed; archived/unresolved stored IDs stay visible and removable. (Corrected 2026-08-15.)
- `tier-instance:{tier_instance_id}` is the strict whole-instance route in [tierDrawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/tierDrawerTypes.ts), resolved by [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx) before occupant fallback.
- [TierSystemContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierSystemContent.tsx) implements the module → Edit → `InlineEditorShell` cycle for Rate Sheet Access, persisted by `useTierInstances.updateInstance` via footer Apply. See [Tier System Registration](tier-registration.md).
- Pool launchers dispatch only a `PoolSubject`. `+ Rate Sheet` opens the existing `rate-sheet` drawer at `'new'` in its one-sheet editor. A stored row already carries both identities; dispatch uses its native editor key, no second request. `rate-sheet` declares size per mode — normal View, extra-wide Edit; see [Admin Station Drawer](admin-station-drawer.md).

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
