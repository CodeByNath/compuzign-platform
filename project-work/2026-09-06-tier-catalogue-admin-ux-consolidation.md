# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
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
