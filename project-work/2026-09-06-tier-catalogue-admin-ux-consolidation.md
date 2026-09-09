# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `0a13fd14` (unchanged — nothing pushed yet).
- Candidate: `review/upgrade-composable-edition-preview-fix` @ `12e00e91`.
- Deploy: Hostinger workflow #979 succeeded for exact `0a13fd14`.
- Live validation failed on two customer-facing defects below — B fixed, A partially investigated (see Claude's report below); needs auditor input to finish.

## Current release goal
Finish the existing customer-facing **Upgrade Your Build** flow only. Do not reopen broader composable-Edition architecture.

Accepted flow remains: normal Tier/Edition first -> staged Tier + Recommendations -> Upgrade CTA -> Browse Catalogue in existing focused shell -> existing server preview/auto-sync authority -> Add to Quote returns to staged view. No standalone Build Your Own journey.

## Live defects — 2026-09-09
1. Customer catalogue shows red **“Could not resolve pricing right now.”**
   - This is the Promise rejection/catch path around `resolveComposablePreview()`, not the normal resolver `ok:false` response.
   - Treat as an HTTP/API/runtime boundary failure until actual response/status/runtime error proves otherwise.

2. Focused-shell top Edition control does not present the dynamic Edition list properly.
   - Current `EditionCueSelector` intentionally hides labels and renders positions/dots only.
   - For this Upgrade surface the customer must see the real available **Default + Edition names**, dynamically from the composable occupant's own `edition_options`.
   - Use established Admin Build Your Own declaration-tab and existing customer Tier/Edition presentation patterns for guidance; do not invent another identity/model.

## Claude — report (2026-09-09)

### B. Edition top control — FIXED
`EditionCueSelector` (`FamilyTierAdapter.tsx`) gained an opt-in `showLabels`
prop: when set, it renders each `destinations[]` entry's real label under
the existing track (same left/width slice as the click targets, same
`aria-label` for the accessible name) — dynamically, no hardcoded
name/count/index. The primary Tier's own cue call site is untouched (no
`showLabels`), so its dots-only behavior is unaffected; only the composable
Upgrade shell's call site now passes `showLabels`. New CSS is additive
(`.cz-package-builder__cue-track--labeled` / `-labels` / `-label`).

### A. Pricing failure — PARTIALLY INVESTIGATED, NEEDS AUDITOR INPUT
Traced the full existing path. `PackageRepository::resolveComposableOfferSelection()`'s
Edition-swap branch (landed in `0a13fd14`, "resolve real Editions end to
end") had **zero PHP-level test coverage** — the obvious suspect given it's
the only genuinely new server-side logic in this feature. Added end-to-end
coverage in `tests/composable-customer-ux-preview.php` (#12: a real active
Edition, an unknown id, a disabled Edition, and an empty-string id) — all
resolve correctly, no crash, prices join the real rate-sheet catalogue
correctly. **This rules out the Edition-swap branch as the cause**, but I
could not reproduce the actual live HTTP failure myself — there is no
live/deployed WordPress environment reachable from this session to hit
`POST /compuzign/v1/package-builder/composable-preview` against, and per
standing instruction I do not perform browser/live validation.

**Needed to proceed:** the actual captured HTTP status + response body (or
PHP error log line) from the live failure — browser Network tab on the
failing request, or the site's PHP error log around the time of the live
check. Once that's available I can trace directly to the real defect rather
than guessing further at a passing code path.

**Must preserve (unchanged):** server preview as pricing authority; debounced
preview/auto-sync; customer-policy and Commercial-Leg resolver; Edition-aware
resolution. **Not substituted:** no client-calculated pricing, no published
unit price as quote authority, no error suppression, no second resolver, no
Edition support removed.

### Changed files
- `wp-content/plugins/compuzign-platform/resources/ts/components/package-builder/FamilyTierAdapter.tsx`
- `wp-content/plugins/compuzign-platform/resources/css/modules/cost-builder.css`
- `wp-content/plugins/compuzign-platform/tests/composable-customer-ux-preview.php`
- `wp-content/plugins/compuzign-platform/dist/{css,js}/cost-builder.*` (rebuilt)
- `docs/code-map/package-builder-focused-shell.md`

### Tests/contracts run (all green except one pre-existing, unrelated failure)
`php tests/composable-customer-ux-preview.php` (extended), `tier-instance-public-projection.php`,
`tier-public-projection-is-addon.php`, `tier-pricing-parity.php`, `tier-edition-public-projection.php`,
`tier-edition-schema.php`, `tier-edition-repository.php`, `tier-edition-default-resolution.php`;
`npm run contract:tier-edition-switch`, `contract:composable-offer-choice`, `contract:composable-offer-contribution`,
`contract:composable-quote-cart`, `contract:composable-recommendations-cta`, `contract:composable-edition-resolution`;
`npx tsc --noEmit`; `npm run build`; `npm run docs:check`.
`php tests/tier-capability-invariants.php` fails on both this branch AND a clean `main` checkout
(unregistered scoped Tier route assertion) — confirmed pre-existing, unrelated to this work, not touched.

### Commit
`review/upgrade-composable-edition-preview-fix` @ `12e00e91`, pushed to origin. `main` untouched.

Do not change the accepted Upgrade journey, Cart/Add-on visibility contract, resolver architecture, or deferred deeper Edition refinements — none of that was touched.

Stopping here for auditor review, per Status above. If the auditor or Nath can supply the live-captured HTTP status/body for defect A, I'll continue immediately in the same cycle.
