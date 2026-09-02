# Composable Tier — Phase 2A customer configuration policy

## Status
- **READY FOR CLAUDE — one final contract correction; no source implementation.**
- Auditor verdict: **Proceed with safeguards — plan still not accepted.**
- Production `main`: `1b2efd23064e3d2fac904c21fa4094912b132c41`.
- Phase 1 architecture is CLOSED.

## Accepted contract direction
The revised plan now correctly establishes:
- explicit inclusion modes `required | optional | excluded`;
- fixed Price Option means exactly the published occupant/Edition row selection, never an inferred fallback;
- customer cannot toggle/create Commercial Legs; the authored Leg structure is fixed in this phase;
- Bundle remains one commercial parent row; supplied children are display-only;
- server revalidates live policy and returns structured rejection, never silent substitution;
- no Rate Sheet IDs in public policy;
- no new Platform ID family;
- cart/request/PDF-email/promotions remain deferred.

## Final blocker — customer row choice vs Additional-Leg assignments
The proposal currently says policy is keyed only by `item_id` and governs only the row's top-level Default declaration, while `leg_assignments[]` retain independent Admin-authored quantity/Price Option values untouched.

That is unsafe unless the resolver defines the whole-row semantics explicitly. The same Rate Sheet inclusion may legally appear under Default + one/more Additional Legs. Example: customer deselects an optional `item_id` or changes its quantity, while an Additional Leg still contains that same `item_id` at its authored quantity/Price Option. The resulting quote could hide/change the customer's chosen inclusion but continue billing a different copy of it.

### Claude — resolve this contract question
Audit `projectTierRateSheetWith()` / Leg bucketing / `resolveCommercialLegTimeline()` and choose one explicit model:

**A. Whole-inclusion customer choice:** selecting/excluding an `item_id` applies to every occurrence of that inclusion across the fixed Leg structure. Quantity/Price Option customization must then define whether it propagates to all Leg occurrences or whether only selection propagates while per-Leg commercial values remain fixed and clearly non-customer-editable.

**B. Leg-occurrence customer choice:** policy key becomes `(leg identity, item_id)` and customer choices can differ by Leg occurrence. This is more expressive but risks exposing commercial-leg complexity and should be rejected unless source/product need genuinely requires it.

Prefer the smallest safe model; do not invent flexibility merely because the data structure permits it. The customer's visible inclusion list and the priced Leg timeline must never disagree about whether an inclusion is selected.

Also clarify these two points in the same correction:
1. **Edition policy inheritance:** if non-empty Edition policy is partial, define the exact merge algorithm and deletion/exclusion semantics. Otherwise make it complete replacement. Do not leave "non-empty overrides per item" undefined.
2. **TCV floor with open-ended streams:** if `minimum_total_contract_value` is configured but TCV resolves `null`, silently skipping the floor is not acceptable. Choose either (a) disallow/configuration-invalid floor for commercial structures whose TCV cannot be resolved, or (b) resolver rejects that customer selection as floor-unverifiable. No silent pass.

Return the corrected contract only, with source evidence and exact resolver semantics. Update this same file, set **AWAITING CHATGPT REVIEW**. No branch/source/build changes.