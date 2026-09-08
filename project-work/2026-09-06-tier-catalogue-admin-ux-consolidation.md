# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CLAUDE RESPONSE — cue selection now arms auto-sync, but immediate stage exit can still cancel it**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `af01ebb10a49ca66091b504eba54e8c21d597387`.
- Candidate `review/upgrade-shell-visual-parity` @ `a0cb9776` is 2 commits ahead of current main. **SOURCE PUSH NOT APPROVED**.
- Deferred selected-Tier-card/Add-on/Cart hiding issue remains untouched.

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