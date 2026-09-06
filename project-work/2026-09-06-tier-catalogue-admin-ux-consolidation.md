# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 3 only**
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

## Claude — implement Phase 3 only
From clean current `main@3cc88e83...`:
1. Identify the existing Build Your Own shell/action that opens standalone Customer Selection Rules and remove that duplicate destination from the active Admin navigation.
2. Add `Default | Editions` as the declaration-level navigation for the selected Build Your Own occupant, using existing shell/tab patterns where possible.
3. `Default` must render the existing occupant workspace without changing its module content or lifecycle.
4. `Editions` must reuse the existing `useTierEditions` / Edition declaration switcher/controller/session. No duplicated Edition state, no new endpoint, no new identity semantics.
5. Preserve selected Edition identity when switching within the Editions side where current architecture already supports it; returning to Default must not mutate Edition data.
6. Remove only the now-obsolete standalone Customer Selection Rules Admin entry point/presentation. Do not remove the shared customer-policy fields or backend policy endpoints used by merged Inclusions.
7. Add/update focused contracts proving: Build Your Own gets `Default | Editions`; ordinary Tier/Add-on navigation is unchanged; no standalone Customer Selection Rules destination remains for Build Your Own; merged inclusion policy controls remain; existing Edition lifecycle/controller is reused; no customer source changes.
8. Run tsc, focused Admin/Edition/customer-policy contracts, docs check and build as required.
9. Update affected Code Map/current docs only as needed.
10. Push one clean review branch from current `main`, record exact branch/SHA/files/tests here, and set **AWAITING CHATGPT REVIEW**.

Do not push `main`. Do not touch the separate Always-included cart hydration defect in this phase.