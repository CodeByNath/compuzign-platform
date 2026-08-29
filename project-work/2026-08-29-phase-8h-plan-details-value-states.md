# Phase 8H — Plan Details Value-State Language

## Status
- Phase 8G: `CLOSED` at production `main@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`
- Phase 8H: `AWAITING CHATGPT REVIEW` — live typography correction implemented
- Source push: `SOURCE PUSH NOT APPROVED`
- Verdict: `Proceed with safeguards` — implemented on the same review branch, pushed there only
- Production (unchanged): `main@1a74e785627bfae8f051ffa32093029e978b2b6e`
- Reviewable candidate: `phase-8h-plan-details-value-states@0c586deb` (pushed, 1 commit on top of the already-deployed `1a74e785`)

## Approved Display Rules
Bundle child Unit Price/Total = **Included**. Open-ended Charge Occurrences = **Until Canceled**. Open-ended Subtotal = formatted known Rate. Open-ended TCV = **Until Canceled** when rates are known. Missing/unresolved price = **To be confirmed**. Real numeric zero = **$0.00**. No explanatory TCV note. Finite minimum-term streams retain calculated occurrences/subtotals. A Period with any unresolved top-level `line_total` cannot show a partial total. Due at plan start cannot silently omit an unresolved starting rate.

## Accepted Source Scope
Independent GitHub comparison confirms candidate is exactly one commit ahead and zero behind production baseline `41c31b41...`, with merge base equal to that production SHA.

Changed source scope is limited to:
- `resources/ts/components/package-builder/PlanDetailsModal.tsx`
- `scripts/plan-details-value-states-contract.ts`
- `scripts/package-builder-bundle-inclusion-parity-contract.ts`
- `package.json` contract registration
- rebuilt `dist/js/cost-builder.js`

Independent source inspection confirms:
- Bundle children render `Included` in both price cells and remain outside top-level arithmetic.
- `periodItemsTotalDisplay()` returns `To be confirmed` if any top-level `line_total` is null; otherwise sums only top-level items.
- open-ended occurrences use `Until Canceled`.
- open-ended known-rate subtotal repeats the rate; unresolved subtotal uses `To be confirmed`.
- TCV distinguishes genuinely open-ended known-rate streams from unresolved pricing.
- Due-at-start refuses a partial/false `$0.00` when a starting price is null.
- all state checks use explicit null semantics, preserving real zero as `$0.00`.
- no pricing resolver, Leg math, identity, persistence, routing, admin, bundle composition, quote snapshot, review/PDF, or CSS behavior is changed.

The focused contract directly exercises all approved semantic states, including finite minimum-term behavior, mixed priced/null Periods, unresolved starting rates, and numeric zero. The existing bundle parity contract was updated only to call the extracted real Period-total helper while preserving the no-child-arithmetic invariant.

## Claude — Production Action
1. Fast-forward `main` to the **exact accepted commit** `1a74e785627bfae8f051ffa32093029e978b2b6e`. Do not amend or add source changes.
2. Push `main` and allow the normal GitHub Actions deployment to Hostinger.
3. Confirm exact resulting `main` SHA and workflow run/status in this same file.
4. Set Phase 8H to `AWAITING LIVE VALIDATION` and stop. Do not perform customer/runtime mutations.

## Final Gate
Nath will perform the browser/customer-facing validation. Phase 8H remains open until the pushed `main` SHA, deployment result, and Nath's live result agree with the accepted source.

## Production Push Record

- Status: PUSHED
- Pushed by: Claude Code
- Pushed at: 2026-08-29
- Pre-push check: `origin/main` confirmed exactly `41c31b41ba51d594f1a4896c2a9ab7175b3f02cc` before push — matched, no divergence. Local `main` checked out fresh from `origin/main` (same SHA), then fast-forward merged to `phase-8h-plan-details-value-states@1a74e785...` (confirmed via `git ls-remote origin phase-8h-plan-details-value-states` to be the exact accepted SHA before merging) — no amend/rebuild/source changes, pure fast-forward.
- Push output: `41c31b41..1a74e785  main -> main`
- Full `main` commit SHA (confirmed via `git ls-remote origin main`): `1a74e785627bfae8f051ffa32093029e978b2b6e` — equals the accepted SHA exactly.
- GitHub Actions run: `33256312318` ("Deploy to Hostinger"), triggered by push on 2026-08-29
- Workflow result: `SUCCESS` (confirmed via the public `api.github.com/repos/.../actions/runs/33256312318` endpoint, polled until `status: completed` — `conclusion: success`)
- Job/step-level results, all `success`: Set up job; Checkout repository; Setup Node.js; Install frontend dependencies; Build frontend assets; Deploy source via SSH; Deploy built dist assets via SCP; Post Setup Node.js; Post Checkout repository; Complete job.
- Deployment result: workflow-reported success for deployed SHA `1a74e785627bfae8f051ffa32093029e978b2b6e`. No customer/runtime mutations performed. Actual live site behavior not independently checked from this environment.

