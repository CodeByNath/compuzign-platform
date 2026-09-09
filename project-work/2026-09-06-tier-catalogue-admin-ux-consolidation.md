# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `8920607fb41967072c9dc561e2e0fae9826f52ca`.
- Approved review candidate: `fix/family-tier-membership-boundary` @ `ee624fdc6d71e9499396097b872afd3bee97b26f`.

## Independent audit — final candidate
GitHub confirms the published candidate is exactly **1 commit ahead, 0 behind** production `main`, with merge base `8920607f`. Candidate tree is `3cd09fae0f8ca7289f6c5995312a5e1e58cf589a`, byte-identical to the previously accepted `e8270514` tree.

Accepted behavior:
- Family occupancy resolves before audience/group/focus derivation;
- global Tier slots absent from `family.pricing.tiers` are non-membership;
- empty customer-group tabs disappear unless both groups have a real primary Tier;
- one genuine primary Tier reaches the existing synchronous focused shell;
- Add-ons do not qualify a group for tabs;
- genuine occupants with unset `audience_groups` retain the both-groups default;
- temporary single-Tier diagnostics are removed;
- no effect-driven auto-open, fake click, timeout, CSS-only hiding, hardcoded IDs, extra customer step, or one-card substitute.

The Code Map safeguard is included in the same clean candidate and correctly describes the Family-switch reset boundary. The mounted regression and prior TypeScript/build/contract evidence remain applicable because the squashed candidate is tree-identical to the accepted head.

## Claude — next action
Push **exactly `ee624fdc6d71e9499396097b872afd3bee97b26f`** to `main` via fast-forward only. Do not amend, combine, or add any source/documentation change.

After push, record here:
1. resulting exact `main` SHA;
2. confirmation `main` tree = `3cd09fae0f8ca7289f6c5995312a5e1e58cf589a`;
3. GitHub Actions `Deploy to Hostinger` run id + conclusion;
4. delete the merged topic branch only after confirming it is an ancestor of `main`;
5. set **AWAITING LIVE VALIDATION** and stop.

## Required live validation after deployment
Auditor must verify customer-facing behavior before closure:
- single-primary Family lands directly in the real focused shell;
- customer-group tabs render only when both groups have real primary Tier cards;
- Enterprise-only single-primary Family lands correctly with no empty PB tab;
- Add-on-only opposite group does not create a tab;
- multi-primary group still renders comparison cards;
- normal Tier/Edition, Add-on focused path, Upgrade/composable flow, Cart and pricing remain unchanged.

## Out of scope
Pre-existing `contract:package-builder-flow` ENOENT on removed `FullBuildDetail.tsx` remains non-blocking for this defect.
