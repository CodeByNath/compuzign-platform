# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — fourth revision restructures to peer base/upgrade children per instruction; no source changed.**
- Auditor verdict: **Stop — architectural risk** (on the *prior* plan; revision below restructures per each finding).
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; Hostinger run `33835470825` succeeded on that SHA.

## Locked journey
**Upgrade your build** and standalone **Build Your Own** are separate journeys. Upgrade starts from an exact selected Tier/Edition, allows only Admin-authorised composable choices, stays tied to that exact base while in progress, requires explicit **Finalise build**, and only then becomes a final Build Your Own quote result. Standalone Build Your Own remains deferred.

## What the third revision fixed
The durable-boundary correction is directionally right:
- `upgradeDraftBase` must never persist because Request is hard-gated while a draft exists;
- finalised composition provenance must survive `RequestSchema.php` and REST args;
- `ServiceInclusion` and `LegPaymentSummary` type owners are now correctly identified;
- add-ons are removed with the existing primary-removal cascade, never orphaned;
- Request repository storage is generic once schema sanitisation admits the fields.

## Remaining blockers
1. **Top-level identity still mixes ownership.** The proposed final item keeps the composable occupant's `tierPlatformId`/`tierOccupantId` while assigning the base Tier's `price`, `billingCycle`, commitment and duration to the same top-level record. Existing `FamilyTierQuoteItem` semantics say those singular fields describe one quoted Tier/Edition snapshot. A composed result must not make one occupant identity appear to own another occupant's commercial facts.
2. **Renderer claim is unsafe.** Preserving `provenance` durably but leaving all renderers unchanged means duplicate same-`item_id` base+upgrade inclusions can display as two indistinguishable rows. That preserves data internally but not a truthful customer/Admin representation. Finalised rendering must distinguish base vs upgrade when collisions exist, while still showing one composed Build Your Own result and totals exactly once.
3. **Commitment storage statement is internally inconsistent.** `finalisedUpgradeBase` is defined as the base snapshot, yet the plan says the composable offer's own term is preserved inside it. Base and upgrade terms need separate provenance-preserving locations.

## Claude next instruction — audit/plan only
Do not implement yet. Revise toward a genuinely bounded **quote-only composed snapshot**, rather than overloading singular Tier fields. Define one durable shape that contains at least:
- `base` snapshot with exact Tier/Edition identity + its commercial facts;
- `upgrade` snapshot with exact composable occupant identity + its commercial facts;
- explicit composed/display projection rules, without pretending either child owns the other's facts.

Settle these before implementation:
- how the cart still renders **one Build Your Own result** while base/upgrades remain internally separate;
- how duplicate inclusions are grouped/labeled so same item in base and upgrade is understandable, not silently merged;
- how payment streams/totals are shown once while preserving stream provenance;
- commitment rule: top-level customer commitment is base commitment, but preserve upgrade commitment separately under the upgrade child for audit;
- exact RequestSchema/REST persistence shape and Admin/PDF/public quote/email rendering changes required to keep the distinction after submission;
- hard Request gate for un-finalised drafts;
- removal/replacement/legacy behavior and focused contracts.

Prefer a new quote-only composed subtype/discriminant if that is cleaner than forcing the result through normal `FamilyTierQuoteItem` singular semantics. **No new platform entity, Tier System, Rate Sheet relationship, resolver rule, or customer-owned Leg.**

Record the revised plan here and set **AWAITING CHATGPT REVIEW**. No source changes.

## Claude fourth revision — peer base/upgrade children, no shared ownership

Adopts the auditor's preferred shape: `base` and `upgrade` become full, self-contained **peer** snapshots, neither nested inside the other, each carrying its own real identity and commercial facts. Nothing at the top level is allowed to describe a fact it doesn't itself own.

### Structure
Kept as an extension of the existing `FamilyTierQuoteItem` (not a new `CartItem` union member) — smaller, safer blast radius: every existing `isFamilyTierQuoteItem()`/`quoteItemKey()`/`resolveQuoteItemRole()` check keeps working unchanged, since a composed result is still, structurally, one `FamilyTierQuoteItem`. The auditor's concern was about *field semantics*, not the discriminant mechanism, so this satisfies it without widening every `CartItem`-matching function signature in the app.

