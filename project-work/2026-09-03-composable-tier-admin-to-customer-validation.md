# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING CHATGPT REVIEW — persistence safeguard delivered; SOURCE PUSH NOT APPROVED.**
- Auditor verdict (prior round): **Proceed with safeguards.**
- Production `main@8ff4eff90129f15f8140858d21cb923dd2f5d549`; deploy #934 succeeded. Unchanged — nothing pushed to `main`.
- New commit: `review/composable-tier-admin-customer-policy@41884a41` (2 commits ahead of production now), pushed to `origin`.

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

## Safeguard delivered — 2026-09-03, commit `41884a41`
While auditing this, found a more severe, independent, **pre-existing** gap the ask didn't anticipate: `PackageSchema::upsertOccupant()` — the shared write every settle path (normal Tier and composable alike) funnels through — never carried `customer_policy` forward at all. Its `current_occupant` return literal simply had no such key, so `settleTierSlot()`'s own correctly-computed draft-preferred `customer_policy` was silently discarded on **every** settle, for any module, not just Features. A saved policy could never actually survive a Publish — full stop, independent of the resurrection question. This went uncaught because every prior test (including this file's own §1-3) hand-built `current_occupant` directly rather than round-tripping through `settleTierSlot()`.

Fix, in order:
1. `upsertOccupant()` now carries `$data['customer_policy']` through like any other occupant field (was previously an omitted key, not a bug in the value itself).
2. New `PackageSchema::pruneStaleCustomerPolicy()`, called in `settleTierSlot()` immediately after the existing `pruneOrphanedLegAssignments()`, against the same just-finalized settled `rate_sheet_items` — drops any `customer_policy` item whose `item_id` is no longer selected. Never adds an entry for a newly/re-selected `item_id`.
3. `tests/composable-customer-policy-admin-surface.php` §5-7: real settle-cycle regression — §5 proves persistence (author → settle, confirmed **fails** without fix 1), §6 proves the exact required scenario (authorize A → settle; remove A → settle → A pruned immediately; re-add A → settle → still excluded, not resurrected), §7 is a no-op-change control (untouched policy survives an unrelated settle). Corrected this same test file's own docblock, which had wrongly asserted settleTierSlot() "already correctly persists" customer_policy — never actually verified.
4. Code Map (`docs/code-map/tier-composable-occupant-admin-customer-policy.md`) updated with the full round-2 finding.

**Files changed:** `PackageSchema.php`, `composable-customer-policy-admin-surface.php`, the Code Map. No frontend files touched this round — `dist/` unchanged.

**Verified (all pass):** the extended admin-surface test (and confirmed §5 fails on the pre-fix code), `composable-customer-policy-resolver.php`, `tier-composable-occupant.php`, `composable-occupant-controller-contract.php`, `tier-leg-assignment-orphan-pruning.php`, the full `Support/SurfacePackages` PHP suite (one pre-existing unrelated failure — `tier-capability-invariants`, confirmed present on `af5a605d` too, before this change), `contract:tier-customer-policy-drawer`, `contract:tier-customer-policy-draft`, `tsc --noEmit`, `npm run build`, `npm run docs:check`.

**Unresolved risk:** none new. The prior round's flagged nuance (item_id identity requiring the exact same catalogue row to reactivate) is now moot — reactivation itself is prevented by the prune.

## Follow-up direction
After this closes, scope **Import all current Rate Sheet inclusions** as a one-time snapshot/bulk selection in the normal occupant inclusion editor. No wildcard binding; later Rate Sheet additions must not auto-enter the occupant.

## Claude next action
Awaiting ChatGPT auditor review of `41884a41`. Do not push `main` until Nath approves and the auditor's verdict is recorded here.