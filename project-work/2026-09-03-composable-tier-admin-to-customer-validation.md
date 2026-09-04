# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — second revision adds provenance-preserving structure and corrects the add-on removal error; no source changed.**
- Auditor verdict: **Stop — architectural risk** (on the *prior* plan; revision below addresses each finding).
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; Hostinger run `33835470825` succeeded on that SHA.

## Locked journey
**Upgrade your build** and standalone **Build Your Own** are different journeys.

Upgrade starts from an exact selected normal Tier/Edition, allows only Admin-authorised composable inclusions/quantities, remains tied to that exact base while in progress, requires explicit **Finalise build**, and only then becomes the final Build Your Own quote result. Standalone Build Your Own remains deferred and must not simply load beside normal Tier cards.

## Auditor review of Claude revision
The revision correctly fixes the first plan's fatal omission by recognising that the composable preview contains only upgrade pricing/inclusions, not the base plan.

However, flattening `primary.inclusionItems + composable.inclusionItems` and `primary.legPaymentSummaries + composable.legPaymentSummaries` into today's single `FamilyTierQuoteItem` is still not safe enough:

1. **Identity/provenance is lost.** The resulting line still has one `tierPlatformId`, one `tierEditionPlatformId`, one `tierOccupantId`, one `tierTitle`, etc., but its commercial facts now come from two different occupants. Existing fields no longer truthfully identify the snapshot they describe.
2. **Headline/commitment semantics are unresolved.** `price`, `billingCycle`, `minimumTermValue`, `minimumTermUnit`, and `planDurationMonths` are singular fields. The plan did not define which source owns them after composition or how conflicting base/upgrade terms are represented.
3. **Inclusion collision is unresolved.** The same inclusion may legitimately exist in the base and upgrade selections. Blind concatenation can create duplicate `item_id` rows with no preserved source/role explaining whether they are additive, separate commercial streams, or presentation duplicates.
4. **Add-on handling contradicts current architecture.** Current source explicitly states Tier add-ons only make sense paired with a primary and `removeFamilyTierSystemQuoteItems()` removes them with the primary. Preserving add-ons after deleting the primary would create the orphan state the existing cart deliberately prevents.
5. Request/PDF/email generic rendering is only safe if the final stored shape has unambiguous meaning; "one existing FamilyTierQuoteItem with mixed provenance" has not met that bar.

The proposed hard gate on Request submission while a draft exists is accepted directionally.

## Claude next instruction — audit/plan only
Revise again before source editing. Prefer a **bounded quote-only composed snapshot structure** rather than forcing two resolved occupants into today's singular Tier fields. It may still render as one Build Your Own cart line, but must preserve base-vs-upgrade provenance internally.

Define exactly:
- final snapshot structure and identities;
- ownership of headline, commitment, duration, inclusions and payment streams;
- duplicate-inclusion semantics;
- add-on rule consistent with existing architecture (either absorb with explicit provenance or remove/reject — never orphan);
- Request/PDF/email persistence/rendering exactly once;
- finalisation/removal/replacement/legacy behavior;
- hard Request gate for un-finalised drafts;
- exact files/contracts and non-change boundaries.

No source changes. Record the revised plan here and set **AWAITING CHATGPT REVIEW**.

## Claude second revision — provenance-preserving composed snapshot

All 5 findings confirmed against source (not reasoned about in the abstract) before revising:

- Point 4 confirmed exactly as stated: `removeFamilyTierSystemQuoteItems()`'s own docblock reads "Removes the primary Tier **and every Add-on** for this Family+Instance" and calls it "the existing Add-on-orphan cascade this function already performs." My prior Q4 answer ("add-ons preserved separately, untouched") was flatly wrong — it called this exact function while claiming its own documented add-on removal wouldn't happen. Corrected below.
- Points 1-3, 5 accepted as stated: flat concatenation into today's singular fields cannot truthfully carry two occupants' provenance, and duplicate `item_id`s across base/upgrade are a real, legitimate case (e.g. a base plan already includes some quantity of an item the customer then buys *more* of through the composable browser) that blind concatenation cannot distinguish from an accidental duplicate.

### Revised final snapshot structure
New additive type, nested inside the composed `FamilyTierQuoteItem` rather than flattening two occupants into one set of singular fields:

```ts
export interface FinalisedUpgradeBase {
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
```

On `FamilyTierQuoteItem` (additive, optional): `finalisedUpgradeBase?: FinalisedUpgradeBase` — present only on a finalised composed result, an exact untouched copy of the base Tier/Edition's own resolved snapshot at the moment of finalisation. This is the base's full provenance, preserved, never merged away — resolves finding 1.

