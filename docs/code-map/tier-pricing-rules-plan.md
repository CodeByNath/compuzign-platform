# Tier Pricing Rules — Implementation Plan (not yet implemented)

**Status:** Planning only. Nothing in this document has been implemented yet.
This is not a current-state Code Map entry — do not treat it as describing
existing behaviour. Once implemented, the relevant sections of
[Tiers](tiers.md), [Tier Edition](tier-edition.md), and
[Tier Commercial Schedule](tier-commercial-schedule.md) must be updated to
reflect the real result, and this file should be reconciled or retired at
that point.

Source of truth for the target shape: the user-authored mental model
(`TierOccupantPlan.md`, attached to this conversation, not to be edited) plus
clarifications given directly by the user during planning. Where this
document and that source model conflict, the source model wins — this file
exists to record the audit findings and the technical decisions needed to
implement it, not to reinterpret it.

## Audit findings (confirmed against source, not docs)

- Occupant and Edition already support independent `rate_sheet_id`,
  `rate_sheet_items`, `billing_cycle`, `minimum_term_value`/`unit`,
  `active_billing_cycles`, `commercial_legs` (`PackageSchema.php`,
  `PackageManagerSchema.php`).
- **Real bug found and must be fixed as part of this work**: the module-save
  route `.../tiers/{tier}/modules/(?P<module>[a-z]+)` in
  `PackageStationController.php` cannot match `commercial_schedule` —
  `[a-z]+` excludes `_` (verified with `preg_match`, returns `0`). The
  Commercial Schedule module's save endpoint has never been reachable over
  real HTTP routing, only through direct PHP test calls that bypass
  `register_rest_route`'s regex.
- Tier Edition's Overview/Inclusions/Commercial-Schedule are already three
  tabs over **one consolidated draft** (`TierEditionEditor.tsx`), so
  restructuring Edition into the three finalized cards is a pure
  presentation/field-regrouping change — no backend module change needed.
- The Tier occupant has **four independent `TIER_MODULES`**
  (`overview`, `features`, `faqs`, `commercial_schedule`), each with its own
  draft/settle/save. To get one "Tier Pricing Rules" card with one Edit/Save,
  `rate_sheet_id`, `minimum_term_value`, `minimum_term_unit` move out of the
  `overview` draft into the `commercial_schedule` draft (internal module key
  and shell variable names stay `commercial_schedule`/`tierCommercialScheduleShell`
  — only the visible card title and its fields change).
- Confirmed via `PackageManagerSchema::projectTierRateSheetWith()` /
  `projectCommercialLegs()` / `PackageRepository::publicCommercialLegs()` /
  `publicInclusionsFromSelections()`: quantity already flows generically as
  `$row['quantity']`, so per-leg quantity is a contained sanitizer +
  one-projector-line + UI change, not a pricing-engine change.
- Confirmed via `RequestSchema.php` and the Tier Commercial Schedule Public
  Projection doc: cart/request only ever carries a resolved price plus a
  plain `commercialLegId` (audit-trail only). **No cart/request changes.**
- Confirmed the standalone legacy `billing_cycle` scalar can be removed from
  every editing surface without breaking anything: both
  `PricingBuilder.php::overlayPackage()` (line 333,
  `if (!empty($pkgTier['billing_cycle']))`) and
  `PricingTiers.tsx::resolveEffectiveTierDisplay()` (line 68,
  `data?.billing_cycle || billingCycle`) already fall back to the
  Service-level default cadence when a Tier's own value is empty. Existing
  stored values are untouched; only the editing control is removed.

## Finalized target shape (locked, do not reinterpret)

Same structure, same literal card names, applied identically to the Default
Tier occupant and to each Tier Edition.

**Tier Overview** — Display Label, Price (read-only), Customer Groups, Ideal
For, Mark as Contact Us, Make this Tier an add-on, Mark as popular tier.

