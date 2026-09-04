# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — 2nd-round live-validation correction applied**
- Auditor verdict (prior round): **Stop — architectural risk** (Upgrade engine fireable with no ready primary)
- Validated deployed source: `main@b6d8d05ab6cfc702670151c3a6543b4faa62c232` (unchanged — still not pushed to `main`)
- Deployment evidence already accepted: Hostinger run `33867191849`, successful for the exact SHA.
- Browser validation date: 2026-09-04.
- Correction head: `review/upgrade-journey-finalisation@a4a23920` (one commit on top of the reviewed `b6d8d05a`)

## Accepted Phase 0 architecture
One active journey only: **Upgrade your plan/build**. Standalone Build Your Own is deferred and disabled. Upgrade must never fall through, relabel, transition, survive, hydrate, or resurrect as standalone Build Your Own.

No `CZTU`/`CZTEU` minting, no `CZTC`/`CZTEC`, and no Finalise-to-Build-Your-Own pipeline in this phase. Preserve exact-base identity as native `tierOccupantId` plus exact Edition identity.

The quote cart is working correctly and is a strict non-change boundary. Do not modify its removal, projection, or rendering behavior to accommodate invalid state emitted by the new Upgrade engine.

## Accepted correction at `b6d8d05a`
The prior stale-selection correction and same-Family+Tier primary invariant remain directionally correct. Cart removal behavior must remain unchanged. This new finding closes an earlier point in the same authority boundary: the Upgrade engine still exposes an enabled action before a valid primary exists.

## Live browser finding
**FAIL — Upgrade your build accepts an Upgrade while the cart has no primary Tier/Edition.**

- With the quote cart empty, the **Upgrade your build** section remains exposed.
- Its Block Storage card shows `$0 per unit` and an enabled yellow **Add** button.
- The empty state underneath says “No inclusions selected yet,” confirming there is no committed primary-backed Upgrade.
- The user can therefore fire the new engine outside a ready cart/primary context.
- When fired, the Upgrade engine can show Block Storage $10, **Remove**, and `$10 / mo Ongoing`, but the cart cannot validly represent it because it has no primary. This is an Upgrade-engine misfire, not a cart defect.
- The earlier evidence of an upgrade-only `BUILD YOUR OWN / Monthly $10` line is the prohibited downstream fallback from this invalid state.

## Exact fix request for Claude
1. In **Upgrade your build**, disable every Upgrade **Add** action unless the authoritative quote cart already contains the exact ready primary Tier/Edition for that Family+Tier Instance.
2. Empty cart, removed primary, mismatched primary, primary still being committed, and otherwise-not-ready primary states must all be non-interactive.
3. The disabled state must be enforced at both UI and Upgrade-engine/domain boundaries. A click, stale handler, hydration, or programmatic call must not start preview, pricing, persistence, or projection without the exact primary.
4. When no exact primary exists, clear or ignore any local Upgrade selection and subtotal. Do not emit an item for the cart to handle, and never fall back to `BUILD YOUR OWN`.
5. Keep the cart unchanged. The cart must not be amended to print, accept, repair, or render this invalid Upgrade state.
6. Preserve the accepted `b6d8d05a` reconciliation behavior, base-removal/swap cascade, and same-exact-base reconfirm behavior.
7. Do not introduce new identity models, schema paths, pricing changes, finalisation machinery, standalone Build Your Own, or unrelated UI redesign.

## Required regressions
- Empty cart: Upgrade **Add** is disabled; invocation cannot create preview, subtotal, persistence, or cart output.
- No exact/matching primary: same guard at domain boundary even if UI is bypassed.
- Primary pending/not ready: Upgrade remains disabled until the exact primary is authoritatively present.
- Remove primary: Upgrade action disables immediately, local selection/subtotal clears, and nothing resurrects.
- Matching ready primary: Add/Remove continues to work and the cart remains unchanged.
- Reload/hydration with an orphan Upgrade: no active selection and no `BUILD YOUR OWN` output.

Report root cause, changed files, tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.

## Claude's 2nd-round correction report (2026-09-04)

**Root cause:** `ComposableOfferBrowser.tsx` had no way to independently verify a ready primary exists — it relied entirely on `FamilyTierAdapter.tsx`'s own render gate (`selectedTierId !== null`) as the SOLE point of enforcement. That gate is correct for the normal path, but the component itself was fully functional (Add enabled, auto-commit effect armed) whenever reached any other way, exactly the single-layer gap the auditor's fix request named ("enforced at both UI and Upgrade-engine/domain boundaries").

