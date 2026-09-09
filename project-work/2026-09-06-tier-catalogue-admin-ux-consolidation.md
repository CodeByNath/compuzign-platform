# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `4a73ed87`.

## Scope lock — Nath approved
Fix **only the composable occupant / Tier Catalogue customer Upgrade path**. Do not alter normal Tier occupants, Add-on occupants, their Edition behavior, or any other occupant projection/resolver.

Pricing on deployed `4a73ed87` is **PASS** and must remain untouched.

## Remaining defects
### 1. Composable Edition list completeness
Live customer cue shows only `Default` + `Subscriptions` when more customer-valid composable Editions should be available.

Re-review the prior narrow projection fix from `09f453ec`: `PackageRepository::enrichCompiledOccupantIdentity()` must not use missing `edition_platform_id` as an extra **customer-visibility** filter for the composable occupant if Active-only eligibility is already established upstream and the existing composable selector/resolver uses the Edition's native `id`.

Do **not** broaden this into a CZTE/CZTEC lifecycle/backfill project unless hard source evidence proves that is required for this customer path.

### 2. Selected composable Edition loads Default inclusions
Confirmed regression in `resolveComposableEligibleRows()`:
- current code always builds catalogue rows from `offer.inclusions`;
- selected Edition's own `inclusions_override` is ignored;
- correct behavior existed in `a584ede0` and was later lost.

Restore the narrow rule:
```ts
const inclusionSource = edition && edition.inclusions_override.length > 0
  ? edition.inclusions_override
  : offer.inclusions;
```
Build `inclusionsById` from `inclusionSource`.

## Claude — implementation boundary
Produce **one clean candidate from `main@4a73ed87`** containing only these composable-path corrections.

Required evidence:
- multiple Active composable Editions all survive into `composable_offer.edition_options`;
- inactive/disabled/trashed composable Editions remain excluded;
- selected composable Edition with non-empty `inclusions_override` uses its own rows/prices;
- empty Edition `inclusions_override` falls back to composable Default;
- normal Tier/Edition and Add-on paths are unchanged;
- existing live pricing path remains untouched.

**Must preserve:** current working pricing; existing server preview authority; composable Edition resolver; Upgrade journey; current label UI; all non-composable occupant behavior.

**Must remove:** composable-only Edition visibility drop and composable-only Default-inclusion leakage.

**Must not substitute:** changes to normal Tier occupants, Add-ons, normal Tier Editions, hardcoded Edition names/counts, client-invented Editions, inactive Edition exposure, second resolver, or extra customer steps.

Report changed files, focused tests/contracts, exact SHA, set **AWAITING CHATGPT REVIEW**, and stop. Do not push to `main`.

## Claude Report

Candidate built from `main@4a73ed87`, kept **uncommitted** in the working tree per `SOURCE PUSH NOT APPROVED` — nothing pushed to `main` or to any topic branch.

**Defect 1 — `PackageRepository.php` (`enrichCompiledOccupantIdentity()`, ~L2613-2665, call site ~L2761):**
Added a `bool $isComposable = false` parameter. The `edition_platform_id !== ''` filter now only runs when `$isComposable === false`; the composable call site passes `true`, the normal Tier/Add-on call site is unchanged (still `false`, implicit default). Confirmed via research: Active-only eligibility is already established upstream in `PackageSchema::publicTierEditionOptions()` before this method runs, and every composable selection path (`resolveComposableOfferSelection()`, `resolveComposableEligibleRows()`) matches by native `id`, never `edition_platform_id` — so skipping the extra identity gate for composable only cannot expose an inactive/disabled/trashed Edition (that gate stays upstream, untouched) and cannot affect normal Tier/Add-on visibility (still requires a minted CZT(A)/CZTE). This supersedes the prior rejected attempt `09f453ec` (pushed to `review/composable-edition-set-completeness`, never merged) — that one removed the filter globally for both occupant kinds; this one is scoped to the composable call site only, per the narrowed instruction in this round.

**Defect 2 — `ComposableOfferBrowser.tsx` (`resolveComposableEligibleRows()`, ~L154-176):**
Restored the `inclusionSource` selection lost when `a584ede0` was reverted (`28b6859c`) and rebuilt without it (`0a13fd14`) — confirmed via `git log`/`git show` on the function's history. `inclusionsById` now builds from `edition.inclusions_override` when non-empty, else falls back to `offer.inclusions`, matching the existing sibling pattern already used for normal Tier Editions in `PricingTiers.tsx` (`resolveEffectiveTierDisplay()`).

**Evidence (all passing against the uncommitted candidate):**
- `tests/composable-customer-ux-preview.php` — new section 13: an Active composable Edition with a minted `edition_platform_id` (`ed_1`) and one without (`ed_3`) both survive `composable_offer.edition_options`; the disabled Edition (`ed_2`) stays excluded.
- `scripts/composable-offer-eligibility-contract.ts` — new sections 7-8: a selected Edition with non-empty `inclusions_override` sources its own rows/prices; an empty `inclusions_override` falls back to the occupant Default's `offer.inclusions`. All 6 pre-existing assertions (`editionId` always `null` in those fixtures) unaffected.
- Normal-path/pricing regression check: `tests/tier-instance-public-projection.php` (KAIROS basic occupant's single minted Edition still the only one surfaced; Family/Service pricing assertions unchanged) — passes unmodified.
- Full sweep: `tier-composable-occupant.php`, `composable-occupant-controller-contract.php`, `composable-customer-policy-resolver.php`, `composable-customer-policy-admin-surface.php`, `tier-edition-public-projection.php`, `tier-occupant-platform-identity.php`, plus `npx tsc --noEmit`, `contract:composable-edition-resolution`, `contract:composable-quote-cart`, `contract:composable-recommendations-cta` — all pass. One pre-existing, unrelated failure (`tests/tier-capability-invariants.php`, a stale registered-route assertion) reproduces identically on clean `main@4a73ed87` and is untouched by this candidate.

**Changed files:** `src/Modules/SurfacePackages/Repositories/PackageRepository.php`, `resources/ts/components/package-builder/ComposableOfferBrowser.tsx`, `tests/composable-customer-ux-preview.php`, `scripts/composable-offer-eligibility-contract.ts` (all under `wp-content/plugins/compuzign-platform/`).
