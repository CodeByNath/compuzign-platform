# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — `e17f6892` rejected after source audit**
- Auditor verdict: **Stop — architectural risk**.
- Production `main`: `28b6859c1efab5044ac761f360852a19988de7b2`.
- Candidate `e17f68922a3841dc1c81487c7d4020f6f5ddbaab` is **SOURCE PUSH NOT APPROVED**.

## What remains correct
Keep the current UX direction unchanged:
- Upgrade Your Build CTA inside Recommendations;
- selected primary Tier remains visible;
- pending CTA hides Add-ons + Cart;
- Browse Catalogue uses the existing `.cz-package-builder__focused` shell;
- `ComposableOfferBrowser` remains the existing preview/auto-sync mutation authority;
- Add to Quote remains exit/return only;
- catalogue-only Families stage correctly;
- no standalone Build Your Own route/card.

## One blocker found in actual source
The Edition fix now carries Edition **identity/policy**, but still prices/quotes the Default occupant's commercial declaration.

Evidence:
- `PricingEditionOption` already carries Edition-specific `price`, `billing_cycle`, `minimum_term_*`, `commercial_legs`, `headline_leg_id`, and `customer_policy`.
- `PackageRepository::resolveComposableOfferSelection()` only overlays the selected Edition's `customer_policy` onto the Default `$container`, then calls the existing resolver.
- `buildComposableFamilyTierQuoteItem()` still derives commitment from `offer.minimum_term_*` (Default), while the returned `periods` are therefore also Default-container commercial periods. It merely attaches `activeEdition.edition_platform_id` / label afterward.

That can produce a quote labelled as an Edition while its commercial legs/price/commitment are the Default occupant's. Do not ship that mismatch.

## Claude — narrow correction only
Use the existing Tier Edition commercial declaration/resolution path for the selected composable Edition — not a policy-only overlay and not a new pricing engine.

### Must preserve
- everything in “What remains correct” above;
- same one server resolver / preview / auto-sync path;
- Default behavior unchanged when `edition_id` is null;
- selected Edition must still fail closed if not active/valid.

### Must fix
When `edition_id` is present, the resolver input must represent that Edition's **full effective commercial declaration** (its own pricing/Commercial Legs/commitment/headline plus its customer-policy inheritance rules), using the platform's existing Edition authority. The resulting preview `periods` and committed quote facts must therefore all describe the same selected Edition identity.

Do not merely copy Edition labels/Platform ID onto Default-resolved periods.

### Must not substitute
- no second resolver/pricing engine;
- no client-side reconstruction of Edition price/legs;
- no redesign of CTA, focused shell, Add to Quote, auto-sync, Cart, or Recommendations.

Prepare one clean corrected candidate from current `main`, report exact SHA/files/evidence, set **AWAITING CHATGPT REVIEW**, and do not push to `main`.