**Tier Pricing Rules** — Rate Sheet dropdown; `Tier Commitment [Yes]/[No]`
(rest hidden by default). When Yes: Commitment unit, Minimum commitment,
`Commercial Legs [Yes]/[No]`. When Commercial Legs is Yes: a repeater —
`Payment Category | Billing Cycle | Duration (From–To)` per leg; `+` adds the
next leg, auto-initialised to start at `max(existing end months) + 1` through
the commitment (never restarting at month 1).

**Tier Inclusion** — existing Rate Sheet inclusion selector, unchanged when no
legs are declared. Once legs exist, each inclusion gets its own
leg-assignment add-row list: `Leg [dropdown of this Tier's declared legs,
excluding legs already used by this inclusion] | Price [dropdown] | Qty`,
with its own add/remove — not an always-render-every-leg checkbox block.
This is what preserves the existing capability for one inclusion to
participate in only some legs (e.g. a hosting fee that only starts once an
upfront leg ends).

## Vocabulary (confirmed by the user, not inferred)

- **Payment Category**: `one-time`, `recurring`.
- **Leg Billing Cycle** (its own constant, separate from the legacy
  `billing_cycle` scalar's vocabulary): `upfront`, `monthly`, `yearly`.
  Designed to extend later (every 2 years, weekly, daily, every 24 days) by
  adding entries to a plain array — not built as an interval/unit model now.
- The legacy `PackageSchema::BILLING_CYCLES` (`monthly`/`annually`/`one-time`)
  is untouched and stays reserved for the retired top-level scalar's stored
  values only.
- `active_billing_cycles`: stop authoring it (remove both multiselects) and
  stop using it to gate leg validation (legs now validate directly against
  the new leg-cycle vocabulary). Keep the stored field/sanitizer for
  read/back-compat only — nothing destroyed.

## Duration / "Indefinite" rule (confirmed)

- Minimum Commitment **set** → every leg needs a bounded `start–end`, capped
  at the commitment (today's rule, unchanged). `+` continues from
  `max(existing end months) + 1`.
- Minimum Commitment **blank** → `end_month` may be omitted ("Indefinite");
  no upper-bound check applies. This reuses the existing
  `sanitizeCommercialLegs()` behaviour where a `null` `$commitmentMonths`
  already skips the upper-bound check — the change is making `end_month`
  itself nullable rather than always requiring a number.

## New explicit state (per the task's own requirement — not inferred from null/empty)

- `commitment_enabled: bool`, `commercial_legs_enabled: bool` — independently
  on the occupant and on each Edition. Persisted explicitly, default `false`,
  preserved verbatim across unrelated saves (same convention as
  `is_explicitly_disabled`).
- Toggling Yes→No just hides the fields; the *existing* documented
  reconciliation ("shortening commitment silently drops legs that no longer
  fit, no separate cascade") handles cleanup on save. No new confirm dialog —
  that was an earlier overreach, corrected.
- Server-side normalization for defense-in-depth: `commitment_enabled=false`
  forces `commercial_legs_enabled=false` and `commercial_legs=[]` on settle,
  regardless of what was submitted.

## Per-leg quantity

- `LegAssignment` gains `quantity` (sanitized `max(1, …)`, same rule as the
  existing top-level `quantity`).
- `PackageManagerSchema::projectCommercialLegs()` prefers the assignment's
  own `quantity` over the selection's top-level one when resolving a leg's
  price.

## Backend changes

**`PackageSchema.php`**
- New constants: `PAYMENT_CATEGORIES = ['one-time', 'recurring']`,
  `COMMERCIAL_LEG_BILLING_CYCLES = ['upfront', 'monthly', 'yearly']`.
- `sanitizeCommercialLegs()`: drop the `$activeCycles` gating param; validate
  `billing_cycle` against `COMMERCIAL_LEG_BILLING_CYCLES`; validate
  `payment_category` against `PAYMENT_CATEGORIES` (leg dropped if invalid,
  same defensive posture as the rest of the function); `end_month` becomes
  nullable per the Indefinite rule above.
- `sanitizeLegAssignments()`: add `quantity` (`max(1, …)`).
- `upsertOccupant()`, `normaliseTierSlot()`, `emptyTierDetail()`,
  `sanitizeTierEdition()`: add `commitment_enabled`/`commercial_legs_enabled`
  plus the normalization rule above.
- `settleTierSlot()`, `draftPreferredActiveCyclesAndCommitment()`,
  `draftPreferredCommercialLegs()`, `sanitizeCommercialLegsForSlot()`: move
  `rate_sheet_id`/`minimum_term_value`/`minimum_term_unit` reads from the
  `overview` draft to the `commercial_schedule` draft; add the two new
  booleans to the same draft-preferred merge. `billing_cycle`'s line is
  untouched — since no draft will carry that key anymore, it already
  degrades to "always preserve existing".

**`PackageManagerSchema.php`**: `projectCommercialLegs()` — per-assignment
quantity preference; include `payment_category` in the returned leg array;
handle nullable `end_month`.

**`PackageRepository.php`**: `publicCommercialLegs()` — add
`payment_category` to the public leg shape; nullable `end_month` passthrough.

**`PackageStationController.php`**: fix the module route regex
`[a-z]+` → `[a-z_]+`; add `commercial_schedule` to the revert route's allowed
module list (`overview|features|faqs` → `overview|features|faqs|commercial_schedule`).

## Frontend changes — Tier occupant

- **`types.ts`**: `TierOverviewDraft` loses `rate_sheet_id`, `billing_cycle`,
  `minimum_term_value`, `minimum_term_unit`, `active_billing_cycles`.
  `TierCommercialScheduleDraft` gains `rate_sheet_id`, `minimum_term_value`,
  `minimum_term_unit`, `commitment_enabled`, `commercial_legs_enabled`.
  `CommercialLeg` gains `payment_category`; `end_month` becomes
  `number | null`. `LegAssignment` gains `quantity`. `SurfaceTierDetail`
  gains the two new booleans.
- **`usePackageStation.ts`**: `draftPreferredDetail()` field-source swap as
  above; rename `saveTierCommercialSchedule` → `saveTierPricingRules` with
  the expanded payload; `saveTierOverview` payload shrinks to match.
- **`useTierModuleEditing.ts`**: draft seeding/saving updated to match the
  new field ownership.
- **`TierOverviewEditor.tsx`**: remove Rate Sheet, Billing Cycle, Minimum
  commitment/unit, Active Billing Cycles controls.
- **New `TierPricingRulesEditor.tsx`** (`drawer/editors/`): Rate Sheet
  dropdown (same confirm-on-switch behaviour as today) → Tier Commitment
  Yes/No → conditional commitment fields + Commercial Legs Yes/No →
  conditional leg repeater (composes the rewritten `CommercialScheduleEditor`).
- **`CommercialScheduleEditor.tsx`** rewrite (stays shared by occupant and
  Edition): Payment Category select + Billing Cycle select (new vocab) +
  Duration, with "To" offering Indefinite only when no commitment value is
  set. `addLeg()` fixed to continue from `max(existing end months) + 1`.
- **`PoolInclusionsEditor.tsx`**: replace the always-render-every-leg
  checkbox block with the add-row leg-assignment list described above
  (Leg select filtered to legs this inclusion hasn't used yet + Price select
  + Qty + remove, plus an "add assignment" control).
- **`rateSheetLabels.ts`**: label maps for the new Payment Category and leg
  Billing Cycle vocabularies.
- **`bindings/tier.tsx`**: `tierOverviewShell.content` trimmed to match;
  `tierCommercialScheduleShell` (internal name unchanged) retitled "Tier
  Pricing Rules" with new content rows (Rate Sheet name, Commitment,
  Commercial Legs, per-leg summary) and `editor.render` swapped to
  `TierPricingRulesEditor`.

## Frontend changes — Tier Edition (no backend module change needed)

- Same field regrouping across Edition's existing three tabs over its one
  consolidated draft: rename the `commercial-schedule` tab id to
  `pricing-rules`, reorder to Overview → Pricing Rules → Inclusions. Same
  literal card names as the occupant ("Tier Overview" / "Tier Pricing Rules"
  / "Tier Inclusion") — not "Edition Overview" etc.; an earlier draft of this
  plan invented that prefix and was corrected.
- `TierEditionOverviewFields.tsx`: split into
  `TierEditionOverviewSection` (title/description/contact/price-ro only) and
  a new `TierEditionPricingRulesSection` (Rate Sheet, moved out of
  Inclusions, + Commitment/Legs fields, same shared `CommercialScheduleEditor`).
  `TierEditionInclusionsSection` drops its Rate Sheet dropdown.
- `bindings/tierEdition.tsx`: add `tierEditionPricingRulesShell`;
  `entities/tierEdition.ts`: register it in `shells`/`placements`.
- `TierEditionDeclarationSwitcher.tsx`: extend `openPanel` and add the third
  `PlacedShell` + `togglePanel`/`openEdit('pricing-rules')` wiring, mirroring
  the existing overview/inclusions pair exactly.
- `tierEditionModel.ts` (`draftFromTierEdition`) and `tierEditionDetailModel.ts`
  (`buildTierEditionDetail`): add the two new booleans and the new binding.
- Backend `sanitizeTierEdition()` already covered above.

## Cross-cutting / public projection

- `cost-builder.ts`: `PricingCommercialLeg` gains `payment_category`;
  `end_month` becomes nullable.
- `PackageFamilyPricingBuilder.php`: no change — it whitelists
  `commercial_legs` as a whole array (no per-field stripping), so the new
  fields ride through automatically.
- No changes to `RequestSchema.php`, cart, Quote, or the classic per-Service
  `PricingBuilder.php::overlayPackage()` leg path (legs are already
  documented as invisible there).

## Tests / contracts to update or add (once implementation starts)

Files with exact-shape leg/assignment array equality that will need a
mechanical update (new keys break `===` comparisons): `tests/tier-commercial-schedule.php`,
`tests/tier-commercial-legs-projection.php`,
`tests/tier-commercial-schedule-public-projection.php`,
`tests/rate-sheet-bundle.php`, `tests/tier-addon-end-to-end.php`,
`tests/tier-edition-schema.php`, `tests/tier-occupant-compatibility.php`,
`tests/tier-occupant-is-addon.php`, `tests/tier-rate-sheet-price-option.php`,
`scripts/tier-commercial-schedule-contract.ts`.

`tests/tier-commercial-schedule.php` has one assertion whose *behaviour* is
intentionally changing (a leg naming a cycle outside the record's
`active_billing_cycles` pool is dropped) — becomes "outside the fixed leg
vocabulary" instead; must update the assertion to match, not just the shape.

New/extended coverage needed: explicit `commitment_enabled`/`commercial_legs_enabled`
persistence + defaults + back-compat; Payment Category validation; the new
leg vocabulary; Indefinite duration (`end_month` nullable only when no
commitment); remaining-duration leg continuation math (`addLeg()` is a
frontend pure computation — extract it so it's covered by a TS-level
contract, not just eyeballed); per-leg Price Option + Qty round-trip through
existing Rate Sheet pricing; Edition legs independent of the occupant's; Rate
Sheet switch still clears selections; simple Tier/Edition unaffected.

Full validation pass at the end: the PHP/`npm run contract:*` lists in
`SurfacePackages/CLAUDE.md` and `package-station/CLAUDE.md` (Tier/Edition/
Rate-Sheet/Cost-Builder relevant subset), plus `npx tsc --noEmit`,
`npm run build`, `npm run docs:check`, `git diff --check`.

## Non-changes (verified during audit)

Rate Sheet row identity / CZPRCI / CZPRCIO, Bundle architecture, CZT/CZTA/CZTE
identity, Tier System assignment, Package Family assignment, cart, Request
Flow, Cost Builder/Package Builder architecture beyond the additive fields
above, Service Station, Service Inclusion lifecycle. Pricing authority stays
exactly as-is: commercial legs remain orchestration over
`projectTierRateSheetWith()`, never a second price engine.
