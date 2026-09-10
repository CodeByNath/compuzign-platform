# Cart Initial Payment Must Include Add-ons

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `1a9b6cc0322e662dbad233532c44bd1ad40bbe30`.
- Current review branch: `review/cart-initial-payment-addons` @ `d33376c2462cbadd15dfc0d83a29b0045216565a`, exactly 1 ahead / 0 behind production.
- **SOURCE PUSH NOT APPROVED.**

## Defect
Nath reports: KAIROS primary + add-on are quoted; the primary is later replaced by OMNIA; the KAIROS add-on correctly survives; **Initial Payment** then omits that surviving add-on's starting charge.

## Audit of Claude round 1
The cart-footer correction itself is correct: `QuoteTotalsPresentation()` now passes the whole `familyTierItems` set into `startingPaymentsByCycle()`, while keeping primary-only Total Contract Value logic unchanged. The helper already works per quoted item's own earliest start and aggregates only same-cycle starts. The new regression reproduces the defect and covers add-on, composable, later-starting-leg and TCV boundaries.

However, I independently confirmed the SAME omission still exists in downstream customer surfaces:
- `request-flow/OrderSummary.tsx` builds `familyCommercialItems = [...familyMainItems, ...familyComposableItems]` and uses that for Initial Payment, excluding `familyAddonItems`.
- `request-flow/QuoteProposalPreview.tsx` does the same.

Therefore shipping only `d33376c2` would make the Cart truthful while Review & Finalise / proposal/PDF remain wrong for the same quote. That is not an acceptable customer-state split.

## Required behavior
Initial Payment is one whole-quote fact. Every surviving Family Tier line with valid `legPaymentSummaries` must contribute its own starting streams in every customer surface that renders Initial Payment: primary, add-on, composable/Upgrade.

Total Contract Value remains on the current primary/composable policy in this phase. Do not broaden TCV just because Initial Payment broadens.

## Claude — correction round 2
Continue on the SAME review branch for this work item.
1. Apply the same whole-Family-line Initial Payment population to `OrderSummary.tsx` and `QuoteProposalPreview.tsx`: include `familyAddonItems` alongside primary/composable when calling `startingPaymentsByCycle()`.
2. Keep each surface's TCV population exactly unchanged.
3. Audit `NotificationTemplates.php` (or whatever current PHP email renderer owns the Family Initial Payment figure). If it independently computes Initial Payment and excludes add-ons, correct that same population there too. If it does not compute this figure independently, record evidence and do not invent a new path.
4. Extend regression/contracts so the same surviving-add-on scenario proves consistent Initial Payment across Cart, Review & Finalise, proposal/PDF renderer, and email renderer when applicable.
5. Preserve `startingPaymentsByCycle()` itself unless hard evidence shows a helper defect; current source indicates caller populations are the issue.
6. Run the relevant quote/request/PDF/email parity contracts, TypeScript, build, docs check, and any affected PHP tests. Push review branch only, record exact SHA/diff/tests, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

## Must preserve
Surviving add-ons; cart ordering; exact quote snapshots; per-item payment rows; each item's own earliest-start semantics; same-cycle aggregation only; primary/composable TCV policy; ongoing/finite disclosure; quantity; composable/Upgrade behavior; legacy Cost Builder fallback; existing customer email/PDF structure.

## Must remove
The primary/composable-only population from **Initial Payment** wherever customer-facing quote surfaces use it.

## Must not substitute
Do not delete surviving add-ons on primary replacement; do not reattach them to OMNIA; do not change TCV to make totals agree; do not fake add-on prices from flat headline values; do not re-resolve live Rate Sheet pricing; do not create a second Initial Payment algorithm; do not add cross-cycle arithmetic.

## Live validation after deployment
Reproduce KAIROS add-on + replacement OMNIA primary. The add-on remains. Cart, Review & Finalise, and proposal/PDF must show the same Initial Payment including OMNIA's starting charge(s) plus the surviving KAIROS add-on's own starting charge(s), excluding later-starting Legs. Email must match too if it displays this figure.

---

## Claude Report — round 2 — 2026-09-10

Same review branch `review/cart-initial-payment-addons`, now at
`2a873b801f6888210785f6b840756f9b33b6c9c0` (2 ahead / 0 behind production
`main@1a9b6cc0`). **Not merged to `main`.**

### 1. OrderSummary.tsx and QuoteProposalPreview.tsx — corrected
Both built `familyCommercialItems = [...familyMainItems, ...familyComposableItems]`
and used it for *both* figures. Each now builds a separate

```ts
const familyInitialPaymentItems = [...familyCommercialItems, ...familyAddonItems];
```

and feeds only that to `startingPaymentsByCycle()`. `familyCommercialItems`
still drives Total Contract Value alone, unchanged in both files.

### 2. TCV populations — unchanged
Verified in all four renderers. No TCV expression was touched anywhere; the
add-on's own finite subtotal still stays out of the Contract Value figure,
and the existing `$1,188.00`-stays-out assertion in the email test still
passes untouched.

### 3. `NotificationTemplates.php` — audited, and it DOES compute this independently
It carries its own `startingPaymentsByCycle()` port and its own
`familyInitialPaymentRow()`, which `buildQuoteSections()` was calling with
`$familyCommercialItems` — the same omission. Corrected: it now receives

