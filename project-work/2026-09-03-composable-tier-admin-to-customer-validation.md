# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION**
- Pushed and deployed: `main@bdac492215e8aebea861a783924b9bdc2d46393a` (fast-forward from `a4a23920`, pushed directly — no conflicts).
- Hostinger deploy: run `33877602142`, **success**, `2026-09-04T13:21:26Z`–`13:21:58Z` (~32s).

## Accepted architecture / non-change boundary
One active customer journey only: **Upgrade your plan/build**. Standalone Build Your Own remains deferred/disabled. Upgrade must never exist, price, persist, hydrate, resurrect, or present itself as Build Your Own without its exact ready Tier/Edition base.

No `CZTU`/`CZTEU` minting yet; `CZTC`/`CZTEC` reserved. Preserve native `tierOccupantId` + exact Edition identity, cart authority/removal semantics, source pricing, schema, and prior readiness/hydration guards.

## Auditor review result
Reviewed the full net diff `a4a23920..bdac4922` (2 commits) and the follow-up source correction itself.

Accepted:
- Upgrade detail table reads stored `inclusionItems.unit_price` / `line_total`; no second pricing source.
- Shared `InclusionDisclosure` is reused for quote-line and Total Commitment quick views; cart remove control remains independent.
- Upgrade inclusion selector is a compact list with accessible +/× controls; server-resolved inline totals/cadence passthrough retained.
- Details plan navigation is a single horizontally-scrollable chip row.
- Customer Details now uses the existing `composableCoexistsWithPrimary()` rule to display **Upgrades** at all previously leaking `item.tierTitle` sites; stored/internal title and identity remain untouched.
- The loop regression is migrated to seed a real ready primary rather than weakening `hasReadyPrimary` or reviving standalone Build Your Own.
- The newly exposed redundant self-removal preview is correctly fixed with a one-shot `selfCausedRemovalRef`; this does not change cart semantics or commercial state.
- Claude reports `tsc --noEmit`, build, docs check, relevant contracts, and `regression:composable-quote-cart-loop` all green.

The omission of a literal per-item **Ongoing** badge remains accepted for this UI round; do not create another resolver just to print it.

## Next action
Pushed and deployed per Status above. Auditor/browser agent to verify from a fresh KAIROS route against `main@bdac4922`:
1. Upgrade detail shows Quantity, Unit Price, Total and correct billing summary.
2. Quote-line disclosures work independently of remove × and close on outside click.
3. Compact Upgrade list shows correct inline totals/cadence and +/× behavior.
4. Details chips horizontally scroll; Total Commitment disclosures show the correct inclusions.
5. No customer-facing **Build Your Own** label appears anywhere in the active Upgrade route.
6. Removing/switching the base or removing the Upgrade still clears/disables Upgrade state correctly; reload does not resurrect it.

Do not start `CZTU`/`CZTEU` work until this live gate passes.