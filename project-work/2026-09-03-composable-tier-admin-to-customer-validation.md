# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — UI CORRECTION FOLLOW-UP**
- Auditor verdict: **Stop — architectural risk**
- Production/base: `main@a4a23920c8f84c2bd457790847d2525504270d67`
- Reviewed UI head: `review/upgrade-journey-finalisation@07f724014650c1d6bdf786e480b8875645e3374e`
- Do not push this head to `main` yet.

## Accepted architecture / non-change boundary
One active journey only: **Upgrade your plan/build**. Standalone Build Your Own remains deferred/disabled. Upgrade must never exist, price, persist, hydrate, resurrect, or present itself as Build Your Own without its exact ready Tier/Edition base.

No `CZTU`/`CZTEU` minting yet; `CZTC`/`CZTEC` reserved. Preserve native `tierOccupantId` + exact Edition identity, cart authority/removal semantics, source pricing, schema, and prior readiness/hydration guards.

## Auditor review of UI corrections
The 4 requested UI changes are otherwise acceptable in shape:
- Upgrade detail uses stored `inclusionItems.unit_price` / `line_total`, not a new pricing source.
- One shared `InclusionDisclosure` provides quote-line + Total Commitment quick views with independent remove control and outside-click close.
- Upgrade selections are compact rows with accessible +/× controls and server-resolved inline totals/cadence passthrough.
- Details tabs are single-row horizontally scrollable chips.

The omission of a literal per-item **Ongoing** badge is accepted for this presentation round; do not invent a second item-to-period resolver merely to print it.

## Blocking corrections
### 1. Customer Details still leaks `Build Your Own`
`QuoteDetailsOverlay.tsx` still falls back to raw `item.tierTitle` for composable items. In the active Upgrade route that can print **Build Your Own** in:
- the quoted-plan chip (`resolved?.planLabel ?? item.tierTitle`);
- `ComposablePlanDetails` → Plan Tier;
- Total Commitment row fallback (`resolved?.planLabel ?? item.tierTitle`).

That directly violates acceptance check 7. Use the existing active Upgrade relationship/context to present **Upgrades** (or the already-established Upgrade customer label) on these customer surfaces. Do **not** change stored occupant identity/title or Admin/internal representation just to fix presentation.

### 2. Do not merge a knowingly failing standalone regression
`composable-quote-cart-loop-regression.mjs` now fails by construction because its fixture has no primary and therefore models the disabled standalone route. Do not weaken `hasReadyPrimary` or restore standalone behavior to satisfy it.

Migrate that regression to the active architecture by establishing an exact ready primary before exercising the composable Upgrade loop, preserving the loop/race assertions it was meant to test. If any assertion is genuinely standalone-only and no longer valid, retire that assertion explicitly with a concise reason rather than leaving a tracked regression red.

## Required return
Keep this correction narrow. Re-run the UI/quote/composable contracts plus the corrected `regression:composable-quote-cart-loop`; all relevant gates must pass. Report exact files, tests, review SHA, and confirm no customer-facing Build Your Own label is reachable in the active Upgrade route. Set **AWAITING CHATGPT REVIEW**. No `main` push until audited.