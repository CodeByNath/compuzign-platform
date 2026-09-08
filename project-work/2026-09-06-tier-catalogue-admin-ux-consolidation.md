# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — both release blockers addressed, one clean commit from current main**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `af01ebb10a49ca66091b504eba54e8c21d597387`.
- Review candidate: `review/upgrade-shell-visual-parity` @ `e165730e` — ONE commit, 17 files, based directly on current `main`, no rejected intermediate ancestry (squashed via `git reset --soft origin/main` + one fresh commit, force-pushed with `--force-with-lease`). Not pushed to `main`.
- Deferred selected-Tier-card/Add-on/Cart hiding issue remains untouched.

## Claude — both release blockers addressed, awaiting review
**Blocker 1 (failed resolve incorrectly re-enables exit):** the signal was redesigned from `hasInteracted && previewLoading` (cleared by `.finally()` on success AND failure alike) to an explicit **unsynced-customer-change** flag. It is cleared to `false` ONLY inside the debounced preview's success branch, immediately after the matching `onCommit`/`onRemoveFromQuote` call for that exact latest change — never from `.catch()`, `.finally()`, or the `!result.ok` branch. A failed/rejected resolve now correctly leaves the flag `true`, so `exitUpgradeBrowsing` keeps refusing and the Add to Quote button stays disabled until a LATER successful resolve (of that same or a further-changed selection) actually settles it.

**Blocker 2 ("immediate exit" not actually proven):** rather than add a component-render test harness this codebase has no precedent for, the guard itself was made provably synchronous at the customer-action boundary — the alternative the instruction explicitly offered. The flag is now set `true` in the exact same event-handler body as the customer's own gesture, never through a reactive effect keyed on a prop change:
- `FamilyTierAdapter`'s cue `onSelect` calls `setComposableSyncPending(true)` directly, in the same handler as `setComposableEditionId` (guarded on an actual change, so re-clicking the already-active destination can never arm a flag with no new preview ever scheduled to clear it).
- `ComposableOfferBrowser`'s own Add/Remove button and quantity input call the passed-down `onSyncPendingChange(true)` directly, in the same handler as `setHasInteracted(true)`.

Since Preact's render+effect-flush for a given click completes synchronously before the browser can dispatch the next event, and the guard state change is now literally part of that first click's own handler body (not a later effect), there is structurally no window in which a second click (Add to Quote) could be processed before the guard has updated. Rewrote `scripts/composable-upgrade-exit-guard-contract.ts` to lock this exact ordering (the state-changing call and the guard-true call in the same handler, nothing between them) and the success-only clear (locked separately against `.catch()`/`.finally()`/`!result.ok`, each proven to never touch the flag).

Re-ran the full suite from the exact squashed-and-staged state before committing: every PHP test/contract in `CostBuilder/CLAUDE.md` and `SurfacePackages/CLAUDE.md`, all ten affected/new TS contracts, `npx tsc --noEmit`, `npm run build`, `npm run docs:check` — all pass (one pre-existing, unrelated failure in `tier-capability-invariants.php`, confirmed present on `main` before any of this work, unaffected).

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