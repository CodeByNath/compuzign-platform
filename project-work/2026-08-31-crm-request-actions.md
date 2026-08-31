# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING CHATGPT REVIEW — payment-summary extraction done; Print stopped and reported on the CSS boundary, not implemented.**
- Production base: `main@96d5593799af4336c071f462aef445baf5872836`.
- Review head: `review/crm-1c-request-actions@215d85a2` (pushed), 2 commits ahead of production (`7c9a0fee`, `215d85a2`).
- Source push to `main`: **NOT APPROVED / NOT DONE**.
- Auditor verdict: **Proceed with safeguards**.

## Accepted from `7c9a0fee`
Approve/Cancel implementation is accepted:
- authenticated `PATCH /admin/requests/{ref}/status`, targets only `approved|cancelled`;
- `404` unknown ref, `409` rejected/opposite-terminal transition;
- response remains the existing allow-listed Request detail, with no post ID/secret exposure;
- `RequestRepository::updateStatus()` now uses conditional `update_post_meta(..., $observed)` CAS semantics;
- same-target repeats are idempotent; concurrent opposite transitions cannot overwrite the winner; legacy raw `new` compares using its raw stored value;
- Request footer reuses `SupportedActionFooter`; pending has Approve + destructive Cancel Request, terminal states have no opposite action;
- successful mutation refreshes drawer + originating Requests wall/summary counts;
- focused PHP/TS/build/Station/docs evidence passed; known six Rate Sheet CSS-contract failures remain unrelated/pre-existing.

Do not redesign this accepted lifecycle work unless new evidence requires it.

## Print decision
Claude correctly stopped because `QuoteProposalPreview` currently imports three pure payment helpers from the 1088-line `PricingTiers.tsx`; importing that component directly into Admin would pull the customer pricing UI bundle boundary across.

The helpers themselves are pure and separable: `computeTotalContractValue`, `startingPaymentsByCycle`, and `chargeTypeLabel`. A narrow extraction is approved **inside this same CRM-1C review branch**, but only to remove this dependency direction; no arithmetic/text/behavior change is allowed.

## Claude next action
1. Extract only the genuinely shared pure payment-summary helpers/types needed by `QuoteProposalPreview` into a neutral shared module. Update existing customer imports to that module with parity tests proving byte-for-byte/fixture-equivalent results. Do not change formulas, labels, or customer behavior.
2. Audit `.cz-proposal` and print-portal CSS ownership before wiring Admin Print. Reuse the exact proposal markup and print rules. Do not duplicate proposal JSX, totals logic, or CSS.
3. If exact Admin reuse can then be achieved without importing live catalog/request-flow state or the whole cost-builder UI runtime, implement **Print / Save PDF** in the Request drawer for all statuses from the durable `RequestEntry` snapshot only. No quote-view secret and no API/catalog re-resolution.
4. If CSS/runtime ownership still requires broad customer-bundle coupling or duplication, stop and report that exact blocker instead of widening scope.
5. Extend contracts for helper parity, immutable-snapshot-only print, no secret/catalog access, and action visibility: pending = Approve + Cancel + Print; approved/cancelled = Print only (+ Close).
6. Push the review branch only, record new SHA/files/tests, set **AWAITING CHATGPT REVIEW**, stop.

## Claude report — `215d85a2`

### 1. Payment-summary extraction (done)
`computeTotalContractValue`, `startingPaymentsByCycle`, `chargeTypeLabel`, and the `LegPaymentSummary` interface moved from `cost-builder/PricingTiers.tsx` to a new `resources/ts/utils/paymentSummary.ts`. Bodies copied verbatim — no arithmetic, label, or behavior change. `PricingTiers.tsx` keeps `buildLegPaymentSummaries()` (not needed by Admin — a durable Request snapshot already carries precomputed `legPaymentSummaries`, never raw commercial Periods) and imports `LegPaymentSummary` back as a type only. Every existing customer caller now imports the three functions/type from the new location instead: `QuoteSummary.tsx`, `PlanDetailsModal.tsx`, `QuoteDetailsOverlay.tsx`, `OrderSummary.tsx`, `QuoteProposalPreview.tsx`, `cost-builder/types.ts`. New `contract:payment-summary-extraction-parity` proves fixture parity (finite/ongoing/empty TCV, cross-item same-cycle combination, cycle-label table incl. null/unknown fallback) plus a structural check that no file still imports these symbols from `PricingTiers`. Full downstream sweep re-run and green: `request-flow-family-tier-parity`, `plan-details-value-states`, `package-builder-addon-focus`, `package-builder-bundle-inclusion-parity`, `package-family-request-flow`, `quote-cart-addon`, `tier-addon-flow`, `tier-edition-switch`, `quote-view`, `quote-proposal-total-typography`, `quote-inclusion-quantity-parity`. `tsc --noEmit` clean, `npm run build` clean (308 modules) — `cost-builder.js` bundle size unchanged (98.85 kB, same as before extraction), confirming the move is purely a source-location change, not a behavior or size change.

### 2. CSS/print-portal boundary audit → stop and report (step 4 of the plan)
`.cz-proposal`/`.cz-printing` rules live in `resources/css/modules/cost-builder.css` (lines ~2906–3556+), a large contiguous, self-contained block — that part is genuinely reusable. But it depends on `--cz-color-*`/`--cz-space-*`/`--cz-font-size-*`/`--cz-radius-*`/`--cz-shadow-card` custom properties, and those are defined in exactly one place: `atomic-engine/css/00-tokens.css` (repo root, the site theme's own token layer — not part of this plugin). `src/Core/AssetLoader.php::enqueueAtomicStyles()` enqueues that file (plus 9 more: reset/base/layout/buttons/cards/forms/tabs/modals/utilities) only on WordPress's `wp_enqueue_scripts` hook — the public frontend hook. It is never fired on `admin_enqueue_scripts`; wp-admin has no access to these tokens today.

Reusing the exact `.cz-proposal` CSS in the Admin Station would require either enqueueing the entire 10-file atomic-engine chain into wp-admin (broad customer-bundle/theme coupling — the whole public design system, not just proposal styling, landing inside the WordPress dashboard) or duplicating the token values into Admin Station's own token file (the auditor's own explicitly disallowed option). Neither is a narrow fix the way the JS extraction was. This is the exact condition step 4 names: **stopping and reporting instead of widening scope.**

Print/Save PDF remains unimplemented. Nothing about the print-portal DOM mechanism (`installPrintPortal`) itself is blocked — only the *styling* reuse is. If this is worth unblocking, the smallest next step would be extracting just the `.cz-proposal`/`.cz-printing` rules plus the specific token values they read into their own small, portable stylesheet (own Vite CSS entry, like `drawer-kit.css`) loadable by both bundles — a CSS-ownership change of similar shape to the JS one, but its own reviewable decision, not something to make unilaterally mid-branch.

### Evidence (from plugin root, this round)
- `npm run contract:payment-summary-extraction-parity` (new) — pass.
- `npm run contract:request-flow-family-tier-parity` — pass (re-verifies the accepted CRM-1A/1B Family-parity work still holds against the new import paths).
- `npx tsc --noEmit`, `npm run build` — clean.
- `npm run docs:check` — pass (110 Markdown files, trimmed `admin-station-drawer.md` back under its 600-word cap after the CRM-1C footer note pushed it 1 word over).
- Full downstream contract sweep listed above — all pass.
- Not run: live WordPress/browser session (same disclosure as the prior round — no running WP install in this environment).

Set **AWAITING CHATGPT REVIEW**.
