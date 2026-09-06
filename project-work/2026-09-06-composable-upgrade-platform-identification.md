# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **AWAITING CHATGPT REVIEW — Overview presentation gap closed, one clean commit, not pushed to `main`**
- Auditor verdict (prior round): **Proceed with safeguards; Phase 1 not closed** until this presentation gap is fixed.
- Production: `main@2f06872f5ac2759a35530a47cd2e6915eca76e7f`; deploy #956 succeeded (unchanged this round).
- Review branch: `review/composable-upgrade-overview-presentation@48cede2f00b7bd2ee202e94f82a61651ee694d3b` — one clean commit on production `main`. Pushed to origin.

## Correction report

**Item 1 (audit first) — confirmed already true, no backend change needed.** The settled composable occupant already returns `upgrade_platform_id` and composable Editions already return `edition_upgrade_platform_id` — both were added to the admin read/projection path (`PackageSchema::normaliseTierSlot()`/`sanitizeTierEdition()`) as part of Phase 1 itself. The gap was entirely frontend: nothing carried the field from the backend response into the Overview shell data, and nothing declared a row to render it.

**Against each remaining item:**
2. `types.ts`: `SurfaceTierDetail.upgrade_platform_id: string`, `TierEdition.edition_upgrade_platform_id: string` — exact backend field names, output-only. `normTier()`/`draftPreferredDetail()` needed no changes (both already spread the whole object through).
3. `tierDetailModel.ts`'s `buildTierDetail()` now carries `detail.upgrade_platform_id` into `TierOverviewShellData.upgradePlatformId`; `bindings/tier.tsx`'s `tierOverviewShell` gained an "Upgrade Platform ID" row alongside the existing "Tier Platform ID" (and, for an Add-on, "Add-on Platform ID") rows — verified both render simultaneously and correctly for the same composable occupant.
4. Same pattern for Edition: `tierEditionDetailModel.ts`'s `buildTierEditionDetail()` → `TierEditionOverviewShellData.editionUpgradePlatformId` → `bindings/tierEdition.tsx`'s new "Upgrade Platform ID" row beside the existing "Edition Platform ID" row.
5. Both new rows use `when: (d) => !!d.xxxPlatformId` (falsy hides, no fallback text) rather than `!== ''` — upgraded from an initial `!== ''` version after it crashed one of the existing lifecycle regression scripts (see below), since `!== ''` treats a genuinely `undefined` value as "present." Verified: every ordinary Tier/Add-on/Edition fixture (no Upgrade id at all) shows no row and no misleading "Assigned after Publish" text.
6. No editable field, no new control — both rows are the same read-only `text` element type every other Platform ID row already uses.
7. New `composable-upgrade-overview-presentation-contract.ts` exercises the real exported `tierOverviewShell`/`tierEditionOverviewShell` schemas directly (not a mock): proves the row is hidden for ordinary data, shown and correctly valued for composable data, and that the existing ecosystem `CZT`/`CZTE` row renders unaffected alongside it — dual identity, neither replacing the other. Also extended `tier-edition-admin-contract.ts`'s existing backend/frontend shape-parity list with the new field.
8. Rebuilt only `dist/js/admin-station.js` (hash change in place, no new chunk). No quote/Request/cart/PDF/email/order/pricing/resolver file touched — confirmed by the diff (10 files, all Package Station/Admin Station presentation + the new contract + `dist`/`package.json`/`CLAUDE.md` wiring).

**A real bug found and fixed via testing**: my first pass used `when: (d) => d.upgradePlatformId !== ''`, which crashed `tier-occupant-lifecycle-regression.mjs` (and two sibling regressions) because their own fixture data predates this field entirely (`upgradePlatformId: undefined`, and `undefined !== ''` is `true`) — the row tried to render and a downstream unrelated pre-existing bug in the SAME fixture (`audienceGroups` missing) then threw first. Fixed to `!!d.upgradePlatformId`, confirmed the target contract passes and the two Upgrade-specific regressions run cleanly again. The `audienceGroups` crash itself is separately pre-existing — confirmed identical all the way back on unmodified production `main`, before any of this work — and out of scope here.

**Tests re-run**: full Package Station JS contract list from its own `CLAUDE.md` (`contract:package-family-capability` through `contract:tier-occupant-inclusions-bundle`, now including the new `contract:composable-upgrade-overview-presentation`), `npm run contract:admin-platform-identifier-migration-sweep`, all Package Station regression scripts (three confirmed pre-existing/unrelated failures as above), the relevant `tests/*.php` list, `npx tsc --noEmit`, `npm run build`, `npm run docs:check` — all pass.

Do not push to `main` before this review.

## What is confirmed working
- CZTU/CZTEU backend identity policy, reserve/bind, migration assignment path and deployed Admin action are live.
- This is not evidence to reopen the dual-identity architecture or pricing/customer flows.

## Source-confirmed presentation gap
The live symptom matches source exactly:
- `SurfaceTierDetail` / `TierEdition` frontend contracts do not declare the new Upgrade ID fields.
- `buildTierDetail()` only sends `platformId` + `addonPlatformId` to Tier Overview.
- `TierOverviewShellData` / `tierOverviewShell` only render **Tier Platform ID** and conditional **Add-on Platform ID**.
- `buildTierEditionDetail()` only sends `editionPlatformId`.
- `TierEditionOverviewShellData` / `tierEditionOverviewShell` only render **Edition Platform ID**.
Therefore a correctly assigned CZTU/CZTEU cannot appear in the Overview even when stored and returned.

## Claude correction — presentation only
On a clean review branch from current `main@2f06872f...`:
1. Audit the current backend admin read/projection shape first and confirm the settled composable occupant returns `upgrade_platform_id` and composable Editions return `edition_upgrade_platform_id`. If either is missing from the admin read projection, add only the missing output field; do not touch minting or registry logic.
2. Extend Package frontend types with output-only Upgrade ID fields using the exact backend names/normalisation convention.
3. Tier Overview: carry/render the additional **Upgrade Platform ID** only for the composable participant when a CZTU value exists. Keep the normal **Tier Platform ID** visible beside it; never replace it.
4. Edition Overview: carry/render **Upgrade Platform ID** (CZTEU) only when that Edition has one, while retaining **Edition Platform ID** (CZTE).
5. Empty Upgrade ID must hide the extra row rather than show a misleading assignment fallback on ordinary Tiers/Editions.
6. No editable Platform-ID field and no new assignment control.
7. Add focused contracts proving dual IDs coexist in Overview and ordinary Tier/Add-on/Edition presentation is unchanged.
8. Rebuild only required generated admin assets; no quote/Request/cart/PDF/email/order/pricing/resolver changes.

Report exact changed files/tests/clean SHA and set **AWAITING CHATGPT REVIEW**. Do not push main before review.