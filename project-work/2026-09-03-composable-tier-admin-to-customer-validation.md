# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — UI correction follow-up implemented**
- Production/base: `main@a4a23920c8f84c2bd457790847d2525504270d67`
- Review head: `review/upgrade-journey-finalisation@bdac492215e8aebea861a783924b9bdc2d46393a`
- Not yet pushed to `main` — awaiting this round's approval.

## Claude's report — round: UI correction follow-up

Both blocking corrections addressed on `review/upgrade-journey-finalisation@bdac4922`. `npx tsc --noEmit`, `npm run build`, `npm run docs:check`, `regression:composable-quote-cart-loop`, and every contract script touching the changed files (`contract:composable-quote-cart`, `composable-offer-contribution-contract`, `composable-live-correction-contract`, `package-builder-addon-focus-contract`, `composable-offer-choice-contract`, `package-builder-bundle-inclusion-parity-contract`, `payment-summary-extraction-parity-contract`, `request-flow-family-tier-parity-contract`, `plan-details-value-states-contract`, `quote-inclusion-quantity-parity-contract`, `package-builder-regression-lock-contract`) all pass — the loop regression is now fully green, not merely migrated.

**1. Customer Details no longer leaks `Build Your Own`:** `QuoteDetailsOverlay.tsx` gained a `planDisplayLabel(item, contextItems, fallback)` helper built on the SAME `composableCoexistsWithPrimary()` check `QuoteSummary.tsx`'s own quote-line label already uses (never a second heuristic). Applied at all 3 flagged sites: the quoted-plan tab chip, `ComposablePlanDetails`' Plan Tier row (which now also takes an `items` prop so it has the cart context to check), and the Total Commitment row. Presentation only — `item.tierTitle`/stored occupant identity and Admin/internal representation are untouched; confirmed no customer-facing `Build Your Own` string is reachable anywhere in the active Upgrade route.

**2. Regression migrated to the active architecture, not retired:** `composable-quote-cart-loop-regression.mjs` now seeds a real primary Tier (`PRIMARY_ITEM`, matching `FAMILY`'s own `family_platform_id`/`tier_instance_platform_id`) into the cart before mounting, via the untouched native `localStorage.setItem` so the seed itself isn't counted as a customer interaction. Every original loop/race assertion was preserved unchanged — none needed retiring.

Migrating the fixture surfaced a genuine, previously-unexercisable defect (only reachable once a real primary lets the Upgrade engine run at all): `ComposableOfferBrowser`'s reconciliation effect — added to reset local Add/Remove state when the cart's composable line disappears out from under it — could not distinguish a *self-caused* Remove-to-zero from an *external* cart removal, even though its own docblock already said it should ("WITHOUT it having caused that itself"). Every self-driven Remove-to-empty click reseeded `selection` to a new-but-equivalent object, which re-fired the auto-commit effect (dependency comparison is by reference, not value) for a selection that had already resolved — one redundant preview round-trip per Remove click. Never an unbounded loop (it settled after the one extra call) and never a wrong commit (the redundant resolution ran with `hasInteracted: false`, so it never called `onCommit`/`onRemoveFromQuote` a second time) — but a real, worth-fixing inefficiency. Fixed with a one-shot `selfCausedRemovalRef`, set immediately before the removal-branch's `onRemoveFromQuote()` call and consumed by the reconciliation effect on its very next run.

This second fix was not explicitly requested — the instruction was to migrate the fixture and preserve its assertions — but "all relevant gates must pass" per the Required return, and the newly-exposed failure was a real defect the old fixture could never have caught, not a test-only artifact, so I fixed it at the cause rather than weakening the assertion or leaving the gate red. Flagging this judgment call explicitly for review rather than deciding silently.

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