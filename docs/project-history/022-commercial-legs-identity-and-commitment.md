# Commercial Legs — Identity, Resolver Correction, and Commitment Cap

## Date

2026-08-23

## Scope

This milestone completed the Commercial Legs model for Tier occupants and
Tier Editions: stable Leg identity (`CZTL`/`CZTEL`) surfaced through
resolved output and Cost Builder projection, a corrected no-suppression
resolver rule, a corrected finite-commitment boundary, an authoring-time
commitment cap (backend and frontend), and extension of the existing
Platform Identifier migration/repair flow to cover Legs. It did not
change Rate Sheet pricing, source/supply identity, Tier/Edition
lifecycle, or the resolver's segmentation logic.

An earlier, unrelated Commercial Legs design (`commercial_legs_enabled`,
mandatory-leg authoring UI, a dedicated batch migration popup, positional
`leg_id`/`leg_index` addressing) was built and fully reverted on
2026-08-21 before any of this milestone's work began; nothing from that
design survives in the current implementation, and none of it is
reflected in current documentation.

## Goal

Give every Tier occupant and Tier Edition a stable, independently
identified commercial Leg model — a born-with Default Leg plus zero or
more Additional Legs, each an independent time-scoped commercial
component over the same Rate Sheet — replacing positional Leg addressing,
correcting a resolver rule that let one Leg's claim silently suppress
Default's own contribution to the same inclusion, and correcting a
commitment-boundary bug that derived the parent's commercial cap from a
Leg's own `from_month` instead of the commitment value itself.

## What Changed

**Stable identity** (`708e0efb`, `22004f4a`, `e357d454`, `77fae4be`):
every Leg carries its own stable `id` independent of `sort_order`; `CZTL`/
`CZTEL` became real Platform ID entity types; inclusion
`leg_assignments[]` addresses a Leg by `leg_platform_id`, never positional
`leg_index`.

**Resolver** (`0be46bab`, `527d73a7`, `293a564b`): `PackageManagerSchema::
resolveLeg()` assembles one canonical resolved Leg object;
`resolveCommercialLegTimeline()` segments Default + Additional Legs into
periods and prices each active Leg's own bucket independently; the result
was exposed publicly as an additive `commercial_legs` field alongside the
existing flat `price`.

**No cross-Leg suppression** (`dc150a4e`): the bucketing rule that dropped
an inclusion from Default's own component whenever any active Leg also
claimed it was removed. Two active identities carrying the same inclusion
is never a collision; each resolves its own independent component, and
Default's bucket is now unconditional whenever Default is active.

**Default Leg identity surfaced** (`113be1d7`, `f4952a50`): the resolver's
emitted Default component now carries the occupant's/Edition's real
`default_leg_platform_id`, never the literal string `'default'`, once one
exists — falling back to `'default'` only for legacy data. A second,
separate gap meant the Tier occupant's own Cost Builder extraction path
(`extractTierForCostBuilder()`) silently dropped `default_leg_platform_id`
from the container it fed the resolver — the Tier Edition path never went
through this whitelist and was unaffected — closed by adding the one
missing field.

**Debug tool** (`a9c19c8b`, `4928f2e6`): Package Settings → Maintenance →
Commercial Legs Debug reuses the real customer projection path
(`findAllActiveFamiliesForCostBuilder()`), no separate calculation. A
redundant, always-`undefined` "own range" line on each component was
removed — the enclosing Period header already states the effective
resolved window; the resolver does not emit a per-component range at all.

**Commitment is the parent's own cap** (`ad2b4af9`, `98e89bf7`,
`e279dca3`): a finite commitment defines the maximum legal `to_month` for
every Leg. The first cap validator (`checkFiniteCommitmentLegCap()`) and
the resolver's own `clampCommercialLegTimelineToCommitment()` both
originally derived the boundary as `container['from_month'] + value - 1`
— but that field is structurally the Default Leg's own start, not a
parent-only anchor, so a Default Leg starting anywhere other than month 1
silently shifted the cap itself (commitment 48, Default starting at month
5, produced a boundary of 52). Both were corrected to
`commitmentEnd = (int) $value` alone, with zero dependency on any Leg's
own `from_month` — a change that produced no regression in any existing
test, since every prior scenario happened to use `from_month => 1`, where
the old and new formulas were numerically identical. `Indefinite`
(`to_month === null`) was deliberately kept as a non-violation throughout
— it already resolves correctly capped at read time — and there is no
"at least one Leg must reach the commitment end" rule and no gap-fill
requirement; Legs may start late, end early, overlap, or sit entirely
mid-commitment. The frontend's `CommercialLegCard` editors (Tier
occupant's own `TierPricingRulesEditor.tsx` and the Edition's own
`TierEditionOverviewFields.tsx`) cap manual numeric `to_month` entry at
the same commitment value; `Indefinite` remains selectable.

