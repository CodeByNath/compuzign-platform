# Phase 8I — Final Quote Inclusion Quantity Parity

## Status
- Phase 8H production baseline: `main@0c586debcccc5ee9eb850b8119200b31fe61b4ed`.
- Phase 8I: `AWAITING CHATGPT REVIEW` — add-on proposal/PDF alignment correction implemented.
- Source push: `SOURCE PUSH NOT APPROVED`.
- Auditor verdict: `Proceed with safeguards` — implemented and pushed to review branch, not main.
- Production (unchanged): `main@eac4240a76215c701898526e70122041e656a319`.
- Reviewable candidate: `phase-8i-final-quote-inclusion-quantity-parity@6736d45d` (pushed, 1 commit on top of the already-deployed `eac4240a`).

## Live Finding
Review & Finalise Quote shows Family inclusion labels but omits their resolved quantities. The printable proposal/PDF reuses the same quantity-less Family inclusion presentation, so the omission carries into PDF.

Live example: KAIROS Business Pro lists `4 vCPU`, `16 GB RAM`, storage, monitoring, etc. without the quantities already shown on the selected Tier card.

## Source Audit
This is display loss, not missing data:
- `ServiceInclusion.quantity?: number` is the authoritative resolved Rate Sheet selection quantity.
- `FamilyTierQuoteItem.inclusionItems` preserves the exact selection-time structured snapshot.
- `FamilyTierAdapter.itemFor()` snapshots `effective.inclusionItems`; do not re-resolve live catalog data.
- `OrderSummary.tsx` and `QuoteProposalPreview.tsx` each render only `inclusion.label` / `child.label`, dropping the existing `quantity`.
- The established Tier-card grammar renders ordinary and Bundle-child quantities with `quantity ?? ''`; Bundle parents remain quantity-less section headers.

## Locked Display Rules
1. In both `OrderSummary` and `QuoteProposalPreview`, structured `inclusionItems` must show the snapshot quantity for:
   - every ordinary top-level inclusion;
   - every Bundle child inclusion.
2. Bundle parents remain section headers with no quantity, matching `PricingTiers.tsx`.
3. Use nullish semantics (`quantity ?? ''`) so numeric zero remains visible as `0`; never use a truthy check.
4. Keep the pre-Phase-8G `features: string[]` fallback label-only; it has no quantity field, so none may be invented.
5. Apply identically to Family primaries and Family add-ons. Both helpers already serve both populations.
6. Use explicit label/quantity spans and right-align the quantity in the existing row; do not concatenate ambiguous display strings.
7. Printable/PDF proposal must inherit the same quantity-bearing markup. Do not add a divergent print-only data path.
8. No arithmetic, pricing, Bundle composition, identity, persistence, routing, resolver, quote snapshot, or wording changes.

## Claude — Implementation
1. Change only the authoritative presentation/source needed in:
   - `resources/ts/components/request-flow/OrderSummary.tsx`
   - `resources/ts/components/request-flow/QuoteProposalPreview.tsx`
   - `resources/css/modules/cost-builder.css`
   - focused regression contract + `package.json`
   - rebuilt `dist/css/cost-builder.css` and `dist/js/cost-builder.js`
2. Reuse the existing `inclusionItems` snapshot; do not touch `FamilyTierAdapter.itemFor()` or types unless audit proves a real missing field.
3. Add a focused contract covering ordinary quantity, Bundle-parent omission, Bundle-child quantity, numeric zero, old-cart fallback, primary/add-on parity, and both screen/PDF renderers.
4. Run typecheck, build, focused contract, relevant request-flow/Bundle contracts, then one concise full contract sweep.
5. Record exact changed files, validation, commit SHA, and risks here; set `AWAITING CHATGPT REVIEW`. Do not push to `main`.

## Final Gate
After independent source review and approved deployment, live validation must confirm quantities in:
- collapsed/expanded Review & Finalise Quote inclusion lists;
- full printable proposal;
- saved PDF;
- both a normal inclusion and a Bundle child;
- a Family add-on where present.

Phase 8I remains open until screen and PDF agree with the snapshot.

## Claude Report — 2026-08-30 (pushed to review branch, not to main)

Branch `phase-8i-final-quote-inclusion-quantity-parity` @ `eac4240a`, based on `main@0c586debcccc5ee9eb850b8119200b31fe61b4ed`. Pushed directly to that non-production branch — `main` untouched — per the lesson from the last two phases (a local-only commit blocks review).

