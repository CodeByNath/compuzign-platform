# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — Request/PDF/email audit complete, no source edits made.**
- Auditor verdict: **Proceed with safeguards.**
- Production accepted: `main@84ebbb2850f9e8f9ead8cec8c13ee67462cb3f33`; Hostinger Deploy #937 / run `33754346845` succeeded.

## Accepted chain through quote/cart
Live customer validation passed on deployed `/pricing/`:
- standalone Build Your Own creates one aggregate composable line;
- zero-selected/no-required removes it;
- primary + composable coexist independently;
- quote count/payment streams include composable once;
- no reactive re-sync loop after idle;
- update does not duplicate;
- primary removal does not remove composable and vice versa;
- reload re-seeds persisted composable choice without auto-mutating cart.

Accepted architecture remains locked: centralized `primary | addon | composable`; no per-inclusion products; no `is_addon` reuse; Family+Tier-System composable key; commercial facts only from successful server preview.

This overall work track remains open. Do not reopen the accepted Admin/customer/quote-cart architecture without hard evidence.

## Next phase — Request / PDF / customer email
Goal: carry the already-accepted composable quote snapshot through the existing Request pipeline and every customer representation without inventing a second commercial model.

### Claude first action — audit only, no source edits
Trace the exact current pipeline:
`FamilyTierQuoteItem` cart snapshot -> Request submit payload -> REST schema/sanitizer -> stored Request line -> Admin Request read/display -> proposal/quote PDF -> customer email content/attachment/view`.

Inspect at minimum:
- `RequestSchema.php` sanitizer + REST args for `family_tier`;
- request submission mapping/payload construction;
- `RequestLine` / `requestLineToCartItem` and any request-item display helpers;
- Admin Request surface representation;
- `QuoteProposalPreview` / print/PDF generation path;
- customer email template/body/attachment generation path;
- every allow-list/serialization boundary that would currently drop `isComposable` or `composableSelection`;
- existing handling of `inclusionItems`, `legPaymentSummaries`, quantities, Tier/Edition labels, TCV/payment streams.

Report in this same file:
1. exact fields that must persist for a truthful composable snapshot;
2. fields that are display-only and should NOT be stored;
3. how Request/Admin/PDF/email should distinguish `primary | addon | composable` without misusing `is_addon`;
4. exact customer-facing label/section for composable (prefer **Build Your Own**, not raw IDs or “primary”);
5. how selected inclusion names + quantities and per-Leg payment streams appear consistently across Admin, proposal/PDF and email;
6. backward compatibility for old Requests with no composable fields;
7. any schema/version/migration risk;
8. exact source files and focused contracts/tests required.

### Hard safeguards
- One stored aggregate composable Request line, never one line per inclusion.
- Persist the resolved commercial snapshot already in cart; do not re-resolve pricing from current Rate Sheet/occupant state when viewing an old Request/PDF/email.
- `composableSelection` is customer-choice audit/reseed context; resolved `inclusionItems` + `legPaymentSummaries` remain the commercial/display snapshot.
- No new entity/CZTG/Rate Sheet identity.
- No changes to pricing/resolver math in this phase, including the known occurrence-month issue.
- Existing primary/Add-on Request behavior must remain byte-compatible when new optional fields are absent.
- Do not implement until auditor approves the audit design.

Set **AWAITING CHATGPT REVIEW** after the audit. Overall final UI/UX refinement remains a later phase after this representation chain is accepted.

## Audit report — Request / PDF / customer email (read-only, no source edits)

Traced by direct source read on `main@84ebbb28` (no assumptions carried over from the cart phase). All eight files in the pipeline were opened; exact line-level evidence below.

### Headline finding
`isComposable` and `composableSelection` do not exist anywhere past the browser. **`src/Modules/Requests/Support/RequestSchema.php::sanitizeItems()`** builds the stored `family_tier` line from an explicit field allow-list (lines 143–172) and never copies `isComposable`/`composableSelection` from the raw submission — they are silently dropped at the one sanitisation gate (`RequestsController::submit()` stores `RequestSchema::validate()`'s output verbatim, no further stripping). Every downstream consumer — `RequestLine` (`api/types/admin.ts:98-128`), `requestLineToCartItem.ts`, `QuoteProposalPreview.tsx`, and `NotificationTemplates.php`'s own PHP port of `classifyQuoteItems()` — therefore has no way to know a stored line was composable, and each independently falls back to its existing `isAddon`-only split, which reads a composable line (`isAddon: false`) as **`primary`**.

By contrast, `inclusionItems`, `legPaymentSummaries`, and `tierEditionTitle` already round-trip correctly today (Phase 8G/8J-A/Phase 5 additions, unrelated to this phase) — `ComposableOfferBrowser.tsx`'s `buildComposableFamilyTierQuoteItem()` populates them with the exact same shapes the primary/add-on builders use, so once the role flag travels, no new commercial-data plumbing is needed — only routing.

**Concrete, reproducible defect (not hypothetical):** a Request containing both a primary Tier line and a composable line for the same Family+Tier-Instance (the exact "coexist independently" scenario just validated live in cart) will have both collapse into the same `primary` bucket on read-back. `quoteItemKey()` computes the identical key (`family:X:instance:Y:primary`) for both in `QuoteProposalPreview.tsx`'s `familyMainItems.map()` (line ~199), causing a duplicate React/Preact list key on the print/PDF and customer quote-view renders. The only thing keeping the two rows humanly distinguishable today is `tierTitle` text (`offer.label || 'Build Your Own'` vs. the real Tier's title) — no structural guarantee. **Pricing itself is not silently wrong** — each item's own `price`/`legPaymentSummaries` still sums correctly regardless of bucket — this is a classification/duplicate-key defect, not a billing one.

### 1. Fields that must persist
- **`isComposable: boolean`** — the one missing field. Everything else the `family_tier` branch already persists (`familyId/familyPlatformId/familyTitle/tierInstanceId/tierInstancePlatformId/tierOccupantId/tierPlatformId/tierEditionPlatformId/tierId('composable' sentinel — already accepted, sanitize_text_field has no allow-list restricting tierId)/tierTitle/tierEditionTitle(null)/price/billingCycle/features/inclusionItems/legPaymentSummaries/isAddon(false)/minimumTermValue/minimumTermUnit`) is correct and unchanged.

### 2. Display-only, should NOT be stored
- **`composableSelection`**. It is `ComposableOfferBrowser`'s own live re-seed/edit state (raw `item_id`/`selected`/`quantity`), not a commercial or display fact. A submitted Request is a terminal, read-only snapshot — nothing ever re-opens the composable browser against a stored Request. `inclusionItems` (labels + quantities) and `legPaymentSummaries` (resolved streams) already fully describe the commercial/display snapshot, matching the hard-safeguard language already in this doc. Recommend leaving it out of the Request/PDF/email chain entirely.

### 3. `primary | addon | composable` without misusing `is_addon`
Mirror `utils/quote.ts`'s `resolveQuoteItemRole()` exactly (composable checked first, then isAddon, else primary) in every reader, never a new enum:
- `RequestLine` (`admin.ts`): add `isComposable?: boolean;`.
- `requestLineToCartItem.ts::toCartItem()`: add `isComposable: item.isComposable ?? false,` — this single line is what actually fixes the misclassification on the reconstructed `FamilyTierQuoteItem`.
- `NotificationTemplates.php::classifyQuoteItems()` (lines 166–178, its own deliberate PHP port of the TS function): add a fourth `familyComposableItems` bucket, and change the `familyMainItems`/`familyAddonItems` filters to also exclude `isComposable` — today's filters only test `isAddon`, so adding the field alone is not sufficient; the two filters must change too.

### 4. Customer-facing label/section
Reuse "Build Your Own" verbatim — already the live cart wording (`OrderSummary.tsx`), already the fallback `tierTitle` value `buildComposableFamilyTierQuoteItem()` sets (`offer.label || 'Build Your Own'`). No new copy to invent.
- `QuoteProposalPreview.tsx` (customer proposal, and Admin Print/PDF via `printRequestProposal.tsx` → `requestLineToCartItem.ts` — same component, one code path): destructure `familyComposableItems` and add a block mirroring the existing `familyMainItems` one (line ~199) with a "Build Your Own" eyebrow instead of "Package Family", reusing `FamilyInclusionsList` unchanged.
- `NotificationTemplates.php::emailFamilyRow()` (line 382): add a third branch alongside the existing `isAddon ? 'add-on' : ''` badge — a "Build Your Own" badge, not the bare `familyTitle`-as-title primary treatment.
- `requestItemDisplay.ts` (Admin Requests list/drawer row) shows no role distinction for any family line today, not even `isAddon` — optional/cosmetic, lowest priority, since price and title already read correctly there; only the classification bucket is wrong elsewhere.

### 5. Inclusion names/quantities + per-Leg streams staying consistent
No new plumbing required. `inclusionItems`/`legPaymentSummaries` are already generic, occupant-agnostic snapshot fields persisted for every `family_tier` line since Phase 8G/Phase 5, predating composable — `ComposableOfferBrowser`'s builder already fills them with the identical shapes the primary/add-on builders use. Once `isComposable` travels through and the composable bucket is routed through the *same* existing helpers (`FamilyInclusionsList`, `emailFamilyStreamsBlock`, `emailInclusionItemsList` — no new rendering logic), everything renders correctly. This is a wiring change only.

Two totals call sites also need the new bucket folded in, or a composable-only Request would silently drop out of combined totals after the fix:
- `QuoteProposalPreview.tsx`: `familyPrimaryTotalContractValues`/`combinedFamilyTotalContractValue`/`familyStartingPayments` currently derive from `familyMainItems` only (lines 96–109) — recommend including `familyComposableItems` too, mirroring `OrderSummary.tsx`'s already-shipped `familyCommercialItems = [...familyMainItems, ...familyComposableItems]` precedent, so the PDF/proposal shows the same combined total the customer already saw in-cart.
- `NotificationTemplates.php::buildQuoteSections()` (lines 538–577): the `$hasMultiStreamItem` detection and `familyContractValueBlock()`/`familyInitialPaymentRow()` calls only merge `familyMainItems`+`familyAddonItems` — must also merge `familyComposableItems`, same reasoning.

### 6. Backward compatibility
`isComposable` optional/nullable everywhere, `!empty($raw['isComposable'])` semantics identical to the existing `isAddon` pattern — absent reads as `false` → `primary`, correct for every Request submitted before this phase (none has ever been composable). Purely additive; zero migration, same shape as every prior optional field added to this sanitiser (`tierEditionTitle`, `inclusionItems`, `legPaymentSummaries`, `serviceDescription`/`bundleDescription`) with no incident.

### 7. Schema/migration risk
None beyond the standard additive-optional-field pattern already used repeatedly in this exact file. No backfill needed for stored rows.

Pre-existing, unrelated gap noticed during this trace (flagging per repo convention, not acting on it): **`planDurationMonths`** is never persisted by `RequestSchema::sanitizeItems()` for *any* `family_tier` line — primary, add-on, or composable — and `RequestLine` doesn't carry it either. It exists only on the live-cart `FamilyTierQuoteItem` type. This predates composable and is out of scope for this phase unless the auditor wants it folded in here.

No new entity/CZTG/Rate Sheet identity anywhere in the above — confirmed; this phase only adds one boolean discriminator and reroutes already-existing snapshot fields through already-existing rendering helpers.

### 8. Exact source files + tests
**Files to change (implementation phase only, not this audit):**
- `src/Modules/Requests/Support/RequestSchema.php` — `sanitizeItems()`: `$item['isComposable'] = !empty($raw['isComposable']);` in the `family_tier` branch; `restArgs()`: add `'isComposable' => ['type' => 'boolean']` to `items.items.properties` for schema-introspection parity (not the real gate, `sanitizeItems()` is).
- `resources/ts/api/types/admin.ts` — `RequestLine`: add `isComposable?: boolean;`.
- `resources/ts/admin-station/stations/requests/requestLineToCartItem.ts` — `toCartItem()`: add `isComposable: item.isComposable ?? false,`.
- `resources/ts/components/request-flow/QuoteProposalPreview.tsx` — destructure and render `familyComposableItems`; fold into the totals math per item 5.
- `src/Modules/Requests/Notifications/NotificationTemplates.php` — `classifyQuoteItems()` fourth bucket + filter fix; `emailFamilyRow()` composable badge branch; `buildQuoteSections()` totals merge per item 5.
- `resources/ts/admin-station/stations/requests/requestItemDisplay.ts` — optional role indicator, lowest priority.
- No changes needed: `ComposableOfferBrowser.tsx`, `FamilyTierAdapter.tsx`, `PackageBuilderApp.tsx`, `utils/quote.ts` — the client cart side is already correct and live; this phase only concerns the Request/PDF/email pipeline reading the same already-existing shape.

**Tests:** this repo has no PHPUnit setup (checked — none found); its convention is TS `tsx` contract scripts throughout, including for logic that has a PHP mirror. Recommend:
- A new focused contract (`scripts/composable-request-line-contract.ts` or extend `composable-quote-cart-contract.ts`) asserting: a `RequestLine` fixture with `isComposable: true` round-trips through `toCartItem()` to `resolveQuoteItemRole() === 'composable'`, and its `quoteItemKey()` differs from a sibling primary line's key for the same family+instance — directly covering the duplicate-key defect found above.
- Update the three `[order, proposal]`-occurrence-count contracts already touched in the prior cart phase (`request-flow-family-tier-parity`, `quote-inclusion-quantity-parity`, `package-builder-bundle-inclusion-parity`) once `QuoteProposalPreview.tsx` gains its own composable block — their counts will need a matching bump for that file, the same pattern used when `OrderSummary.tsx` got its row.
- The PHP-side `classifyQuoteItems()`/`emailFamilyRow()` changes have no automated test path in this repo (no PHPUnit) — recommend manual verification against a hand-built composable+primary-coexisting Request fixture, consistent with how the rest of `NotificationTemplates.php` is currently verified.

No source edits were made. Awaiting review before any implementation begins.