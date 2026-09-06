# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Phase 3 implemented on a review branch**
- Auditor verdict: **Proceed with safeguards**.
- Phase 2 is accepted on deployed `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.
- The customer Always-included initial-cart hydration defect discovered during validation is tracked separately and does not reopen Phase 2 Admin architecture.

## Phase 2 acceptance
Accepted evidence:
- merged Customer Selection controls render once per top-level Build Your Own inclusion;
- ordinary Tier/Add-on remains unchanged;
- access modes, Selected by default, quantity bounds and Featured persist;
- standalone Customer Selection Rules and merged Inclusions are two-way data-equivalent;
- Leg ownership remains one policy entry per `item_id`;
- Bundle supplied children do not receive controllers;
- save sequence remains separate features -> customer_policy authority;
- deployment correspondence independently verified.

The standalone Customer Selection Rules drawer was intentionally retained only as a Phase 2 rollback/parity surface. Its purpose is now exhausted.

## Locked Phase 3 architecture
For a selected Build Your Own / Tier Catalogue occupant, replace the duplicate Customer Selection Rules destination with a simple declaration navigation:

`Default | Editions`

- **Default** is the existing Build Your Own occupant workspace. Its existing Details/Inclusions/Pricing Rules/etc. remain exactly the same; customer-selection authoring stays embedded in the existing inclusion rows.
- **Editions** switches the same right-side Admin workspace to the existing Tier Catalogue Edition list/detail/session. Reuse the current Edition controller/state/lifecycle and CZTEC children. Do not create a second Edition system, route, entity, draft model or identity family.
- Remove/retire the standalone **Customer Selection Rules** action/drawer/route from the Build Your Own Admin navigation only after the new navigation is wired.
- Do not create a new Customer Selection tab/module. The policy editor no longer owns an independent Admin destination.
- Keep backend `customer_policy` storage, draft semantics, REST authority and publish lifecycle unchanged.
- Do not change customer frontend, resolver, pricing, quote/cart, Request/PDF/email/order, or routing in this phase.

## Claude — Phase 3 implementation report

Done. Not pushed to `main`.

- **Branch**: `review/tier-catalogue-declaration-navigation`, created from production `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.
- **Commit**: `4ae6505c` — "Replace standalone Customer Selection Rules drawer with Default | Editions navigation". 31 files changed, +264/-938 lines.
- **How `Default | Editions` works** (items 1-5): View/Edit on the composable card already ARE `Default` (unchanged — same occupant workspace, Details group). A new `Editions` action is added unconditionally (`withComposableEditionsAction()`, no eligibility gate — Edition management never required Default to be published, matching every ordinary Tier's own Options group) and opens the SAME Tier drawer composition forced onto its existing Options group (`TierEditionDeclarationSwitcher`, untouched) via a new `tier-editions` drawer-template key (`TierEditionsDrawerHost.tsx`, a thin wrapper adding one additive `initialTierGroup` prop to `TierDrawerContentProps`, seeding `useTierDrawerController`'s existing `tierTab` state — every other entry point omits it and still defaults to `'details'`). No new controller, endpoint, or identity; `useTierEditions`/`TierEditionDeclarationSwitcher` are byte-unchanged. Switching tabs on an already-open drawer already preserves `selectedDeclarationId` independently of `editingSection`/tab state (pre-existing behavior, unaffected) and never mutates Edition data on its own.
- **Retired standalone drawer** (item 6): 7 files deleted outright (entity, binding, content, controller, host, routing types, editor) plus the retired module's own notification definition (`tierCustomerPolicyModule`) — not merely unregistered. `PackageTierWorkspace.tsx`'s two `onAction` handlers no longer special-case an action id; `view`/`edit`/`editions` now all flow through the same existing `dispatchTierIntent`. The middle shell's own "View/Edit Customer Options" launch button is removed (redundant — View/Edit already reach the merged Inclusions controls); its Featured-inclusions/policy-stats summary is untouched. `customerPolicyFields.tsx` (shared mutation/lookup authority) and all backend `customer_policy` module/draft/REST/lifecycle code are untouched, per the boundary.
- **New contract** (item 7): `scripts/tier-catalogue-declaration-navigation-contract.ts` — real behavior against `withComposableEditionsAction` (unconditional, additive, ordinary-Tier exclusion), filesystem proof the 7 retired files are gone, source proof no `customer-options`/`tier-customer-policy` registration remains anywhere, proof Editions reuses `TierDrawerHost`/`TierEditionDeclarationSwitcher` verbatim (no new state/hook), proof the Phase 2 merged inclusion controls still render, and proof no customer-facing file (`ComposableOfferBrowser.tsx`, `FamilyTierAdapter.tsx`) references any of this phase's new symbols. Updated the retired drawer's own now-obsolete contract (deleted) and the composable Admin UX contract's stale dispatch-string assertions (§5) to match the new generic dispatch.
- **Docs** (item 9): deleted `docs/code-map/tier-composable-occupant-admin-customer-policy.md` (fully retired architecture) and fixed its 4 inbound "Related Code Maps" links plus the `000-README.md` index entry; updated `tier-composable-occupant-admin-ui.md`'s Phase 2/3 narrative; updated `package-station/CLAUDE.md`'s Validation list (removed the now-deleted contract script name, added the two new ones).
- **Validation run** (item 8, all green): `npx tsc --noEmit`; `npm run build`; `npm run docs:check` (117 Markdown files, 46 Code Maps); 28 contracts including `tier-catalogue-declaration-navigation`, `tier-inclusions-customer-policy-merge`, `composable-tier-admin-ux`, `composable-occupant-workspace`, `composable-occupant-address`, `tier-customer-policy-draft`, `tier-edition-admin`, `tier-edition-switch`, `tier-edition-move-to-bin`, `tier-occupant-inclusions-bundle`, `tier-rate-sheet-catalogue-bundle`, `tier-instance-scope`, `tier-instance-tool`, `tier-overview-is-addon`, `tier-catalogue-overview-presentation`, `package-family-capability`, `package-tier-workspace`, `package-tier-workspace-shell`, `tier-system-drawer`, `tier-lifecycle-menu`, `tier-connections`, `tier-settings`, `drawer-module-entry`, `composable-offer-choice`, `composable-offer-contribution`, `composable-quote-cart`, `composable-request-line`, `composable-live-correction`. No PHP/backend/customer source changed, so no PHP tests were re-run.
- **Unresolved risks**: none identified. Live Admin browser validation of the new `Default | Editions` navigation is required before this can be considered fully closed, same as Phase 2.

Do not push `main` before approval. The separate Always-included cart hydration defect was not touched.