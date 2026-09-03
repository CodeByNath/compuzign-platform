# Composable Tier — Admin → customer browser handoff

## Status
- **READY FOR CLAUDE — final persistence safeguard; SOURCE PUSH NOT APPROVED.**
- Auditor verdict: **Proceed with safeguards.**
- Production `main@8ff4eff90129f15f8140858d21cb923dd2f5d549`; deploy #934 succeeded.
- Reviewed fix: `review/composable-tier-admin-customer-policy@af5a605dbfcc326df9a20ef1266edad7da639bc5` (1 commit ahead of production; now independently visible on origin).

## Live defect / accepted fix
Live KAIROS Build Your Own owns exactly:
- 2 vCPU ×1
- Block Storage ×100
- Backup Storage — BaaS ×50

Customer Options incorrectly showed all 45 bound Rate Sheet rows.

`af5a605d` correctly fixes the immediate defect: `useTierCustomerPolicyDrawerController` no longer calls the full-catalogue `buildRateSheetCatalogue()` helper and instead uses the composable occupant's own resolved `detail.rate_sheet_selections`. The actual diff is narrowly limited to the controller, focused contract, and rebuilt Admin bundle. Backend save validation already rejects policy IDs not present in the occupant's own `rate_sheet_items`.

Expected live result after deployment: exactly the three occupant-owned rows above, never all Rate Sheet rows.

## Remaining blocker before main
Claude correctly identified a stale-policy resurrection hazard: removing an inclusion from the occupant makes its stored customer-policy entry inert, but if Admin later re-adds the same Rate Sheet `item_id`, the old Required/Optional/quantity/Featured rule automatically becomes active again.

That violates the external-controller model: re-adding a product inclusion must not silently restore old customer authorization.

### Required safeguard
When the composable occupant's selected inclusion set is committed/settled, policy state must be reconciled to that current set so removed `item_id`s cannot later resurrect automatically.

Audit the existing occupant Features/inclusion settle path and implement the smallest server-owned reconciliation. Requirements:
- prune removed item IDs from the authoritative settled `customer_policy`;
- handle any pending `customer_policy` draft safely so stale removed IDs cannot survive/reappear;
- never add policy entries automatically for newly selected/re-added inclusions — they remain Not offered until Admin explicitly authors Customer Options;
- normal Tier/Add-on occupants remain untouched;
- no client-only cleanup as the authority;
- add a regression: select A → authorize A → remove A → settle → re-add same A → settle => A is **Not offered**, with no resurrected rule.

Do not expand into bulk-import implementation yet.

## Follow-up direction
After this fix closes, scope **Import all current Rate Sheet inclusions** as a one-time snapshot/bulk selection in the normal occupant inclusion editor. No wildcard binding; later Rate Sheet additions must not auto-enter the occupant.

## Claude next action
Patch the same review branch, add the stale-policy reconciliation regression, rerun focused PHP/TS contracts/build/docs, update this file with exact SHA/files/evidence, set **AWAITING CHATGPT REVIEW**, then stop. Do not push `main`.