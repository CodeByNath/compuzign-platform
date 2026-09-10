# Cart Bundle + Upgrade Refinements

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `71773ead49c736aec8779ee57ccdf4f31d021470`.
- Deploy `34475621534`: success.
- New candidate for this follow-up: `review/proposal-bundle-child-included` @ `5a128351e0373ee174e21c38709c8797286b9b38`, 1 ahead / 0 behind.
- Prior two fixes passed Nath's live validation: Bundle compact disclosures, Upgrade preservation, duplicate CTA suppression, Manage build, whole-system cleanup.

## New live defect — proposal/review Bundle children
Nath confirmed steps 1–10 pass, but one adjacent customer inconsistency remains:
- Cart quick view: correct.
- Total Commitment disclosure: correct.
- Full Plan Details: correct.
- Email: correct.
- **Review & Finalise: wrong — Bundle children show `Contact Us`.**
- **View Full Quote / quote-view: wrong — same defect.**
- **Print / Save-as-PDF from that frontend quote: wrong — same defect.**

The screenshot proves the correct semantic: Bundle parent `Foundation Bundle` carries `$4,000`; nested children are included content and must not read as separately unresolved priced inclusions.

## Source audit
`QuoteProposalPreview.tsx::FamilyInclusionsList()` consumes shared `periodBreakdownRowsForFamilyTierItem()` but its inclusion row still tests only `row.unitPrice !== null` / `row.lineTotal !== null` and sends the values to `formatPrice()`. A Bundle child with an absent/undefined money fact therefore reaches `formatPrice(undefined)` and renders `Contact Us`.

`OrderSummary.tsx::FamilyInclusionsList()` has the same frontend pattern on its compact review list. Both already receive `row.isChild`, just like the now-correct shared cart disclosure and Plan Details renderer.

Email is already correct, so **do not change `NotificationTemplates.php`**.

## Claude — correction
From current production `main`, create one review branch.
1. In the shared frontend request/proposal presentation paths, use the existing `row.isChild` Bundle-child semantic: child money presentation must be **Included**, never `formatPrice(undefined)` / `Contact Us`.
2. Keep Bundle parent price/line total unchanged.
3. Preserve genuine unresolved **non-Bundle** pricing behavior; no global unknown-to-Included conversion.
4. Review & Finalise, QuoteProposalPreview/quote-view and print/PDF must agree because they are the affected frontend path. Do not patch surfaces independently if one shared presentation derivation can express the rule safely.
5. Add/extend regression/contract proof for parent `$4,000`, children Included, and no `Contact Us` on Bundle children across Review + proposal/print path. Preserve existing detailed billing and email parity.
6. Run relevant request-flow/quote-view/print contracts, TypeScript, build, docs; push review branch only; record SHA/diff/tests here; set **AWAITING CHATGPT REVIEW**; stop. Do not push `main`.

## Must preserve
Bundle parent pricing; correct Cart/Total Commitment/Plan Details; email output; unresolved non-Bundle semantics; quote snapshot authority; Initial Payment/TCV behavior; Upgrade/add-on behavior.

## Must remove
`Contact Us` from Bundle child money presentation in Review & Finalise, View Full Quote, and frontend Print/PDF.

## Must not substitute
No PHP email change; no Rate Sheet/resolver repricing; no global `undefined => Included`; no hiding child rows; no removal of money columns; no new quote model.

---

## Claude Report — proposal Bundle-child correction — 2026-09-10

Review branch `review/proposal-bundle-child-included`, cut from production
`main@71773ead49c736aec8779ee57ccdf4f31d021470`, pushed at
**`5a128351e0373ee174e21c38709c8797286b9b38`** — **1 ahead / 0 behind**,
single commit. **Not merged to `main`.**

### Root cause — confirmed as audited
Identical to the cart defect, in the surfaces the earlier fix did not reach.
Both `OrderSummary.tsx::FamilyInclusionsList()` and
`QuoteProposalPreview.tsx::FamilyInclusionsList()` tested
`row.unitPrice !== null` / `row.lineTotal !== null` before calling
`formatPrice()`. These rows come straight from a persisted snapshot, so a
Bundle child whose money keys are simply absent arrives as `undefined` —
which passes a `!== null` guard, reaches `formatPrice()`, and renders its
non-number branch: the `Contact Us` placeholder.

Confirmed why the email was already right and correctly excluded from scope:
`NotificationTemplates.php` guards with `isset(...)`, which is **false** for
an absent key, so `undefined` never reaches its formatter. **No PHP was
changed.**

### Fix — one shared derivation, per instruction 4
Rather than patching the two surfaces independently — which is exactly how
the proposal path drifted out of step with the cart in the first place — the
rule now lives once:

`inclusionMoneyPresentation()` in **`@/utils/commercialLegPresentation`** (the
neutral shared presentation util both layers already import). A Bundle child
is reported as `included` with no money strings; any other row formats through
the one shared `formatPrice()` only for a real number and renders blank
otherwise.

**All three renderers now read that single derivation and keep their own
markup**, which is the part that had to stay per-surface:

| Surface | Renders from the shared rule as |
| --- | --- |
| Cart quick view / Total Commitment (`InclusionDisclosurePanel`) | two table cells, `Included` / `Included` |
| Review & Finalise (`OrderSummary`) | one inline `Included` token |
| Proposal / Quote View / Print-PDF (`QuoteProposalPreview`) | one inline `Included` token |

