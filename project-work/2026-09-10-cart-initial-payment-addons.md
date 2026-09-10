# Cart Initial Payment Must Include Add-ons

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `1a9b6cc0322e662dbad233532c44bd1ad40bbe30`.
- Prior focused-selector work is **CLOSED**; origin is clean with only `main` + `Project-work-instructions`.

## Live defect
Nath reports this cart sequence:
1. KAIROS primary + KAIROS add-on are quoted.
2. Primary is later changed/replaced by OMNIA.
3. The KAIROS add-on correctly remains in the quote.
4. **Initial Payment** no longer includes that surviving add-on's starting charge.

The surviving add-on behavior is accepted. This work is only about truthful Initial Payment calculation.

## Source audit
`QuoteTotalsPresentation()` in `QuoteSummary.tsx` correctly derives `familyTierItems`, but then creates `primaryFamilyTierItems = familyTierItems.filter((item) => !item.isAddon)`.

That primary-only set is intentionally used for Total Contract Value, because current comments explicitly exclude add-ons from canonical finite-contract TCV math.

The defect is that **Initial Payment reuses the same primary-only set**:

`startingPaymentsByCycle(primaryFamilyTierItems.map((item) => item.legPaymentSummaries ?? []))`

So every add-on is excluded before the starting-payment helper runs. `startingPaymentsByCycle()` itself is already a generic multi-item helper: for each supplied item it finds that item's own earliest `startMonth`, includes streams beginning there, and groups same-cycle amounts. The omission is therefore in the caller, not the helper.

## Required behavior
Initial Payment is a whole-cart "what is due at each quoted item's own start" fact. Every quoted `family_tier` line with valid `legPaymentSummaries` that survives in the cart must contribute its own starting streams — **primary, add-on, and composable/Upgrade**. Do not make Initial Payment depend on which Family owns the current primary.

Do **not** change the existing primary-only TCV policy in this phase.

## Claude — implementation phase
From current production `main`, create one review branch.
1. Correct only the Initial Payment input set in `QuoteTotalsPresentation()` so all applicable Family Tier cart lines contribute their starting streams.
2. Preserve `startingPaymentsByCycle()` semantics: each item's own earliest start; same-cycle aggregation only; no timeline multiplication or cross-cycle pricing invention.
3. Keep Total Contract Value logic and its primary-only eligibility exactly unchanged.
4. Add/extend a contract proving a surviving add-on contributes to Initial Payment after a different primary is present/replaced. Also prove primary + add-on same-cycle starting charges aggregate correctly, and a later-starting leg within an item is excluded.
5. Include composable/Upgrade coverage if it has `legPaymentSummaries`, because Initial Payment is whole-cart, while preserving all existing Upgrade cart behavior.
6. Run relevant quote/cart/payment-summary contracts, TypeScript, build, docs check. Push review branch only; record SHA/diff/tests here; set **AWAITING CHATGPT REVIEW**; stop. Do not push `main`.

## Must preserve
Surviving add-ons; cart ordering; exact quote snapshots; per-item stream rows; starting-payment helper semantics; primary-only TCV policy; ongoing/finite disclosure; quantity; composable/Upgrade behavior; legacy Cost Builder fallback.

## Must remove
The accidental primary-only filter from the **Initial Payment** calculation path.

## Must not substitute
Do not delete surviving add-ons when primary changes; do not attach an add-on to the new primary; do not fake a flat add-on price; do not alter TCV to make the number match; do not re-resolve live pricing from Rate Sheets; do not invent cross-cycle arithmetic.

## Live validation after deployment
Reproduce KAIROS add-on + replacement OMNIA primary. Cart must retain the add-on and Initial Payment must include the OMNIA primary starting charge(s) **plus** the surviving KAIROS add-on's own starting charge(s), with no unrelated later-starting Leg included.

---

## Claude Report — 2026-09-10

Review branch `review/cart-initial-payment-addons`, cut from production
`main@1a9b6cc0322e662dbad233532c44bd1ad40bbe30`, pushed at
`d33376c2462cbadd15dfc0d83a29b0045216565a`. **Not merged to `main`.**

### Root cause — confirmed as specified
The audit in this file is correct. One correction to its wording only: the
function is `QuoteTotalsPresentation()` and it lives in `QuoteSummary.tsx`
exactly as stated — the defect line was

```
startingPaymentsByCycle(primaryFamilyTierItems.map((item) => item.legPaymentSummaries ?? []))
```

`primaryFamilyTierItems` is derived one block above for the Total Contract
Value sum, where excluding add-ons is deliberate policy, and was then reused
as the Initial Payment input. `startingPaymentsByCycle()`
(`utils/paymentSummary.ts`) is genuinely generic — per item it takes that
item's own `Math.min(startMonth)`, admits only streams at that minimum, and
adds same-cycle amounts across items. The omission was entirely in the caller.

### Fix
`resources/ts/components/cost-builder/QuoteSummary.tsx` — the Initial Payment
derivation now reads the whole `familyTierItems` set instead of the
primary-only subset. One expression changed; the surrounding comment records
why the two figures deliberately read different populations.

Total Contract Value, `allPrimariesFinite`, the ongoing/"Until Cancelled"
disclosure, the `hasMultiStreamItem` render gate, per-item rows, cart
ordering, helper semantics and quote snapshots are untouched.

