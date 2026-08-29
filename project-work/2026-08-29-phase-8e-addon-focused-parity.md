# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CHATGPT REVIEW`
- Verdict: `Proceed with safeguards — LIVE REGRESSION CORRECTION REQUIRED` (correction implemented, pushed for review)
- Production (unchanged, `main` not touched): `main@b7083c44cb23e0e005976687583d7fdf2b4f2a6d`
- Deployment (unchanged): run `33245001288`, `SUCCESS`
- Source push: `NOT APPROVED`
- Review branch (advanced): `phase-8e-addon-cta-review` → `cf650905d96b8fdee5c0032caefd7d5694fc51a9` (parent `b7083c44cb23e0e005976687583d7fdf2b4f2a6d`), pushed to `origin`

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

## Claude Corrective Response — 2026-08-29

**1. Cart affordance restored to "View details"** — `QuoteSummary.tsx`: removed `onOpenAddonFocus` prop/callback and its "View Plan" button entirely. The existing "View details" button (`onOpenDetails`) now renders for every `family_tier` item — dropped the `!item.isAddon` exclusion. Cart-total/TCV math (`primaryFamilyTierItems`) is untouched, still primary-only by design (per requirement #23 in this file).

**2. QuoteDetailsOverlay extended, not bypassed** — added `allFamilyTierItems = items.filter(isFamilyTierQuoteItem)` (every quoted plan) driving the tab list and active-tab resolution; `primaryFamilyTierItems` is now derived from it (`.filter((item) => !item.isAddon)`) and still exclusively feeds the Total Commitment tab — no add-on TCV math invented. An add-on's own tab reuses `resolvePlanDetails()` verbatim, same as a primary's.

**3. Fail-closed exact identity** — `resolvePlanDetails()` had the SAME fail-open bug FamilyTierAdapter's own resolver had (fixed in the prior round): a non-null `tierEditionPlatformId` with no matching Edition silently fell back to Default via `?.id ?? null`. Fixed to return `null` in that case (the overlay's existing fallback already renders "Details unavailable" — no new UI needed).

**4. Bottom action into focused shell** — per requirement #5 ("if that action already exists in the details flow"): confirmed `PlanDetailsContent` has no such action for ANY plan today (primary or add-on) — it's read-only content only. Per the "if it already exists" phrasing, nothing was added; inventing one would be scope creep beyond the narrowest correction.

**5. Now-unneeded plumbing removed** — grep confirmed `externalFocusRequest`/`onExternalFocusConsumed` (FamilyTierAdapter) and `openAddonFocus`/`addonFocusRequest` (PackageBuilderApp) had no consumer left once the cart route reverted; removed entirely from both files.

**Regression coverage rewritten** (`package-builder-addon-focus-contract.ts`): CTA-order checks kept as-is (untouched this round); new checks confirm the removed plumbing is gone from all three files, `QuoteSummary`'s "View details" gate has no `isAddon` exclusion, `QuoteDetailsOverlay`'s tab population/active-item resolution covers every quoted plan while Total Commitment stays primary-only, and `resolvePlanDetails()` fails closed on an unmatched Edition.

- Files changed: `resources/ts/components/cost-builder/QuoteSummary.tsx`, `resources/ts/components/package-builder/FamilyTierAdapter.tsx`, `resources/ts/components/package-builder/PackageBuilderApp.tsx`, `resources/ts/components/package-builder/QuoteDetailsOverlay.tsx`, `scripts/package-builder-addon-focus-contract.ts`, `dist/js/cost-builder.js`. No CSS changes — CTA order preserved exactly.
- Tests/build: `tsc --noEmit` clean; `npm run build` succeeded; contracts passed — the rewritten `package-builder-addon-focus`, `package-builder-regression-lock`, `cost-builder-isolation`, `package-family-cart`, `quote-cart-addon`, `tier-addon-flow`, `package-builder-customer-tabs`, `tier-edition-switch`. `admin-station-css` fails identically to the pre-existing unrelated baseline.
- Source state: committed locally on `main` (`cf650905`, parent `b7083c44`), **not pushed to `origin/main`**. Same commit pushed to `phase-8e-addon-cta-review` (advancing it from `b7083c44`). `origin/main` confirmed unmoved before and after.
- Questions for approval: none.
