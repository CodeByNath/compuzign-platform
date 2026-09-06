# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — audit and propose phased plan only**
- Auditor verdict: **Proceed with safeguards**.
- Previous cart / PDF / email customer-output work is **CLOSED**. Do not wait on that file.

## Mandatory Claude bootstrap for this work
Before doing anything else, sync the remote coordination branch and verify you are reading the latest `origin/Project-work-instructions`, not a stale local copy. Then read `project-work/AGENTS.md` and this file. If your local copy still shows the quote/PDF/cart work as `AWAITING LIVE VALIDATION`, you are stale: resync before acting.

This file is the active work item. Claude should proceed immediately with the audit below. No source implementation yet.

## User goal
Consolidate Build Your Own / Tier Catalogue Admin authoring so the same selected inclusions are not rendered twice merely to attach customer-selection metadata.

Current shape to audit:
- Build Your Own Inclusions already owns selected `rate_sheet_items` and edits price option, quantity, and Commercial Leg assignments.
- Separate Customer Selection Rules drawer re-renders those same selected inclusions and attaches `customer_policy.items[]` metadata by the same `item_id`: mode, default-selected, configurable quantity bounds, featured.
- `customer_policy` is attribute data keyed to existing inclusions, not a second inclusion store.
- Featured is already a flag on the policy item, not a second authoritative list.

## Locked direction
Do **not** add Customer Policy as another Tier/Inclusions module/card. Do not create per-inclusion module overviews.

Instead, audit how to add the existing customer-policy **controller/capability directly to the existing Build Your Own inclusion authoring row/editor**:
- one Inclusions module;
- same inclusion row;
- existing commercial controls stay where they are;
- customer-selection controls join the same row/session by stable `item_id`;
- backend separation may remain `rate_sheet_items[item_id]` + `customer_policy.items[item_id]` if that is still the safest model;
- no duplicate lifecycle/module status.

Tier Catalogue Editions must receive the same capability through their existing consolidated Edition Inclusions/session — no new drawer/route/module.

Customer frontend is a hard non-change boundary: Upgrade Your Build / Build Your Own UX, resolver, pricing, Commercial Legs, quote/cart, Request, PDF/email/order and customer routing remain unchanged.

A later Admin shell refinement may add compact tabs such as **View | Editions | Featured | other existing data**. Featured must remain a derived projection from inclusion policy flags, not separate storage.

## Claude task — AUDIT ONLY, NO IMPLEMENTATION
Read current `main`, root `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps, and all source paths involved in:
- Build Your Own/composable inclusion editor;
- standalone Customer Selection Rules drawer/controller/entity/route/launch action;
- `customer_policy` draft/save/settle/prune path;
- Tier Edition draft/editor/save/settle/resolver path;
- customer composable resolver/projection and Featured ordering.

Update this same work file with:
1. exact current ownership/data-flow map and confirmation whether the second drawer is only a duplicate projection over the same selected inclusion IDs;
2. exact source/components to reuse, extract, retire, or leave untouched;
3. hidden lifecycle/data-migration hazards, especially save/settle parity and stale-policy pruning;
4. how Edition policy ownership should be added without a second Edition module or route;
5. a small phased implementation plan, each phase independently reviewable, with tests/contracts and explicit non-change boundaries;
6. recommendation for the safest first implementation phase only.

Do not edit source. Do not start implementation. Set status **AWAITING CHATGPT REVIEW** when the audit/plan is recorded.