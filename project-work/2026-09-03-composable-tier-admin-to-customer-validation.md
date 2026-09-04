# Composable Tier — continuous work track

## Status
- **SOURCE PUSH APPROVED — pricing/disclosure correction through `db154aa7`**
- Auditor verdict: **Proceed with safeguards**
- Production/base independently confirmed: `main@bdac492215e8aebea861a783924b9bdc2d46393a`
- Approved review head: `review/upgrade-journey-finalisation@db154aa7b081c458a0784a7d52b51449e0757531`

## Accepted architecture / non-change boundary
One active customer journey only: **Upgrade your plan/build**. Standalone Build Your Own remains deferred/disabled. Preserve native `tierOccupantId` + exact Edition identity, cart authority/removal semantics, readiness/hydration guards, schema, and Rate Sheet authority.

**Money rule:** Rate Sheet `unit_price` is an authoritative numeric rate, not inherently cent-precision. Resolver, Commercial Legs, quote snapshots, multiplication, and aggregation use raw numeric values. Presentation-only normalization may suppress IEEE-754 representation noise but must not impose a business decimal-place policy or feed back into calculations.

## Auditor review result
Reviewed `604c46fb..db154aa7`: one narrow source correction plus rebuilt assets.

Accepted:
- Removed the rejected fixed six-decimal-place ceiling.
- `formatPrice()` now normalizes to 15 significant digits via `Number(price.toPrecision(15))`, which is tied to JavaScript `number` precision rather than a fixed currency/rate decimal-place rule.
- `Intl.NumberFormat` then presents up to its technical fraction-digit range; known KAIROS rates `$0.023` and `$0.004` survive, as do deeper non-zero fixtures `$0.0000004` and `$0.00000004`.
- Whole/fractional conventions remain `$50`, `$0.20`, `$36.50`, `$0.10`; `0.1 + 0.2` presents `$0.30`.
- No calculation path was changed: multiplication/sums continue on original numeric values; formatted values remain presentation-only.
- The previously accepted in-flow Inclusion/Qty/Price disclosure redesign and Upgrade/cart/readiness/hydration/no-Build-Your-Own safeguards are untouched.
- Claude reports typecheck, build, docs check, money-format contract, composable quote/cart contract, and real-DOM loop regression all green.

Safeguard: 15 significant digits is a runtime representation normalization, **not a Rate Sheet schema precision guarantee**. Do not document it later as a commercial precision limit. If Rate Sheet storage ever moves from JS `number` semantics to exact decimal/string money, this formatter contract must be revisited rather than inherited as business policy.

## Next action for Claude
Fast-forward/push **only the reviewed work through `db154aa7`** to `main`, deploy through the normal GitHub Actions -> Hostinger path, record exact `main` SHA and workflow/run result here, then set **AWAITING LIVE VALIDATION**.

Live browser gate must verify:
1. Block Storage `$0.10`, Object Storage `$0.023`, Archive/Cold `$0.004` and a whole-number control render correctly where those authoritative values are present.
2. Quantity changes update Upgrade row price/subtotal/cart/Details/Total Commitment consistently.
3. Quote disclosure expands in-flow, pushes later rows, shows Inclusion/Qty/Price + Total, and the chevron/remove controls remain independent.
4. No customer-facing Build Your Own label appears in the active Upgrade route.
5. Removing/swapping the base or removing Upgrade clears/disables state; reload does not resurrect it.

Do not begin `CZTU`/`CZTEU` work until this live gate passes.