## Live Browser Validation
- Semantic state result: PASS on production `main@1a74e785627bfae8f051ffa32093029e978b2b6e`.
- OMNIA Basic confirmed Bundle children = `Included`; occurrences/TCV = `Until Canceled`; Subtotal/Due at start = `$4,000.00`; no explanatory TCV note; no browser console errors.
- Visual result: CORRECTION REQUIRED. Review & Finalise Quote renders both `Ongoing` and `$160,675` at 32px, the only proposal text above 22.4px, causing overflow/over-emphasis. The printable/PDF proposal reuses the same markup and its `@media print` block does not override this amount size, so both oversized values carry into the PDF.

## Live Typography Correction — Claude
User evidence correctly identified made-up sizes instead of tokens. Live CSS and source both show:
- `.cz-proposal__total-amount { font-size: 1.5rem; }`
- `.cz-proposal__total-row--primary .cz-proposal__total-amount { font-size: 2rem; }`

Implement the narrowest source correction in `resources/css/modules/cost-builder.css`:
1. Base total amount: `font-size: var(--cz-font-size-lg)`.
2. Primary total amount: `font-size: var(--cz-font-size-xl)`.
3. Preserve weight, color, whitespace, labels, note copy, JSX, all arithmetic, and all semantic value-state behavior.
4. Rebuild `dist/css/cost-builder.css`.
5. Add/extend a focused contract rejecting literal `rem`/px sizes for these two rules and asserting the exact tokens.
6. Validate the exact same token-sized hierarchy for both `Ongoing` and numeric amounts in the on-screen Review & Finalise Quote and the printable/PDF proposal; neither value may retain a literal-size print override.
7. Validate focused contract, CSS contract, build, and concise full contract sweep. Record changed files, exact commit SHA, and results here; set `AWAITING CHATGPT REVIEW`. Do not push source to `main`.

## Claude Report — 2026-08-30 (pushed to review branch, not to main)

Same branch `phase-8h-plan-details-value-states`, new commit `0c586deb` on top of the already-deployed `1a74e785`. Pushed directly to that non-production branch (learned from this same phase's earlier round: a local-only commit blocks review) — `main` untouched.

**Root cause confirmed:** `.cz-proposal__total-amount { font-size: 1.5rem; }` and `.cz-proposal__total-row--primary .cz-proposal__total-amount { font-size: 2rem; }` were literal sizes, never tied to the design-token scale every other proposal text element (labels, cycle suffixes, notes) already uses. `2rem` renders at 32px against a ~14px document baseline — the only proposal text above the token ceiling. The printable/PDF proposal reuses this exact `.cz-proposal` markup (`RequestFlowModal.tsx` clones it for print); its `@media print` block only sets a base `font-size: 9.5pt` on the whole document, which a `rem`-sized child rule ignores entirely — so the oversized text carried straight into the PDF too.

**Fix applied** (`resources/css/modules/cost-builder.css`, only these two declarations changed):
```
.cz-proposal__total-amount { font-size: var(--cz-font-size-lg); ... }
.cz-proposal__total-row--primary .cz-proposal__total-amount { font-size: var(--cz-font-size-xl); }
```
Confirmed no existing `@media print` rule targets `.cz-proposal__total-amount` (none needed to be removed or added — the token switch alone fixes both surfaces, since they share the identical class/markup). Confirmed in `QuoteProposalPreview.tsx` that both the `Ongoing` text (line 350) and every numeric amount (Total Contract Value, Estimated total, Initial Payment) render through this same `.cz-proposal__total-amount` class, and both the `Ongoing` row and the finite-TCV row carry `.cz-proposal__total-row--primary` — so the identical token hierarchy now applies to both value types, on screen and in the PDF, with a single CSS change. Nothing else (weight, color, white-space, labels, note copy, JSX, arithmetic, semantic value-state behavior from the earlier Phase 8H round) touched.

**New contract** `scripts/quote-proposal-total-typography-contract.ts` (`contract:quote-proposal-total-typography`): asserts both rules use the exact tokens, rejects any literal `rem`/`px`/`pt`/`em` font-size on either rule (regression guard), confirms no `@media print` override targets this class, and confirms `font-weight`/`color`/`white-space` survive untouched.

**Tests:** `tsc --noEmit` clean. `npm run build` clean. `contract:quote-proposal-total-typography` passes. Full contract sweep: only the three confirmed pre-existing unrelated failures remain (`admin-station-css`, `package-builder-flow`, `platform-identity-schema`).

**Diff:**
```
 dist/css/cost-builder.css                                    |  2 +-
 package.json                                                 |  1 +
 resources/css/modules/cost-builder.css                       |  4 +--
 scripts/quote-proposal-total-typography-contract.ts          | 42 ++++++++++++++++++++++
 4 files changed, 46 insertions(+), 3 deletions(-)
```
(paths relative to `wp-content/plugins/compuzign-platform/`)

Awaiting review of the actual `0c586deb` diff before any push to `main`.
