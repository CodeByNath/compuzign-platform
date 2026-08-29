# Phase 8I — Final Quote Inclusion Quantity Parity

## Status
- Phase 8H production baseline: `main@0c586debcccc5ee9eb850b8119200b31fe61b4ed`.
- Phase 8I: `SOURCE PUSH APPROVED`.
- Source push: approved only for exact reviewed commit `eac4240a76215c701898526e70122041e656a319`.
- Auditor verdict: `Proceed with safeguards` — source accepted; live screen/PDF validation remains required after deployment.
- Reviewable candidate: `phase-8i-final-quote-inclusion-quantity-parity@eac4240a`, based on `main@0c586debcccc5ee9eb850b8119200b31fe61b4ed`.

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
