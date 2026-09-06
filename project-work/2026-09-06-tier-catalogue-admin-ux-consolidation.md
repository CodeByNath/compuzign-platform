# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 2 only**
- Auditor verdict: **Proceed with safeguards**.
- Phase 1 is accepted/closed within this work item: `main@bfb203c776b3d4927ee7c34c54db31d80dc13bb9`, deployment run `34030530788` attempt 2 succeeded, landed review branch removed.
- Customer-frontend trace remains the compatibility contract.

## Phase 1 verification
Independent checks confirm:
- exact approved source is on `main`;
- deployment retry completed successfully for exact `bfb203c7...` with no source change;
- landed Phase 1 review branch is gone from origin;
- `review/composable-tier-customer-ux` is also gone;
- `review/quote-email-billed-item-separators` remains because that separate work is still active.
No browser gate is required for the Phase 1 backend-only hygiene fix.

## Locked architecture for Phase 2
Merge the existing Customer Selection Rules **authoring controls** into the existing Build Your Own / Tier Catalogue occupant Inclusions editor. This is a controller/capability merge, not a new module.

Must remain true:
- one Inclusions module and existing inclusion rows/cards;
- customer-policy controls appear once per selected inclusion `item_id`, never once per Default/Additional Commercial Leg assignment;
- commercial inclusion state remains `rate_sheet_items[]`; customer selection state remains `customer_policy.items[]`;
- preserve separate draft/module semantics and existing REST authorities — one Admin Save interaction may coordinate them, but do not collapse backend storage or lifecycle contracts;
- preserve published-occupant eligibility: do not enable customer-policy authoring earlier than the current standalone controller allows;
- "Not offered" must preserve the current write convention by removing that policy item, not storing a new explicit excluded entry;
- Bundle-backed Rate Sheet row may have one policy controller for the Bundle row `item_id`; never create controls for Bundle children;
- no Price Option policy expansion;
- do not change Edition UI in this phase;
- do not retire/delete the standalone Customer Selection Rules drawer/action/route in this phase — keep it as rollback/parity surface until the merged UI is live-validated;
- no customer frontend/resolver/projection/pricing/Commercial Legs/quote/cart/Request/PDF/email/order/routing changes.

## Claude — implement Phase 2 only
From clean current `main@bfb203c7...`:
1. Extract/reuse the existing per-item customer-policy control logic from `CustomerPolicyEditor` into a cohesive controller/presentational capability suitable for mounting inside the existing inclusion row/editor. Do not duplicate policy mutation logic.
2. Wire that capability only for the Tier Catalogue / composable occupant's existing Inclusions surface. Ordinary Tier occupants must remain unchanged.
3. Policy controls must bind to the inclusion's stable `item_id` and render once at the inclusion level, outside any per-Leg assignment repetition.
4. Preserve the existing customer-policy draft tri-state and save/reopen/discard semantics. If one visible Save coordinates inclusion + policy drafts, each existing module endpoint/storage authority must still receive its own correct payload and failure must not be falsely reported as full success.
5. Keep the current standalone Customer Selection Rules surface functional and data-equivalent during this phase.
6. Add/extend focused contracts proving identical policy payload semantics for required/optional/not-offered, default-selected, quantity bounds and featured; prove ordinary Tier inclusions receive no policy controls; prove Bundle children receive none; keep the accepted customer-facing parity contracts green without changing assertion intent.
7. Run `tsc`, focused Admin contracts, relevant customer-policy/resolver/preview/quote/request/notification contracts, docs check, and build if source changes require generated assets.
8. Update affected Code Map/current docs only as needed.
9. Push one clean review branch from current `main`, record exact branch/SHA/files/tests here, and set **AWAITING CHATGPT REVIEW**.

Do not push `main`. Do not start Phase 3 or Edition work. Live Admin validation will be required after Phase 2 is deployed before the old duplicate drawer can be retired.