**Orphaned assignment pruning** (`70fb165d`): an inclusion assignment
referencing a Leg that no longer exists is dropped (never reassigned to
Default or another Leg) at `settleTierSlot()`/
`settleTierEditionOverview()`, validated against both the Leg's draft id
and its settled `platform_id`.

**Platform ID migration extended** (`a9570934`): `TIER_LEG`/
`TIER_EDITION_LEG` were added to `TemporaryMigrationController`'s existing
dry-run → assign scopes, reusing the `tierLeg()`/`tierEditionLeg()`
adapters already used for live Publish-time reservation — both were
already complete, adapter-shaped, and enumerable; only the wiring was
missing. The progress/lock option was bumped `v3` → `v4` (the same
precedent set when Rate Sheet Item was added) so an install already
reporting `complete: true` re-runs the dry-run for the two new scopes.
This is the same existing user-driven dashboard action; no new script,
migration, CLI command, or maintenance surface was created.

## Final Architecture

- Rate Sheets remain the atomic pricing source of truth; Tier occupants
  and Tier Editions own commercial composition over them.
- An Edition is a vertical variant, never the mechanism for multi-cycle
  billing.
- Every Tier occupant/Edition owns a born-with Default Leg (`CZTL`/
  `CZTEL`) plus zero or more Additional Legs, each independently
  identified once resolved. `'default'` is an internal bucketing key
  only, never the exposed identity.
- No cross-Leg suppression by `item_id`/`price_option_id`; the same
  inclusion may resolve under multiple active Legs simultaneously; Default
  and Additional Legs may overlap freely.
- A finite commitment is the parent's own cap — never derived from any
  Leg's `from_month` — enforced server-side at settle and client-side on
  entry; `Indefinite` stays authorable and resolves capped.
- `commercial_legs` is additive alongside the untouched flat `price` in
  every existing Cost Builder/public consumer.
- Leg identity repair lives in the same existing Platform Identifier
  migration dry-run/assign action; there is no dedicated Leg backfill
  tool.

See [Commercial Legs](../code-map/commercial-legs.md) for the current
implementation.

## Decisions and Invariants

- A period boundary and a Leg's own authored range are not the same
  concept; an attempted fix that fed a child's own `from_month`/`to_month`
  into its per-period resolution (`456301e2`) was reverted the same day
  per explicit product decision, not because the underlying computation
  was wrong — the correction plan chosen instead was the commitment-anchor
  fix above.
- Commitment coverage has no "must reach the end" or gap-fill
  requirement; only the upper cap is enforced.
- Leg repair must reuse the existing Platform Identifier migration
  mechanism, never a new script/tool, when the existing adapter already
  exists and is enumerable.

## Validation

`php tests/commercial-leg-resolution.php`, `php tests/tier-commercial-leg-identity.php`,
`php tests/commercial-leg-timeline.php`, `php tests/commercial-leg-commitment-cap.php`,
`php tests/tier-leg-inclusion-reference.php`, `php tests/tier-leg-platform-identity.php`,
`php tests/tier-leg-assignment-orphan-pruning.php`,
`php tests/tier-default-leg-identity-cost-builder.php`,
`php tests/platform-identifier-temporary-migration.php`,
`php tests/tier-group-platform-identity-backfill.php`, the full existing
Tier/Edition/Rate Sheet suite (confirmed against the two pre-existing,
unrelated failures — `service-route-baseline.php`,
`tier-capability-invariants.php` — present on `main` before this work),
`npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Deferred Work

Whether `Indefinite` should be hidden (rather than allowed and
resolution-capped) in the editor while a finite commitment is active
remains an open UX choice, deliberately left as-is. `CZPRCIO` (Rate Sheet
Item Price Option), the Rate Sheet Bundle identity family, and Tier
Promotion (`CZTP`) remain outside the Platform Identifier migration's
scope, unrelated to this milestone.

## Related History

None — this is the first Project History record for Commercial Legs.