**Files changed:**
- `request-flow/OrderSummary.tsx` + `request-flow/QuoteProposalPreview.tsx`: `FamilyInclusionsList` now branches on `inclusion.bundle_id` — the Bundle-parent branch renders only `inclusion.label` (still a quantity-less section header, matching `PricingTiers.tsx`), the ordinary-inclusion branch renders a `cz-os__feature-row`/`cz-proposal__feature-row` span pair (`-label` + `-qty`, `quantity ?? ''`). Every Bundle child row gets the identical label/qty span pair. The `features[]` fallback for a pre-Phase-8G cart entry is untouched (label-only, no quantity field exists to invent). Applied to both `familyMainItems` and `familyAddonItems` rows in both files (same `<FamilyInclusionsList item={item} />` call sites, unchanged count of 2 per file). `QuoteProposalPreview.tsx` is the exact markup `RequestFlowModal.tsx` clones for print, so no separate print-only path was added or needed.
- `resources/css/modules/cost-builder.css`: new `.cz-os__feature-row`/`.cz-os__feature-qty` and `.cz-proposal__feature-row`/`.cz-proposal__feature-qty` rules (flex row, `justify-content: space-between`, quantity muted/right-aligned/`flex-shrink: 0`). No existing rule's declarations changed.
- `scripts/quote-inclusion-quantity-parity-contract.ts` (new, `contract:quote-inclusion-quantity-parity`): for both files — ordinary inclusion shows `quantity ?? ''`; Bundle-parent branch never references `quantity`; Bundle child shows `quantity ?? ''`; dedicated label/qty spans used; `features[]` fallback never references `quantity`; `FamilyInclusionsList` usage count is 2 (primary + add-on parity). Plus a runtime proof that `quantity ?? ''` renders a real `0` as `0` (not blank) — the nullish-vs-truthy distinction the display rules require.
- `dist/css/cost-builder.css`, `dist/js/cost-builder.js`, `package.json`: rebuilt/updated to match.

No changes to `FamilyTierAdapter.itemFor()`, `cost-builder/types.ts`, arithmetic, Bundle composition, identity, persistence, routing, or resolver code — the audit's own conclusion (this is display loss, not missing data) held, so the existing `inclusionItems` snapshot was reused exactly as instructed.

**Tests:** `tsc --noEmit` clean. `npm run build` clean. Full contract sweep (every registered `contract:*`): only `admin-station-css`, `package-builder-flow`, `platform-identity-schema` fail — the same three confirmed pre-existing/unrelated failures from every prior round. `contract:quote-inclusion-quantity-parity`, `contract:package-builder-bundle-inclusion-parity`, `contract:request-flow-family-tier-parity`, `contract:package-family-request-flow`, `contract:package-builder-regression-lock`, `contract:cost-builder-isolation`, `contract:quote-proposal-total-typography`, `contract:plan-details-value-states` all pass.

**Diff:**
```
 dist/css/cost-builder.css                                    |  2 +-
 dist/js/cost-builder.js                                      |  2 +-
 package.json                                                 |  1 +
 resources/css/modules/cost-builder.css                       | 36 +++++++++++
 resources/ts/components/request-flow/OrderSummary.tsx        | 17 +++++-
 resources/ts/components/request-flow/QuoteProposalPreview.tsx| 17 +++++-
 scripts/quote-inclusion-quantity-parity-contract.ts          | 71 ++++++++++++++++++++++
 7 files changed, 140 insertions(+), 6 deletions(-)
```
(paths relative to `wp-content/plugins/compuzign-platform/`)

Awaiting review of the actual `eac4240a` diff before any push to `main`.


## Independent ChatGPT Review — 2026-08-30

Compared production `0c586debcccc5ee9eb850b8119200b31fe61b4ed` with candidate `eac4240a76215c701898526e70122041e656a319`: exactly 1 commit ahead, 0 behind, merge base equals production.

Accepted scope is exactly the reported seven files. Independent diff/source inspection confirms:
- ordinary and Bundle-child rows render the existing snapshot quantity with `?? ''`;
- Bundle parents remain quantity-less headers;
- label/quantity are separate spans with right-aligned nonshrinking quantity;
- old `features[]` fallback stays label-only;
- the same helper serves primary and add-on rows;
- printable/PDF proposal uses the same quantity-bearing markup;
- no types, snapshot capture, arithmetic, pricing, Bundle composition, identity, persistence, routing, or resolver code changed.

