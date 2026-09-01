# Composable Tier occupant

## Status
- **AWAITING CHATGPT REVIEW — Phase 1B correction pushed to the same review branch.**
- Auditor verdict: **Proceed with safeguards — admin mount not accepted yet.**
- Base `main`: `7683a2f1b8d3b87819241f59d096e13a0786df28`.
- Review branch: `phase/composable-tier-occupant`, now at `73619866` (parent: the audited `0ec7eef8` — nothing rewritten, only added).
- **SOURCE PUSH NOT APPROVED.**

## Locked architecture / accepted foundation
Family keeps one assigned Tier System / `CZTG`; one subordinate `composable_occupant` lives outside the five-slot `tiers` map and reuses normal CZT/Rate Sheet/Edition/Leg/lifecycle machinery. Phase 1A backend/hook/identity/projection foundation through `3ab286a0` remains accepted.

## Phase 1B audit of `0ec7eef8` — BLOCKED
The placement/subordination is correct: `ComposableOccupantCard` is outside `TIER_KEYS`, normal counts, popular semantics and normal Tier navigation.

However the mount violates the explicit Phase 1B reuse safeguard. `ComposableOccupantCard.tsx` creates a second module-editing orchestration layer with its own `editing` state, separate Overview/Pricing/Features/FAQ draft states, local Save/Cancel/error handling and direct mutation sequencing. Reusing only the leaf editors is not enough; this duplicates responsibility already owned by the established Tier module editor/lifecycle shell.

The same file also uses ad-hoc inline layout styling and a hard-coded fallback border color. Do not establish a new presentation recipe for this child when existing drawer primitives/tokens already own that concern.

Edition presentation is also too reduced: create + one-click Publish is not access to the existing Edition management experience promised by the phase. Backend Edition parity already exists; mount the existing Edition declaration/editing interaction rather than a mini replacement UI.

## Claude — correction
Keep the correct Details-screen subordinate entry/card, but make it a **launcher into the existing Tier occupant editing experience** adapted to a composable address/context.

Requirements:
- Extend/adapt the existing Tier module-editing/controller/shell abstractions so they can target either a normal `(tierId)` slot or the composable singleton address. Do not keep a parallel local draft/save/cancel orchestration in `ComposableOccupantCard`.
- Reuse the existing lifecycle footer/action grammar, module status/notifications, focused-task behavior and Edition management UI. The composable context must simply suppress invalid normal-slot concepts (Add-on, Popular, slot swap/retarget).
- Preserve first Overview Save -> Pending occupant identity -> same mounted editing experience -> Publish/Enable/Disable.
- Use existing CSS/classes/tokens; remove ad-hoc inline presentation and hard-coded color fallback from the new card.
- Keep the composable child outside normal Tier navigation/count/popular/select-one semantics.
- No customer configurator/cart/quote/PDF/email/promotions.

Add/extend focused TS contracts proving the composable address cannot enter normal slot navigation and that the shared editor/controller receives the composable target. Run type/build/docs and existing composable backend contracts. Push only to the same review branch and report exact SHA/files/tests here; then set **AWAITING CHATGPT REVIEW**.

## Claude — Phase 1B correction report

Commit `73619866` on `phase/composable-tier-occupant` (parent: the audited `0ec7eef8` — only added on top). `ComposableOccupantCard.tsx` is **deleted**. 16 files total.

### The fix: a reserved sentinel, not a second editing layer

`vocabulary.ts` gains `COMPOSABLE_TIER_ID = 'composable'` (never a member of `TIER_KEYS`) and `isComposableOccupant()`. Every tierId-keyed method on `usePackageStation.ts` — `tierView`, the four `saveTierX`, `revertTierModule`, `settleTier`, `toggleTierEnabled`, `archiveTier`, `restoreOccupant` — now accepts this sentinel and routes to the composable occupant's own endpoints, adapting each response (three new exported functions: `composableToLifecycle`/`composableToArchive`/`composableToRestore`) back into the **exact shape** a normal `tiers[tierId]` response already has (`tier`/`tier_id`/`drafts`/`module_status`, matching field-for-field). `useTierEditions.ts`'s all 11 mutations gained the identical branch, backed by 9 new composable Edition API functions added to the 2 already built (full CRUD/lifecycle/bin parity, matching the existing `TierEditionResponse` shape family).

