# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- Claude's audit/phased plan is recorded below. No source edited, no implementation started.
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

## Audit — ownership/data-flow map (confirmed against source, not code maps alone)

```
PoolInclusionsEditor.tsx (rate-sheet branch, 128–207)     CustomerPolicyEditor.tsx (42–183)
  row key = item_id; InclusionAssignmentCard per            row key = item_id; findItem(draft,item_id)
  Default Leg + leg_assignments[]                           mode/default_selected/qty-bounds/featured
        ▲ same detail.rate_sheet_selections (filtered .resolved) ▲
        └──────────── usePackageStation.tierView(COMPOSABLE_TIER_ID).detail ────────────┘
  saveTierFeatures → drafts.features            saveTierCustomerPolicy → drafts.customer_policy (wrapped {value})
        └──────────────────┬──────────────────────────────────────┘
                    settleTierSlot() → upsertOccupant() → pruneOrphanedLegAssignments() → pruneStaleCustomerPolicy()
```

**Confirmed: the standalone drawer is a pure duplicate projection.** `useTierCustomerPolicyDrawerController.ts` sources rows from `detail.rate_sheet_selections.filter(resolved)` — the same selections `PoolInclusionsEditor` renders. `CustomerPolicyEditor.tsx` has no add/remove affordance and no independent `item_id` set; it only annotates rows that already exist. Both are `TIER_MODULES` siblings (`features`, `customer_policy`) settled together in one `settleTierSlot()` call but saved via two separate REST round-trips today.

## Reuse / extract / retire
- **Reuse unchanged**: `PoolInclusionsEditor`/`InclusionAssignmentCard` (also shared by Edition Inclusions via `TierEditionDeclarationSwitcher`), `CustomerPolicyItem` shape, `settleTierSlot()`'s upsert→prune-legs→prune-policy order, all resolver/projection code (`resolveCustomerComposableSelection`, `presentCustomerPolicy`, `ComposableOfferBrowser.tsx`'s Featured join) — none of this needs to move.
- **Extract**: the per-row policy controls out of `CustomerPolicyEditor.tsx` into a small presentational block that `InclusionAssignmentCard`'s row (or a sibling slot in the same row) can mount, driven by a `CustomerPolicyItem | undefined` + `onChange` prop pair — not a rewrite of `CustomerPolicyEditor`'s logic, a relocation of its render.
- **Retire once Phase 3 (below) lands**: `TierCustomerPolicyDrawerContent.tsx`, `TierCustomerPolicyDrawerHost.tsx`, `tierCustomerPolicyDrawerTypes.ts`, `tierCustomerPolicy.ts` entity, `tierCustomerPolicy.tsx` binding, and `withComposableCustomerOptionsAction()`'s "Customer Options" card action. Backend `customer_policy` module/draft/REST/prune stays exactly as-is — only the frontend surface retires.

## Hidden hazards
1. Two separate drafts/module keys/REST saves today; merging the row UI must not silently merge the drafts into one payload without preserving each module's own draft tri-state (`undefined` = no draft vs `{value:null}` = explicitly cleared) — collapsing that distinction breaks `settleTierSlot()`'s draft-preferred logic.
2. `CustomerPolicyItem` has no Leg dimension (policy never mentions a Leg) while a `PoolInclusionsEditor` row can expand into one Default + N Leg-assignment cards under one `item_id` — the merged row must attach policy controls once per `item_id`, never once per Leg-assignment card.
3. The standalone drawer gates entirely on `detail.enabled === true` (published occupant); `PoolInclusionsEditor` has no such gate. Losing this on merge would let policy be authored against an unpublished occupant.
4. **Real pre-existing bug, independent of this consolidation**: `settleTierEditionOverview()` calls `pruneOrphanedLegAssignments()` but never `pruneStaleCustomerPolicy()`, unlike the occupant's `settleTierSlot()`. An Edition-level policy entry for a removed-then-re-added `item_id` can resurrect today. Fix is a one-line addition mirroring the occupant path.
5. Bundle rows (`row.bundle_id`) render read-only in `PoolInclusionsEditor`; `CustomerPolicyEditor` currently treats a Bundle row like any other `item_id`. Needs an explicit decision on whether policy controls appear on Bundle rows in the merged UI.
6. Price Option asymmetry (Admin can pick a specific price option for the occupant; policy can never restrict which option a customer picks — permanently `{mode:'fixed'}`) becomes visually obvious once both controls sit in one row. Out of scope to fix here; should be called out in the merged UI copy, not silently hidden.

## Edition policy ownership — no new module/drawer/route
Backend already supports per-Edition `customer_policy` correctly (draft field, `settleTierEditionOverview()` draft-preferred settle, `null`-means-inherit-from-occupant / non-null-means-complete-replacement, correct public read-side inherit-or-override) — entirely unused by the frontend today. Plan: add `customer_policy` to `useTierEditions.ts`'s `TierEditionOverviewDraft` type, thread it into `TierEditionDeclarationSwitcher`'s existing Inclusions tab using the SAME merged row component built for the occupant (parameterized by an `editionId`-scoped draft instead of the occupant's), fix hazard #4 alongside it. No new drawer, route, or module — the Inclusions tab already exists.

## Phased implementation plan (each independently reviewable)
- **Phase 1 — backend parity fix only.** Add `pruneStaleCustomerPolicy()` to `settleTierEditionOverview()`, mirroring the occupant path. No UI change. Contract: extend `tests/composable-customer-policy-admin-surface.php` (or a new Edition-scoped test) to assert prune-after-settle for Editions. Non-change boundary: nothing customer-facing, no occupant-path change.
- **Phase 2 — occupant UI merge.** Relocate `CustomerPolicyEditor`'s per-row controls into `PoolInclusionsEditor`'s row (occupant only), preserving both module drafts/REST calls under one Save action, preserving the `enabled` gate (disable/hide policy controls when not yet published), deciding Bundle-row and price-option handling from hazards #2/#5/#6. Contract: extend existing draft-shape contract to cover the combined session; `tsc`/build. Non-change boundary: no Edition change yet, no customer frontend change, no backend save-order change.
- **Phase 3 — retire the standalone drawer.** Delete the files listed under Retire above once Phase 2 is live-validated; keep backend module/REST untouched. Contract: grep for dead imports/registrations of the retired drawer key; full contract suite green.
- **Phase 4 — Edition parity.** Wire `customer_policy` into `TierEditionDeclarationSwitcher`'s Inclusions tab via the same merged row component from Phase 2, `editionId`-scoped. Contract: Edition-scoped save/settle/inherit-or-override test. Non-change boundary: occupant path untouched, customer frontend untouched.

Every phase's hard non-change boundary (restated): Upgrade Your Build / Build Your Own customer UX, resolver, pricing, Commercial Legs, quote/cart, Request, PDF/email/order, and customer routing.

## Recommendation for safest first phase
**Phase 1.** It is a real, independently-confirmed bug fix (not a UI change), touches only `settleTierEditionOverview()`, has a direct precedent to mirror (`settleTierSlot()`'s own three-call order), and is fully contract-testable with zero frontend or customer-facing risk — the lowest-risk way to start this work and unrelated to whether Phases 2–4's UI approach gets adjusted on review.