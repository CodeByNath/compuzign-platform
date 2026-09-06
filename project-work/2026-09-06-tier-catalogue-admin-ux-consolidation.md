# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — customer-frontend trace audit only; NO implementation yet**
- Auditor verdict: **Proceed with safeguards**.
- Previous cart / PDF / email customer-output work is **CLOSED**.

## Correction to prior handoff
Do **not** implement the previously proposed Phase 1 yet. Before approving any source change, we need an exact source-backed map of what the existing `customer_policy` fields drive on the customer frontend. This audit becomes the required gate before implementation.

## Confirmed Admin architecture
The standalone Customer Selection Rules drawer is a second Admin projection over the same Build Your Own selected `rate_sheet_items`, joined by stable `item_id`; it is not a second inclusion store. Commercial inclusion data stays in `rate_sheet_items[]`; customer-selection attributes stay in `customer_policy.items[]`.

Locked future direction remains:
- one Inclusions module; no new Tier/Inclusions module, per-inclusion module overview, drawer, route, or lifecycle;
- customer-policy controls mount once per inclusion `item_id`, not once per Commercial Leg assignment;
- Tier Catalogue Editions use their existing consolidated Edition Inclusions/session; no new Edition route/module;
- Featured remains derived from policy flags, never separate storage;
- customer frontend is a hard non-change boundary unless this audit proves a required compatibility change.

## Claude task — trace current customer behaviour end to end
Audit current `main` only. Do not edit source. For each current policy field/state, trace the exact path:

`Admin authoring field -> stored customer_policy shape -> public/read projection -> resolver -> customer component -> visible/interactive behaviour`

Cover at minimum:
1. `mode = required | optional | excluded`, including the meaning of a missing policy entry;
2. `default_selected`;
3. `quantity.default/min/max/step`;
4. `featured` and its exact sort/highlight/render effect;
5. `price_option` current fixed/choice behaviour, even if Admin cannot author choice today;
6. occupant policy vs Edition policy inheritance/replacement;
7. Bundle-backed rows and whether policy acts on the Bundle row only or its supplied children;
8. published/unpublished eligibility and what reaches the customer when policy is absent or pending;
9. exact customer files/functions involved in Upgrade Your Build / Build Your Own, including resolver/projection boundaries;
10. any route-specific difference between Upgrade and Build Your Own consumption of the same Tier Catalogue policy.

## Required output in this same file
Record:
- a compact field-by-field behaviour table;
- exact authoritative source paths/functions for each hop;
- any hidden coupling that means moving Admin controls could accidentally change customer behaviour;
- the customer-facing parity contracts/tests we must lock before any Admin UI merge;
- whether the previously found Edition stale-policy prune issue is still safe to fix independently after this trace.

Set status **AWAITING CHATGPT REVIEW** when complete. Do not edit source, do not create a review branch, and do not implement Phase 1 yet.