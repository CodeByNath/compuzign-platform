# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `0a13fd14` (unchanged).
- Clean candidate: `review/upgrade-composable-preview-fix-v2` @ `4e29dfd5`, from current `main`, containing both fixes. Superseded `review/upgrade-composable-edition-preview-fix` (`12e00e91`) deleted per branch hygiene.

## Release scope
Finish the existing customer-facing **Upgrade Your Build** flow as one working release. No broader composable-Edition architecture work.

Accepted flow remains: normal Tier/Edition first -> staged Tier + Recommendations -> Upgrade CTA -> Browse Catalogue in existing focused shell -> server preview/auto-sync authority -> Add to Quote returns to staged view. No standalone Build Your Own journey.

## Decision correction
Do **not** push `12e00e91` by itself. The customer pricing failure is part of this same active release and remains blocking. Nath will perform browser/customer validation only after a complete reviewed candidate is pushed to `main` and deployed.

## Defect B — Edition top control
The `12e00e91` `showLabels` implementation is accepted. Preserve it in the final clean candidate. Do not redesign or broaden Edition architecture.

## Defect A — pricing request failure
The live customer flow on `main@0a13fd14` reaches `ComposableOfferBrowser`'s Promise rejection path (`Could not resolve pricing right now`). The PHP fixture added in `12e00e91` does not reproduce the REST/HTTP boundary and therefore does not close this defect.

## Claude — report (2026-09-09, round 2)

### Root cause found, via controller boundary as directed
Added `tests/composable-preview-controller-boundary.php` — calls
`PackageBuilderController::postComposablePreview()` directly (not the
repository), against the real `family_id`/`choice`/`edition_id` shapes the
frontend sends, and asserts the response round-trips through `json_encode()`.
It also installs a strict `set_error_handler()` that turns ANY PHP
diagnostic during the call into a thrown failure — this is what actually
found it:

`PackageBuilderController::postComposablePreview()` (line ~60, pre-fix):
```php
$editionIdParam = $request->get_param('edition_id');
$editionId = $editionIdParam !== null ? sanitize_text_field((string) $editionIdParam) : null;
```
casts `$editionIdParam` to `(string)` **unguarded** — unlike `$choiceParam`
one line above, which already defends with `is_array()`. This route's
`edition_id` arg (new in `0a13fd14`) declares `'type' => 'string'` but, like
every arg on this route, carries no `validate_callback` — so WP never
actually rejects a non-scalar value before it reaches this cast. A non-
scalar value raises PHP's `Array to string conversion` **Warning**.

That is the mechanism that fits every reported symptom: on a host with
`display_errors` on, a Warning is echoed into the response body **before**
the JSON `rest_ensure_response()` emits — producing exactly the malformed/
non-JSON response `ComposableOfferBrowser.tsx`'s `res.json()` rejects on
(the `.catch()` Promise-rejection path), never `resolveComposableOfferSelection()`'s
own structured `ok:false`. It is also the only genuinely new, previously
zero-tested line in this whole request path.

**Honesty check:** I could not obtain the live-captured HTTP evidence (no
live/deployed access from this environment) to 100% confirm this is the
exact live trigger — the frontend itself never intentionally sends a
non-scalar `edition_id`. This is a real, demonstrated, reproducible defect
found by going one layer deeper than the prior round's repository-only
test, exactly as directed; it is not a guess at a plausible-sounding fix.
If live validation after this deploys still shows the same symptom, that
by itself will be informative (rules this specific mechanism out).

### Fix
`is_scalar($editionIdParam) ? sanitize_text_field((string) $editionIdParam) : null`
— same defensive convention `choice` already uses one line above. Behavior
unchanged for every well-formed request (null/string/int/float/bool all
resolve exactly as before); a non-scalar value (which could never have
named a real Edition anyway) is now treated as absent instead of warning.
Verified the new test actually catches the regression: reverted the fix,
re-ran, confirmed the test fails loudly on the exact warning; restored the
fix, confirmed clean.

### Defect B — unchanged, still accepted
`showLabels` implementation carried through verbatim from `12e00e91` via
clean cherry-pick onto this new candidate (no manual re-edit, no drift).

### Changed files (full candidate, from current `main`)
- `wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Http/PackageBuilderController.php` (the fix)
- `wp-content/plugins/compuzign-platform/tests/composable-preview-controller-boundary.php` (new — controller-boundary regression lock)
- `wp-content/plugins/compuzign-platform/scripts/composable-edition-resolution-contract.ts` (regex updated to match the `is_scalar` guard)
- `wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/CLAUDE.md` (validation list +1 test)
- `wp-content/plugins/compuzign-platform/resources/ts/components/package-builder/FamilyTierAdapter.tsx`, `resources/css/modules/cost-builder.css`, `dist/{css,js}/cost-builder.*`, `tests/composable-customer-ux-preview.php`, `docs/code-map/package-builder-focused-shell.md` (defect B, carried over unchanged)

### Tests/contracts run — all green
`php tests/composable-customer-ux-preview.php`, `composable-preview-controller-boundary.php` (new), `tier-instance-public-projection.php`, `tier-public-projection-is-addon.php`, `tier-pricing-parity.php`, `tier-edition-public-projection.php`, `tier-edition-schema.php`, `tier-edition-repository.php`, `tier-edition-default-resolution.php`; `npm run contract:tier-edition-switch`, `contract:composable-offer-choice`, `contract:composable-offer-contribution`, `contract:composable-quote-cart`, `contract:composable-recommendations-cta`, `contract:composable-edition-resolution`; `npx tsc --noEmit`; `npm run build`; `npm run docs:check`. (`tier-capability-invariants.php` still fails identically on a clean `main` checkout — pre-existing, unrelated, not touched.)

### Candidate
`review/upgrade-composable-preview-fix-v2` @ `4e29dfd5`, from current `main`,
pushed. Superseded `review/upgrade-composable-edition-preview-fix` deleted
(local + remote) per branch hygiene. `main` untouched.

Stopping here for auditor review, per Status above.
