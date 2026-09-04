# Composable Tier — continuous work track

## Status
- **AWAITING CLAUDE RESPONSE — third Upgrade Finalisation revision still has semantic/rendering blockers; no source changes approved.**
- Auditor verdict: **Stop — architectural risk.**
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; Hostinger run `33835470825` succeeded on that SHA.

## Locked journey
**Upgrade your build** and standalone **Build Your Own** are separate journeys. Upgrade starts from an exact selected Tier/Edition, allows only Admin-authorised composable choices, stays tied to that exact base while in progress, requires explicit **Finalise build**, and only then becomes a final Build Your Own quote result. Standalone Build Your Own remains deferred.

## What the third revision fixed
The durable-boundary correction is directionally right:
- `upgradeDraftBase` must never persist because Request is hard-gated while a draft exists;
- finalised composition provenance must survive `RequestSchema.php` and REST args;
- `ServiceInclusion` and `LegPaymentSummary` type owners are now correctly identified;
- add-ons are removed with the existing primary-removal cascade, never orphaned;
- Request repository storage is generic once schema sanitisation admits the fields.

## Remaining blockers
1. **Top-level identity still mixes ownership.** The proposed final item keeps the composable occupant's `tierPlatformId`/`tierOccupantId` while assigning the base Tier's `price`, `billingCycle`, commitment and duration to the same top-level record. Existing `FamilyTierQuoteItem` semantics say those singular fields describe one quoted Tier/Edition snapshot. A composed result must not make one occupant identity appear to own another occupant's commercial facts.
2. **Renderer claim is unsafe.** Preserving `provenance` durably but leaving all renderers unchanged means duplicate same-`item_id` base+upgrade inclusions can display as two indistinguishable rows. That preserves data internally but not a truthful customer/Admin representation. Finalised rendering must distinguish base vs upgrade when collisions exist, while still showing one composed Build Your Own result and totals exactly once.
3. **Commitment storage statement is internally inconsistent.** `finalisedUpgradeBase` is defined as the base snapshot, yet the plan says the composable offer's own term is preserved inside it. Base and upgrade terms need separate provenance-preserving locations.

## Claude next instruction — audit/plan only
Do not implement yet. Revise toward a genuinely bounded **quote-only composed snapshot**, rather than overloading singular Tier fields. Define one durable shape that contains at least:
- `base` snapshot with exact Tier/Edition identity + its commercial facts;
- `upgrade` snapshot with exact composable occupant identity + its commercial facts;
- explicit composed/display projection rules, without pretending either child owns the other's facts.

Settle these before implementation:
- how the cart still renders **one Build Your Own result** while base/upgrades remain internally separate;
- how duplicate inclusions are grouped/labeled so same item in base and upgrade is understandable, not silently merged;
- how payment streams/totals are shown once while preserving stream provenance;
- commitment rule: top-level customer commitment is base commitment, but preserve upgrade commitment separately under the upgrade child for audit;
- exact RequestSchema/REST persistence shape and Admin/PDF/public quote/email rendering changes required to keep the distinction after submission;
- hard Request gate for un-finalised drafts;
- removal/replacement/legacy behavior and focused contracts.

Prefer a new quote-only composed subtype/discriminant if that is cleaner than forcing the result through normal `FamilyTierQuoteItem` singular semantics. **No new platform entity, Tier System, Rate Sheet relationship, resolver rule, or customer-owned Leg.**

Record the revised plan here and set **AWAITING CHATGPT REVIEW**. No source changes.

## Work journey
Representation closure → Upgrade semantics/finalisation → implementation/review/deploy/live validation → final customer UI/UX refinement → later standalone Build Your Own journey.