Each entry in `ServiceInclusion`/`LegPaymentSummary` gains one new optional field: `provenance?: 'base' | 'upgrade'`. Every existing entry everywhere else in the app simply omits it (harmless, backward compatible). On a finalised item, the top-level `inclusionItems`/`legPaymentSummaries` are still the union of both sources — but now every entry is tagged with which occupant it came from. **Rule, stated explicitly (resolves finding 3):** the same `item_id` appearing with different `provenance` is never deduplicated — it represents two genuinely separate commercial facts (e.g. the base plan's own included quantity, plus an additional quantity the customer separately bought through the upgrade), never a rendering duplicate to merge.

### Ownership of singular fields (resolves finding 2, stated explicitly rather than left implicit)
The composed item's own top-level identity stays the **composable occupant's own identity** — `tierId: COMPOSABLE_QUOTE_TIER_ID`, `tierTitle: 'Build Your Own'`, `tierPlatformId`/`tierOccupantId`/`tierEditionPlatformId` from the composable offer — exactly like today's standalone composable item, so nothing at the top level claims to identify anything it doesn't: it truthfully identifies "the composable occupant that mediated this quote," and the base's own distinct, equally truthful identity lives in `finalisedUpgradeBase`, never merged into one ambiguous scalar.
- `price`/`billingCycle` (top-level, decorative headline for generic renderers): the **base's** own headline — matches what a customer means by "the price of my plan"; the real combined total is always `legPaymentSummaries`-derived (already established as safe — see prior revision's verified `computeTotalContractValue`/`startingPaymentsByCycle` behavior), so this flat pair is a display fallback only, same status quo as every other item today.
- `planDurationMonths` (top-level): the **base's** value, unambiguous by construction — `buildComposableFamilyTierQuoteItem()` always sets this to `null` for a standalone composable item, so there is no competing upgrade-side value to conflict with, ever.
- `minimumTermValue`/`minimumTermUnit` (top-level): the **base's** own commitment values by default, with the composable offer's own values (`offer.minimum_term_value`/`minimum_term_unit`, which *can* be independently populated, per `buildComposableFamilyTierQuoteItem()`) preserved for reference under a new `upgradeMinimumTermValue`/`upgradeMinimumTermUnit` pair on `FinalisedUpgradeBase`'s sibling (or inline on the top-level item) purely for transparency.
  **Open product question, flagged rather than silently resolved (the same mistake pattern the auditor caught twice already):** if the composable offer's own commitment is *longer* than the base's, should the combined commitment be the longer of the two? This needs Nath/product sign-off, not a unilateral pick — the plan defaults to "base governs" only because it is the simplest, most defensible starting position, not because the alternative was considered and rejected.

### Add-on rule (resolves finding 4) — remove, not absorb
Finalisation reuses `removeFamilyTierSystemQuoteItems()` **unchanged**, which already removes both the primary and every Add-on for that Family+Instance in one documented, existing cascade. Absorbing add-ons into the composed snapshot would reintroduce exactly the same "one line can't truthfully carry N occupants' provenance" problem this whole revision is fixing, this time for a third source. Removing them is consistent with existing architecture (an Add-on is already documented as only making sense paired with a primary; the primary is going away) and requires no new code path — the same cascade the app already runs every time a primary changes today.
**UX flag (not an architecture question):** the customer will lose any selected Tier add-ons when they finalise an Upgrade build. Recommend the "Finalise build" action surface this plainly (e.g. "Finalising will remove any add-ons — add equivalent items through your upgrade selection if needed") rather than silently dropping them; leaving the exact copy/confirmation-step design to the implementation/UI phase.

### Request/PDF/email — exactly once, unambiguous (resolves finding 5)
No backend change. `finalisedUpgradeBase` is a new field the existing `RequestSchema.php` allow-list simply never copies (dropped automatically, like every other unlisted field) — it never reaches persistence, by construction, same guarantee as the first revision's `upgradeDraftBase`. The top-level `inclusionItems`/`legPaymentSummaries`/`price`/`billingCycle` remain well-defined, single-item, generically renderable fields with the explicit ownership rules above — every existing PDF/email/admin renderer keeps working unchanged, rendering the composed result exactly once (one item, its own arrays), with defined (not accidental) meaning even without reading the new `provenance` tag or `finalisedUpgradeBase` at all. A future upgrade-aware renderer could optionally read `finalisedUpgradeBase`/`provenance` for a richer "Base plan / Upgrades" breakdown — explicitly out of scope for this phase.

### Finalisation, removal/replacement, legacy — unchanged from prior revision, still correct
`composableDraftIsStale()`, the `replaceFamilyNormalQuoteItem()`/`removeFamilyTierSystemQuoteItems()` staleness-pruning, and `hasUnfinalisedUpgradeDraft()` (accepted directionally by the auditor) all stand as previously recorded. `finaliseUpgradeQuoteDraft()` is revised to: (1) no-op if the draft is absent/stale; (2) otherwise build `finalisedUpgradeBase` from the current primary's exact resolved fields, tag both sources' `inclusionItems`/`legPaymentSummaries` with `provenance` before concatenating them onto the composable item, set the ownership fields per the rules above, then call the existing (unchanged) `removeFamilyTierSystemQuoteItems()` to drop the primary and any add-ons, and clear `upgradeDraftBase`. Legacy/existing carts and Requests omit every new field (`upgradeDraftBase`, `finalisedUpgradeBase`, `provenance`) and are completely unaffected — no migration in either direction.

### Affected files — unchanged list from prior revision, plus:
- `resources/ts/components/cost-builder/types.ts` — also add `FinalisedUpgradeBase`, `finalisedUpgradeBase?`, and `provenance?` on `ServiceInclusion`/`LegPaymentSummary`.
- `resources/ts/components/package-builder/ComposableOfferBrowser.tsx` — the "Finalise build" action's confirmation copy should mention add-on removal per the UX flag above.
- No other file added to the previously recorded list; no backend/PHP file touched.

### Proposed focused contracts — extends prior revision's list with
(10) a finalised item's `finalisedUpgradeBase` is byte-identical to the primary's pre-finalisation resolved fields; (11) every concatenated `inclusionItems`/`legPaymentSummaries` entry carries the correct `provenance`; (12) a same-`item_id` pair with different `provenance` is preserved as two distinct rows, never deduplicated; (13) finalisation removes any Add-on lines for that Family+Instance (regression-locks the corrected Q4 answer); (14) legacy items (no new fields present) are untouched by every new predicate/mutation.

## Work journey
Representation closure → Upgrade semantics/finalisation → implementation/review/deploy/live validation → final customer UI/UX refinement → later standalone Build Your Own journey.