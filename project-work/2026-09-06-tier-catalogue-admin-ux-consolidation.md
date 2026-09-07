# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Upgrade inclusion rows added via existing Cart disclosure derivation, fresh candidate pushed**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`; deploy #972 succeeded.
- Superseded candidate `review/upgrade-your-build-cart-reuse` @ `139e1ceebd449635c05add2b6ae8976eab4b39e9` — branch deleted (local + remote), architecture accepted but incomplete.
- New combined Phase 2+3+4 candidate: `review/upgrade-your-build-inclusions` @ `b4c4951523c98a2e26dbca4f6b443d7c47c43d4a`, built fresh from `main` (`5c7eb062`) with no ancestry from the superseded branch — pushed to origin. Evidence below.

## Accepted in this candidate
The architecture is now on the right track:
- `QuoteItemPricePresentation` and `QuoteTotalsPresentation` are extracted from `QuoteSummary.tsx` and `QuoteSummary` itself uses them, so the Upgrade stage shares the real Cart monetary presentation instead of imitating it.
- Upgrade stage scopes that presentation to primary + composable cart lines only.
- No second totals implementation/store/staging cart.
- Browse/auto-sync/gate behavior remains intact.
- `Add to Quote` remains stage-exit only.

## Remaining blocking mismatch
The scoped Upgrade right side currently renders only the Cart's price/totals presentation. It **drops the selected Build Your Own inclusions/features entirely**.

That conflicts with the locked customer requirement: while browsing, the right side must show the already-quoted plan plus the selected Upgrade inclusions underneath as a simple truthful `name × quantity` view.

Source already has the authoritative Cart inclusion projection in `InclusionDisclosure.tsx`: `disclosureRowsForFamilyTierItem(item)` reads the committed `cartBreakdown` / `inclusionItems[]` snapshots and preserves `quantity: null` when no authoritative quantity exists. This is read-only presentation data, not a cart mutation.

## Claude — narrow correction only
Keep the current shared Cart price/totals extraction. Add the composable line's selected Upgrade inclusions underneath using the **existing Cart inclusion derivation**, not a new projection:
- reuse `disclosureRowsForFamilyTierItem(composableItem)` or the smallest truthful existing read-only presentation seam around it;
- render a simple always-visible Upgrade list in this browsing summary (no need to carry the Cart chevron/disclosure interaction into this stage unless source proves that is the cleaner reuse);
- show label plus `× quantity` only when `quantity !== null`; if quantity is absent, show the label only — never default/reconstruct `1`;
- preserve Bundle/child hierarchy semantics if the shared rows expose them; do not flatten away meaningful child identity;
- do not add Remove/Clear/Review controls or any quote mutation.

Update the focused contract to prove the Upgrade inclusion rows come from the existing Cart disclosure derivation and no client quantity fallback exists. Run `tsc`, relevant contracts and build.

Return a fresh clean combined Phase 2+3+4 candidate from current `main` with exact SHA/files/evidence as **AWAITING CHATGPT REVIEW**. Do not push to main.

## Corrected inclusion-rows evidence

`UpgradeBuildSummary` now also calls `disclosureRowsForFamilyTierItem(composableItem)` (from `InclusionDisclosure.tsx`) when a composable line exists — the exact same authoritative row derivation `QuoteSummary`'s own inclusion-disclosure panel already uses for this item (same `cartBreakdown`/`inclusionItems[]` snapshot reading, same Bundle-child recursion via `row.isChild`), never `composableItem.inclusionItems` or `composableSelection` read directly.

Rendered as a simple, always-visible `<ul>` (no chevron/toggle carried over — `InclusionDisclosureToggle`/`InclusionDisclosurePanel` themselves were deliberately not reused, since this stage has no reason to start collapsed and the full 4-column Inclusion/Qty/Unit price/Line total table would duplicate the totals already shown via `QuoteTotalsPresentation` directly below it): each row shows `row.label`, plus `` × `${row.quantity}` `` only when `row.quantity !== null` — no `??` fallback anywhere. `row.isChild` drives a distinct `cz-package-builder__upgrade-summary-inclusion--child` class (its own minimal rule, `padding-left: var(--cz-space-3)`) rather than reusing `.cz-inclusion-disclosure__label--child`, which is table-scoped (`.cz-inclusion-disclosure__table td.cz-inclusion-disclosure__label--child`) and would not apply outside that markup.

Branch construction: `git checkout -b review/upgrade-your-build-inclusions main` (tip `5c7eb0621c1c3610b6e970826a294065e7bdb89a`, unchanged), then `git checkout review/upgrade-your-build-cart-reuse -- <the 9 changed files>` — working-tree-only copy, no commit history attaches. Rebuilt (`npm run build`) to confirm the copied `dist/` matches a from-scratch build (`git diff --stat` empty), then committed everything as **one** commit. `git log review/upgrade-your-build-inclusions` shows a single commit whose only parent is `main`'s `5c7eb062`; none of the four prior superseded/rejected branches is an ancestor.

Commit: `b4c4951523c98a2e26dbca4f6b443d7c47c43d4a` — "Add Upgrade inclusion rows via existing Cart disclosure derivation".

Verification run on this branch:
- `npx tsc --noEmit -p tsconfig.json` — clean, no errors.
- `npm run contract:upgrade-your-build-gate` — PASS (adds property 15: `disclosureRowsForFamilyTierItem` import; exact rows expression; label + conditional `× quantity` only when non-null; no `??` fallback on quantity; `row.isChild` read and reflected in markup).
- `npm run contract:composable-offer-eligibility` / `composable-offer-choice` / `composable-offer-contribution` / `composable-quote-cart` / `composable-live-correction` — all PASS.
- `npm run contract:payment-summary-extraction-parity` / `package-builder-addon-focus` / `package-builder-customer-tabs` / `package-family-request-flow` / `request-flow-family-tier-parity` / `commercial-leg-inclusion-groups` / `commercial-leg-extension-groups` / `package-builder-bundle-inclusion-parity` / `cost-builder-isolation` — all PASS.
- `npm run build` (`vite build`) — clean; ran twice (once before committing to confirm the copied `dist/` matched a fresh build, `git diff --stat` empty).

Not pushed to `main`. Set **AWAITING CHATGPT REVIEW**.