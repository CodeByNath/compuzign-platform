# Cart Initial Payment Parity

## Status
- **AWAITING CHATGPT REVIEW**
- **SOURCE PUSH NOT APPROVED** — nothing pushed to `main`.
- Auditor verdict last round: **Proceed with safeguards**.
- Production `main`: `8271bb0259c199724979ecc4c1d0647454df3c91`.
- Review branch: `feat/cart-initial-payment-parity`, head `1554cb81`.

> **Scope decision needed before closure — see "Same defect on three other
> surfaces" below.** The corrected Cart will now disagree with Review &
> Finalise, the proposal/PDF and the customer email, which still carry the
> identical gate. That is a scope call, not something this round decided.

## Live defect
Nath supplied live screenshots for KAIROS with three quoted Family lines:
- Business Pro: Monthly `$675`
- Upgrades: Monthly `$55`
- Backup & DR Shield: Monthly `$580`

The Cart footer shows **Est. monthly total $1,255 + 1 item at custom pricing**.
The Total Commitment overlay shows **Initial Payment $1,310**.

`$675 + $55 + $580 = $1,310`, so the overlay is correct and the Cart is dropping the Upgrade's `$55` from its starting-payment total.

## Source finding
`QuoteDetailsOverlay.tsx` correctly derives Initial Payment with `startingPaymentsByCycle()` across every quoted Family Tier item's `legPaymentSummaries` (primary + composable Upgrade + add-ons).

`QuoteSummary.tsx` also computes the same `startingPayments`, but only exposes that authoritative Initial Payment branch when `hasMultiStreamItem` is true. If every quoted item has exactly one stream, it falls back to legacy `calcQuoteTotals()` using each item's flat `price/billingCycle`. The composable Upgrade can therefore be classified as custom/unpriced even though its quoted `legPaymentSummaries` correctly carry `$55 Monthly`.

The defect is the **branch trigger**, not the payment-summary helper.

## Required correction
For Package Builder Family Tier quote items, the presence of authoritative `legPaymentSummaries` must be enough to drive the Cart's stream-aware totals/Initial Payment presentation, even when each item has only one stream.

For the live example, Cart and Total Commitment must both resolve Initial Payment to **$1,310**.

Do not globally rewrite `calcQuoteTotals()`; Cost Builder and legacy flat quote items still need that compatibility path.

## Must preserve
- `startingPaymentsByCycle()` as the shared payment-start authority;
- complete Family population: primary + composable Upgrade + add-ons, each once;
- existing Total Commitment behavior;
- finite/ongoing TCV behavior and `Until Cancelled` fallback;
- legacy/Cost Builder flat quote handling when no `legPaymentSummaries` exist;
- per-item stream rows and exact quoted snapshot identity;
- no Family/Tier hardcoding.

## Must remove
The assumption that stream-aware Cart totals are needed only when **one item has multiple streams**.

## Must not substitute
Do not omit Upgrade/Add-on lines, force composable flat prices into `calcQuoteTotals()`, duplicate starting-payment math, or change pricing/resolver data to solve this presentation defect.

## Claude
Audit `QuoteSummary.tsx`, `QuoteDetailsOverlay.tsx`, `utils/paymentSummary.ts`, `utils/quote.ts`, relevant cart/quote regressions and Code Maps. Make the smallest correction so Cart totals use the authoritative quoted payment summaries whenever Family Tier items carry them, while true legacy/no-summary items retain the existing flat fallback.

Add regression coverage for three single-stream Family items (primary `$675`, Upgrade `$55`, add-on `$580`) proving Cart Initial Payment equals `$1,310` and matches Total Commitment; also cover a mixed legacy/no-summary case so compatibility is explicit.

Create one clean review branch from current `main`, run focused cart/quote regressions + TypeScript/build/docs, record exact SHA/tree/files/evidence here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.

---

## Round 1 — Claude implementation record

**Candidate:** `feat/cart-initial-payment-parity` @ `1554cb81`
(tree `3ea3e54612bb368af738f885d0d11c14be5740c1`), branched clean from
`main` `8271bb02`. One commit. Pushed to the review branch only.

**Files changed (4):**
- `resources/ts/components/cost-builder/QuoteSummary.tsx` (the correction)
- `scripts/cart-initial-payment-parity-regression.mjs` (new)
- `scripts/cart-initial-payment-addons-regression.mjs` (one inverted assertion)
- `package.json` (registers `regression:cart-initial-payment-parity`)
- `dist/js/cost-builder.js` (rebuilt output)

### Diagnosis — confirmed, and the mechanism is exactly as this file stated
`QuoteTotalsPresentation()` gated its stream-aware presentation on
`(item.legPaymentSummaries?.length ?? 0) > 1`. All three live lines carry one
stream, so the footer fell through to `calcQuoteTotals()`, which buckets on
each item's own flat `price`. The composable Upgrade's flat price is `null` by
construction — `ComposableOfferBrowser.tsx` builds it as
`price: headline?.price ?? null` — while its `legPaymentSummaries` correctly
carry `$55 Monthly`. `calcQuoteTotals()` classifies `price === null` as
unpriced, which is both the missing `$55` and the "+ 1 item at custom pricing"
note. `$675 + $580 = $1,255`, the reported figure, exactly.

