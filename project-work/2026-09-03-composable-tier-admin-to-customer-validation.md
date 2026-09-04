# Composable Tier — continuous work track

## Status
- **AWAITING CLAUDE RESPONSE — Upgrade Journey Finalisation plan challenged before implementation.**
- Auditor verdict: **Stop — architectural risk.**
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; Hostinger run `33835470825` succeeded on that SHA.
- No Upgrade Journey source changes are approved.

## Accepted production state retained
Request/Review rail geometry and hidden scrollbar chrome are accepted. Existing composable occupant, pricing/resolver, Rate Sheet, identity, Request persistence/email and published snapshot architecture stay locked. Remaining representation checks still need closure.

## Locked journey direction
**Upgrade your build** and standalone **Build Your Own** are different customer journeys.

Upgrade:
1. starts from an exact selected normal Tier/Edition;
2. customer adds/removes only Admin-authorised composable inclusions/quantities;
3. remains dependent on that exact base while in progress;
4. requires explicit **Finalise build**;
5. after finalisation becomes the final **Build Your Own** composed quote result.

Standalone Build Your Own is deferred and must not simply load beside normal Tier cards.

## Auditor finding on Claude's first plan
The proposed optional `upgradeDraftBase` idea is directionally useful for tying an in-progress upgrade to its base, but the proposed finalisation algorithm is unsafe.

Current `buildComposableFamilyTierQuoteItem()` builds the composable cart line only from the composable occupant preview: its own selected inclusions, resolved periods, headline price and payment summaries. It does **not** contain the selected primary Tier/Edition's inclusions or commercial streams.

Therefore the proposed `finaliseUpgradeQuoteDraft()` cannot safely remove primary + add-ons and merely clear `upgradeDraftBase`. Doing that would leave only the extras/composable commercial snapshot while deleting the base plan commercial value. That is not a composed Build Your Own result.

Second blocker: allowing **Review & Finalise Quote / Request submission** while the upgrade is still un-finalised contradicts the required explicit transition. The current "primary + Upgrades" fallback is not an acceptable final snapshot once this journey exists.

## Claude next instruction — audit/plan only
Before source editing, revise the plan and answer:
1. What exact final cart/snapshot shape represents **base Tier/Edition + selected upgrades** after Finalise Build, including inclusions, quantities, Legs/payment streams, commitment/headline and TCV, without double-counting?
2. Is finalisation best represented as one composed FamilyTierQuoteItem snapshot or another bounded quote-only structure? Reuse existing identities where possible; no new platform entity/Tier System.
3. How is the exact base Tier/Edition snapshot captured so later cart edits cannot silently mutate the finalised build?
4. What happens to normal Tier add-ons during finalisation: included, preserved separately, or rejected? Justify from current architecture.
5. How will Request/PDF/email persist/render the final composed result exactly once?
6. Add a hard customer-flow rule preventing Request submission while an Upgrade draft is un-finalised.
7. Define removal/replacement behavior before finalisation and legacy-cart handling.
8. List exact affected files/contracts and non-change boundaries.

Record the revised design here, set **AWAITING CHATGPT REVIEW**, and make **no source changes**.

## Work journey
Representation closure → Upgrade Journey semantics → implementation/review/deploy/live validation → final customer UI/UX refinement → later standalone Build Your Own journey.