The focused contract is partly structural, so live screen/PDF remains mandatory, but no source blocker was found.

## Claude — Production Action
1. Confirm `origin/main` is still exactly `0c586debcccc5ee9eb850b8119200b31fe61b4ed`.
2. Fast-forward `main` to exactly `eac4240a76215c701898526e70122041e656a319`; no amend, rebuild, or source edits.
3. Push `main` and allow the normal GitHub Actions Hostinger deployment.
4. Record exact resulting main SHA and workflow run/status here.
5. Set `AWAITING LIVE VALIDATION` and stop. Do not mutate customer/runtime records.

## Production Push Record

- Status: PUSHED
- Pushed by: Claude Code
- Pushed at: 2026-08-30
- Pre-push check: `origin/main` confirmed exactly `0c586debcccc5ee9eb850b8119200b31fe61b4ed` before push — matched, no divergence. Local `main` checked out fresh from `origin/main` (same SHA), then fast-forward merged to `phase-8i-final-quote-inclusion-quantity-parity@eac4240a...` (confirmed via `git ls-remote origin phase-8i-final-quote-inclusion-quantity-parity` to be the exact accepted SHA before merging) — no amend/rebuild/source changes, pure fast-forward.
- Push output: `0c586deb..eac4240a  main -> main`
- Full `main` commit SHA (confirmed via `git ls-remote origin main`): `eac4240a76215c701898526e70122041e656a319` — equals the accepted SHA exactly.
- GitHub Actions run: `33259764859` ("Deploy to Hostinger"), triggered by push on 2026-08-30
- Workflow result: `SUCCESS` (confirmed via the public `api.github.com/repos/.../actions/runs/33259764859` endpoint, polled until `status: completed` — `conclusion: success`)
- Job/step-level results, all `success`: Set up job; Checkout repository; Setup Node.js; Install frontend dependencies; Build frontend assets; Deploy source via SSH; Deploy built dist assets via SCP; Post Setup Node.js; Post Checkout repository; Complete job.
- Deployment result: workflow-reported success for deployed SHA `eac4240a76215c701898526e70122041e656a319`. No customer/runtime mutations performed. Actual on-screen and printable/PDF inclusion-quantity behavior not independently checked from this environment.

## Live Browser Validation
- Production under test: `main@eac4240a76215c701898526e70122041e656a319`.
- Compact Review & Finalise Quote: PASS.
  - KAIROS Business Pro ordinary inclusions show resolved quantities (for example 4 vCPU = 2, Block Storage = 500, Advanced Monitoring = 12).
  - OMNIA Foundation Bundle remains a quantity-less header; all three Bundle children show quantity 1.
  - Backup & DR Shield Family add-on shows its quantities (5, 1000, 500, 500, 1).
- Expanded full printable proposal: PASS for the same ordinary, Bundle-child, and add-on rows.
- Layout: quantities are separate right-aligned cells; no inspected row overflowed.
- Browser console errors: none.
- Print / Save as PDF invoked; native preview is outside the controllable page DOM, so saved-PDF pixels remain unverified.
- Final status: `AWAITING LIVE PDF VALIDATION`. Nath must confirm the saved PDF contains the same quantities before Phase 8I closes.


## Live PDF/Layout Finding — Add-on Double Inset

User PDF/print evidence shows the Family add-on inclusion shell and its quantity column inset farther than the primary Family plan above.

Source cause is confirmed:
- primary `.cz-proposal__features` is a sibling of the padded `.cz-proposal__service-row`, so the shell spans the service card width;
- add-on `.cz-proposal__features` is a child of `.cz-proposal__addon`, which already has `var(--cz-space-5)` horizontal and `var(--cz-space-4)` vertical padding;
- the shared features rule then adds its own horizontal padding, producing a double inset and a different right edge for quantities;
- print overrides the features padding but does not remove the parent add-on inset, so the mismatch survives into PDF.

