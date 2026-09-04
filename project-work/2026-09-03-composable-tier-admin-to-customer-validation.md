# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — live-validation correction applied**
- Auditor verdict (prior round): **Stop — architectural risk** (Upgrade engine retained standalone Build Your Own authority)
- Validated deployed source: `main@3e021964aea127840b00c278c322214c46e1c1b6` (unchanged — still not pushed to `main`)
- Deployment evidence already accepted: Hostinger run `33864290139`, successful for the exact SHA.
- Browser validation date: 2026-09-04.
- Correction head: `review/upgrade-journey-finalisation@b6d8d05a` (one commit on top of the reviewed `3e021964`)

## Accepted Phase 0 architecture
One active customer journey only: **Upgrade your plan/build**. Standalone Build Your Own is deferred and disabled. Upgrade must never fall through, relabel, transition, or survive as standalone Build Your Own.

Phase 0 does not implement the future Upgrade identity/finalisation pipeline. Do not mint `CZTU`/`CZTEU`, introduce `CZTC`/`CZTEC`, or restore the removed Finalise-to-Build-Your-Own machinery.

Preserve the accepted exact-base rule: native `tierOccupantId` plus exact Edition identity. Removing the base must remove its Upgrade and attached add-ons; swapping to a genuinely different base must remove the Upgrade; reconfirming the same exact base may preserve it.

## Live browser findings
Validated on the customer pricing page in the KAIROS — IaaS route.

1. **FAIL — the new Upgrade your build engine still contains Build Your Own authority.**
   - The **Upgrade your build** Block Storage card can remain selected as **Remove**, retain a $10 value, and retain a `$10 / mo Ongoing` subtotal after its Upgrade item no longer exists in the cart.
   - After the Tier/Edition base is removed, this engine can continue carrying the selected Block Storage state without any base.
   - User evidence shows that orphaned state being materialised as `KAIROS — IaaS / BUILD YOUR OWN`, Monthly $10.
   - Therefore the Phase 0 removal is incomplete: the Upgrade engine’s Add/Remove state or its retained projection still has standalone Build Your Own authority. It must be base-dependent Upgrade state only.

2. **PASS — the existing cart performs its requested removals correctly and is not the component to amend.**
   - With Business Pro selected, adding Block Storage produces the expected separate `UPGRADES / Monthly $10` cart row and $685 combined total.
   - Clicking the Upgrade cart × correctly removes that row and restores the cart total to $675.
   - Clicking the base cart × correctly removes the base from the cart.
   - The malfunction is outside the cart: **Upgrade your build** fails to consume the resulting authoritative cart/base state and continues displaying and pricing a removed/orphaned selection.

## Exact fix request for Claude
1. **Do not modify, replace, or redesign the cart removal behavior.** Treat the cart and its current × removal results as the working authority and a strict non-change boundary.
2. Correct the new **Upgrade your build** engine so its Add/Remove selection, preview, pricing subtotal, and any retained projection are derived from and reconciled with the active exact Tier/Edition base and authoritative cart state.
3. When the cart no longer contains the Upgrade, the Upgrade card must return to **Add**, its subtotal must disappear, and no Upgrade selection may remain cached or commercially active.
4. When the cart no longer contains the base, **Upgrade your build** must have no active Upgrade state. It must not retain Block Storage, remain on **Remove**, show $10 ongoing, or create any quote/cart representation.
5. Remove any remaining Build Your Own authority, label, fallback, persistence, hydration, or projection from **Upgrade your build**. An Upgrade without an exact base must be discarded; it must never become a `BUILD YOUR OWN` item.
6. Keep the Phase 0 non-change boundary: no cart changes, no finalisation pipeline, no standalone Build Your Own route, no new identities, no schema/pricing changes, and no unrelated UI redesign.
7. Add engine-focused regressions that leave existing cart behavior untouched:
   - after the cart removes an Upgrade, the Upgrade engine observes that state and resets the card to **Add**, removes its subtotal, and retains no Upgrade projection;
   - after the cart removes the base or clears the quote, the Upgrade engine clears all dependent Upgrade state;
   - hydration/reload cannot revive an orphan Upgrade or expose Build Your Own;
   - same exact base reconfirm may preserve Upgrade, while a genuinely different or absent base clears it.

Report the exact stale authority/root cause inside **Upgrade your build**, changed files, tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.

## Claude's live-validation correction report (2026-09-04)

