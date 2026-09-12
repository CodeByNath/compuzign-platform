# Cart Initial Payment Parity

## Status
- **AWAITING CHATGPT REVIEW**
- **SOURCE PUSH NOT APPROVED** — nothing pushed to `main`.
- Auditor verdict last round: **Proceed with safeguards**.
- Production `main`: `8271bb0259c199724979ecc4c1d0647454df3c91`.
- Candidate: `36ba345d920fff59adcd38bafc85d91e2bc3dbc6` (tree `0e69543dd3afba44ca1436bd196efa9f00e99e95`).
- Review branch: `feat/cart-initial-payment-parity`, rebuilt clean from `main` — one commit, and `1554cb81` is **not** in its ancestry.

## Exact fix
Do not redesign totals. The calculations are already correct.

The defect is only the duplicated trigger:
- wrong: stream-aware totals activate only when a Family item has `legPaymentSummaries.length > 1`;
- correct: activate when a Family item has `legPaymentSummaries.length > 0`.

One resolved stream is authoritative just like multiple streams.

Live case: `$675` primary + `$55` Upgrade + `$580` add-on = **$1,310 Initial Payment**. When a multi-stream OMNIA item is present, Cart and Total Commitment already agree, which confirms the helper math is not the problem.

Apply the same trigger only in:
- `QuoteSummary.tsx`
- `OrderSummary.tsx`
- `QuoteProposalPreview.tsx`
- `NotificationTemplates.php`

`QuoteDetailsOverlay.tsx` is already correct; leave it alone.

## Preserve
Keep `startingPaymentsByCycle()` / `computeTotalContractValue()` unchanged; keep Initial Payment population as primary + composable + add-ons; keep each surface's existing Contract Value population; keep legacy flat fallback only when no summaries exist; keep ongoing/Until Cancelled behavior and quote snapshots unchanged.

## Do not substitute
No composable flat-price patch, new calculator, duplicated math, Family/Tier special cases, or broader quote redesign.

## Claude
Rebuild one clean candidate from current `main`. Make this same `> 0` trigger correction across the four duplicated surfaces and nothing broader. Regression must prove `$1,310` on Cart, Total Commitment, Review & Finalise, proposal/PDF and email, plus a no-summary legacy case retaining the flat path. Record SHA/tree/files/evidence, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.

---

## Round 2 — Claude implementation record

One commit, `36ba345d`, parented directly on `main` `8271bb02`. The round-1
branch was reset rather than built on, so the superseded candidate is not in
the ancestry.

**Files changed (9):**

| File | Change |
|---|---|
| `resources/ts/components/cost-builder/QuoteSummary.tsx` | trigger (Cart footer) |
| `resources/ts/components/request-flow/OrderSummary.tsx` | trigger (Review & Finalise) |
| `resources/ts/components/request-flow/QuoteProposalPreview.tsx` | trigger (proposal/PDF + Quote View) |
| `src/Modules/Requests/Notifications/NotificationTemplates.php` | trigger (admin + customer email) |
| `scripts/cart-initial-payment-parity-regression.mjs` | new, 17 checks |
| `tests/notification-templates-initial-payment-trigger.php` | new, email coverage |
| `scripts/cart-initial-payment-addons-regression.mjs` | inverted §6 + repaired scraper |
| `scripts/request-flow-family-tier-parity-contract.ts` | tracks rename, pins `> 0` |
| `tests/notification-templates-composable-quote-parity.php` | stale comment only |
| `dist/js/*` | rebuilt output |

The four triggers are the same one-line change, `> 1` → `> 0`, renamed
`hasMultiStreamItem` → `hasQuotedPaymentStreams` so the identifier states the
question it now asks. `QuoteDetailsOverlay.tsx` untouched, as instructed.

**Preserved, as required:** `startingPaymentsByCycle()` and
`computeTotalContractValue()` unchanged; Initial Payment population still
primary + composable + add-ons; each surface's Contract Value population
unchanged; `calcQuoteTotals()` unchanged for its other callers; the
double-count-proof `itemsForGeneralTotals` split unchanged; ongoing/Until
Cancelled behavior asserted on both surfaces and in the email; no composable
flat-price patch, no new calculator, no Family/Tier special cases.

