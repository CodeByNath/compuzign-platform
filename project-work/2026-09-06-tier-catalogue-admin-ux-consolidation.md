# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED — Phase 2 exact candidate only**
- Auditor verdict: **Proceed with safeguards**.
- Phase 1 remains accepted/closed at `main@bfb203c776b3d4927ee7c34c54db31d80dc13bb9`.
- Approved Phase 2 review head: `review/tier-inclusions-customer-policy-merge@3cc88e83f93e57fec7b61419129cd93a8432809b`.
- Customer-frontend trace remains the compatibility contract.

## Independent Phase 2 review
The review branch is cleanly based on current production: ahead 1, behind 0, merge base exactly `bfb203c7...`. Scope is 12 files: Admin TS wiring/refactor, one new focused contract, one existing contract correction, Code Map, package script, and rebuilt `dist/js/admin-station.js`; no PHP/backend/customer source changed.

Accepted implementation:
- shared `customerPolicyFields.tsx` is now the single per-item mutation/presentation authority used by both the standalone Customer Selection Rules drawer and merged Inclusions UI;
- `PoolInclusionsEditor` renders policy controls once per resolved top-level selected inclusion `item_id`, after the inclusion/Leg UI, never per Leg assignment and never for Bundle children;
- controls are threaded only when the editing target is the composable/Tier Catalogue occupant **and** `detail.enabled` is true, preserving the existing published-occupant gate; ordinary Tier/Add-on and Edition callers receive no policy capability;
- commercial inclusion draft and customer-policy draft remain separate; Save performs existing features save first, then existing customer-policy save. A second-call failure reports Save failure rather than false full success. This sequential two-authority behavior is accepted for this consolidation phase; live validation must confirm the Admin does not imply atomicity beyond what the backend provides;
- "Not offered" still removes the policy entry; Price Option authoring remains unchanged/fixed;
- standalone Customer Selection Rules drawer remains intact as parity/rollback surface.

Claude's reported validation is accepted as sufficient for source approval. The reported `notification-templates-composable-quote-parity.php` failure is not a Phase 2 regression because it reproduces on untouched production `main` and Phase 2 changes no PHP/email code. Do not fix that defect in this work item; its separate active quote/email work remains separate.

## Non-change boundary
No customer frontend, resolver/projection, pricing, Commercial Legs, quote/cart, Request/PDF/email/order, routing, Edition UI, backend storage shape, or lifecycle semantics may change in this push.

## Next action — Claude
Push **exactly `3cc88e83f93e57fec7b61419129cd93a8432809b`** to `main` with no additional source changes. Then:
1. record exact resulting `main` SHA and GitHub Actions deployment result;
2. do not delete the Phase 2 review branch until deployment succeeds;
3. update this same file to **AWAITING LIVE VALIDATION** after successful deployment;
4. do not start Phase 3 and do not retire the standalone Customer Selection Rules drawer.

## Live validation gate after deploy
Auditor must validate the deployed Admin experience before Phase 3:
- published Build Your Own/Tier Catalogue occupant Inclusions shows one Customer Selection controller per selected top-level inclusion;
- controls are not repeated for Commercial Leg assignments or Bundle children;
- ordinary Tier/Add-on Inclusions do not show the controller;
- existing standalone Customer Selection Rules drawer still works and displays equivalent saved state;
- edit/save/reopen round-trip preserves required/optional/not-offered, default selected, quantity bounds, and Featured;
- a failed second save must not be presented as complete success;
- customer-facing Upgrade Your Build behavior remains unchanged.

Only after successful live parity validation may the review branch be cleaned and Phase 3 (retiring the duplicate standalone drawer) be considered.