```php
$familyInitialPaymentItems = array_merge($familyCommercialItems, $classified['familyAddonItems']);
```

while `familyContractValueBlock($familyCommercialItems)` is untouched. No new
path was invented; the existing row builder's population changed and its
docblock now records why the two populations differ.

### Surfaces covered for free through reuse
`QuoteProposalPreview` is also the renderer behind the standalone customer
Quote View (`QuoteViewApp.tsx`) and the Admin Station's Print/Save PDF
(`printRequestProposal.tsx` via `requestLineToCartItem.ts`). Both inherit
the correction rather than needing a second implementation — which is why
`dist/js/admin-station.js` is in this commit.

### 4. Regression extended — 24 checks, all passing
`npm run regression:cart-initial-payment-addons` now bundles all three
components into one entry and mounts each for real. Added on top of round 1's
coverage:

- Cart, Review & Finalise and proposal/PDF asserted to produce the **same**
  figure for the same cart (`$5,275`), read back out of each rendered DOM by
  locating the row labelled "Initial Payment" — never re-derived in the test;
- the same three-way agreement with a composable/Upgrade line present
  alongside primary and add-on (`$5,575`).

The email renderer is covered by
`php tests/notification-templates-family-quote-parity.php` instead, since it
is PHP-rendered.

**Directional proof, each surface independently:**
- revert `OrderSummary.tsx` alone -> regression fails
  `Review & Finalise must include the surviving add-on's own start (expected $5,275, got $5,200)`,
  and the parity contract fails
  `OrderSummary feeds startingPaymentsByCycle() the whole-quote population, not the TCV-only one (got familyCommercialItems)`;
- revert the PHP alone -> email test fails
  `admin email Initial Payment must include the add-on own starting charge`;
- revert the cart footer alone -> round 1's original check still fails.

### 5. `startingPaymentsByCycle()` — untouched
Confirmed a caller-population issue in all four renderers, exactly as this
file predicted. Neither the TS helper nor its PHP port was modified.

---

## Two locked assertions changed — flagging explicitly

Both encoded the now-superseded primary-only policy. I did **not** relax
either to make the build pass; each was rewritten to assert the newly
required behavior at least as strictly.

**`scripts/request-flow-family-tier-parity-contract.ts`** previously asserted
one blanket rule — the combined block "excludes add-ons" — via a regex
spanning TCV *and* Initial Payment together. That was correct only while the
two figures shared one item list. It now pins each population separately:
TCV must still exclude add-ons, **and** Initial Payment must be fed
`familyInitialPaymentItems`. Strictly tighter: two named populations instead
of one blanket negative match, and it now catches a partial revert (proved
above) that the old form could not express.

**`tests/notification-templates-family-quote-parity.php`** locked
`$5,490.00` as "the combined primary-only figure". In that fixture the OMNIA
add-on's own `$99` monthly stream also starts at its own Month 0, so the
truthful combined figure is `$5,589.00`. Updated, plus a new directional
assertion that `$5,490.00` is now absent from both emails.

Please confirm both rewrites are acceptable; if either invariant was meant to
survive this change, say so and I will revisit rather than assume.

---

## Validation — round 2

Green: `contract:request-flow-family-tier-parity`,
`contract:cost-builder-isolation`, `contract:tier-addon-flow`,
`contract:tier-edition-switch`, `contract:quote-sidebar-scroll`,
`contract:quote-view`, `contract:quote-view-print-portal`,
`contract:quote-view-legacy-description`, `contract:quote-cart-addon`,
`contract:request-flow-rail-scroll`, `contract:package-family-cart`,
`contract:package-builder-regression-lock`,
`contract:commercial-leg-inclusion-groups`,
`contract:commercial-leg-extension-groups`,
`contract:package-family-request-flow`,
`regression:cart-initial-payment-addons` (24), `npx tsc --noEmit`,
`npm run build`, `npm run docs:check`.

PHP green: `notification-templates-family-quote-parity`,
`package-family-notification`, `request-schema-is-addon`,
`request-schema-minimum-term`, `request-schema-family-quote-snapshot`,
`request-schema-legacy-snapshot-description`, `request-durable-submission`,
`quote-view-access-boundary`, `quote-view-entrypoint`,
`tier-instance-public-projection`, `tier-public-projection-is-addon`,
`tier-pricing-parity`, `tier-edition-public-projection`.

**Unchanged pre-existing baseline failures** (all four re-verified against
clean `main`; `contract:platform-identity-schema`'s output re-diffed
byte-for-byte against clean `main` after round 2's contract edit —
**identical**, no new violation):
`contract:platform-identity-schema`, `php tests/tier-capability-invariants.php`,
`php tests/quote-view-http-boundary.php`, `php tests/quote-view-email-link.php`.

### Note on `dist/`
`vite.config.ts` sets `emptyOutDir: false` and hashed chunks accumulate in
this repo (16 `QuoteProposalPreview-*.js` were already tracked), so the new
chunk is added and stale ones left alone, exactly as every prior commit here
does. I did not clean them up — that is not this work item's scope.

### Status
Set to **AWAITING CHATGPT REVIEW**. Source not pushed to `main`.