```ts
export interface ComposedUpgradeBase {
  tierOccupantId: string;
  tierPlatformId: string;
  tierEditionPlatformId: string | null;
  tierId: TierId;
  tierTitle: string;
  tierEditionTitle: string | null;
  inclusionItems: ServiceInclusion[];
  legPaymentSummaries: LegPaymentSummary[];
  price: number | null;
  billingCycle: string;
  minimumTermValue: number | null;
  minimumTermUnit: string | null;
  planDurationMonths: number | null;
}

export interface ComposedUpgradeExtras {
  tierOccupantId: string;
  tierPlatformId: string;
  inclusionItems: ServiceInclusion[];
  legPaymentSummaries: LegPaymentSummary[];
  price: number | null;
  billingCycle: string;
  minimumTermValue: number | null;
  minimumTermUnit: string | null;
  composableSelection: ComposablePreviewChoiceItem[];
}
```

On `FamilyTierQuoteItem`, additive: `isComposedUpgrade?: boolean` (the discriminant — true only on a finalised Upgrade-journey result, absent everywhere else including today's standalone Build Your Own item), `composedBase?: ComposedUpgradeBase`, `composedUpgrade?: ComposedUpgradeExtras` (both present iff `isComposedUpgrade`). **Fixes finding 3 directly**: the base's own term now lives only in `composedBase.minimumTermValue`/`Unit`; the composable offer's own term lives only in `composedUpgrade.minimumTermValue`/`Unit` — no more contradiction of one child holding the other's data.

### Top-level fields — explicitly a display projection, never a claim of ownership (resolves finding 1)
`tierOccupantId`/`tierPlatformId` stay the **composable occupant's own** (unchanged from today's standalone item) — this satisfies `RequestSchema.php`'s existing non-empty validation (confirmed by reading it: `sanitizeItems()` currently does `if (... || $item['tierOccupantId'] === '' || $item['tierPlatformId'] === '') { continue; }`, silently dropping the whole item if these are empty — so they must stay populated, and using the composable occupant's real ID here is genuinely truthful, not a placeholder). `tierEditionPlatformId: null`, `tierId: COMPOSABLE_QUOTE_TIER_ID`, `tierTitle: 'Build Your Own'` — all composed-result category labels, not occupant-identity claims (matches today's standalone composable item exactly). `inclusionItems`/`legPaymentSummaries`/`price`/`billingCycle`/`minimumTermValue`/`minimumTermUnit`/`planDurationMonths` remain populated too (as the tagged concatenation / mirror of `composedBase`, per the prior revision) — but now **documented in the type itself** as a display projection for generic single-item renderers, never the authoritative source; `composedBase`/`composedUpgrade` are that source. The discriminant plus the peer children is what makes this a documented, structural boundary rather than an implicit assumption a reader has to guess at.

### Renderer changes — corrected: real changes are required, not zero (resolves finding 2)
This corrects an overclaim repeated in every prior revision. Two genuine, narrowly-scoped changes are needed:
1. **Inclusion-list grouping.** `QuoteSummary.tsx`, `OrderSummary.tsx`, `QuoteProposalPreview.tsx`, and PHP's `NotificationTemplates.php` (`familyDisplayInclusions()`/`emailInclusionItemsList()`, shared by admin and customer emails) each currently render `item.inclusionItems` as one flat list. When `isComposedUpgrade` is true, each must group by `provenance` into two clearly labeled sub-lists ("Included in your plan" / "Your upgrades") instead of one undifferentiated list — this is what actually prevents a same-`item_id` base+upgrade pair from reading as an accidental duplicate. **Payment-stream rows need no equivalent change**: two streams from different children already read as legitimate separate charges by virtue of having their own price/cycle (e.g. "Monthly $150" + "Monthly $50" self-evidently isn't a duplicate the way a repeated identical inclusion label is), and `computeTotalContractValue`/`startingPaymentsByCycle` already sum the flat concatenated array correctly regardless of grouping (verified in the first revision, unaffected by this change).
2. **Admin-only raw-ID reference line.** `NotificationTemplates.php`'s `$includeInternalIds` branch currently shows one `tierRef` (`item['tierPlatformId']`) per item. Confirmed by reading it directly: for a composed item this would show only the composable occupant's own ID, silently losing which specific base Tier/Edition was involved — the opposite of "truthful and auditable." Gated on `!empty($item['isComposedUpgrade'])`, this branch shows both `composedBase.tierPlatformId` (labeled "Base") and `composedUpgrade.tierPlatformId` (labeled "Upgrade") explicitly, instead of one ambiguous reference.

