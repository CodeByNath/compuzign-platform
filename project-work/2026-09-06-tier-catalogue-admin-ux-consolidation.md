# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING LIVE VALIDATION — Phase 2 deployed**
- Auditor verdict: **Proceed with safeguards**.
- Phase 1 remains accepted/closed at `main@bfb203c776b3d4927ee7c34c54db31d80dc13bb9`.
- Phase 2 is independently verified on `main@3cc88e83f93e57fec7b61419129cd93a8432809b` and deployed successfully by GitHub Actions run `34033325117` (#964).
- Customer-frontend trace remains the compatibility contract.

## Accepted Phase 2 implementation
- shared `customerPolicyFields.tsx` is the one per-item mutation/presentation authority for both standalone Customer Selection Rules and merged Inclusions UI;
- `PoolInclusionsEditor` renders policy controls once per resolved top-level selected inclusion `item_id`, after inclusion/Leg authoring, never per Leg assignment and never for Bundle children;
- controls are available only for the published composable/Tier Catalogue occupant; ordinary Tier/Add-on and Edition callers remain unchanged;
- `rate_sheet_items[]` and `customer_policy.items[]` remain separate authorities/drafts;
- one Save coordinates features first, then customer policy; policy-save failure must report Save failure, not false complete success;
- "Not offered" removes the policy entry; Price Option authoring remains fixed/unchanged;
- standalone Customer Selection Rules drawer remains intact as parity/rollback surface.

## Independent production/deployment verification
Auditor independently confirmed `main` points exactly to approved `3cc88e83...`, parent `bfb203c7...`, and Actions run `34033325117` completed successfully for the exact same head SHA. No additional source commit exists between review and production.

## Live validation required before Phase 3
Validate the deployed Admin UI and customer parity:
1. Open the published Build Your Own / Tier Catalogue occupant -> **Inclusions -> Edit**. Each selected top-level inclusion must show one Customer Selection controller.
2. For an inclusion with Additional Commercial Leg assignments, confirm the Customer Selection controls appear once for the inclusion only, not inside/repeated for each assignment.
3. For a Bundle row, confirm there is one controller for the Bundle row and none beside its supplied child inclusions.
4. Open a normal Tier/Add-on -> Inclusions -> Edit. No Customer Selection controls should appear.
5. In the merged Build Your Own Inclusions editor test one row through: Not offered -> Always included -> Customer Add/Remove; optional should expose Selected by default; quantity should expose default/min/max/step; Featured should toggle.
6. Save, close, reopen Inclusions. Confirm all values round-trip exactly.
7. Open the old standalone **Customer Selection Rules** drawer. Confirm it shows the exact same saved policy state for those same `item_id`s; changing one value there and reopening Inclusions should show the same updated state.
8. Confirm a normal successful Inclusions Save shows success only after both inclusion and policy save complete. If a save visibly errors, do not treat the operation as fully successful; report the exact state seen after reopening.
9. Customer-facing **Upgrade Your Build**: confirm the same inclusions remain offered/required/optional, default selection, quantity controls and Featured ordering as before. Do not change customer data merely for validation unless necessary; read-only/parity observation is enough where existing policy already exercises the states.

Phase 2 review branch stays until this live validation passes. Do not start Phase 3 or Edition UI work yet.