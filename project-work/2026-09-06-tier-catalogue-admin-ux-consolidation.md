# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `0a13fd14` (unchanged).
- Candidate: `review/upgrade-composable-preview-fix-v2` @ `bdfa3c71` (same branch, one new commit added — not a new branch, per "continue from the same clean candidate").

## Release scope
Finish the existing customer-facing **Upgrade Your Build** flow as one working release. No broader composable-Edition architecture work.

Accepted flow remains: normal Tier/Edition first -> staged Tier + Recommendations -> Upgrade CTA -> Browse Catalogue in existing focused shell -> server preview/auto-sync authority -> Add to Quote returns to staged view. No standalone Build Your Own journey.

## Auditor review of `4e29dfd5`
### Defect B — Edition top control
**Accepted.** The previously reviewed `showLabels` change is preserved without architecture drift.

### Defect A — pricing Promise rejection
**Not accepted as root-cause closure yet.**

The new `is_scalar()` guard is a valid defensive hardening and the controller-boundary test proves a non-scalar `edition_id` can otherwise emit a PHP warning. Keep that hardening.

But it does **not** explain the reported customer failure under the normal frontend path. `resolveComposablePreview()` sends `edition_id` only from `composableEditionId`, whose declared runtime contract is `string | null`; when non-null it is serialized by `JSON.stringify()` as a JSON string. The candidate report itself acknowledges the frontend never intentionally sends a non-scalar value. Therefore the demonstrated warning path is real but has not been shown to be the trigger for the actual live failure.

Do not claim the customer pricing defect fixed on this evidence alone.

## Claude — report (2026-09-09, round 3)

Added Section 7 to `tests/composable-preview-controller-boundary.php`:
a `dispatchThroughRegisteredRoute()` helper that resolves `callback`/
`permission_callback` FROM the route definition `register_rest_route()`
actually captured (not calling `postComposablePreview()` directly), checks
required-param presence the same way `WP_REST_Server::dispatch()`'s own
`has_valid_params()` does, then dispatches the two well-formed shapes the
real frontend sends — Default (`edition_id` omitted) and a real active
Edition id — through it.

**Result: both pass clean.** HTTP 200, `ok:true`, clean `json_encode()`
round-trip, zero PHP diagnostics (the same strict `set_error_handler()`
from round 2 is still armed) — for the *actually-registered* route, not a
hand-called method.

Also hand-inspected (no WordPress core exists in this repo to run a
further automated test against):
- **Module wiring** (`CostBuilderModule.php`): `new PackageBuilderController(new PackageFamilyPricingBuilder($packageRepository), $packageRepository)` — matches the constructor exactly, no DI mismatch.
- **Client path construction**: `AssetLoader.php` sets `apiRoot => rest_url('compuzign/v1/')`; `apiClient.ts`'s URL join with `path = 'package-builder/composable-preview'` builds exactly this route's registered namespace+path — no mismatch.

**Conclusion, as instructed:** since the well-formed full-boundary test
passes, I'm reporting the `is_scalar()` guard as hardening only — not the
live fix — and naming what's left. Every source-controllable boundary
reachable without a real WordPress install is now clean. What remains
untested is outside source and outside what this repository can exercise
without either WordPress core or the live evidence:
1. **WP-core nonce/cookie auth middleware** — only engages for a
   logged-in customer (anonymous requests skip it entirely). A stale
   nonce on the POST (plausible if the customer browses a while before
   interacting) would 403 with a valid-but-non-2xx `WP_Error` JSON body —
   `apiClient`'s `!res.ok` branch throws, landing in the exact same
   `.catch()` as a malformed response. This is genuinely untestable here:
   it requires real WP's cookie/nonce stack.
2. **Actual live production data shape** for this specific customer's
   family/composable occupant — my fixtures are clean by construction;
   production data could carry a field shape mine doesn't cover.
3. Host-level causes (WAF, OPcache staleness after deploy, a caching
   plugin intercepting REST) — infrastructure, not source.

I am not implementing a source change for any of these without evidence —
per "must not substitute," speculatively reworking auth or adding
defensive code for an unconfirmed cause would be guessing, not fixing a
demonstrated defect. The `is_scalar` hardening stays (genuine improvement,
zero behavior change, already accepted). If the auditor's live check
(logged in vs. anonymous customer, and the actual failing response) can
narrow among the three above, I'll act immediately on whichever it is.

### Candidate
`review/upgrade-composable-preview-fix-v2` @ `bdfa3c71` (same branch,
`4e29dfd5` + one new commit — continuing per instruction, not a fresh
branch). `main` untouched.

### Tests/contracts run — all green
Same full suite as round 2, plus the extended `composable-preview-controller-boundary.php` (now includes Section 7). `npx tsc --noEmit`, `npm run docs:check` also re-run clean.

Stopping here for auditor review, per Status above.
