# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING CHATGPT REVIEW — pushed to main; awaiting live validation.**
- Auditor verdict (prior round): **Proceed with safeguards.**
- Production: `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9` (fast-forward from `8ff4eff9`, no additional source changes — exactly the approved review head).
- Deploy: GitHub Actions "Deploy to Hostinger" run #935 (`33708795165`), `head_sha` = `41884a41ab7f0e21c52dc8e9158c126aace1abf9`, status `completed`, conclusion `success`.

## Live defect and accepted correction
Live KAIROS Build Your Own owns 3 selections (2 vCPU, Block Storage, Backup Storage — BaaS) but Customer Options showed all 45 bound Rate Sheet rows.

`af5a605d` correctly changes the standalone Customer Options controller to use only the occupant's resolved `detail.rate_sheet_selections`; the full-catalogue helper is no longer used there. Backend policy-save validation already restricts item IDs to the occupant's own `rate_sheet_items`.

## Persistence safeguard accepted
`41884a41` closes the remaining authorization-resurrection risk and also fixes a more serious pre-existing persistence gap:
- `upsertOccupant()` now carries `customer_policy` into `current_occupant`; previously every settle silently dropped it, meaning an authored policy could not survive Publish.
- `pruneStaleCustomerPolicy()` runs server-side during `settleTierSlot()` against the finalized occupant `rate_sheet_items`, after inclusion/Leg reconciliation.
- removed inclusion IDs are deleted from authoritative settled policy;
- newly selected/re-selected IDs are never auto-authorized, so they return as **Not offered** until Admin explicitly authors them;
- settle-cycle tests cover policy persistence, remove→settle→re-add same ID→settle with no resurrection, and unrelated settle preserving valid policy.

This is the correct authority boundary: cleanup is server-owned at settle, not dependent on Customer Options UI behavior. Normal Tier/Add-on data carries no real `customer_policy`, so the addition is inert for those occupants.

## Independent diff review
Compared production `8ff4eff9` → approved `41884a41`: 2 commits, limited to the Customer Options row-source fix/contract/bundle plus `PackageSchema.php`, focused PHP regression coverage and Code Map. No cart/quote/Request/PDF/email/promotions/TCV work entered scope.

Claude reports focused PHP/TS/build/docs suites green; the known unrelated `tier-capability-invariants` failure remains pre-existing.

## Follow-up — not part of this push
After this live defect is closed, separately scope **Import all current Rate Sheet inclusions** as a one-time snapshot/bulk-selection action in the normal occupant inclusion editor. No wildcard binding and no automatic future Rate Sheet additions.

## Claude next action
None — awaiting the auditor's read-only live validation against the deployed SHA above: reopen KAIROS Build Your Own's Customer Options and confirm exactly 3 occupant-owned rows (not 45), then exercise remove → settle → re-add same item_id → settle and confirm it returns Not offered with no resurrected rule. Do not mark **CLOSED** until that live behavior is confirmed to match this accepted source/deployment.