# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — `0a13fd14` rejected after source audit**
- Auditor verdict: **Stop — architectural risk**.
- Production `main`: `28b6859c1efab5044ac761f360852a19988de7b2`.
- Candidate `0a13fd14` is **SOURCE PUSH NOT APPROVED**.

## What is now correct
Keep all of this unchanged:
- CTA inside Recommendations;
- selected primary Tier visible;
- pending CTA hides Add-ons + Cart;
- Browse Catalogue uses `.cz-package-builder__focused`;
- `ComposableOfferBrowser` remains the one preview/auto-sync mutation authority;
- Add to Quote remains exit/return only;
- catalogue-only Families stage correctly;
- selected composable Edition now drives the server resolver's full Edition commercial container;
- no standalone Build Your Own route/card.

## Two remaining source mismatches

### 1. Quote builder still reads Default commercial metadata
`buildComposableFamilyTierQuoteItem()` receives the correct Edition-resolved `periods`, but still uses Default `offer` fields for:
- `minimumTermValue` / `minimumTermUnit`;
- `commitmentMonths` passed into `buildLegPaymentSummaries()`;
- `offer.headline_leg_id` passed into `resolveHeadlinePrice()`;
- `offer.headline_leg_id` passed into `buildQuotedCartBreakdown()`.

So an Edition can now resolve the correct periods but still have Default commitment/headline metadata applied while building the quote.

**Fix:** derive these fields from the active Edition when one is selected, otherwise from Default. Do not recalculate pricing client-side; continue using server-returned `periods`.

### 2. Edition catalogue rows are still Default-bound
`resolveComposableEligibleRows()` always builds its inclusion map from `offer.inclusions`, even when using an Edition's `customer_policy`. Therefore an Edition-only `rate_sheet_items` inclusion can be priced by the corrected server resolver but never appear in the catalogue/selection UI or committed inclusion list.

This is not merely cosmetic: required/selected Edition inclusions can become hidden from the customer while still affecting the resolved commercial result.

**Fix:** reuse the existing Edition projection/inclusion authority so an active composable Edition's browsable inclusion set comes from that Edition's own resolved inclusion declaration/Rate Sheet rows, with the same browse metadata enrichment used for Default. Default remains unchanged when no Edition is selected.

## Must preserve
- every item in “What is now correct”;
- same server resolver/preview/auto-sync path;
- Add to Quote is not a second commit path;
- no new pricing engine or client commercial calculation;
- Edition identity must match the same declaration used for rows, periods, commitment and headline.

## Must not substitute
- no redesign of CTA, focused shell, Cart or Recommendations;
- no new route/gate/wrapper;
- no hiding Edition-only inclusions to avoid fixing projection;
- no flattening Editions back onto Default.

Prepare one clean corrected candidate from current `main`, report exact SHA/files/evidence, set **AWAITING CHATGPT REVIEW**, and do not push to `main`.