# Rate Sheet Row Lock (Edit/Save/Cancel/Remove/Delete)

## Date

2026-08-05

## Scope

This milestone changes only the standalone Rate Sheet drawer's pricing grid (`resources/ts/package-station/presentation/rate-sheet-tool/`) and its controller (`resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts`). It adds no backend endpoint, changes no Platform Identifier ownership or transaction shape, and leaves the focused-Tier connection drawers (`tier-rate-sheet`, `tier-rate-sheet-group`) and every other `InlineEditorShell` consumer (Tier, Package Family, Tier System, …) unchanged.

## Goal

Before this milestone, every Rate Sheet grid row was always live-editable, bound directly to a single shared manager draft; the only persistence boundary was the drawer's footer Save, which committed every pending change (title, status, groups, and every row) in one request and switched the drawer to View. The goal was to lock existing rows by default, let exactly one row be unlocked at a time (Edit → Save/Cancel/Delete), let a newly added row start unlocked (Save/Cancel only, no Delete before its first save), and make row Save/Remove/Delete persist immediately — without creating a row-scoped endpoint, without changing Platform Identifier ownership, and without leaving two buttons both labelled "Save" with different meanings visible at once.

## What Changed

`useRateSheetTool.ts` gained Rate-Sheet-only row-lock state — `editingRowId` and `editingRowSnapshot` — and four controller methods: `beginRowEdit` (unlocks one row, captures its snapshot, refuses a second concurrent row), `cancelRowEdit` (reverts an existing row's snapshot locally, or discards a not-yet-saved row entirely; no API call either way), `saveActiveRow`, and `removeRowImmediately`. The latter two both call the SAME `persist()` the footer always used, sending the complete current manager payload (sources, groups, item_decisions, every touched sheet's rows) through `savePackageStationManager`; `persist()` now returns a `Promise<boolean>` so callers can tell success from failure without re-deriving it from state. A row locks (or, for Remove/Delete, disappears) only once that promise resolves `true` and the returned model has already become the new baseline via `applyReadModel`; on failure the row stays unlocked with its live draft and `saveError` intact, exactly where the failure left it. `addRow` now also begins that new row's edit session atomically (its key is deterministic — `new:${optionId}` — so this needs no post-add lookup), and `discard()` now also clears the row-lock state so a whole-drawer Cancel cannot leave it dangling.

`rateSheetParts.tsx` added an optional `lockCommands` prop to `RateSheetGridEditor`/`RateSheetEditRow`. Omitted, a row renders exactly as it always has — this is what keeps `TierRateSheetDrawer.tsx` byte-for-byte unchanged, since it never passes the prop. Supplied (only by the standalone Rate Sheet drawer), a row renders locked (read-only cells, Edit + Remove) or active (live cells, Save + Cancel + Delete — Delete omitted while the row's `id` is still blank, i.e. not yet saved). The five field cells and the five read-only cells were each extracted once (`RateSheetRowFieldCells`, `RateSheetRowReadCells`) so the locked and always-editable paths share one implementation.

`RateSheetTool.tsx` wires `lockCommands={controller}` into the sheet editor, disables Add Row (and its candidate buttons) while `controller.editingRowId !== null`, and extends the footer's `saveDisabled` with the same condition — so the sheet-level footer Save (still the only way to persist title/status/group/Service-import edits) is never visibly offered alongside an active row's own Save.

## Final Architecture

Row Save/Remove/Delete persist through the identical full-manager transaction the footer always used — there is exactly one save meaning, exercised from two UI locations that are never both offered at once. The row lock is presentation/controller state local to `useRateSheetTool`, not a new reducer, endpoint, or shared-framework concept; `InlineEditorShell` itself carries no row-lock awareness. Platform Identifier handling is untouched: a new row's blank `item_id` is still minted by `PackageManagerSchema::commitConfiguration` on the same save call; removal still tombstones through the same manager-save boundary proven by `tests/rate-sheet-platform-identity-reconciliation.php`.

## Decisions and Invariants

Row Save means "apply this row's edits, then persist the whole current draft immediately" (Model B from the audit), not a two-step local-Apply-then-later-footer-Save — chosen because the Platform Identifier reservation/reconciliation pass is a whole-manager transaction, and deferring it multiplies exposure to the exact dangling-identifier class of bug fixed in `1ab503b`/`16b2f7a`. Only one row may be unlocked at a time, enforced in the controller (not just via disabled buttons) so a bypassed UI cannot start a second concurrent save. A not-yet-saved row never shows Delete; Cancel is its only discard path. `TierRateSheetDrawer.tsx` and every other `InlineEditorShell` consumer must never gain row-lock behavior implicitly — the `lockCommands` prop and the `saveDisabled` extension are both opt-in, per-call-site decisions.

## Validation

`npx tsc --noEmit` and `npm run build` (plugin root) pass. `npm run contract:rate-sheet-tool` (extended with two new checks: the Tier-scoped file never references `lockCommands`; `InlineEditorShell.tsx` carries no row-lock awareness) and `npm run contract:rate-sheet-row-platform-identity` pass. `php tests/rate-sheet-platform-identity-reconciliation.php` passes unchanged. `npm run contract:tier-connections` passes. A new mounted regression, `npm run regression:rate-sheet-row-lock` (esbuild + happy-dom + Preact render of the real `RateSheetDrawerContent`, following the same technique as `scripts/tier-occupant-lifecycle-regression.mjs`), proves all 15 required scenarios end to end against a fetch-mocked Package Manager: locked-by-default, one-row lock (Edit/Remove/Add Row all disabled on other rows), exactly-once save on success and on failure, lock-only-after-verified-success, failed-save draft/error retention, snapshot-scoped Cancel, new-row Cancel/Save/identity-adoption, and confirm-then-persist Remove/Delete. `npm run docs:check` passes.

## Deferred Work

The focused-Tier connection drawers were deliberately left on the always-editable grid; row-locking there, if ever wanted, is a separate decision scoped to that drawer's own connection-editing UX. Sheet-level fields (title, status, groups, Service import) still depend on the footer Save and were out of scope for this milestone.

## Related History

None — this is the first Project History record for the Rate Sheet row editor.
