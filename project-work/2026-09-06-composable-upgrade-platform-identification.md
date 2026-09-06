# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **AWAITING CHATGPT REVIEW — authoring control implemented, one clean commit, not pushed to `main`**
- Auditor verdict (prior round): **Proceed with safeguards; Phase 1 remains open** until this authoring gap is closed.
- Production: `main@48cede2f00b7bd2ee202e94f82a61651ee694d3b`; deploy #957 succeeded (unchanged this round).
- Review branch: `review/composable-upgrade-authoring-control@335df721f543808d800192cee0964c8c9cfbad79` — one clean commit on production `main`. Pushed to origin.

## Correction report

**Against each required item:**
1. No Platform Identifier minting, native reference, migration engine, or dual-ID Overview row was touched — diff is entirely new files/UI wiring for the authoring control and its tests.
2. New "Declare as Upgrade offer" checkbox added to `TierOverviewEditor.tsx`, wired through the **existing** Overview module save path (`saveTierOverview()` → `saveModule()` → `saveComposableOccupantModule()`'s already-shipped `is_upgrade_offer` handling from Phase 1). No new endpoint, no second settings store.
3. Gated by a new `showUpgradeOffer` prop, threaded from `TierDrawerContent.tsx` using the exact same `isComposableOccupant(c.editingTierId)` function that already gates `hideAddonAndPopular` — verified by contract that both use the identical call, never a second/diverging composable check. An ordinary Tier/Add-on's own Overview editor renders no such control (defaults hidden).
4. Checkbox label is literally **"Declare as Upgrade offer"**, with a hint stating explicitly that it does not change the occupant's own Tier Platform ID and that unchecking later never retracts an already-assigned Upgrade ID.
5. `is_upgrade_offer` now round-trips through the exact same draft-preferred seed/save/revert/settle path `is_addon` already uses (`useTierModuleEditing.ts`'s `openSection()`/`saveSection()`) — verified by contract exercising the real source wiring.
6. **Mutation-semantics audit (documented explicitly, as required):** confirmed from the existing Phase 1 backend code — `PackageSchema::upsertOccupant()` unconditionally preserves `upgrade_platform_id`/`edition_upgrade_platform_id` from the prior stored state regardless of the current `is_upgrade_offer` value (mirroring how `cz_platform_id`/`addon_platform_id` are already preserved), and the settle/activate gate (`if ($occupant['is_upgrade_offer'] ?? false)`) only ever *reserves a new one when empty* — it never reads or clears an existing one when the flag is false. **Conclusion: clearing the declaration after CZTU/CZTEU already exists never orphans, reassigns, or erases it — the identity becomes dormant from future-minting only, never retroactively un-minted.** No code change was needed to satisfy this; two new PHP tests prove it directly (mint → uncheck → settle/reactivate → assert the id is byte-identical and still `STATUS_BOUND` in the registry).
7. Verified no equivalent Edition-level control existed; added the identical `showUpgradeOffer`-gated checkbox to `TierEditionOverviewFields.tsx`'s `TierEditionOverviewSection`, threaded through `TierEditionDeclarationSwitcher.tsx` → `TierEditionEditor.tsx` using the same `isComposableOccupant()` gate. An ordinary (non-composable) Edition's own editor renders no such control.
8. New contracts: `composable-upgrade-authoring-control-contract.ts` (visibility gating, draft-seed/save wiring, `draftFromTierEdition()` exercised directly for both true/false) and two new PHP tests appended to `composable-upgrade-platform-identity.php` (permanent-ID preservation across a declare→mint→uncheck→re-settle cycle, for both the occupant and its Edition). No quote/Request/cart/PDF/email/order/pricing/resolver file touched.

**Tests re-run**: full Package Station JS contract list (now including both new contracts), all non-pre-existing-broken regression scripts, the relevant `tests/*.php` list (now including the two new preservation tests), `npx tsc --noEmit`, `npm run build`, `npm run docs:check` — all pass.

Do not push to `main` before this review.

## Root cause confirmed from source
The display correction is functioning as designed: it hides Upgrade Platform ID when the value is absent.

The real failure is earlier in the lifecycle:
- backend `settleComposableOccupant()` only reserves CZTU when settled occupant `is_upgrade_offer === true`;
- composable Overview save endpoint accepts `is_upgrade_offer` and stores it in the Overview draft;
- however `TierOverviewEditor.tsx`, including its composable reuse path (`hideAddonAndPopular`), exposes **no control for `is_upgrade_offer`**.

Therefore the live Build Your Own record has no supported Admin UI action to declare itself an Upgrade offer. Running the one-time Platform ID assignment button cannot assign CZTU to an undeclared record. The screenshot is consistent with that exact state.

This also explains the earlier migration expectation of processed 0: the new Upgrade scopes are eligibility-gated by `is_upgrade_offer`; none of the existing records had a UI path to set it.

## Required correction — smallest lifecycle/UI slice
1. Do not alter Platform Identifier minting, native references, migration engine, or the dual-ID Overview rows.
2. Add an explicit Admin authoring control for the composable occupant's Upgrade declaration using the **existing Overview module save path** and existing `is_upgrade_offer` field. Do not add a new endpoint or second settings store.
3. The control must only exist for the composable/Build Your Own occupant; ordinary Tier/Add-on Overview must remain unable to author `is_upgrade_offer`.
4. Label/copy must make the domain meaning clear (e.g. **Declare as Upgrade offer**), not imply that it changes the Tier's underlying CZT identity.
5. Existing value must round-trip draft-preferred through Overview edit/save/revert/settle. Publish/settle with declaration true mints/binds CZTU through the already-shipped backend path; false does not.
6. Audit mutation semantics before implementation: once CZTU exists, clearing `is_upgrade_offer` must **not orphan, reassign, or erase** the existing permanent CZTU. Determine current backend behavior and preserve additive permanent identity. If current save/settle would make the already-minted ID semantically dormant, document that explicitly; do not delete/recycle it.
7. For composable Editions, verify whether an equivalent Admin control already exists for Edition `is_upgrade_offer`. If absent, include the same bounded control in the Edition Overview editor using its existing draft/status path; ordinary Editions outside the composable occupant must remain ineligible.
8. Add focused contracts for authoring visibility, draft persistence, settle eligibility, and permanent-ID preservation. No quote/Request/cart/PDF/email/order/pricing/resolver work.

After audit/implementation, return one clean review commit on current production and set **AWAITING CHATGPT REVIEW**. Do not push main before review.