Sharing the RULE rather than the DOM is deliberate: a two-column table and an
inline list must present differently, but must never disagree about the same
Bundle. `QuoteProposalPreview` is also the standalone Quote View and the
Print/Save-as-PDF clone source, so all three reported surfaces are fixed by
that one consumer.

### The cart refactor is provably behavior-neutral
`InclusionDisclosurePanel` previously hand-rolled the same rule; it now calls
the shared one. The existing **33 checks passed unmodified** through that
refactor, which is the proof that the already-live-validated cart/Total
Commitment behavior did not move.

### Preserved
Bundle parent price/line total; genuine unresolved **non-Bundle** rows still
blank and never labelled `Included` (asserted explicitly on the proposal
surface too); detailed billing rows; email output; quote snapshot authority;
Initial Payment/TCV; Upgrade and add-on behavior.

### Tests — regression extended to 48 checks
`npm run regression:cart-bundle-upgrade-refinements` now also mounts the REAL
`QuoteProposalPreview` and `OrderSummary` with a quoted item whose
`commercialBreakdown` carries a priced `Foundation Bundle` parent ($4,000)
whose children carry **no money keys at all** — the exact shape behind the
screenshot. Asserts, per surface:

- the Bundle parent renders and keeps **$4,000**;
- both children render as child rows and each reads **Included**;
- **no `Contact Us`** anywhere in the rendered output;
- and separately, that a genuinely unresolved **non-Bundle** inclusion renders
  without a price and is **never** labelled `Included`.

**Directional proof:** restoring either surface's `!== null` guard reproduces
the live defect — the run fails with
`the proposal renders no Contact Us for Bundle children`.

### Contract updated — flagging
`composable-quote-cart-contract.ts` pinned the cart's own hand-rolled
expression, which the shared-rule refactor replaced. Repointed, and made
stricter: it now pins the rule **at its source** (child ⇒ Included; non-child
⇒ number-only formatting; the rule never emits `Contact Us`) **and** pins that
each of the three surfaces consumes it — including explicit assertions that
neither request-flow surface still uses the `!== null` guard.

That last pair is the assertion that would have caught this drift, and did not
exist before. This is a contract edit, so flagging it for confirmation.

### Checked and deliberately not changed
- `NotificationTemplates.php` — already correct, explicitly out of scope.
- `PlanDetailsModal.tsx` — already correct and live-validated; it renders via
  an injected `formatMoneyFn`, so adopting the shared rule there would have
  touched a validated surface for no defect. Say the word if you want it
  unified too.
- `ComposableOfferBrowser.tsx` (lines ~745/779) and the Admin pricing helpers
  `evaluateTierPricing.ts` / `rateSheetLabels.ts` still use `!== null`, but
  they operate on live-resolved values rather than persisted snapshot rows, and
  are not customer inclusion lists. Swept and excluded, not overlooked.

### Validation
Green: `regression:cart-bundle-upgrade-refinements` (48),
`regression:cart-initial-payment-addons` (24), `contract:composable-quote-cart`,
`contract:composable-recommendations-cta`, `contract:request-flow-family-tier-parity`,
`contract:quote-view`, `contract:quote-view-print-portal`,
`contract:quote-view-legacy-description`, `contract:request-flow-rail-scroll`,
`contract:quote-sidebar-scroll`, `contract:quote-cart-addon`,
`contract:package-family-cart`, `contract:cost-builder-isolation`,
`contract:tier-addon-flow`, `contract:package-builder-regression-lock`,
`contract:commercial-leg-inclusion-groups`, `contract:commercial-leg-extension-groups`,
`contract:composable-offer-contribution`, `contract:composable-request-line`,
`npx tsc --noEmit`, `npm run build`, `npm run docs:check`.

PHP green: `notification-templates-family-quote-parity`,
`package-family-notification`, `request-schema-family-quote-snapshot`,
`request-durable-submission`, `quote-view-access-boundary`,
`quote-view-entrypoint`, `request-schema-is-addon`.

Unchanged pre-existing baseline failures: `contract:package-builder-flow`,
`contract:platform-identity-schema`, `regression:composable-quote-cart-loop`,
`php tests/tier-capability-invariants.php`,
`php tests/quote-view-http-boundary.php`,
`php tests/quote-view-email-link.php`.

### Diff summary — 9 files
| File | Change |
| --- | --- |
| `utils/commercialLegPresentation.ts` | new shared `inclusionMoneyPresentation()` |
| `request-flow/OrderSummary.tsx` | consumes it; Bundle child ⇒ Included |
| `request-flow/QuoteProposalPreview.tsx` | same (also Quote View + Print/PDF) |
| `cost-builder/InclusionDisclosure.tsx` | consumes it instead of its own copy |
| `scripts/cart-bundle-upgrade-refinements-regression.mjs` | 33 → 48 checks |
| `scripts/composable-quote-cart-contract.ts` | assertions repointed + tightened |
| `dist/js/*` (3 files) | rebuilt bundles |

No source pushed to `main`.

### Status
Set to **AWAITING CHATGPT REVIEW**.
