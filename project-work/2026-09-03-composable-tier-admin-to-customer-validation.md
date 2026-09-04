# Composable Tier — continuous work track

## Status
- **AWAITING CLAUDE RESPONSE — revised Upgrade Finalisation plan still unsafe; no source changes approved.**
- Auditor verdict: **Stop — architectural risk.**
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; Hostinger run `33835470825` succeeded on that SHA.

## Locked journey
**Upgrade your build** and standalone **Build Your Own** are different journeys.

Upgrade starts from an exact selected normal Tier/Edition, allows only Admin-authorised composable inclusions/quantities, remains tied to that exact base while in progress, requires explicit **Finalise build**, and only then becomes the final Build Your Own quote result. Standalone Build Your Own remains deferred and must not simply load beside normal Tier cards.

## Auditor review of Claude revision
The revision correctly fixes the first plan's fatal omission by recognising that the composable preview contains only upgrade pricing/inclusions, not the base plan.

However, flattening `primary.inclusionItems + composable.inclusionItems` and `primary.legPaymentSummaries + composable.legPaymentSummaries` into today's single `FamilyTierQuoteItem` is still not safe enough:

1. **Identity/provenance is lost.** The resulting line still has one `tierPlatformId`, one `tierEditionPlatformId`, one `tierOccupantId`, one `tierTitle`, etc., but its commercial facts now come from two different occupants. Existing fields no longer truthfully identify the snapshot they describe.
2. **Headline/commitment semantics are unresolved.** `price`, `billingCycle`, `minimumTermValue`, `minimumTermUnit`, and `planDurationMonths` are singular fields. The plan did not define which source owns them after composition or how conflicting base/upgrade terms are represented.
3. **Inclusion collision is unresolved.** The same inclusion may legitimately exist in the base and upgrade selections. Blind concatenation can create duplicate `item_id` rows with no preserved source/role explaining whether they are additive, separate commercial streams, or presentation duplicates.
4. **Add-on handling contradicts current architecture.** Current source explicitly states Tier add-ons only make sense paired with a primary and `removeFamilyTierSystemQuoteItems()` removes them with the primary. Preserving add-ons after deleting the primary would create the orphan state the existing cart deliberately prevents.
5. Request/PDF/email generic rendering is only safe if the final stored shape has unambiguous meaning; "one existing FamilyTierQuoteItem with mixed provenance" has not met that bar.

The proposed hard gate on Request submission while a draft exists is accepted directionally.

## Claude next instruction — audit/plan only
Revise again before source editing. Prefer a **bounded quote-only composed snapshot structure** rather than forcing two resolved occupants into today's singular Tier fields. It may still render as one Build Your Own cart line, but must preserve base-vs-upgrade provenance internally.

Define exactly:
- final snapshot structure and identities;
- ownership of headline, commitment, duration, inclusions and payment streams;
- duplicate-inclusion semantics;
- add-on rule consistent with existing architecture (either absorb with explicit provenance or remove/reject — never orphan);
- Request/PDF/email persistence/rendering exactly once;
- finalisation/removal/replacement/legacy behavior;
- hard Request gate for un-finalised drafts;
- exact files/contracts and non-change boundaries.

No source changes. Record the revised plan here and set **AWAITING CHATGPT REVIEW**.

## Work journey
Representation closure → Upgrade semantics/finalisation → implementation/review/deploy/live validation → final customer UI/UX refinement → later standalone Build Your Own journey.