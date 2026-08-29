# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `READY FOR CLAUDE`
- Verdict: `Proceed with safeguards — LIVE REGRESSION CORRECTION REQUIRED`
- Production: `main@b7083c44cb23e0e005976687583d7fdf2b4f2a6d`
- Deployment: run `33245001288`, `SUCCESS`
- Source push: `NOT APPROVED` for the next correction until ChatGPT reviews it.

## Live Validation — 2026-08-29
Nath confirmed the recommendation-card button order is correct.

A regression remains in the cart behavior. ChatGPT previously instructed Claude to replace the add-on cart's existing **View details** behavior with **View Plan** routing directly into the focused Tier shell. That instruction was wrong and must be reversed.

## Required Customer Behavior
For a quoted add-on cart row:
1. The link text is **View details**.
2. Clicking it opens the existing quote/details prompt/overlay.
3. That overlay must include the selected add-on's own plan details, not exclude add-ons.
4. The add-on details must resolve from the exact quoted Family + Tier + Edition identity.
5. The existing details experience should provide the bottom action that can take the customer into that exact add-on's focused Tier/Edition state, if that action already exists in the details flow. Do not bypass the details overlay from the cart row.

Primary quote rows keep their existing **View details** behavior. Total Commitment must keep its existing primary-plan aggregation unless there is already an established add-on rule; do not invent add-on TCV math.

## Source Audit Finding
Current `QuoteDetailsOverlay.tsx` explicitly filters `primaryFamilyTierItems = ...filter((item) => !item.isAddon)` and its comments state add-ons never receive tabs. Current `QuoteSummary.tsx` instead routes add-ons through a separate `onOpenAddonFocus` / **View Plan** path. These are the behaviors to correct.

## Claude Next Action
Make the narrowest correction only:
- Restore add-on cart affordance to **View details** using the existing quote-details overlay callback, not a parallel direct-focus callback.
- Extend `QuoteDetailsOverlay` so an add-on can be the initial/active detail target and receive its own detail tab/content using the same `resolvePlanDetails()` path, with exact Edition identity and fail-closed behavior where resolution is invalid.
- Preserve the current Total Commitment population/math unless source already defines add-on commitment handling.
- Remove the now-unneeded add-on-only direct-focus plumbing if it has no other valid consumer.
- Preserve recommendation CTA order, add/remove independence, quote capture, pricing, persistence, primary behavior, and Cost Builder isolation.
- Add/update focused regression coverage for add-on **View details** and exact add-on detail resolution.

Implement locally, push only to the existing review branch, update this same work file with changed files/tests/diff summary, then set `AWAITING CHATGPT REVIEW`. Do not push `main` yet.
