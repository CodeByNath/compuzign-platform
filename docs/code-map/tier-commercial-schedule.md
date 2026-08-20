# Tier Commercial Schedule

## Purpose and ownership

The Tier occupant and each Edition may additionally carry
`active_billing_cycles` (a reusable cadence pool, drawn from the same
`PackageSchema::BILLING_CYCLES` vocabulary as the legacy scalar
`billing_cycle`) and `commercial_legs` (each `{id, billing_cycle,
start_month, end_month}` — 1-based inclusive months; `billing_cycle` must
be one of the record's own `active_billing_cycles`; `end_month` bounded by
`minimum_term_value`/`unit` converted to months). Absent/empty on every
record that has never used this capability — **Simple Mode** — whose legacy
`billing_cycle`/`price_option_id` stay fully authoritative, and whose
`rate_sheet_items[]` rows omit `leg_assignments` entirely (not `[]`): the
pre-existing `{item_id, quantity, price_option_id}` shape survives
byte-for-byte (`tests/rate-sheet-bundle.php` and others). Legs are never
inherited between occupant and Edition — each is independent, the same
rule already applied to price/billing_cycle/commitment. See
[Tier Edition](tier-edition.md) for that relationship.

## Inclusion assignment

An inclusion attaches to one or more legs via `leg_assignments` on its own
`TierRateSheetSelection` row (`{leg_id, price_option_id}` pairs) — one
inclusion identity, never duplicated — resolved through
`PackageSchema::sanitizeTierRateSheetSelections()`'s optional `$legs`
parameter; an unresolved `leg_id`/`price_option_id` is dropped, never
fabricated. Two assignments on one inclusion naming the same
`billing_cycle` with overlapping months are a double-charge shape and the
later one is dropped; different cycles overlapping (e.g. a one-time setup
fee alongside a monthly service) is normal. Legs are re-validated against
commitment on every read/write — shortening it silently drops whatever no
longer fits, no separate cascade. Legs carry plain local ids
(`PackageSchema::mintCommercialLegId()`, `leg_` + random) — no Platform ID
family, the same posture an inclusion row or a Price Option's `option_id`
already uses.

## Storage and settle (Phase 0)

`commercial_schedule` is a fourth `TIER_MODULES` entry for the occupant
(own draft/settle; `active_billing_cycles` stays part of `overview`'s
draft); an Edition carries both in its one consolidated `overview` module.
`PackageSchema::draftPreferredCommercialLegs()` and
`sanitizeCommercialLegsForSlot()` let Features and Commercial Schedule be
authored/saved in either order. See `tests/tier-commercial-schedule.php`.

## Price resolution (Phase 1)

`PackageManagerSchema::projectCommercialLegs($readModel, $legs,
$selections, $rateSheetId, $contact)` resolves each leg to its own
aggregate price: a synthetic `{item_id, quantity, price_option_id}` row is
built per inclusion whose own `leg_assignments` name that leg (using THAT
assignment's `price_option_id`, never the selection's top-level one), then
handed to `projectTierRateSheetWith()` **unchanged** — the same authority
`projectEditionPrices()` shares, once per leg instead of once per Edition.
No new pricing calculation; an unassigned leg still appears, priced null.
`$legs` empty (Simple Mode) returns `[]`. Tested directly
(`tests/tier-commercial-legs-projection.php`) but not yet wired into
`extractTierForCostBuilder()`/`projectTierInstanceForCostBuilder()` —
public/Cost-Builder projection is a later phase.

## Admin authoring (Phase 2)

Active Billing Cycles is a `MultiSelectField` in Tier Overview
(`TierOverviewEditor.tsx`) and Edition's Overview tab
(`TierEditionOverviewFields.tsx`), beside Minimum commitment. Commercial
Schedule is a fourth module/shell for the occupant
(`tierCommercialScheduleShell`, in `TIER_ENTITY.shells`/
`placements.drawer.details`, through the SAME `PlacedShell` machinery
Overview/Features use) and a third `DrawerGroupTabs` tab over the SAME
session for an Edition (`TierEditionEditor.tsx`), both authored through one
shared `CommercialScheduleEditor.tsx`. `tierCommercialScheduleModule`
(`moduleNotifications/tier.ts`) never reports `isEmpty` — Simple Mode (most
Tiers) must read as a calm, complete Active module, never an
action-needed badge for optional capacity nothing requires.

Included Features (`PoolInclusionsEditor.tsx`) is the assignment surface:
its rate-sheet-mode row renders today's single Price Option select only in
Simple Mode; with one or more legs, each row instead renders a checkbox +
Price Option select per leg — an inclusion need not join every leg (e.g. a
hosting fee applying only once an upfront leg ends). Shared by both the
occupant's and every Edition's inclusion editor alike.

Every save uses the existing generic per-module Tier endpoint
(`.../tiers/{tierId}/modules/{module}`) and the existing Edition module
endpoint — no new route, and Edition needed no new module key, only new
fields on its one draft. See `scripts/tier-commercial-schedule-contract.ts`
for the full wiring contract.

## Related Code Maps

[Tier Edition](tier-edition.md), [Rate Sheet](rate-sheet.md), and
[Platform Identifier Station](platform-identifier-station.md).
