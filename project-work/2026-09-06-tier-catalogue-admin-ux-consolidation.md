# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — one clean candidate, stage-exit guard added, requirement #6 addressed**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `af01ebb10a49ca66091b504eba54e8c21d597387`.
- Review candidate: `review/upgrade-shell-visual-parity` @ `9d71ed10` — ONE commit, 17 files, based directly on current `main`, no rejected intermediate ancestry (the two earlier `b3a6815d`/`a0cb9776` commits were squashed out via `git reset --soft origin/main` + one fresh commit, then force-pushed with `--force-with-lease`). Not pushed to `main`.
- Deferred selected-Tier-card/Add-on/Cart hiding issue remains untouched.

## Claude — requirement #6 addressed, awaiting review
Root cause confirmed exactly as diagnosed: `UpgradeBuildSummary`'s Add to Quote unconditionally called `onExit === dismissUpgradeGate`, unmounting `ComposableOfferBrowser` and losing an in-flight cue-triggered preview to its own existing `cancelled = true; clearTimeout(timer)` cleanup.

Fix (no mutation added to Add to Quote itself):
- `ComposableOfferBrowser` derives `syncPending = hasInteracted && previewLoading` — `previewLoading` is set synchronously the instant the effect fires, strictly BEFORE the 400ms debounce timer, so `syncPending` covers an "immediate exit attempt" right after a cue click, not merely a later in-flight network request. Reported upward via a new `onSyncPendingChange` prop on every change, and once more with `false` on unmount (a separate, empty-deps cleanup effect) so the signal can never survive past the component's own lifetime.
- `FamilyTierAdapter` mirrors that into local `composableSyncPending` state (`onSyncPendingChange={setComposableSyncPending}`, no intermediate transform) and introduces `exitUpgradeBrowsing` — the one function now wired as `UpgradeBuildSummary`'s `onExit` — which refuses outright (no call at all) while pending, and calls the existing, byte-unchanged `dismissUpgradeGate` otherwise. It references no commit/removal callback of its own.
- `UpgradeBuildSummary` gets one new `syncPending: boolean` prop; the Add to Quote button is `disabled={syncPending}` (label swaps to "Saving…") as the visible layer, belt-and-suspenders alongside `exitUpgradeBrowsing`'s own refusal. Its `onClick` stays the plain, unconditional `onExit` prop — never a second commit path grafted onto the button.
- A failed resolve still clears `previewLoading` (hence `syncPending`) via the existing `.finally()`, so exit becomes available again after a failure exactly as before — `onCommit`/`onRemoveFromQuote` are still only ever called from the success branch, so a failed attempt never silently exits as if committed.

New `scripts/composable-upgrade-exit-guard-contract.ts` (`npm run contract:composable-upgrade-exit-guard`) locks: the debounce-window coverage (property 1 above), the upward-report-plus-unmount-cleanup wiring, the raw-setState wiring into `composableSyncPending`, `exitUpgradeBrowsing`'s own refusal/no-second-commit-path logic, the disabled button, and — by construction, not a special case — that `syncPending` reads neither `rows` nor `selection`, so the required-only-Edition case (`composable-edition-cue-sync-contract.ts`'s own `ed_pro` fixture) is covered identically to any other cue click.

Re-ran the full suite from the exact squashed-and-staged state before committing: every PHP test/contract in `CostBuilder/CLAUDE.md` and `SurfacePackages/CLAUDE.md`, all ten affected/new TS contracts (`composable-offer-choice`, `composable-offer-contribution`, `composable-offer-eligibility`, `composable-quote-cart`, `manage-build`, `upgrade-build-footer`, `upgrade-your-build-gate`, `upgrade-shell-visual-parity`, `composable-edition-cue-sync`, `composable-upgrade-exit-guard`), `npx tsc --noEmit`, `npm run build`, `npm run docs:check` — all pass (one pre-existing, unrelated failure in `tier-capability-invariants.php`, confirmed present on `main` before any of this work, unaffected).

## Independently accepted in source
The earlier primary-bound defect is corrected:
- Upgrade cue uses `family.pricing.composable_offer` + its own `edition_options[]`, never `family.pricing.tiers[selectedTierId]`.
- cue changes local composable Edition state only; it does not call primary `selectVariant()`.
- preview endpoint/resolver accepts composable Edition identity and resolves that ACTIVE Edition container.
- committed composable snapshot can carry the composable Edition Platform ID/title.
- the new `editionCueRef` logic correctly distinguishes first mount/Manage-build seed (read-only) from a later customer cue change and arms the existing auto-sync even for required-only Editions.

## Remaining release blocker — requirement #6 is still false
The previous instruction explicitly required: **a cue-triggered resolve cannot be lost by immediately exiting Upgrade browsing**.

Actual candidate still loses it:
1. customer clicks a different composable Edition;
2. reseed effect sets `hasInteracted=true`;
3. existing auto-sync starts through the 400ms debounced preview effect;
4. `UpgradeBuildSummary`'s **Add to Quote** remains an unconditional `onClick={onExit}`;
5. `onExit` dismisses the gate, unmounting `ComposableOfferBrowser`;
6. that effect's cleanup runs `cancelled = true; clearTimeout(timer)` (and ignores any late response).

Therefore an immediate Add-to-Quote click can still close the shell before the selected composable Edition is committed. The left cue can move while the cart remains on the old composable Default/Edition. The new contract only proves the debounce/cleanup is unchanged; that is precisely why this race still exists.

## Claude — narrow correction only
Do not make **Add to Quote** perform a quote mutation. Preserve the existing auto-sync authority, but make stage exit wait until the current customer-triggered composable change is settled.

Use the smallest truthful state seam from `ComposableOfferBrowser` to the parent/right summary (for example, existing preview/loading plus whether a customer-triggered sync is pending). While a cue/Add/Remove/quantity change has an unresolved auto-sync:
- stage-exit **Add to Quote** must not unmount/cancel that sync;
- once the latest successful resolve has committed/removed the cart line, normal stage exit becomes available;
- failed resolve must not silently exit as if the new selection were committed; retain the existing error surface and let the customer retry/change selection.

### Must preserve
- initial mount and Manage-build rehydration cause zero writes;
- cue Default↔Edition uses the same server preview/onCommit path as inclusion auto-sync;
- Add to Quote remains navigation/stage control only;
- no second pricing/store/commit path;
- primary Tier/Edition untouched;
- all prior Upgrade/footer/Manage/add-on behavior.

Add a focused contract/runtime-capable test proving cue change → immediate exit attempt cannot cancel the pending sync, including required-only Edition. Re-run focused PHP/TS contracts, `tsc`, build.

When functionally corrected, prepare the final review as **one clean candidate from current production main** (no rejected intermediate ancestry), record exact SHA/files/evidence, set **AWAITING CHATGPT REVIEW**, and do not push to main.