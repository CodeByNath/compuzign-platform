# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — audit complete, design proposed, no source edited.**
- Auditor verdict (prior round): **Proceed with safeguards.**
- Current production: `main@bb86513c38fb4e0eea39c290ddf07961e6ecfd1a`; Deploy #936 succeeded.

## Current accepted chain
Admin architecture/UI path is accepted live:
- five normal Tier backend slots remain five;
- Build Your Own is subordinate workspace only;
- Customer Options standalone drawer works;
- composable middle shell + reused lower deck work live;
- published Block Storage Add/Remove policy reaches `/pricing/`;
- Add/Remove and server preview `$10/mo Ongoing` work.

This work area is **not globally closed**. UI/UX refinements remain for later review; continue in this same work file until the whole composable chain is complete.

## Next phase — quote/cart connection only
Connect the already-resolved composable customer state to the existing quote engine. Preserve all existing backend architecture.

Locked direction:
- composable occupant remains one aggregate commercial authority;
- customer-selected inclusions/quantities are a quote-time composition snapshot, never mutation of the published occupant;
- create/update **one composable quote item/snapshot**, not one cart product per inclusion;
- do not reuse `is_addon`;
- composable must coexist with the normal primary Tier/Edition and existing Add-ons;
- snapshot carries selected inclusion breakdown + quantities and authoritative resolved per-Leg payment summaries;
- cart/TCV must consume that resolved snapshot rather than inventing flat totals;
- no Request/PDF/email work yet; those come only after quote/cart is accepted;
- no new CZTG/entity/Rate Sheet/customer product identity.

## Claude first action — audit before implementation
Audit the current customer preview -> quote/cart boundary and report the smallest safe design **before editing source**. Inspect at minimum:
- `FamilyTierQuoteItem` and quote key/role construction;
- `replaceFamilyNormalQuoteItem()` and Add-on coexistence semantics;
- `legPaymentSummaries` production/consumption;
- cart totals/TCV calculation and rendering;
- `ComposableOfferBrowser` / preview response shape and the exact server-resolved data currently available after Add/qty changes;
- quote persistence/storage compatibility and any downstream assumptions that only primary/add-on roles exist.

Answer in this same file with:
1. exact proposed composable quote role/key;
2. exact snapshot fields to reuse/add;
3. add/update/remove behavior when customer changes composition or removes all optional selections;
4. coexistence proof with primary + Add-ons;
5. TCV/payment-stream handling;
6. migration/backward-compat risks;
7. exact files likely to change and tests required.

Set status **AWAITING CHATGPT REVIEW** after the audit. **Do not implement yet.**

## Claude audit answer — no source touched

Confirmed via direct read (`FamilyTierQuoteItem`, `utils/quote.ts`, `PackageBuilderApp.tsx`, `ComposableOfferBrowser.tsx`, `TierId`), not just the exploring agent's report.

