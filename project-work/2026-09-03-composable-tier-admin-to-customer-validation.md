# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — Phase 0 identity safeguard applied**
- Auditor verdict (prior round): **Stop — architectural risk** (occupant-identity blocker)
- Current production/source: `main@eaead45338f9cc464e56d4510fa798d8b4c558b3` (unchanged — still not pushed to `main`)
- Corrected head: `review/upgrade-journey-finalisation@3e021964` (one commit on top of the reviewed `be0e10bf`)

## Architecture direction
One active journey only: **Upgrade your plan/build**. Standalone Build Your Own is deferred/disabled. Upgrade must never fall through, relabel, transition, or survive as standalone Build Your Own.

## Platform identity / occupant rule
Use the **CompuZign Platform skill** for identity work. Reuse the existing Tier/Edition occupant pipeline; no parallel allocator/persistence/resolver/order system.

- Tier: Default `CZT...`; Upgrade `CZTUXXXXX`; future Custom `CZTCXXXXX`
- Edition: Default `CZTE...`; Upgrade `CZTEUXXXXX`; future Custom `CZTECXXXXX`
- `CZTC`/`CZTEC` reserved for later Build Your Own only.
- Existing `tierOccupantId`/occupant identity is the native foundation; Platform IDs are the permanent platform identity layered through the existing identifier machinery.

## Auditor review
Phase 0 reset and orphan correction are otherwise accepted in shape. `FamilyTierAdapter` gates the browser to a selected base and forces `upgrade_your_build`; `removeFamilyTierSystemQuoteItems()` now removes base + add-ons + Upgrade; replacing a genuinely different base removes the Upgrade; same-base reconfirm preserves it. This correctly prevents the former standalone fallback/orphan behavior.

**Remaining blocker:** `replaceFamilyNormalQuoteItem()` currently decides whether the base changed using only `tierPlatformId + tierEditionPlatformId`. That is weaker than the platform's existing occupant identity model and conflicts with the explicit instruction that the Tier occupant ID is the foundation. The active customer base is an exact occupant (and, where applicable, an exact Edition), not merely two possibly absent/stale display-facing Platform-ID fields.

## Exact correction
1. Make the base-equivalence/swap guard use the existing native occupant identity (`tierOccupantId`) as mandatory identity, plus exact Edition identity where applicable. Platform IDs may be checked additionally, but must not replace occupant identity.
2. Same exact occupant + same Edition reconfirm must preserve the Upgrade. Any different occupant or different Edition must remove it.
3. Add contract cases that prove occupant change removes the Upgrade even if other Tier-facing fields happen to match, and same occupant/same Edition preserves it.
4. Do not add a new identity model, draft tracker, `CZTU`/`CZTEU` minting, or Upgrade finalisation yet. This remains Phase 0 isolation.

Return exact files/tests/review SHA and set **AWAITING CHATGPT REVIEW**. Do not push to `main`.

## Claude's identity-safeguard report (2026-09-04)

Applied as one commit (`3e021964`) on top of `be0e10bf`, `resources/ts/utils/quote.ts` only (plus rebuilt `dist/js` and the one contract file) — no new identity model, draft tracker, or minting added:

- `replaceFamilyNormalQuoteItem()`'s `baseChanged` comparison now reads `previousPrimary.tierOccupantId !== item.tierOccupantId` (mandatory, native — was `tierPlatformId`) `|| previousPrimary.tierEditionPlatformId !== item.tierEditionPlatformId` (exact Edition identity — the only Edition-identifying field this item shape carries, so "where applicable" is handled by direct null-safe equality). `tierPlatformId`/`tierId`/`tierTitle` no longer participate in the decision at all.
- Per the CompuZign Platform skill (`platform-id-families.md`): `CZT`'s own reference shape is `(tier_instance_id, occupant_id)` — occupant_id is the identity a Platform ID is minted against, confirming `tierOccupantId` is the correct mandatory anchor, not a coincidental stand-in.

**Both auditor-requested contract cases added to `scripts/composable-quote-cart-contract.ts`:**
1. A different `tierOccupantId` removes the Upgrade even when `tierPlatformId`/`tierId`/`tierTitle` all still match the old primary (proves occupant identity alone drives the removal, never a Platform-ID/label coincidence).
2. The same `tierOccupantId` + `tierEditionPlatformId` preserves the Upgrade even when `tierPlatformId`/`tierId`/`tierTitle` differ from the old primary (proves occupant identity alone drives the preservation).
The pre-existing same-Tier/reconfirm and different-Tier/swap scenarios from the prior round still pass unchanged.

**No `CZTU`/`CZTEU` minting or unified Upgrade finalisation implemented** — Phase 0 remains cleanup/isolation only, per instruction 4.

**Tests:** `tsc --noEmit`, `npm run build`, `npm run docs:check` pass; every composable/package-family/quote-cart/tier contract re-run and passing (`composable-quote-cart` updated, `package-family-cart`, `composable-offer-choice`, `composable-offer-contribution`, `composable-live-correction`, `composable-occupant-address`, `composable-occupant-workspace`, `composable-request-line`, `composable-tier-admin-ux`, `quote-view`, `quote-cart-addon`, `tier-addon-flow`, `tier-edition-switch`, `request-flow-family-tier-parity`).

**Files changed this round:** `resources/ts/utils/quote.ts`, `scripts/composable-quote-cart-contract.ts` (+ rebuilt `dist/js/admin-station.js`/`cost-builder.js`/`homepage.js` and three new hashed chunks).
**Branch:** `review/upgrade-journey-finalisation@3e021964` (base `be0e10bf` → `04b871e3` → `main@eaead453`). Not merged to `main`.