### The emailed view/print quote — Nath's addition this round
Nath reported the quote opened from the email carries the same error. It does,
and it is already covered: `QuoteViewApp.tsx` renders `QuoteProposalPreview`
and owns no totals logic of its own, so the proposal fix is that page's fix.
The regression pins that relationship as a source fact, so if the Quote View
ever grows its own totals renderer the parity claim fails loudly instead of
silently ceasing to cover it.

### Evidence
`regression:cart-initial-payment-parity` (17 checks) mounts the **real** Cart
footer, Total Commitment overlay, Review & Finalise and proposal renderer, and
reads each figure from its own rendered DOM — `$1,310` on all four, the flat
`$1,255` and the "custom pricing" wording gone, `Until Cancelled` agreeing,
plus legacy-only, no-summary-Family and mixed carts keeping the flat path.
`php tests/notification-templates-initial-payment-trigger.php` proves `$1,310`
in both admin and customer emails, no `$1,255`, no "custom pricing", every line
present by its quoted identity (the composable line reads **Upgrades**, matching
Nath's screenshot), no fabricated Total Contract Value for an all-ongoing quote,
and a legacy no-summary quote keeping flat totals with no Initial Payment row.

**Each of the four surfaces was reverted individually and its own check
failed.** That mattered: see below.

### Two test defects found and fixed — declared, not silent
1. `cart-initial-payment-addons-regression.mjs` §6 asserted that a single-stream
   cart renders **no** Initial Payment block — exactly this file's **Must
   remove**. Inverted, reason recorded at the assertion.
2. More seriously, that script's cross-surface parity section **was asserting
   nothing**. It rendered every surface into one shared container and matched
   any `div` whose text began with "Initial Payment", so it could read the
   Cart's leftover row — or the `QuoteProposalPreview` that `OrderSummary`
   renders *inside itself* as its print clone. Proof: deleting OrderSummary's
   Initial Payment row outright still passed all 24 checks. My own new script
   had the identical flaw and passed a reverted OrderSummary until I caught it
   during negative testing. Both now render each surface into a fresh container
   and read it by its own row classes. The sibling's 24 checks still pass, so
   nothing but the weak assertion was being masked.

`request-flow-family-tier-parity-contract.ts` tracks the rename and now pins
the `> 0` derivation literally on both request-flow surfaces, so the duplicated
`> 1` cannot come back. Its numeric assertions are unchanged.

### Validation
Pass: `regression:cart-initial-payment-parity` (17),
`regression:cart-initial-payment-addons` (24),
`regression:cart-bundle-upgrade-refinements` (48),
`regression:tier-next-step-navigation` (93),
`regression:single-occupant-quoted-focus` (87);
`contract:request-flow-family-tier-parity`, `contract:composable-quote-cart`,
`contract:package-family-cart`, `contract:quote-cart-addon`,
`contract:quote-view`, `contract:package-builder-regression-lock`,
`contract:quote-inclusion-quantity-parity`;
`php tests/notification-templates-initial-payment-trigger.php`,
`…-family-quote-parity.php`, `tests/package-family-notification.php`;
`tsc --noEmit`, `vite build`, `docs:check`, `php -l` all clean.

Pre-existing failures, both verified byte-identical on clean `main` `8271bb02`
by stashing the change:
- `regression:composable-quote-cart-loop` — 11 checks;
- `php tests/notification-templates-composable-quote-parity.php` — fails on
  "admin email shows the Build Your Own badge/label for the composable row".

Neither is touched by this work. The second file appears in the diff for a
**comment-only** correction (it referenced the now-renamed gate); its failure
predates and survives that edit.

No Code Map documents this gate (grepped `docs/code-map/`), so none became
stale and none was edited.

### Note on the flat-totals presentation
Where the stream-aware block now activates, the flat "Est. X total" line no
longer renders for Family items — that is the pre-existing shape of this branch,
now reached by more quotes, and is what makes Cart and Total Commitment agree.
Legacy/non-Family items keep their own general totals block alongside it
unchanged, which is what `itemsForGeneralTotals` and the parity contract's
mixed-cart guard exist to protect.
