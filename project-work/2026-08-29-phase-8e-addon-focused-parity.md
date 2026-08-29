# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CHATGPT REVIEW`
- Verdict: `Proceed with safeguards — ONE PRESENTATION REFINEMENT BEFORE LIVE VALIDATION` (refinement implemented, pushed for review)
- Production (unchanged, `main` not touched): `main@cf650905d96b8fdee5c0032caefd7d5694fc51a9`
- Deployment (unchanged): run `33246121533`, `SUCCESS`
- Source push: `NOT APPROVED`
- Review branch (advanced): `phase-8e-addon-cta-review` → `b299563d264615d39b40a9a21e56e14edd0e1565` (parent `cf650905d96b8fdee5c0032caefd7d5694fc51a9`), pushed to `origin`

## Accepted Behavior Already Live
- Recommendation CTA order is correct.
- Add-on cart/details support is restored through the existing Quote Details overlay.
- Add-on detail identity fails closed on invalid Edition resolution.
- Total Commitment remains primary-only.

## Nath Refinement Before Browser Validation
There must not be 2–3 separate **View details** links in the cart.

Use one single cart-level **View details** control only — the existing footer control beside/below the summary area near **Initial Payment**.

Required behavior:
1. Remove the per-item **View details** buttons from each quoted plan row.
2. Keep one footer **View details** button only.
3. Clicking that one button opens the existing Quote Details overlay on the **first quoted plan tab**, not Total Commitment.
4. Overlay tab order must follow cart order from top to bottom: first quoted plan, next quoted plan/add-on(s), then **Total Commitment** last.
5. The customer can move through all plan/add-on detail tabs and finally Total Commitment from that one overlay.
6. Left-align the single footer **View details** control in the quote footer/summary area.

## Source Shape Already Supports This
`QuoteDetailsOverlay` already builds plan tabs from `allFamilyTierItems` in item/cart order and appends **Total Commitment** last. The refinement should reuse that order rather than introduce a new sorter or navigation model.

`QuoteSummary` currently renders both per-item detail buttons and one cart-level footer detail button. Its footer button currently calls `onOpenDetails(null)`, which opens the overlay on Total Commitment. Change only this presentation/entry behavior so the single footer control targets the first quoted `family_tier` item.

## Claude Next Action
Make the narrowest source change:
- Remove row-level **View details** rendering.
- Keep the footer **View details** control and open the overlay on the first quoted `family_tier` item.
- Preserve existing overlay tabs/content, add-on details, exact identity behavior, Total Commitment math, quote ordering, pricing, persistence, mutation, and Cost Builder isolation.
- Add/update focused regression coverage for exactly one cart **View details** entry, first-plan default tab, cart-order tabs, and Total Commitment last.
- Adjust only the required CSS to left-align that footer detail control.

Implement locally, push only to the existing review branch, update this same file, and set `AWAITING CHATGPT REVIEW`. Do not push `main` yet.

## Claude Corrective Response — 2026-08-29

**QuoteSummary.tsx**: removed the per-item "View details" button entirely (it previously rendered once per quoted plan row). The one remaining footer button now opens on `familyTierItems[0]` (cart order) instead of `onOpenDetails(null)`/Total Commitment, and is gated on `familyTierItems.length > 0` (any quoted plan) rather than `primaryFamilyTierItems.length > 0` — an add-on can never exist in the cart without its own primary (confirmed by ChatGPT's own prior audit), so the two gates are equivalent, but this one reads correctly as "is there a plan to show."

**QuoteDetailsOverlay.tsx**: no changes needed — confirmed its tab list already builds from `items` in cart order via `allFamilyTierItems`, with the Total Commitment tab button rendered after that map (always last). This already matched the required ordering exactly.

**CSS**: `.cz-quote-summary__view-details--cart` changed from `align-self: center` to `align-self: flex-start`, matching the plain `.view-details` button's own default alignment now that it's the sole entry point.

**Regression coverage rewritten**: locks that `onOpenAddonFocus` stays gone, no per-item `onOpenDetails(item)` call remains inside the cart list, the "View details" class-name substring appears exactly twice in the file (both from the one remaining button's own class attribute — base + `--cart` modifier), the footer button's `familyTierItems.length > 0` gate and `onOpenDetails(familyTierItems[0])` call, and the left-aligned CSS.

- Files changed: `resources/ts/components/cost-builder/QuoteSummary.tsx`, `resources/css/modules/cost-builder.css`, `scripts/package-builder-addon-focus-contract.ts`, `dist/css/cost-builder.css`, `dist/js/cost-builder.js`.
- Tests/build: `tsc --noEmit` clean; `npm run build` succeeded; contracts passed — the rewritten `package-builder-addon-focus`, `package-builder-regression-lock`, `cost-builder-isolation`, `package-family-cart`, `quote-cart-addon`, `tier-addon-flow`, `package-builder-customer-tabs`, `tier-edition-switch`. `admin-station-css` fails identically to the pre-existing unrelated baseline.
- Source state: committed locally on `main` (`b299563d`, parent `cf650905`), **not pushed to `origin/main`**. Same commit pushed to `phase-8e-addon-cta-review` (advancing it from `cf650905`). `origin/main` confirmed unmoved before and after.
- Questions for approval: none.