**1. Role/key.** Reuse `offer_type: 'family_tier'` — do not add a third `CartItem` union member; every generic consumer (`isFamilyTierQuoteItem`, cart persistence, admin Request mapping, PDF/quote-view) stays untouched. Add one orthogonal `isComposable?: boolean` field on `FamilyTierQuoteItem`, mirroring exactly how `isAddon` was added (matches the doc's own "do not reuse `is_addon`" instruction). `tierId: TierId` (`'basic'|'standard'|'premium'|'enterprise'|'ultimate'`, `cost-builder.ts:1`) cannot literally hold the admin-only `COMPOSABLE_TIER_ID` sentinel (confined entirely to `package-station/`, never imported customer-side) — needs a small additive widen (`TierId | 'composable'`) or the field goes optional for a composable line. `TierId` is never exhaustively pattern-matched outside Package Station, so this is low-risk.

**2. Snapshot fields.** Reusable as-is: `price`, `billingCycle`, `legPaymentSummaries` (already computed today at `ComposableOfferBrowser.tsx:266` via `buildLegPaymentSummaries()`, just discarded after render), `inclusionItems` (`ServiceInclusion` already carries the Phase 2B1 `unit_price`/`line_total`/`categories` fields this needs), `familyId`/`tierOccupantId`/`tierPlatformId`/`minimumTermValue`/etc. Genuinely new: `composableSelection: ComposablePreviewChoiceItem[]` — the actual customer *choice* record (already built by the exported `buildComposableChoice()`, `ComposableOfferBrowser.tsx:57-76`), distinct from the *resolved/priced* `inclusionItems`, needed both to re-seed the browser on "Update" and for a real "customer chose X, Y, Z" record in Request/PDF later. `tierEditionPlatformId`/`planDurationMonths` stay `null` (composable has no Edition/duration picker).

**3. Add/update/remove.** New `upsertFamilyComposableQuoteItem()`/`removeFamilyComposableQuoteItem()` mirroring `upsertFamilyAddonQuoteItem()`. Update = full replace (new selection + re-resolved price/legs), never a patch — matches the resolver's own "non-empty is a complete replacement" posture. Removing every optional inclusion is NOT empty-cart: `buildComposableChoice()` already always includes `mode: 'required'` rows regardless of customer action, and the preview UI already treats zero-optional as a legitimate state ("No inclusions selected yet."), so a required-only composable line must persist, not auto-delete. `removeFamilyTierSystemQuoteItems()` (removes everything for a Family+Instance when the primary Tier is cleared) must NOT also remove a standalone composable line, since `context: 'build_your_own'` is designed to work with no primary Tier at all — needs its own scoping, not inherited Add-on "orphaned without primary" behavior.

**4. Coexistence proof.** Currently **cannot** coexist without the `isComposable` addition. Proof: `quoteItemKey()` (`quote.ts:22`) is strictly binary (`isAddon ? ...addon... : ...primary`); a composable item with `isAddon: false` collides with the true primary's `:primary` key. `replaceFamilyNormalQuoteItem()` (`quote.ts:30`) filters out every non-addon `FamilyTierQuoteItem` sharing the Family+Instance key before appending — calling it with a composable item would silently delete the real primary Tier line (or vice versa). `PackageBuilderApp.tsx:77`'s `primary = familyItems.find(item => !item.isAddon)` and `classifyQuoteItems()`'s `familyMainItems` (non-addon) filter both assume exactly one non-addon line per Family — a composable line sharing that bucket duplicates as two "primary" rows in the proposal/TCV sum. All four sites need the same third `isComposable` branch, in the same change, or the layers disagree about which line is primary.

**5. TCV/payment streams.** The aggregation primitives (`buildLegPaymentSummaries`, `computeTotalContractValue`, `startingPaymentsByCycle`) are already format-agnostic pure functions over `LegPaymentSummary[]` — zero changes needed. Only the three call sites' filter predicates (`QuoteSummary.tsx:56`, `OrderSummary.tsx:125`, `QuoteProposalPreview.tsx:96`, all currently `!item.isAddon`) need widening to include a composable line in the primary-side sum. Backend already reuses the unmodified `resolveCommercialLegTimeline()` for composable — no new pricing engine either side. Known pre-existing off-by-one in `buildOccurrenceMonths()` (documented in `tier-composable-occupant-customer-policy.md`) is inherited, not introduced, by this change.

**6. Migration risk.** Browser cart storage (`cartStorage.ts`) is schema-free JSON with only a version/TTL check — new optional fields are safe, same posture as every prior additive field on this type. Server-side `RequestSchema.php::sanitizeItems()` is an explicit allow-list — a new field is silently dropped unless added to the `family_tier` branch (`~143-172`), `restArgs()`'s nested schema (`~356-416`), and mirrored in `requestLineToCartItem.ts`/`RequestLine` — three places that must agree simultaneously. Pre-existing stored carts/Requests are unaffected (absent-means-none, matching `inclusionItems`/`legPaymentSummaries` today).

**7. Files/tests.** Frontend: `types.ts`, `utils/quote.ts`, `PackageBuilderApp.tsx`, `FamilyTierAdapter.tsx` (`itemFor()` composable analog + wiring `ComposableOfferBrowser`'s currently-absent add/update/remove callbacks), `ComposableOfferBrowser.tsx` (accept/emit a persisted selection instead of pure local state), `QuoteSummary.tsx`, `QuoteDetailsOverlay.tsx`, `OrderSummary.tsx`, `QuoteProposalPreview.tsx`, `requestLineToCartItem.ts`/`requestItemDisplay.ts`, `admin.ts` (`RequestLine`). Backend: `RequestSchema.php` only (sanitizer + REST args) — Package/resolver layer already complete, no changes expected there. Existing contracts to keep green: `contract:package-family-cart` (closest structural precedent for a new `composable-cart-coexistence` contract — pure `check()` assertions, no DOM), `contract:quote-cart-addon`, `contract:request-flow-family-tier-parity`, `contract:composable-offer-choice`/`-contribution`, plus `tsc`/`build`/`docs:check`. PHP: `request-schema-family-quote-snapshot.php`, `request-schema-is-addon.php`, `composable-customer-*-*.php`.

## Deferred within this same work track
After quote/cart acceptance: Request -> PDF -> customer email propagation, then a dedicated UI/UX refinement pass across Admin + customer composable surfaces before final closure.