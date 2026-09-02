# Composable Tier — Phase 2A customer configuration policy

## Status
- **AWAITING CHATGPT REVIEW — final blocker resolved below, no source touched.**
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

## Claude Report — final correction

**Model A (whole-inclusion), resolved via existing structure, not new bucketing logic.** Per Round-2 evidence, `leg_assignments[]` lives **nested inside** its own `rate_sheet_items[]` row (`{item_id, quantity, price_option_id, leg_assignments}` — `PackageSchema.php:98-101`), and `resolveCommercialLegTimeline()`'s bucketing reads Default's items from that same top-level array, each Leg's own bucket only from that array's own nested `leg_assignments`. This means removing a row from a **copy** of `rate_sheet_items[]` structurally removes it from every bucket at once — Default's AND every Leg's — in one operation, with zero changes to `resolveCommercialLegTimeline()`/`projectTierRateSheetWith()` itself.

**Resolver mechanism:** build a customer-scoped copy of the container's `rate_sheet_items[]` (original occupant storage untouched):
1. Drop any row whose `item_id` resolves to `excluded`, or `optional` + not selected by the customer. This removes the row's own top-level entry AND its nested `leg_assignments[]` together — no inclusion can survive under a Leg while absent from the customer's visible list, because there is structurally nowhere left for it to survive.
2. For every remaining row, if the policy allows it, overwrite only that row's own top-level `quantity`/`price_option_id` with the customer's chosen values. **Never touch `leg_assignments[]`** on any row — a Leg's own per-window quantity/Price Option stays exactly as Admin authored. This is intentionally asymmetric with step 1: presence/absence must agree everywhere (the actual defect the auditor found), but two independent commercial components legitimately differing in quantity/price has always been valid in this resolver (Default vs. Leg were never required to match) — customizing the customer's base purchase doesn't retroactively edit a separately-authored Leg-window deal.
3. Hand this adjusted copy to the unmodified `resolveCommercialLegTimeline()`. Smallest safe model: no `(leg, item_id)` policy key, no new bucketing code, exclusion consistency is structural rather than asserted.

**Edition policy inheritance — complete replacement, not a merge.** Per the auditor's own fallback: a non-empty Edition `customer_policy` is the Edition's **entire** policy, exactly mirroring how non-empty `inclusions_override` already works for Editions (a full replacement list, never a per-item patch against Default's). Any item present in the Edition's own resolved inclusions but **absent** from its own non-empty policy array defaults to `excluded` — never falls back to Default's policy entry for that item, which is exactly the undefined-merge path being rejected. No merge algorithm exists because there is no merge: empty policy = inherit Default's wholesale; non-empty policy = this Edition's complete, exclusive answer.

**TCV floor with open-ended streams — invalid at configuration time, not silently skipped.** Whether a Leg structure resolves to an open-ended (null) TCV is a fixed, Admin-authored fact — Legs are fixed this phase, and by resolve-time every remaining item is already validated/available, so nullness at this stage can only come from genuinely open-ended Leg cadence, never from customer choice. Therefore: **(a) primary enforcement at save-time** — `sanitizeCustomerPolicy()` computes the occupant's/Edition's own fixed-Leg-structure TCV once (same aggregator, no customer selection involved) and rejects/ignores a configured `minimum_total_contract_value` if that structural TCV is unresolvable, so the invalid state can never be saved. **(b) defensive backstop at resolve-time** — if a floor is nonetheless present against an unresolvable TCV (e.g. a stale record), the resolver rejects the entire customer selection with a distinct top-level code `floor_unverifiable`, never a silent pass. No silent skip in either path.

**Everything else from Rounds 1-2 stands:** rung-1 classification, no new Platform ID family, Bundle one-row/no special-case, required/optional/excluded inclusion model, fixed-Price-Option-means-published-selection, structured per-item rejection vocabulary, cart/request/PDF/promotions deferred.