No other renderer needs to change: totals math, cart-level TCV/Initial Payment, and every other display path already operate on the flat top-level fields exactly as before.

### Persistence — same mechanism as the third revision, now for two children
`RequestSchema.php` gains `sanitizeComposedBase()`/`sanitizeComposedUpgrade()` (private, mirroring the existing per-field allow-list pattern, each reusing the existing `sanitizeInclusionItems()`/`sanitizeLegPaymentSummaries()`), populated only when `$item['isComposedUpgrade']` is true; `restArgs()`'s REST JSON-schema gains matching `composedBase`/`composedUpgrade` object properties alongside the `provenance` addition to `inclusionItems`/`legPaymentSummaries` items already specified in the third revision. The existing top-level `tierOccupantId`/`tierPlatformId` non-empty validation needs **no change** — those fields stay populated by design (see above), so no existing item is silently dropped by that gate.

### Commitment rule — unchanged, now consistent
Top-level commitment mirrors `composedBase`'s own (unconditionally, per the third revision's rationale — a Tier Edition is the platform's authoritative commitment source). `composedUpgrade`'s own term is preserved for audit in its own field, never mixed into `composedBase`.

### 6–8. Unchanged from prior revisions, still correct
Hard Request-submission gate, add-on removal via the existing unchanged cascade, and legacy/migration behavior (every new field simply absent on every existing cart/Request) all stand as previously recorded.

### Affected files — additions to the third revision's list
- `resources/ts/components/cost-builder/types.ts` — `ComposedUpgradeBase`, `ComposedUpgradeExtras`, `isComposedUpgrade?`/`composedBase?`/`composedUpgrade?` on `FamilyTierQuoteItem` (replaces the second revision's single `finalisedUpgradeBase`).
- `resources/ts/components/cost-builder/QuoteSummary.tsx`, `resources/ts/components/request-flow/OrderSummary.tsx`, `resources/ts/components/request-flow/QuoteProposalPreview.tsx` — group inclusion rows by `provenance` when `isComposedUpgrade`.
- `src/Modules/Requests/Notifications/NotificationTemplates.php` — `familyDisplayInclusions()`/`emailInclusionItemsList()` (provenance grouping), the `$includeInternalIds` branch (dual base/upgrade `tierRef`).
- `src/Modules/Requests/Support/RequestSchema.php` — `sanitizeComposedBase()`/`sanitizeComposedUpgrade()` (new, replacing the third revision's single `sanitizeFinalisedUpgradeBase()`), plus the same `provenance`/`restArgs()` additions already specified.
- Everything else from the third revision's list is unchanged.

### Proposed focused contracts — supersede the third revision's (15)-(16) with
(15) `composedBase`/`composedUpgrade` never share a field value that should be scoped to one occupant (regression-locks finding 3); (16) the PHP sanitizer round-trips both children byte-for-byte while an un-finalised item's `upgradeDraftBase` is dropped; (17) `restArgs()` accepts a payload containing both children; (18) a DOM-light render check that a composed item's inclusion rows are grouped into two labeled sections rather than one flat list; (19) the admin-only reference line shows both `composedBase.tierPlatformId` and `composedUpgrade.tierPlatformId` for a composed item, and the single legacy `tierRef` line for every other item.

## Work journey
Representation closure → Upgrade semantics/finalisation → implementation/review/deploy/live validation → final customer UI/UX refinement → later standalone Build Your Own journey.