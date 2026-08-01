# Focused-Tier Rate Sheet Connections

**Pending migration.** These scoped Package drawers share Rate Sheet storage
but do not yet claim the locked Station/Drawer lifecycle.

## Purpose and ownership

Two registered drawer keys address what ONE focused Tier is connected to inside a Rate Sheet — the whole sheet, or one group in it. They are Package Station's, siblings of the `rate-sheet` drawer rather than a second Rate Sheet editor: the same controller, the same grid and groups presentation, scoped to one Tier.

## Addresses

```text
tier-rate-sheet:{tier_instance_id}:{slotId}:{rate_sheet_id}
tier-rate-sheet-group:{tier_instance_id}:{slotId}:{rate_sheet_id}:{group_id}
```

Both are opened from the focused-Tier Connections lane and require a fully resolved address. The sheet scope shows only the grid filtered to that Tier's connected rows — never the Groups section; the group scope shows the groups block for the addressed group. `InlineEditorShell` owns the single save footer.

## Current implementation

- [tierRateSheetDrawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier-rate-sheet/tierRateSheetDrawerTypes.ts) encodes and decodes both tokens; an undecodable one reports an invalid connection identity rather than guessing a scope.
- [useTierRateSheetDrawer.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/rateSheetTool/useTierRateSheetDrawer.ts) composes `useRateSheetTool` and `usePackageStation`, adding no third reader, editor or endpoint: sheet by stored id, group by stored `group_id`, grid scoped by the slot's selected `item_id`s.
- [TierRateSheetDrawer.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/TierRateSheetDrawer.tsx) is the shared content for both keys, rendering the same [rateSheetParts.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/rate-sheet-tool/rateSheetParts.tsx) the whole-sheet tool uses. `allowRemove` is false here, so a Tier scope never deletes a row the sheet owns.

## Invariants

- Every scope fails closed. A missing sheet, a missing group, or a slot no longer bound to the addressed sheet reports the connection as gone rather than falling back to another sheet.
- A Tier occupant binds to **one** sheet and selects rows by `item_id` + quantity; switching sheets clears selections. Identity is `(rate_sheet_id, item_id)`, never a cross-sheet scan.
- Price authority stays with the Rate Sheet, so an edit made inside a Tier scope applies to every Tier using that row.
- These drawers add no storage, no endpoint and no id minting of their own.

## Validation

Run `npm run contract:rate-sheet-tool`, `npm run contract:package-tier-workspace`, `php tests/tier-pricing-parity.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Rate Sheet](rate-sheet.md), [Tiers](tiers.md), [Package Manager](package-manager.md), and [Drawer System](drawer-system.md).