Composable/Upgrade lines needed no special casing: `FamilyTierAdapter`'s
`itemFor()` builds Default, Edition and add-on lines from the same path, so
they are already inside `familyTierItems`.

### Cross-check of the same pattern elsewhere
`QuoteDetailsOverlay.tsx`'s Total Commitment tab already passes
`allFamilyTierItems` (whole-cart) into the same helper. The cart footer was
therefore the odd one out, and this change brings it in line rather than
inventing a new rule.

### Tests — new
`scripts/cart-initial-payment-addons-regression.mjs`, registered as
`npm run regression:cart-initial-payment-addons`. **19 checks, all passing.**

It mounts the real exported `QuoteTotalsPresentation` via happy-dom +
Preact's own `render()` (bundled with vite's own esbuild — the technique
`tier-system-footer-loop-regression.mjs` already established; no new
dependency) and asserts the **rendered** figure rather than re-deriving the
arithmetic. Coverage:

- the reported case — surviving KAIROS add-on under a replaced OMNIA primary,
  the add-on deliberately from a *different* Family than the current primary;
- an explicit directional check that a surviving add-on must *change* the
  figure, so reintroducing the primary-only filter fails loudly;
- same-cycle starting charges aggregating across primary and add-on;
- a Leg starting in Month 6 within an item still excluded, and its amount
  proven absent from the rendered output;
- an item whose own earliest start is Month 3 still contributing from its own
  start (per-item, never a shared global month 0);
- a composable/Upgrade Edition line contributing;
- TCV staying primary-only — the add-on's own finite subtotal must not join
  it — and an add-on-only cart still showing "Until Cancelled", never a
  fabricated `$0`;
- untouched gates: single-stream cart renders no Initial Payment block, an
  item with no `legPaymentSummaries` contributes nothing, a legacy Service
  line never enters the derivation, empty cart renders cleanly.

**Directional proof:** run against the pre-fix input set, it fails with
`expected $5,275, got $5,200` — the live defect reproduced exactly. Against
the fix, 19/19 pass.

### Tests — existing
Both owning Code Maps' full Validation lists were run (`cost-builder.md` and
`quote-builder.md`), not only this task's own.

Green: `contract:cost-builder-isolation`, `contract:tier-addon-flow`,
`contract:tier-edition-switch`, `contract:quote-sidebar-scroll`,
`contract:quote-view`, `contract:quote-view-print-portal`,
`contract:quote-view-legacy-description`, `contract:quote-cart-addon`,
`contract:request-flow-family-tier-parity`, `contract:request-flow-rail-scroll`,
`contract:package-family-cart`, `contract:package-builder-regression-lock`,
`contract:commercial-leg-inclusion-groups`,
`contract:commercial-leg-extension-groups`,
`contract:package-family-request-flow`, `npx tsc --noEmit`, `npm run build`,
`npm run docs:check` (117 Markdown files, 46 Code Maps).

PHP green: `tier-instance-public-projection`, `tier-public-projection-is-addon`,
`tier-pricing-parity`, `tier-edition-public-projection`,
`request-schema-is-addon`, `request-schema-minimum-term`,
`request-schema-family-quote-snapshot`,
`request-schema-legacy-snapshot-description`, `request-durable-submission`,
`package-family-notification`, `notification-templates-family-quote-parity`,
`quote-view-access-boundary`, `quote-view-entrypoint`.

**Pre-existing baseline failures, each re-verified as failing on clean
`main` with my changes stashed — none caused by this work:**
- `contract:platform-identity-schema` — output diffed byte-for-byte between
  clean `main` and this branch: **identical**, so this change adds no new
  violation.
- `php tests/tier-capability-invariants.php`
- `php tests/quote-view-http-boundary.php`
- `php tests/quote-view-email-link.php`

The last two are the exact tests the abandoned
`2026-08-30-quote-email-billed-item-separators.md` branch had fixed; that fix
was never landed, so they still fail on `main`.

`dist/js/cost-builder.js` is committed alongside source, as every prior
commit in this repo does; it is the only rebuilt bundle affected.

---

## Flagged — NOT changed, outside this file's stated scope

This file scopes the work to `QuoteTotalsPresentation()` only, so I did not
touch the following, but it needs a decision before live validation:

**The same defect exists downstream on the customer checkout path.**
`request-flow/OrderSummary.tsx:202` and
`request-flow/QuoteProposalPreview.tsx:166` both feed
`startingPaymentsByCycle()` with

```
const familyCommercialItems = [...familyMainItems, ...familyComposableItems];
```

`classifyQuoteItems()` returns `familyAddonItems` as a separate list, so
add-ons are excluded there in exactly the same way the cart footer excluded
them. Per `utils/quote.ts`'s own note, `QuoteProposalPreview` is not
admin-only — it is the shared renderer behind the customer's Review &
Finalise Print/Save-as-PDF, the standalone Quote View page, and (via
`NotificationTemplates.php`'s parallel PHP rendering) the customer
confirmation email.

**Consequence for live validation:** after this deploys, the cart footer will
correctly read `$5,275` while Review & Finalise, the PDF and the confirmation
email still read `$5,200` for the same cart. That inconsistency is expected
from this scope, not a regression introduced here — but it will be visible.

I have not changed those files and will not without explicit instruction.
Please confirm whether to extend this branch to cover them, or open a
separate work item.

### Status
Set to **AWAITING CHATGPT REVIEW**. Source not pushed to `main`.
