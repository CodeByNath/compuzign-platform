# Composable Tier — Admin → customer browser handoff

## Status
- **READY FOR CLAUDE — live Admin defect: Customer Options action is not visible.**
- Auditor verdict: **Proceed with safeguards.**
- Production `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9`; Hostinger deploy #935 succeeded on exact SHA.

## Verified live evidence
Nath supplied current Studio screenshots of KAIROS Tier workspace. The subordinate **Package Build Your Own** occupant is Active, $48.50 monthly, 3 included features. Its card exposes only the normal **View** split-button. Opening it shows the standard Tier drawer with **Details / Options / Connections / Support**. The normal occupant editors correctly show the 3 selected inclusions: 2 vCPU, Block Storage, Backup Storage — BaaS.

The expected separate **Customer Options** action is not visible anywhere on the Build Your Own card in this live state. Therefore the previously recorded live-validation instruction “open Customer Options” is currently impossible through the normal Admin UI.

## Architecture remains locked
Customer policy stays an external controller over the otherwise normal full Tier occupant. Do not put `customer_policy` back into the shared Tier drawer. The intended action is a composable-card-only sibling action that opens the standalone `tier-customer-policy` drawer. Normal Tier/Add-on cards and their 4-module drawer must remain unchanged.

## Claude task — focused audit then smallest fix
Trace production source at `41884a41` from composable workspace card projection through action rendering/dispatch:
1. confirm `withComposableCustomerOptionsAction()` is still applied to the composable card and what exact eligibility value it receives;
2. trace whether `detail.enabled === true` is actually true for this live Active Build Your Own projection, and whether the card action is dropped later by shell/action normalization or split-button rendering;
3. verify `'customer-options'` intent and `tier-customer-policy` drawer registration still exist and are reachable;
4. identify why the live card shows only View despite Active status.

If the defect is source-side, implement the **smallest correction only** so an Active/published composable occupant shows `Customer Options` in its card action menu. Do not add it to the normal Tier drawer or normal/Add-on cards. Do not change customer `/pricing/`, policy semantics, cart/quote/PDF/email, Rate Sheets, Legs, Editions, or lifecycle.

Add/adjust a narrow contract proving:
- active composable card => View + Customer Options;
- draft/inactive composable card => no Customer Options;
- normal Tier/Add-on cards unchanged;
- Customer Options dispatches standalone `tier-customer-policy` drawer.

Report exact changed files, tests, branch/commit and diff in this same file, then set **AWAITING CHATGPT REVIEW**. Do not push to `main` without auditor approval.

## Deferred live gate
After this action is restored, live validation resumes: exactly 3 policy rows, author one Required/Optional rule, Save, normal Publish/settle, reopen persistence, then `/pricing/` Build Your Own / Upgrade your build. Stale remove/re-add regression remains afterward.