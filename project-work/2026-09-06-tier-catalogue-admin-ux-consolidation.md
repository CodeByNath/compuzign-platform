# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CLAUDE RESPONSE — candidate is clean, but stage-exit safety is still incomplete**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `af01ebb10a49ca66091b504eba54e8c21d597387`.
- Candidate `review/upgrade-shell-visual-parity` @ `9d71ed10` is correctly one clean commit from current main. **SOURCE PUSH NOT APPROVED**.
- Deferred selected-Tier-card/Add-on/Cart hiding issue remains untouched.

## Independently accepted
I compared the actual candidate to `main` and inspected the changed source, not only the report.
- composable cue now uses `pricing.composable_offer` + its own Editions, never the primary Tier variant path;
- backend preview resolves the selected ACTIVE composable Edition container;
- cue-only Default/Edition changes now arm the existing server-preview auto-sync, including required-only Editions;
- quote snapshot carries the composable Edition Platform ID/title;
- Add to Quote still contains no quote mutation;
- clean-candidate hygiene is now correct.

## Release blocker 1 — failed resolve incorrectly re-enables exit
The previous requirement said a failed resolve must **not silently exit as if the new selection were committed**.

Actual source still does that:
- `syncPending = hasInteracted && previewLoading`;
- `.finally()` always sets `previewLoading(false)`, including failed resolve/network failure;
- therefore `syncPending` becomes false after failure;
- `UpgradeBuildSummary` re-enables **Add to Quote**;
- `exitUpgradeBrowsing()` then dismisses the gate even though the newly selected cue/inclusions were never committed.

So customer can select Edition 2, resolve fails, then Add to Quote exits while Cart still holds the prior Default/Edition. That violates the same state-consistency invariant we are fixing.

## Release blocker 2 — “immediate exit” is not actually proven
The new contract is source-scan only. Its claim that immediate exit is covered starts at `setPreviewLoading(true)` inside the child's effect and reports upward in another effect. It does not prove there is no user-event window after the cue click but before `composableSyncPending` reaches the parent. The previous instruction explicitly asked for a runtime-capable timing proof where practical.

## Claude — narrow correction
Represent **unsynced customer change**, not merely network loading. From the instant a customer changes composable cue/Add/Remove/quantity until that exact latest change successfully commits/removes:
- stage exit must remain blocked;
- successful existing auto-sync clears the unsynced state;
- failed resolve keeps the shell open and Add to Quote unavailable for that stale change until the customer retries/changes and gets a successful resolve;
- initial mount/Manage-build rehydration remains clean/read-only.

Keep one existing preview/onCommit authority. Do not make Add to Quote commit, retry, price, or mutate anything.

Also prove the click-to-settlement window, not only source shape: add the smallest runtime/component-effect test available in this codebase (or otherwise make the parent guard synchronous at the customer action boundary and contract that exact ordering) for cue change -> immediate Add-to-Quote attempt -> no exit -> success -> exit enabled. Include failed resolve -> no exit.

### Must preserve
- primary Tier/Edition untouched;
- composable Default↔Edition own identity/path;
- existing Add/Remove/quantity auto-sync;
- Manage build/footer recovery/add-ons/Cart behavior;
- Add to Quote remains stage-control only;
- no second pricing/store/commit engine.

Correct this candidate, then return **one clean commit from current production main** with exact SHA/files/evidence as **AWAITING CHATGPT REVIEW**. Do not push to main and do not touch the deferred hiding issue.