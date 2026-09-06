# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 1 only**
- Auditor verdict: **Proceed with safeguards**.
- Previous cart / PDF / email customer-output work is **CLOSED**.

## Audit result
Claude's source audit is accepted: the standalone Customer Selection Rules drawer is a second Admin projection over the same Build Your Own selected `rate_sheet_items`, joined by stable `item_id`; it is not a second inclusion store. Existing backend separation remains correct: commercial inclusion data stays in `rate_sheet_items[]`, customer-selection attributes stay in `customer_policy.items[]`.

Confirmed source facts:
- `customer_policy` already exists on occupant and Edition storage/projection.
- Edition `customer_policy` already has inherit-or-complete-replacement semantics.
- `settleTierEditionOverview()` settles Edition policy but currently prunes orphaned Leg assignments only; unlike `settleTierSlot()`, it does not prune stale customer-policy entries after final `rate_sheet_items` are known. This is a real resurrection hazard.

## Locked implementation direction
- Do **not** create another Tier/Inclusions module, per-inclusion module overview, drawer, route, or lifecycle.
- Future merged UI mounts customer-policy controls **once per inclusion `item_id`**, not once per Default/Additional Leg assignment.
- Preserve Bundle behavior exactly: a Bundle-backed Rate Sheet row may carry one policy entry for its own `item_id`; do not create policy controls for Bundle children.
- Do not expand Price Option policy in this work. Existing customer-policy `price_option` behavior remains unchanged.
- Keep customer frontend/resolver/pricing/Commercial Legs/quote/cart/Request/PDF/email/order/routing unchanged.
- Do not retire the standalone Customer Selection Rules drawer until the merged occupant UI is implemented and validated.
- The current published-occupant eligibility gate is not to be weakened implicitly during consolidation. Any change to when policy can first be authored must be reviewed separately in the occupant-UI phase.

## Accepted phased plan
1. **Phase 1 — Edition stale-policy prune parity** (now authorized).
2. Phase 2 — merge existing customer-policy row controls into Build Your Own Inclusions as a controller/capability while preserving backend module/draft semantics.
3. Phase 3 — after Phase 2 validation, retire the duplicate standalone drawer/action/routing only.
4. Phase 4 — wire the same inclusion-row capability into Tier Catalogue Edition Inclusions using the Edition's existing consolidated session; no new Edition module/route.
5. Later shell refinement: View / Editions / Featured / other existing data. Featured remains derived from `customer_policy.items[].featured`, never separate storage.

## Claude — implement Phase 1 only
From clean current `main`:
- add stale `customer_policy` pruning in `settleTierEditionOverview()` at the same post-final-selection point/order used by occupant `settleTierSlot()`;
- reuse `pruneStaleCustomerPolicy()`; do not alter its semantics;
- add focused Edition contract proving: remove selected `item_id` + settle => policy entry is removed; re-adding the same `item_id` later does not resurrect old policy;
- no UI/source changes outside what the focused backend fix/test/docs require;
- run focused contract, relevant PHP validation, docs check as applicable;
- update affected Code Map only if current-state responsibility text needs correction;
- report exact files/tests/review branch/SHA here and set **AWAITING CHATGPT REVIEW**;
- do not push `main` before audit.