### Correction
One predicate, renamed to say what it now means:
`hasMultiStreamItem` (`> 1`) becomes `hasQuotedPaymentStreams` (`> 0`), used by
the same two render gates as before. Nothing else changed.

- `startingPaymentsByCycle()` and `computeTotalContractValue()` untouched;
- the Initial Payment population (whole `familyTierItems` set: primary +
  composable + add-on) untouched — that was the 2026-09-10 correction and this
  round did not revisit it;
- the TCV population (primary/composable only) untouched;
- `calcQuoteTotals()` untouched, so its other callers are unaffected;
- `QuoteDetailsOverlay.tsx` needed **no change**: it never had this gate, which
  is why it was already right at `$1,310`.

### Evidence
`scripts/cart-initial-payment-parity-regression.mjs` (14 checks) mounts the
**real** `QuoteTotalsPresentation` *and* the **real** `QuoteDetailsOverlay`
(opened on Total Commitment) under happy-dom and reads both figures out of
rendered DOM — the parity claim is asserted between two rendered surfaces, not
re-derived from the helper both of them call. Covers: the live three-line cart
at `$1,310` on both surfaces; the flat `$1,255` and the "custom pricing"
wording gone; `Until Cancelled` still agreeing on both; a lone single-stream
item reporting its own total; a pure-legacy cart and a pure no-summary Family
entry keeping the flat `Est. monthly total` path; and a mixed cart where the
no-summary line contributes nothing rather than a silent `$0`.
**Verified to fail with the `> 1` trigger reinstated** (reports `null` where
`$1,310` is required), then restored.

### One test assertion was inverted — declared, not quietly changed
`cart-initial-payment-addons-regression.mjs` §6 asserted *"a single-stream cart
still renders no Initial Payment block (hasMultiStreamItem gate untouched)"*.
That is precisely the assumption this file's **Must remove** names, so it could
not both stand and be satisfied. Inverted to require `$100`, with the reason
recorded at the assertion and in the file header. That script's own subject —
the primary + add-on + composable population rule — is untouched and still
passes (24 checks).

### Validation
Pass: `regression:cart-initial-payment-parity` (14),
`regression:cart-initial-payment-addons` (24),
`regression:cart-bundle-upgrade-refinements` (48),
`regression:tier-next-step-navigation` (93),
`regression:single-occupant-quoted-focus` (87);
`contract:composable-quote-cart`, `contract:package-family-cart`,
`contract:quote-cart-addon`, `contract:quote-view`,
`contract:package-builder-regression-lock`; `tsc --noEmit` clean;
`vite build` clean; `docs:check` clean.

Pre-existing failure, **not** caused by this change:
`regression:composable-quote-cart-loop` fails 11 checks. Verified by stashing
the change and re-running on clean `main` `8271bb02` — byte-identical failure
set ("REGRESSION FAILED — 11 check(s) did not hold"). Untouched by this work.

No Code Map documents this gate (grepped `docs/code-map/` for
`hasMultiStreamItem`, `multi-stream`, `Initial Payment`, `startingPayments`),
so none became stale and none was edited.

---

## Same defect on three other surfaces — scope decision for the auditor

**Not acted on.** Flagging rather than fixing, because widening scope is not
mine to decide — but this needs a ruling before closure, since the Cart fix on
its own creates a disagreement that did not exist before.

The identical `> 1` gate, with the same consequence, is also in:

| Surface | File | Gate |
|---|---|---|
| Review & Finalise | `resources/ts/components/request-flow/OrderSummary.tsx` | line ~194 |
| Proposal / PDF | `resources/ts/components/request-flow/QuoteProposalPreview.tsx` | line ~158 |
| Customer email | `src/Modules/Requests/Notifications/NotificationTemplates.php` | line ~939 |

Each computes `hasMultiStreamItem` the same way and uses it both to gate its
Contract Value / Initial Payment block *and* to decide `itemsForGeneralTotals`.
On the live KAIROS quote all three will still show `$1,255 + 1 item at custom
pricing` and **no Initial Payment row at all**.

So after this candidate ships, the same quote reads `$1,310` in the Cart and
Total Commitment, and `$1,255` everywhere downstream. Before it, all four
agreed — by being wrong together.

The 2026-09-10 work item established the standing principle for exactly this
(*"Cart, Review & Finalise, proposal/PDF/Quote View and PHP email were
corrected consistently"*), which points toward fixing all four. This file
scopes the work to the Cart and does not list these files, which points the
other way. **Please rule.** If extended, it is the same one-line predicate
change per surface plus matching regression coverage; the existing
`cart-initial-payment-addons-regression.mjs` already mounts `OrderSummary` and
`QuoteProposalPreview`, so the harness for two of the three is already there.

## Minor observation — not acted on
In `QuoteTotalsPresentation()` the `cycleEntries.length === 0` branch
("Pricing on request / Contact Us") is evaluated *before* the stream-aware
branch. A cart containing only null-flat-priced stream-carrying lines (a lone
composable Upgrade) therefore still reads "Pricing on request" in the `.total`
block — though with this fix it now *does* render its Initial Payment row
below, so no figure is missing. Reordering is one line if wanted; left alone as
outside the reported defect.
