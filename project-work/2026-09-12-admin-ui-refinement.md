# Admin UI Refinement

## Status
- **SOURCE PUSH NOT APPROVED**
- Builder: **Codex**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `9617c0edf4fc50d5971bf47e6ae0431aacd4153c`
- Topic branch: `admin-ui-refinement` @ local `35d48d4b931b7901374a182e12c6a3012a8281fd` (one commit ahead of origin; not pushed)

## Scope lock
Same Admin UI work item. Keep previously accepted items locked. No automatic backfill, migration-on-read, new maintenance mechanism, pricing/customer-flow change, or unrelated refactor.

## Reviewer audit of `ab0b36ba`
Directionally accepted:
- Individual occupant **Connections** tab is restored without bringing back Service Overview; it shows read-only Package Family / Tier Group / Rate Sheet / Rate Sheet Group relationships from Package-owned read paths.
- Build Your Own label spacing increase is scoped.
- Tier Grid is scoped to the occupant grid, 2 cards per row above 767px, capped at 1440px.
- Existing CompuZign Admin Platform-ID action is already globally mounted and covers `package_rate_card_item`; no second action/backfill path should be created.

### One blocker — lower-deck Platform ID is not actually resolved
Do not accept “already wired” as sufficient. Nath's live screenshot shows the same 2 vCPU row has Platform ID in Inclusion Overview (`CZPRCI...`) while its lower-deck row shows no reference.

Source explains the mismatch: `PackageManagerSchema::projectTierRateSheetWith()` currently projects:
`'platform_id' => $rateItem['platform_id'] ?? null`
while authoritative stored Rate Sheet row identity is `cz_platform_id` before normalization. This read path can therefore emit null even when the ID exists.

Fix the **read projection only** so the existing stored ID reaches the lower deck. Prefer compatibility-safe fallback/normalization, e.g. existing normalized `platform_id` first, then stored `cz_platform_id`; do not mint, backfill, write, or call the Admin action for this case. Preserve existing response keys/compatibility.

Add a focused contract/test proving a Rate Sheet row with only stored `cz_platform_id` projects that same value as selection `platform_id`, then reaches `DeckInclusion.platformId`/the row reference.

## Keep unchanged
- Connections tab implementation from `ab0b36ba` unless testing exposes a real issue.
- Existing Admin Platform-ID action; only deliberate admin repair for genuinely missing IDs.
- 2x2 Grid / 1440px cap.
- Build Your Own spacing.
- All earlier accepted Admin UI work.

## Builder result — local commit `35d48d4b`

`PackageManagerSchema::projectTierRateSheetWith()` now preserves normalized
`platform_id` and falls back to a stored row's `cz_platform_id`; it neither
mints nor backfills identity. The existing lower-deck model carries that
selection value into `DeckInclusion.platformId`/the displayed row reference.

- Changed: `PackageManagerSchema.php`, `tests/tier-rate-sheet-price-option.php`, and `scripts/package-tier-workspace-contract.ts`.
- Regression coverage: a row with only stored `cz_platform_id` projects the same normalized selection ID; the pure lower-deck contract asserts that value reaches its inclusion row.
- Passed: focused PHP test; `package-manager-schema`; Package Tier Workspace, Rate Sheet identity/price-option, Tier inclusion Bundle, Tier Connections, and Tier System drawer contracts; `tsc`; production build; docs check; `git diff --check`.
- Known baseline: `contract:admin-station-css` retains its six pre-existing unused Rate Sheet CSS-class findings; this change does not touch CSS.
- Push/deployment: the source candidate is committed locally but not pushed, so reviewer source audit and deployment are not yet available. `main` was not changed.
