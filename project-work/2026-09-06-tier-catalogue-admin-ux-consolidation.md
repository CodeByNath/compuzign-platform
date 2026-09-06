# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 1 only**
- Auditor verdict: **Proceed with safeguards**.
- Customer-frontend trace is accepted as the compatibility contract for later Admin consolidation.
- Previous cart / PDF / email customer-output work is **CLOSED**.

## Accepted architecture / customer coupling
The separate Customer Selection Rules drawer is a second Admin projection over the same selected Build Your Own `rate_sheet_items`, keyed by stable `item_id`; it is not a second inclusion store. Keep backend separation: `rate_sheet_items[]` owns commercial inclusion data, `customer_policy.items[]` owns customer-selection attributes.

Customer behaviour that must not change in later UI phases:
- no policy entry = not offered/excluded;
- `required` = mandatory, `optional` = customer selectable, `excluded`/absent = not rendered;
- `default_selected` seeds optional state but an explicit customer deselection must stay deselected;
- quantity min/default/max/step constrain the customer stepper and invalid submissions fail rather than clamp;
- `featured` is merchandising only;
- current Admin authors policy Price Option as fixed only; do not expand this here;
- Edition policy `null` inherits the occupant policy wholesale; non-null Edition policy is a complete replacement;
- Bundle policy applies only to the Bundle row's own `item_id`, never Bundle children;
- unpublished occupant is not exposed; published occupant with no policy exposes no selectable rows;
- Upgrade / future standalone Build Your Own share the same customer policy component path. Do not alter either context or their route logic in this work.

The current source finding that standalone Build Your Own has no live mounted entry point is informational only. Do not change routing or create an entry point in this work.

## Locked Admin direction
- one Inclusions module; no customer-policy module/card per inclusion;
- mount customer-policy controls once per inclusion `item_id`, not per Commercial Leg assignment;
- preserve the existing Admin write convention: choosing "Not offered" removes the policy item rather than persisting an explicit excluded entry;
- preserve the published-occupant authoring eligibility rule unless a later phase explicitly audits and changes it;
- Tier Catalogue Editions use their existing consolidated Edition session/Inclusions surface; no new Edition drawer/route/module;
- Featured remains derived from `customer_policy.items[].featured`, never separate storage;
- do not retire the standalone Customer Selection Rules drawer until the merged occupant UI is implemented and live-validated.

## Required parity gate for later UI phases
Keep the existing customer-policy/resolver/preview/quote/cart/request/notification and TS choice/contribution/live-correction contracts green without changing their assertion intent. The Admin merge is presentation/authoring consolidation only; stored shape, projection, resolver and customer behaviour remain authoritative.

## Phased plan
1. **Phase 1 — Edition stale-policy prune parity** — authorized now.
2. Phase 2 — merge existing customer-policy controls into Build Your Own inclusion authoring as a controller/capability while preserving separate backend drafts/module semantics.
3. Phase 3 — only after Phase 2 live validation, retire the duplicate standalone Customer Selection Rules drawer/action/route.
4. Phase 4 — add the same inclusion-row capability to Tier Catalogue Edition Inclusions through the Edition's existing consolidated session.
5. Later Admin shell refinement: View / Editions / Featured / other existing data.

## Claude — implement Phase 1 only
From clean current `main`:
- in `settleTierEditionOverview()`, call existing `pruneStaleCustomerPolicy()` after Edition `rate_sheet_items` are final / after `pruneOrphanedLegAssignments()`, before final sanitize, mirroring occupant settle order;
- do not alter `pruneStaleCustomerPolicy()` semantics or any resolver/public/customer code;
- add focused Edition regression coverage proving removed inclusion policy is pruned on settle and re-adding the same `item_id` does not resurrect the old rule;
- run focused PHP validation and relevant existing customer-policy contracts; no browser validation is required for this backend-only phase;
- update current Code Map only if needed to accurately record Edition prune parity;
- push one clean review branch from current production `main`, report exact branch/SHA/files/tests here, set **AWAITING CHATGPT REVIEW**;
- do not push `main` before auditor approval.