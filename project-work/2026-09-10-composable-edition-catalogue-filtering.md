# Composable Edition Catalogue Filtering

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `f9ca5b187c70ef8e4daf2d863e985e2fe540d545`.
- Reviewed branch: `review/composable-edition-catalogue-projection` @ `65e242d7`, 2 ahead / 0 behind, merge base `f9ca5b18`.
- **SOURCE PUSH NOT APPROVED yet — branch hygiene only.**

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
