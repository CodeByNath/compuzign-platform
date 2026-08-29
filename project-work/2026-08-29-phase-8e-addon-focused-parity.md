# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `READY FOR CLAUDE`
- Verdict: `Proceed with safeguards — ONE PRESENTATION REFINEMENT BEFORE LIVE VALIDATION`
- Production: `main@cf650905d96b8fdee5c0032caefd7d5694fc51a9`
- Deployment: run `33246121533`, `SUCCESS`
- Source push: `NOT APPROVED` for this refinement until ChatGPT reviews it.

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