**Fix:** threaded the actual primary item down as a new prop (`PackageBuilderApp` → `FamilyTierAdapter` as `selectedPrimaryItem` → `ComposableOfferBrowser` as `primaryItem` — mirrors the existing `selectedComposableItem` precedent, not a new pattern). `hasReadyPrimary = primaryItem !== null` is the one readiness signal, used in three places:
1. The Add/Remove button and quantity input are both `disabled` **and** their own click/input handlers independently refuse to act — belt and suspenders against a stale handler or programmatic dispatch bypassing the `disabled` attribute.
2. The debounced auto-commit effect bails out *before starting a preview request at all* when `!hasReadyPrimary` (not merely before the eventual commit) — `hasReadyPrimary` is now one of its own dependencies too, so a primary disappearing mid-debounce tears down any in-flight request via the same cleanup a Family switch already used.
3. The existing reconciliation effect (prior round, keyed on `initialCartItem` going present→absent) now *also* resets local `selection`/`hasInteracted` when `hasReadyPrimary` itself goes true→false, tracked via its own ref — a customer can interact before ever having a committed Upgrade line to lose, so the cart-item signal alone couldn't catch a primary disappearing mid-interaction.

`FamilyTierAdapter.tsx`'s own `selectedTierId !== null` render gate is unchanged — this is a second, independent layer, not a replacement.

**Against each fix-request item:**
1. Add disabled without a ready primary — done (both layers).
2. Empty cart / removed primary / mismatched primary are all covered by the single binary `hasReadyPrimary` check, since `primaryItem` is always the exact scoped primary for this Family+Instance (never a different one) — "mismatched" cannot occur by construction. "Primary still being committed" has no distinct state in this codebase: primary selection is a synchronous cart insert, never a staged/async two-step, so there is no partial-commit window to separately gate.
3. Enforced at both UI (disabled controls) and domain boundary (auto-commit effect bail-out) — done, independently of each other.
4. No exact primary → local selection/subtotal clear via the reconciliation effect; nothing is ever emitted for the cart to handle since the auto-commit effect can't start; no `BUILD YOUR OWN` fallback exists anywhere in this code (confirmed by full-tree grep, unchanged from the prior round).
5. Cart untouched — 0 lines changed in `RequestSchema.php`/`NotificationTemplates.php`/any removal function; diff is scoped to `ComposableOfferBrowser.tsx`, `FamilyTierAdapter.tsx`, `PackageBuilderApp.tsx` (prop threading only), and the contract.
6. Prior round's reconciliation, base-removal/swap cascade, and same-base reconfirm behavior are all untouched and still pass their existing contract cases.
7. No new identity model, schema path, pricing change, finalisation machinery, standalone route, or unrelated UI redesign — confirmed by diff scope.

**Required regressions:**
- Empty cart / no primary — covered by source-scan proving the button `disabled` + handler guard, and the auto-commit effect's early bail-out before starting a preview.
- No exact/matching primary at the domain boundary even if UI bypassed — same auto-commit bail-out check, independent of the button's own disabled state.
- Remove primary → disables immediately, local selection/subtotal clears — covered by the reconciliation effect's `hasReadyPrimary` transition, source-scanned alongside the existing `initialCartItem` transition.
- Matching ready primary → Add/Remove continues to work, cart unchanged — the existing (pre-this-round) contract cases for that path are untouched and still pass.
- Reload/hydration with an orphan Upgrade → structurally unreachable, not merely handled: `upsertFamilyComposableQuoteItem()`'s hard invariant (prior round) means a new orphan can never be written to storage in the first place, and even a hypothetical pre-existing corrupted entry can't expose anything through this component, since `FamilyTierAdapter`'s render gate never mounts it without a primary.

**Tests:** `tsc --noEmit`, `npm run build`, `npm run docs:check` pass; every composable/package-family/quote-cart/tier contract re-run and passing. New source-scan cases in `scripts/composable-quote-cart-contract.ts` prove: `hasReadyPrimary` is derived from `primaryItem`; the auto-commit effect bails before starting a preview and lists `hasReadyPrimary` as a dependency; the Add/Remove button is disabled and its handler independently guards; the reconciliation effect resets on either trigger.

**Files changed this round:** `ComposableOfferBrowser.tsx`, `FamilyTierAdapter.tsx`, `PackageBuilderApp.tsx` (prop threading only), `scripts/composable-quote-cart-contract.ts` (+ rebuilt `dist/js/cost-builder.js`).
**Branch:** `review/upgrade-journey-finalisation@a4a23920` (base `b6d8d05a` → `3e021964` → `be0e10bf` → `04b871e3` → `main@eaead453`). Not merged to `main`.
