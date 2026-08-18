# Tier Commercial Schedule — Public Projection

## Purpose

A Tier occupant's and each Edition's own `active_billing_cycles`/
`commercial_legs` (storage/resolution: [Tier Commercial
Schedule](tier-commercial-schedule.md)) additionally reach the public Cost
Builder/Package Builder response and the Package Builder focused Choose Plan
view, so a customer can select a leg and see its own price/inclusions —
without a second pricing engine, duplicated inclusions, or Editions becoming
the cycle mechanism. Legs stay invisible to the classic per-Service Cost
Builder path (`PricingBuilder.php::overlayPackage()`); no leg-selection UI
exists there.

## Backend projection

`PackageRepository::projectTierInstanceForCostBuilder()` resolves the
occupant's own `commercial_legs` (from `extractTierForCostBuilder()`, which
now passes the occupant's own legs into `sanitizeTierRateSheetSelections()`
so `leg_assignments` survive that extraction) through
`PackageManagerSchema::projectCommercialLegs()`, then reshapes each leg's own
resolved rows into the same public `{id,label,quantity,bundle_id?,includes?}`
inclusion shape the occupant's own top-level inclusions already use — via two
private helpers (`bundleIdIndexForRateSheet()`,
`publicInclusionsFromSelections()`) factored out of that existing occupant
path, not duplicated. Each Active Edition resolves its own legs the same way,
against ITS OWN `rate_sheet_id`/`rate_sheet_items`/`contact` — independent
of, and possibly a different Rate Sheet than, the occupant's — never the
occupant's selections. A leg's own `start_month`/`end_month` stay bounds
within the DECLARATION's own `minimum_term_value`/`unit`, never a commitment
of their own, so no per-leg commitment field exists.
`PackageFamilyPricingBuilder` explicitly whitelists
`active_billing_cycles`/`commercial_legs` alongside `edition_options` (this
builder does not spread unknown keys — an easy silent-drop trap). Simple Mode
projects `commercial_legs: []`, never omitted or null. Tested end-to-end
(`tests/tier-commercial-schedule-public-projection.php`), including two
independent Rate Sheets (occupant vs. its own Edition) resolving without
crossing.

## Frontend wiring

`PricingTierData`/`PricingEditionOption` (`api/types/cost-builder.ts`) carry
the same two fields plus a new `PricingCommercialLeg`
(`{id,billing_cycle,start_month,end_month,price,inclusions}`).
`resolveEffectiveTierDisplay()` (`PricingTiers.tsx`) takes an additional
`selectedLegId` — scoped to whichever declaration (Default/Edition)
`selectedEditionId` already resolved, never blended across the two; omitted
(the default), every prior caller is unaffected.

`TierCard`'s Edition switch became **optionally controlled**
(`selectedEditionId`/`onEditionChange` props, falling back to its own
internal state when both are omitted) so the Package Builder focused Choose
Plan view — the only caller that passes them — can lift it and keep its own
left-column leg `<select>` in sync with whichever declaration the card itself
is showing. That `<select>` renders only when the resolved declaration's own
`commercialLegs.length > 0`, replacing a prior decorative, hardcoded
`[1, 12, 24]`-month placeholder with real, data-driven options
(`Full schedule` plus one per leg); selecting a leg drives the SAME card's
price/cycle/inclusions live. Every other caller (Cost Builder's `ServiceCard`,
the comparison strip, the staged/selected view) never passes these props and
is completely unchanged — leg selection exists only in this one focused view.

`FamilyTierQuoteItem.commercialLegId` (replacing the prior inert
`planDurationMonths`, which never touched price/cycle/Editions/the quote) is
audit-trail only: price/billingCycle/features already reflect the selected
leg via `effective` at the moment `Add to Quote` fires, the same role
`tierEditionPlatformId` already plays for Editions. A plain local id, never a
Platform ID — commercial legs have none.

## Related Code Maps

[Tier Commercial Schedule](tier-commercial-schedule.md), [Tier
Edition](tier-edition.md), [Cost Builder](cost-builder.md), [Package
Station](package-station.md), and [Rate Sheet](rate-sheet.md).
