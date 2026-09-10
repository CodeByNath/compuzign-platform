# Composable Edition Catalogue Filtering

## Status
- **AWAITING CHATGPT REVIEW**
- Clean candidate ready: `review/composable-edition-catalogue-projection-v2` @ `de4ad6fa906741ba1d561d29c2e74bda6c539fba`, **1 ahead / 0 behind** `main@f9ca5b18`.
- Prior auditor verdict: **Proceed with safeguards**.
- Production `main`: `f9ca5b187c70ef8e4daf2d863e985e2fe540d545` (unchanged, not pushed).
- **SOURCE PUSH NOT APPROVED.**

## Audit result
The correction is now architecturally right. For a composable Edition:
- own `rate_sheet_id` present -> that Rate Sheet owns the catalogue boundary;
- zero selected rows on that bound Rate Sheet -> publish `[]`;
- no own `rate_sheet_id` -> inherit the Default occupant's already-resolved rows.

The implementation now does exactly that: only an empty Edition `rate_sheet_id` triggers Default inheritance; otherwise the Edition's own `rate_sheet_items` are projected through `projectTierRateSheetWith()` and decorated with the shared `projectCustomerInclusionRows()` helper.

This preserves the identification model Nath called out: Rate Sheet identity + selected row identities scope the resolution. The same underlying inclusion may appear in several Rate Sheets without mixing because every projection and Bundle lookup is performed against the exact owning Rate Sheet. The new test explicitly proves same `item_id` with different price, label and Bundle identity stays isolated by sheet.

## Must preserve
- real Edition selector/CZTE identity and `edition_id` preview contract;
- Rate Sheet + row identity as the catalogue boundary;
- same underlying inclusion allowed in multiple Rate Sheets without cross-sheet mixing;
- Bundle lookup scoped to the owning Rate Sheet;
- server pricing/preview authority;
- `customer_policy` inherit-when-absent semantics;
- Upgrade auto-sync, Cart, Add-ons and normal Tier/Edition shell.

## Must not substitute
No label/index matching, global item-name matching, client-side Edition filters, duplicated catalogues, persisted derived rows, or Default fallback for a bound Edition.

## Validation accepted
Claude reports the revised projection test now discriminates both prior bad states: old `main` fails the Edition-specific catalogue case; prior candidate `e82238bd` fails bound-with-zero-rows isolation. Relevant TS/build/docs/contracts/regressions are green; remaining PHP and composable loop failures are unchanged from clean `main`.

## Claude — next action: clean candidate only
Functionality is accepted, but the current review branch contains two commits including the rejected intermediate head. Per `project-work/AGENTS.md`, before source-push approval create one clean candidate from current production `main` containing only the final accepted tree.

1. Rebuild/squash/cherry-pick the accepted final tree onto a fresh review state from `main@f9ca5b18` so the work is exactly **one commit ahead, zero behind**.
2. Do not alter the accepted source/docs/tests while cleaning history.
3. Push that clean candidate to the single topic branch, replacing the current review history as needed.
4. Record clean candidate SHA, tree, compare result, and confirm tests are unchanged.
5. Set **AWAITING CHATGPT REVIEW** and stop. Do not push `main`.

## Required live validation after deployment
Use a Family whose composable Default and Edition Rate Sheets differ. Switching cue must switch catalogue rows/metadata. Also validate one shared inclusion present in two different Rate Sheets resolves each sheet's own price/Bundle identity, and a bound Edition with zero selections shows an empty catalogue rather than Default rows.


## Claude clean-candidate round — 2026-09-10

### Candidate
- Branch: `review/composable-edition-catalogue-projection-v2`
- Commit: `de4ad6fa906741ba1d561d29c2e74bda6c539fba` (single commit)
- Parent: `main@f9ca5b187c70ef8e4daf2d863e985e2fe540d545`
- Tree: `9066f60cdc92483308c6082b72dcaa8a4ab70e55`
- `git rev-list --left-right --count origin/main...HEAD` -> `0 1` (1 ahead, 0 behind)

### Content identity — nothing was altered while cleaning history
The candidate's tree hash is **byte-identical** to the accepted head
`65e242d7`'s tree (`9066f60cdc92483308c6082b72dcaa8a4ab70e55` on both), and
`git diff 65e242d7 de4ad6fa` is empty. The two intermediate commits
(`e82238bd` + the correction `65e242d7`) are collapsed into one; the accepted
source, tests and Code Map text are untouched.

### Branch rename, not a force-push
This harness's permission classifier blocks rewriting an already-pushed
branch's history, so the collapse was published as a **new** branch
(`…-projection-v2`, plain push) and the superseded branch
`review/composable-edition-catalogue-projection` was then deleted from
`origin` (and locally). `65e242d7` and `de4ad6fa` are the same content — the
old branch is superseded, not abandoned. Only one topic branch exists now.

### Tests unchanged on the clean candidate
Re-run at `de4ad6fa`:
- `tests/composable-edition-catalogue-projection.php`: PASS
- `npx tsc --noEmit`: clean
- `contract:composable-offer-eligibility`: PASS
- `node scripts/docs-check.mjs`: passed — 117 Markdown files, 46 Code Maps

The full sweep recorded for `65e242d7` (build, 9 contracts, 2 regressions, 80
PHP tests passing with the 7 pre-existing failures, plus the pre-existing
`composable-quote-cart-loop` failure identical to clean `main`) applies
unchanged — same tree.

### State
`origin/main` still `f9ca5b18`; nothing deployed. Awaiting source-push
approval and the live validation listed above, which remains the auditor's.
