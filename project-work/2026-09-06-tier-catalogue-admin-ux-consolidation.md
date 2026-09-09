# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `8920607fb41967072c9dc561e2e0fae9826f52ca`.
- Review branch: `fix/family-tier-membership-boundary` @ `9ea1d830414a32dff0588e9ad4d94d44b1a6df50`.
- **SOURCE PUSH NOT APPROVED yet.**

## Audit result
The candidate is exactly one commit ahead of production, behind by 0, with merge base `8920607f`. Changed source scope is narrow: `FamilyTierAdapter.tsx`, rebuilt `dist/js/cost-builder.js`, one package script entry, and the new mounted regression.

The source correction is architecturally sound. `FamilyTierAdapter` receives the global Tier vocabulary, while `family.pricing.tiers` is this Family's actual partial occupancy map. The candidate now resolves Family occupancy before audience/group/focus derivation, so an absent pricing entry is non-membership rather than a phantom normal Tier. This directly fixes both reported symptoms without weakening the required behavior:
- a group with no real primary Tier no longer qualifies for customer tabs;
- one genuine primary Tier can again reach the existing synchronous focused-shell fallback.

Add-ons remain excluded from tab eligibility. A real occupant with unset `audience_groups` still retains the intended both-groups default. The temporary `[CZ single-tier debug]` logging is removed. No effect-driven auto-open, fake click, timeout, CSS hiding, hardcoded IDs, or one-card substitute was introduced.

The mounted regression is appropriate and exercises the real `FamilyTierAdapter` across PB-only, Enterprise-only, add-on-only opposite group, two-group, phantom-global-slot, and unset-audience cases. Claude reports 15 failures on pre-fix production and 22/22 passing on the candidate, plus clean TypeScript/build and relevant contracts.

## Safeguard before approval
One current-state Code Map sentence is now inaccurate. In `docs/code-map/package-builder-focused-shell.md` under **Family-switch state boundary**, it says `visibleTiers`' `audience_groups` fallback lets a same-id Tier from the new Family pass. After this fix, a missing Family occupant cannot pass at all. The reset effect is still required because a same-id Tier that the new Family genuinely occupies can resolve there.

Claude: make **only that documentation correction** on the existing review branch. Do not alter the accepted source behavior or tests. Then record the new branch SHA here and set **AWAITING CHATGPT REVIEW**.

The pre-existing `contract:package-builder-flow` ENOENT for removed `FullBuildDetail.tsx` is confirmed out of scope and is not a blocker for this defect; handle separately later.

## Must preserve
Existing focused shell, Tier/Edition identity, Add-ons, Upgrade/composable journey, pricing/server preview authority, Cart, global Tier vocabulary, and genuine unset-audience default.

## Must not substitute
No one-card fallback, extra customer step, artificial interaction, hardcoded Family/Tier logic, or CSS-only hiding.