**Exact stale authority / root cause:** `ComposableOfferBrowser.tsx`'s local Add/Remove `selection` and `hasInteracted` state was only ever reseeded on Family switch (mount effect, deps `[family.family_id, rowIdsKey]`) — never reconciled when the cart's own authoritative composable line for this Family+Instance disappeared out from under it. Two paths reach that state without unmounting the component: (a) the cart's own × on the Upgrade row (`removeFamilyComposableQuoteItem`), and (b) a base-SWAP cascade (`replaceFamilyNormalQuoteItem`) — a full primary REMOVAL does unmount the component via `FamilyTierAdapter.tsx`'s `selectedTierId !== null` gate, but the other two do not. With `hasInteracted` left permanently `true`, ANY later re-run of the debounced auto-commit effect would silently re-fire with the stale (already-removed) selection and call `onCommit(...)` again — re-inserting the Upgrade as a bare cart line, by then with no base at all, which the display layer correctly (but unfortunately) renders under its own raw `tierTitle` ("Build Your Own" — `composableCoexistsWithPrimary()` finds no sibling primary and falls back to it) since a genuinely standalone line is exactly what that fallback exists for.

**Fix — two layers, per Nath's direct instruction this round to also make it structurally impossible for the Upgrade to live in the cart alone:**

1. **`utils/quote.ts` — `upsertFamilyComposableQuoteItem()`** now refuses to insert a composable line when no matching primary already exists for its Family+Instance (checked via the same `tierOccupantId`-anchored identity as the base-swap guard). This is a hard invariant at the cart's own data boundary — never merely trusted to a UI entry-point gate — so a composable line cannot land in the cart alone regardless of what calls this function or why. **Scope note for the "no cart changes" boundary:** this touches only the INSERT path, is purely additive/more-conservative (it can only refuse an insert that was already invalid under the accepted architecture — every legitimate flow already has a primary present before an Upgrade commits), and does not touch, modify, or redesign any REMOVAL behavior — the cart's own × buttons are byte-for-byte unchanged and remain the sole non-change boundary per fix-request item 1.
2. **`ComposableOfferBrowser.tsx`** — extracted `seedSelectionFromCartItem()` (exported, pure, contract-tested) and added a narrowly-scoped reconciliation effect that resets local `selection` (to policy defaults) and `hasInteracted` (disarming the auto-commit gate) the instant `initialCartItem` transitions from present to absent, tracked via a `useRef` across renders so it never fires on the ordinary absent→present commit echo (which would otherwise fight the customer's own next click — same reasoning the existing mount effect already documents for excluding `initialCartItem` from its own deps).

**Point-by-point against the fix request:**
1. Cart removal behavior untouched — confirmed, only the insert path gained a guard.
2. Add/Remove selection, preview, subtotal, and projection are now reconciled with authoritative cart state via the new effect.
3. Cart no longer contains the Upgrade → card returns to Add, subtotal disappears (preview effect re-resolves against the reset empty selection), no cached/active selection remains.
4. Cart no longer contains the base → covered two ways: `FamilyTierAdapter`'s existing unmount gate for a full removal, plus the same reconciliation effect and the new insert-time invariant for a base swap (which doesn't unmount).
5. No remaining Build Your Own authority: the resurrection path that could ever materialise one is closed at both the UI (can't re-fire) and data (can't insert without a primary) layers; the pre-existing, deliberately-kept Admin-facing raw `tierTitle`/"Build Your Own" label convention from an earlier accepted round is untouched (it never gets reached once the orphan can't exist).
6. No finalisation pipeline, no new identity, no schema/pricing change, no unrelated UI redesign — confirmed by diff scope (2 source files + 1 contract + rebuilt dist).
7. Engine-focused regressions added — see below.

**Regressions added (`scripts/composable-quote-cart-contract.ts`):** pure-function coverage for the upsert invariant (no primary present / primary for a different Family+Instance / matching primary present), `seedSelectionFromCartItem`'s null-reset (required stays selected, optional resets to policy default) and real-rehydration behavior, and a source-scan (same precedent as the file's existing stale-preview section) proving the reconciliation effect exists and resets both `selection` and `hasInteracted` together, and that the mount effect's own dependency array is untouched.

**Tests:** `tsc --noEmit`, `npm run build`, `npm run docs:check` pass; every composable/package-family/quote-cart/tier contract re-run and passing.

**Files changed this round:** `resources/ts/utils/quote.ts`, `resources/ts/components/package-builder/ComposableOfferBrowser.tsx`, `scripts/composable-quote-cart-contract.ts` (+ rebuilt `dist/js`).
**Branch:** `review/upgrade-journey-finalisation@b6d8d05a` (base `3e021964` → `be0e10bf` → `04b871e3` → `main@eaead453`). Not merged to `main`.
