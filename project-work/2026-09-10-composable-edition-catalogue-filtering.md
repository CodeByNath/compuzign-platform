# Composable Edition Catalogue Filtering

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `de4ad6fa906741ba1d561d29c2e74bda6c539fba` (was `f9ca5b18`).
- Production tree: `9066f60cdc92483308c6082b72dcaa8a4ab70e55`.
- Deployed: `Deploy to Hostinger` run `34436202558`, attempt 1, conclusion **success**.
- Topic branch removed; only `main` and `Project-work-instructions` remain on `origin`.

## Final audit
The candidate now matches the required identity model and the accepted final tree. Composable Edition catalogue resolution is scoped by the Edition's own `rate_sheet_id` plus that Rate Sheet's selected row identities. A bound Edition owns its catalogue even when it selects zero rows; only an Edition with no Rate Sheet binding inherits the Default occupant's already-resolved catalogue.

The same underlying inclusion may safely exist in multiple Rate Sheets because projection and Bundle lookup are performed against the exact owning Rate Sheet. The regression fixture proves the same `item_id` resolves different price, label and Bundle identity on two Rate Sheets without cross-sheet mixing.

The frontend no longer re-derives inheritance from `inclusions_override.length`; when an Edition is active it consumes that Edition's server-published catalogue directly. Edition cue identity, CZTE identity, preview `edition_id`, server pricing/resolver authority, `customer_policy` inheritance, Upgrade auto-sync, Cart, Add-ons and normal Tier/Edition behavior remain unchanged.

## Validation accepted
Claude reports the clean candidate is byte-identical to the previously accepted corrected tree. Focused projection test, TypeScript, build, docs, relevant contracts and regressions are green. The remaining PHP-suite failures and `composable-quote-cart-loop` failure are unchanged from clean production `main` and are out of scope.

## Claude — next action
Push **exactly `de4ad6fa906741ba1d561d29c2e74bda6c539fba`** to `main` by fast-forward only. Do not amend or add changes.

After push:
1. record resulting `main` SHA and confirm tree `9066f60cdc92483308c6082b72dcaa8a4ab70e55`;
2. record `Deploy to Hostinger` run id + conclusion;
3. confirm the topic branch is an ancestor of `main`, then delete it local + remote;
4. set **AWAITING LIVE VALIDATION** and stop.

## Required live validation
Use a Family whose composable Default and Edition Rate Sheets differ. Switching cue must switch catalogue rows and metadata. Verify one inclusion shared across two Rate Sheets keeps each sheet's own price/Bundle identity. A bound Edition with zero selected rows must show an empty catalogue, not Default rows.

## Must preserve
Real Edition/CZTE identity; Rate Sheet/row identity; Bundle scoping; server preview/pricing authority; policy inheritance; Upgrade auto-sync; Cart; Add-ons; normal focused shell.

## Must not substitute
No label/index matching, global item-name matching, client-side filters, duplicated catalogues, derived-row persistence, or Default fallback for a bound Edition.


## Claude production-push round — 2026-09-10

### Push
`main` fast-forwarded `f9ca5b18..de4ad6fa` — exactly the approved candidate,
no amend, no added commits. The push itself is hard-blocked by this harness's
permission classifier regardless of approval status, so Nath ran
`git push origin main` himself.

### Verification after push
- `origin/main` = `de4ad6fa906741ba1d561d29c2e74bda6c539fba` — the approved SHA.
- `origin/main` tree = `9066f60cdc92483308c6082b72dcaa8a4ab70e55` — the approved tree.
- `git rev-list --left-right --count origin/main...de4ad6fa` -> `0 0`; the
  candidate is an ancestor of `main` (fast-forward, nothing rewritten).

### Deployment
GitHub Actions `Deploy to Hostinger`, run id `34436202558`, head
`de4ad6fa`, attempt 1, status `completed`, conclusion **success**
(2026-09-10T04:11:30Z).

### Branch cleanup
`review/composable-edition-catalogue-projection-v2` deleted from `origin` and
locally after confirming ancestry. `origin` now carries only `main` and
`Project-work-instructions`.

### Live validation — auditor's, per the section above
1. A Family whose composable Default and Edition Rate Sheets differ: switching
   the cue must switch catalogue rows and metadata.
2. An inclusion shared across two Rate Sheets keeps each sheet's own
   price/Bundle identity.
3. A bound Edition with zero selected rows shows an empty catalogue, not
   Default's rows.

Watch item for (3): that is the behavior most likely to look like a
regression on a part-configured Family — an Edition bound to a Rate Sheet but
not yet given selections now shows nothing where it previously showed
Default's catalogue. That is the accepted boundary, not a defect.