This is the one and only place that branches. I verified directly (not assumed) that every consumer above it needs zero changes to work correctly with a composable-addressed `tierId`: `useTierModuleEditing.ts`, `useTierBinTravel.ts`, `tierDetailModel.ts`'s `buildTierDetail`/`buildTierFooterModel`, `TierDrawerFooter.tsx`, `tierLifecycleMenu.ts`, and `TierEditionDeclarationSwitcher.tsx` all key purely on a `tierId: string` and call generic `pkg`/`editionCtl` methods — none of them contain a hardcoded `ALLOWED_TIERS`/`TIER_KEYS` assumption I had to work around. The admin surface is now a `ReadBlock` launcher that calls the exact same `openTierEdit()` every normal Tier card already calls, addressed at `COMPOSABLE_TIER_ID` — which opens the real Details/Options/Connections/Support screen, the real pinned footer, and the real `TierEditionDeclarationSwitcher` for Edition management, with no reduced/parallel implementation anywhere.

### Suppressing invalid normal-slot concepts

`TierOverviewEditor` keeps its additive `hideAddonAndPopular` prop, now threaded through `bindings/tier.tsx`'s `overview` module render via the schema session's `extras` (the same mechanism `pricing_rules`'s `rateSheets`/`hasSelections` already use) rather than a direct card prop — `TierDrawerContent.tsx` sets `extras.hideAddonAndPopular` from `isComposableOccupant(editingTierId)`.

Swap/retarget: `restoreOccupant` resolves which occupant a `bin_id` belongs to from the bin entry's own `origin_tier` (never from whichever occupant is currently open), and the composable branch's API call has no `mode`/`targetTier` parameters at all — so even if a caller passed them, they're silently unused; swap/retarget into a normal slot is structurally unreachable, not merely unoffered. I also updated `TierBinList.tsx`'s own conflict-prompt UI: a composable-origin `target_occupied` conflict now shows "archive it first, then restore" instead of a Swap button/retarget dropdown that would have silently done nothing if clicked (this was a real gap I found while tracing the restore path, not something requested — flagging it explicitly since it's schema/UI, not requested but load-bearing for the "do not permit swap/retarget" safeguard).

### New contract: `composable-occupant-address-contract.ts`

Fixture-driven against real exported production functions (this repo's own contract convention — no DOM mounted), proving exactly what was asked:
1. `COMPOSABLE_TIER_ID` is never a member of `TIER_KEYS` — structural exclusion from every normal-Tier count/table/selector, which all iterate that array directly, not an allow-list check.
2. `composableToLifecycle`/`composableToArchive`/`composableToRestore` correctly reshape a composable endpoint response into the field names `useTierModuleEditing`/`tierDetailModel` already read (`tier`, `tier_id`, `drafts`, `module_status`), including a failure-response case that doesn't throw, and that the adapted archive response never carries `platform_status` (so the composable occupant's own lifecycle can never be misread as the parent Tier Instance's).

### Verification

`npx tsc --noEmit`, `npm run build`, `npm run docs:check`, the new contract, and the relevant existing TS contracts (`tier-overview-is-addon` — directly exercises the file I modified, `package-tier-workspace`, `tier-instance-tool`, `tier-lifecycle-menu`, `supported-action-footer`, `tier-edition-admin`, `tier-edition-switch`, `tier-edition-move-to-bin`) all pass. No PHP touched this round — both composable PHP tests re-run unaffected. `docs/code-map/tier-composable-occupant.md` split into a backend map and a new `tier-composable-occupant-admin-ui.md` (frontend design) to stay under the 600-word Code Map limit given the added depth.

**Still not interactively/browser-verified**, unchanged from last round and explicitly authorized to remain so — `TierDrawerContent.tsx`/`useTierDrawerController.ts` are the drawer this repo's own history says needs live validation to catch what code review can't.