## Claude — Alignment Correction
1. Keep the Phase 8I quantity markup/data unchanged.
2. Make only the Family add-on's direct child `.cz-proposal__features` full-bleed within its add-on row: cancel the parent add-on's horizontal inset and bottom inset so the inclusion shell meets the same card edges as a primary plan's shell.
3. Preserve the inclusion list's own padding; that padding owns label/quantity breathing room.
4. Add an explicit `#cz-print-root` rule using the existing print dimensions so the saved PDF has the same geometry. Do not rely on screen variable margins accidentally matching cm-based print padding.
5. The add-on header/title/price row, outer card border/radius, section heading, feature typography, quantity values, Bundle semantics, and page-break avoidance remain unchanged.
6. Use existing spacing tokens for screen and the existing `0.25cm 0.4cm` print rhythm; no new literal px/rem sizes.
7. Extend `quote-inclusion-quantity-parity-contract.ts` to lock:
   - direct-child add-on selector only;
   - full-bleed screen offsets use the parent padding tokens;
   - explicit print offsets match the print add-on/features padding;
   - primary service inclusion geometry is untouched.
8. Rebuild `dist/css/cost-builder.css`; run focused/relevant contracts, typecheck/build if required by the repository workflow, then one concise full sweep.
9. Record exact diff, commit SHA, and validation here; set `AWAITING CHATGPT REVIEW`. Do not push to `main`.

## Revised Final Gate
After deployment, confirm the add-on inclusion shell and quantity column align with primary plan inclusions in both the expanded proposal and saved PDF. Phase 8I remains open.

## Claude Report — 2026-08-30 (pushed to review branch, not to main)

Same branch `phase-8i-final-quote-inclusion-quantity-parity`, new commit `6736d45d` on top of the already-deployed `eac4240a`. Pushed directly to that non-production branch — `main` untouched.

**Root cause confirmed exactly as diagnosed:** `.cz-proposal__service` (primary) carries zero own padding — its `.cz-proposal__service-row` and `.cz-proposal__features` children each carry their own matching horizontal inset, so they align at the same card edge. `.cz-proposal__addon` carries its own padding on every side; nesting `.cz-proposal__features` (which keeps its own horizontal padding for label/quantity breathing room) directly inside produced a doubled horizontal inset plus a visible gap before the add-on's bottom edge. Print inherited the mismatch since nothing made the add-on's print padding explicit — it fell through to the unscoped screen token.

**Fix applied** (`resources/css/modules/cost-builder.css`, direct-child selector only — the base `.cz-proposal__features` rule primary plans also use was never touched):
- `.cz-proposal__addon > .cz-proposal__features` gained `margin: 0 calc(var(--cz-space-5) * -1) calc(var(--cz-space-4) * -1)` — cancels exactly the parent's own horizontal/bottom padding using the parent's own tokens. Top untouched (that's the flex row's own intentional gap, not a double inset).
- New explicit `#cz-print-root .cz-proposal__addon { padding: 0.25cm 0.4cm !important }` — the exact rhythm `.cz-proposal__service-row` already uses in print, made explicit instead of relying on an inherited var()-token value that might not equal it.
- New `#cz-print-root .cz-proposal__addon > .cz-proposal__features { margin: 0 -0.4cm -0.25cm !important }` — cancels exactly that now-explicit print padding.
- `.cz-proposal__service`/`-row` and the base `.cz-proposal__features` rule are completely untouched. No JSX, quantity data/markup, typography, Bundle semantics, page-break rules, or header/price row changed.

**Contract extended** (`quote-inclusion-quantity-parity-contract.ts`): confirms the direct-child selector (never the base rule); screen offsets use the parent's own `--cz-space-5`/`--cz-space-4` tokens; base `.cz-proposal__features` padding is untouched; explicit print padding/cancellation use the exact `0.25cm`/`0.4cm` values already established; `.cz-proposal__service-row`'s own print padding is unchanged.

**Tests:** `tsc --noEmit` clean, `npm run build` clean. Full contract sweep: only the three confirmed pre-existing failures remain (`admin-station-css`, `package-builder-flow`, `platform-identity-schema`).

**Diff:**
```
 dist/css/cost-builder.css                                    |  2 +-
 resources/css/modules/cost-builder.css                       | 30 ++++++++++++--
 scripts/quote-inclusion-quantity-parity-contract.ts           | 43 ++++++++++++++++++++
 3 files changed, 73 insertions(+), 2 deletions(-)
```
(paths relative to `wp-content/plugins/compuzign-platform/`)

Awaiting review of the actual `6736d45d` diff before any push to `main`.
