# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — Phase 0 correction applied**
- Auditor verdict (prior round): **Stop — architectural risk** (blocking orphan-Upgrade finding)
- Current production/source: `main@eaead45338f9cc464e56d4510fa798d8b4c558b3` (unchanged — still not pushed to `main`)
- Corrected Phase 0 head: `review/upgrade-journey-finalisation@be0e10bf` (one commit on top of the reviewed `04b871e3`)

## Architecture direction
There is **one active customer journey only: Upgrade your plan/build**. Standalone **Build Your Own** is deferred and disabled. Upgrade must never fall through, relabel, transition, or survive as standalone Build Your Own.

## Platform identity / occupant rule
Use the **CompuZign Platform skill** for identity work. Reuse the existing Tier/Edition occupant identity, lifecycle, persistence, allocator, resolver and ordering pipelines — no parallel system.

- Default Tier `CZT...`; Upgrade `CZTUXXXXX`; future Custom `CZTCXXXXX`
- Default Edition `CZTE...`; Upgrade `CZTEUXXXXX`; future Custom `CZTECXXXXX`
- `CZTC`/`CZTEC` are reserved for the later Build Your Own phase; do not mint them now.
- Upgrade/Custom variants must use the same occupant ordering/sort mechanism once that mechanism is identified/extended.

## Auditor review of Phase 0 head
The net reset `eaead453..04b871e3` correctly removes the three hybrid Finalise->Build Your Own corrections and gates `ComposableOfferBrowser` so it renders only with an already-selected Tier/Edition, always in `upgrade_your_build` context. The TODO for future standalone Build Your Own is correctly left at the entry point. The review diff preserves the pre-hybrid composable browsing/pricing path and removes the hybrid composed-snapshot/request/email machinery.

**Blocking issue:** Claude reports that `removeFamilyTierSystemQuoteItems()` still preserves a composable line when its primary Tier/Edition is removed. That behavior existed to support standalone Build Your Own. With standalone now disabled, it is no longer valid for the active route: a customer can create an Upgrade, remove/swap the base, and leave an orphaned composable item that effectively becomes the forbidden standalone state.

## Exact Phase 0 correction
1. In the active upgrade-only regime, removing or replacing the exact base Tier/Edition must also remove the dependent Upgrade composable line. No orphan may survive.
2. Do this through the existing cart/occupant mutation path; do not add another state machine, identity type, or Build Your Own fallback.
3. Preserve normal add-on cascade behavior and unrelated standalone code that is merely dormant for the later phase, except where its current runtime behavior can still create an orphan from the active Upgrade route.
4. Add/update a focused contract: select base -> commit Upgrade -> remove base, and base -> commit Upgrade -> replace/switch base. In both cases the Upgrade line must be gone, not relabeled or preserved.
5. Do **not** implement `CZTU`/`CZTEU` minting or unified Upgrade finalisation yet. Phase 0 remains cleanup/isolation only.

Return changed files, tests, exact review SHA, and confirm no customer-reachable path can produce standalone Build Your Own. Set **AWAITING CHATGPT REVIEW**. Do not push to `main`.

## Claude's correction report (2026-09-04)

Applied as one commit (`be0e10bf`) on top of the reviewed `04b871e3`, `resources/ts/utils/quote.ts` only (plus rebuilt `dist/js` and the one contract file below) — no new state machine, identity type, or Build Your Own fallback added:

- **`removeFamilyTierSystemQuoteItems()`** now removes the composable line along with the primary and every Add-on (previously excluded it). Removing the base now always empties the whole Tier System for that Family+Instance — verified `afterPrimaryRemoval.length === 0` in the contract.
- **`replaceFamilyNormalQuoteItem()`** now also drops the composable line when the new primary's identity (`tierPlatformId` + `tierEditionPlatformId`) genuinely differs from the one being replaced — a plain identity comparison read directly off the two items, never a revived draft/staleness tracker. Re-confirming the exact same Tier/Edition (e.g. a plan-duration change via Choose Plan, which still calls this function with a freshly built item for the identical Tier/Edition) leaves the Upgrade untouched — not a base swap, so not an orphan risk.
- **`removeFamilyComposableQuoteItem()`** unaffected — still the distinct "remove just my Upgrade, keep the primary" action.

**Both auditor-requested scenarios are now locked in `scripts/composable-quote-cart-contract.ts`** (the existing quote/cart-connection contract — its own property #2 previously asserted the now-superseded "composable always survives primary removal/swap" behavior, updated in place rather than adding a parallel contract file):
1. base → commit Upgrade → remove base: Upgrade line gone (`!afterPrimaryRemoval.includes(updatedComposable)`).
2. base → commit Upgrade → replace/switch base (different Tier/Edition): Upgrade line gone (`!afterPrimarySwitch.includes(composable)`).
3. (regression guard, not requested but needed to avoid overcorrecting) base → commit Upgrade → re-confirm the SAME base: Upgrade line survives (`afterSameBaseReconfirm.includes(composable)`).

**Confirmed no customer-reachable path can produce standalone Build Your Own:** the one entry point (`FamilyTierAdapter.tsx`, gated `selectedTierId !== null`, Phase 0 head) never renders the composable browser without a primary already selected; and now no cart mutation (remove base, swap base) can leave a composable line behind once its primary is gone either. The only two ways a composable line's existence is decided are (a) that gated entry point committing one, and (b) the two mutation functions above — both now enforce the same invariant.

**No `CZTU`/`CZTEU` minting or unified Upgrade finalisation implemented** — Phase 0 remains cleanup/isolation only, per instruction 5.

**Tests:** `tsc --noEmit`, `npm run build`, `npm run docs:check` all pass. Every composable-related contract re-run and passing: `composable-quote-cart` (updated), `package-family-cart`, `composable-offer-choice`, `composable-offer-contribution`, `composable-live-correction`, `composable-occupant-address`, `composable-occupant-workspace`, `composable-request-line`, `composable-tier-admin-ux`, plus the unrelated `quote-view*`/`tier-*`/`request-flow-*` contracts.

**Files changed this round:** `resources/ts/utils/quote.ts`, `scripts/composable-quote-cart-contract.ts` (+ rebuilt `dist/js/admin-station.js`/`cost-builder.js`/`homepage.js` and three new hashed chunks, same build-artifact convention already established in this repo's history).
**Branch:** `review/upgrade-journey-finalisation@be0e10bf` (base `review/upgrade-journey-finalisation@04b871e3`, itself based on `main@eaead453`). Not merged to `main`.