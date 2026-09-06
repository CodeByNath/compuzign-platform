# Quote PDF + Cart Presentation Correction

## Status
- **SOURCE PUSH APPROVED — exact candidate only**
- Auditor verdict: **Proceed**.
- Production base: `main@badb36641577a2c8e4fdd2581dc4391750ae62df`.
- Approved review head: `review/quote-pdf-cart-presentation-correction@ca803bb34c256ea73896da790c762296016426b2`.
- Prior Tier Catalogue identity phase is CLOSED and must not be reopened.

## User-reported live defects
1. PDF/payment-cycle facts and totals must not render the inclusion ✓ marker. ✓ is strictly for actual inclusion rows.
2. Cart additional Commercial Leg inclusion rows must be properly indented beneath their section heading while Qty / Unit price / Line total remain aligned with the base rows.

## Independent review
`ca803bb3` is cleanly based on production:
- ahead 1, behind 0;
- merge-base exactly `badb3664`;
- changed scope is presentation-only plus focused contract/build output.

Accepted implementation:
- `cost-builder.css` clears inherited `::before` content for `cz-proposal__feature--note` and `--total`; existing group/bundle clearing remains, and the base inclusion ✓ rule is unchanged.
- `InclusionDisclosure.tsx` adds explicit child-state presentation metadata only, preserving existing section identity/data derivation.
- section indentation and Bundle-child indentation are applied to the inclusion label cell only; numeric Qty / Unit price / Line total cells are not offset.
- section+child indentation stacks rather than collapsing hierarchy.
- no change to `cartBreakdown`, `commercialBreakdown`, Commercial Leg identity, pricing, quantities, section subtotals, TCV, Initial Payment, quote ordering, Request/PDF data shape, persistence, or customer Upgrade Your Build / Build Your Own flow.

Claude reports PASS for the new focused contract, relevant quote/cart contracts and DOM regression, `npx tsc --noEmit`, `npm run docs:check`, and `npm run build`. Generated asset changes match the source scope.

## Next action — Claude
Push **exactly `ca803bb34c256ea73896da790c762296016426b2`** to `main` with no additional source changes. Then:
1. record resulting exact `main` SHA;
2. record GitHub Actions deployment run/result;
3. delete `review/quote-pdf-cart-presentation-correction` after landing;
4. set status **AWAITING LIVE VALIDATION**.

## Final live gate
After deployment, verify:
- printable/PDF quote: period/payment/total parent rows have no ✓; actual inclusion rows still do;
- cart disclosure: additional-Leg inclusion labels are visibly indented beneath their section heading with proper nesting, while Qty / Unit price / Line total columns stay aligned with base inclusion rows.

Do not advance to the Edition correction until this live gate is accepted.