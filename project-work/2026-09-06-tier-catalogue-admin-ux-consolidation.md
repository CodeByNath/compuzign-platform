# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Stop — architectural risk** for current customer behaviour.
- GitHub `main` observed: `8920607f`.
- Deploy workflow for `8920607f`: run `34357677128`, **success**.
- Nath live report: the default single-Tier landing still shows the one-card comparison instead of the focused shell. Screenshot also shows customer-group tabs can remain visible even when a group has no real primary Tier card.

## Scope correction — Nath approved
The earlier composable-only scope lock is superseded only for this narrow customer Tier/tab defect. Do not reopen pricing, Add-ons, Editions, composable Upgrade, Cart, or unrelated Package behaviour.

## Audit root cause
`PackageBuilderApp` passes global `data.tiers` into `FamilyTierAdapter`, while each Family owns only `pricing.tiers: Partial<Record<TierId, PricingTierData>>`.

Current membership logic conflates those layers:
- `filterTiersByCustomerGroup()` treats a missing `family.pricing.tiers[tier.id]` as belonging to both audience groups;
- `!family.pricing.tiers[tier.id]?.is_addon` also treats a missing entry as a normal occupant.

Therefore global Tier slots that the Family does not actually occupy can become phantom normal Tiers. They can make an otherwise empty audience group appear eligible for a tab and inflate `normalTiers.length`, preventing the existing `singleVisibleTier` focused fallback. The `8920607f` selected/default customer-group state change did not correct this Family-membership boundary.

## Claude — next action
Create the one permitted review branch from current `main`. Do **not** push source to `main`.

Correct Family membership before audience/focus derivation:
- a Tier with no `family.pricing.tiers[tier.id]` is **not** a Family occupant and must be excluded;
- normal occupants require a real Family pricing entry with `is_addon !== true`;
- tab eligibility derives only from real non-add-on Family occupants;
- render customer-group tabs only when **both** groups contain at least one real primary Tier card;
- if only one group has a primary Tier, hide the tabs and resolve directly to that group;
- if the resolved group has exactly one real primary Tier, the existing synchronous focused-shell fallback must land directly in focused state.

**Must preserve:** global Tier vocabulary contract, pricing/server-preview authority, Tier/Edition identity, Add-ons, composable Upgrade journey, Cart, and the existing focused shell.

**Must remove:** phantom missing occupants from audience/normal-Tier counts and temporary single-Tier diagnostic logging once fixed.

**Must not substitute:** `useEffect` auto-open, artificial click, timeout, CSS-only tab hiding, hardcoded Family/Tier IDs, or a one-card fallback.

Add behavioural coverage for: PB-only single Tier; Enterprise-only single Tier; empty opposite group; opposite group containing only Add-ons; both groups with real primary Tiers; and global Tier slots absent from the Family. Tests must validate behaviour, not only source-string presence.

After implementation, push only the review branch, record exact SHA/diff/tests here, set **AWAITING CHATGPT REVIEW**, and stop.