# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 3 correction only**
- Auditor verdict: **Proceed with safeguards**.
- Phase 2 remains accepted on deployed `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.
- Phase 3 review head `4ae6505c...` is **not approved for main**.

## Final approved UX clarification
Scope tabs belong **inside the existing Customer Selection Rules summary area**. Do not turn this into a separate Editions workspace, third card action, or duplicated Edition editor.

The panel gains one scope tab per declaration:

`Default | Edition 1 | Edition 2 | ...`

Default is selected initially. Each Edition tab is the existing Build Your Own Edition already managed under Build Your Own -> Options and must remain tied to that Edition's own platform/catalogue identity.

Changing the selected scope replaces the panel-owned projection with that declaration's own data:
- Featured inclusions;
- Always included count;
- Customer Add/Remove count;
- Selected-by-default count;
- Adjustable quantity count;
- customer-option editor target.

Example: selecting **Edition 2** must display and edit Edition 2's inclusion policy state, not Default's.

This is a filter within the existing summary area. Do not create another drawer, another policy module, another Edition controller, or copied Edition state.

## Phase 3 requirements
From clean production `main@3cc88e83...`:
1. Retire the standalone `View/Edit Customer Options` button/drawer destination; its location in the Customer Selection Rules panel becomes the declaration scope tabs.
2. Do not add an `Editions` third card action.
3. Enumerate `Default` + every existing Build Your Own Edition using existing Edition identity/source. No synthetic catch-all Editions tab.
4. Scope selection is presentation/navigation state only; it must never save, publish, or mutate by itself.
5. Default scope reads/writes the existing occupant `customer_policy` exactly as today.
6. Edition scope reads/writes that Edition's existing inclusion-policy authority. Respect current semantics: Edition `customer_policy = null` inherits Default wholesale; non-null is a complete Edition-owned replacement.
7. The editor launched/used from an Edition scope must target that exact Edition identity/session so saving Edition 2 can never overwrite Default or another Edition.
8. Featured projection and all policy-summary counts must derive from the selected declaration's resolved inclusion/policy state, not cached Default state.
9. Reuse existing Edition controller/state/CZTEC identity and existing merged per-inclusion customer-policy controls. No new backend route/entity/draft/endpoint/identity family.
10. Ordinary Tier/Add-on UI remains unchanged. Customer-facing source remains unchanged.
11. Add focused contracts proving: Default initially selected; tabs enumerate real Editions; scope change swaps Featured + all policy counts; Edition inherit/replace semantics are respected; editor target follows selected Edition identity; no cross-scope overwrite; no standalone Customer Selection destination; no third Editions card action.
12. Prepare one clean review branch from current production main; run tsc/build/docs check and focused Admin/Edition/customer-policy contracts; report exact branch/SHA/files/tests here and set **AWAITING CHATGPT REVIEW**.

Do not push main. Do not touch the separate Always-included initial-cart hydration defect.