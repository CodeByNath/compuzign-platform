# Package Builder Focused Shell

## Purpose and ownership

Choosing a Tier/Edition in `PackageBuilderApp`/`FamilyTierAdapter.tsx` opens a
focused single-Tier view: the SAME `TierCard` the comparison strip renders
(`hideOverview`), beside a left column presenting that variant's own
resolved Commercial Leg timeline. This replaced an earlier flat
1/12/24-month duration picker; the left column is now driven entirely by
`commercial_legs` (see [Commercial Legs](commercial-legs.md)), never a
second pricing calculation. `planDurationMonths` on the quote item remains a
reserved, currently-unpopulated field — every existing call site passes
`null`; nothing today writes a Commercial-Legs-derived value into it.

## Periods timeline ("How this plan is charged")

Renders every resolved Period for the active Default/Edition variant, each
with its own AVAILABLE components (`availablePeriodComponents()` —
`commercialLegPresentation.ts`, shared with `PlanDetailsModal.tsx`). A
Period explains which Legs are active TOGETHER; the same Leg (identified
by stable `component.source`) reappearing in a later Period because a
DIFFERENT Leg started/stopped is one continuous payment stream, never
counted as restarting. Each payment card shows its own inclusion count
(`component.items.length`, unfiltered, never deduped across Legs).

Hovering/keyboard-focusing a payment card is Leg-aware inspection only (no
click/tap pinning): the Headline Leg (or idle) leaves the main inclusion
list full; a non-Headline Leg with a rendered Extension group dims the
whole main list (its own claim is shown in the Extension group, not
duplicated in the main list); a non-Headline Leg with no Extension group
keeps only its own claimed items full.

## Extensions presentation

The main "What's included" list stays the complete Headline-Leg-relative
Tier/Edition declaration. An Extension group is customer PRESENTATION only
— never a new backend entity — shown for a non-Headline Leg only when it
overlaps the Headline Leg in some resolved Period; its items are the exact-
`item_id` differences from the Headline Leg's own claim (present on the
Other Leg but not Headline, or same item at a different quantity). An
identical item+quantity is already explained by the main list and is never
repeated as an Extension. Groups stay separate by `component.source` —
same-cycle Legs are never merged into one group.

## Family-switch state boundary

The Package Family selector (`PackageBuilderApp.tsx`) is a SIBLING of
`FamilyTierAdapter`, outside every one of its render branches — switching
Family only ever changes the `family` prop. Because `TierId` is a shared
enum across every Family (not Family-scoped) and `visibleTiers`' own
`audience_groups` fallback lets a same-id Tier from the new Family still
pass the filter, a stale focused Tier id would otherwise keep resolving
non-null under the new Family. A `useEffect` keyed on `family.family_id`
inside `FamilyTierAdapter.tsx` clears the focused Tier, focused Edition,
selected Period override, hovered Leg, and Plan Details target — returning
to that Family's own normal Tier-card view instead of silently reopening
the new Family's data at the same focused level.

## Known limitation

Weekly/Daily `billing_cycle` values are selectable in the admin Pricing
Rules editors and do reach `commercial_legs`, but the customer-facing
cadence-word/suffix maps in `PricingTiers.tsx`,
`commercialLegPresentation.ts`, and `PlanDetailsModal.tsx` have no entries
for them — they fall back to a neutral label/no suffix rather than
formatting correctly. `periodPriceOverride()` remains behaviorally broader
than its name suggests (also supplies a Period's inclusion list, not only
price).

## Authoritative files

| Area | Files |
|---|---|
| Focused shell | `FamilyTierAdapter.tsx`, `commercialLegPresentation.ts` |
| Card/hover rendering | `PricingTiers.tsx` (`TierCard`, `relatedInclusionIds`) |
| Extension groups | `commercialLegExtensionGroups()`, `commercialLegInclusionGroups()` (`FamilyTierAdapter.tsx`) |
| Family switch | `PackageBuilderApp.tsx` |
| Tests | `package-builder-regression-lock-contract.ts`, `commercial-leg-inclusion-groups-contract.ts`, `commercial-leg-extension-groups-contract.ts`, `package-builder-customer-tabs-contract.ts` |

## Related Code Maps

[Commercial Legs](commercial-legs.md), [Cost Builder](cost-builder.md),
[Tier Edition](tier-edition.md), and [Plan Details](plan-details.md).
