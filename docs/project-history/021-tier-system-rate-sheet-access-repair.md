# Tier System Rate Sheet Access Repair

## Date

2026-08-16

## Scope

This milestone repaired the Tier System's whole-instance Rate Sheet Access
module — presentation, notification wiring, its inline editor, and two
underlying state bugs in the Tier System controller and the Family assignment
guard. It did not change Package Family, Tier occupant, Tier Add-on, Tier
Edition, or Rate Sheet ownership, and it did not reopen the Tier Group list's
own `disabled`-reads-Disabled mapping (a separate, deliberately locked
invariant that a same-day attempt at correcting it reverted).

## Goal

The module — renamed "Included Rate Sheets" in this pass — never received the
draft-preferred read pattern established for the Tier occupant on 2026-07-04
and consciously reapplied to Tier Edition on 2026-08-10. Its module
notification hardcoded an empty `notes: []` for its pre-Publish state,
making the pill non-interactive; its read card showed chip-rendered active
sheets restated as prose rather than a genuine name list; and its editor was
a bare checkbox-per-row list with an explanatory paragraph, unlike every
other Admin Station picker. Separately, a first-session Publish-then-Apply
sequence could surface "the Tier system was saved, but its Package Family
could not be changed" even when the Family assignment was never touched.

## What Changed

`useTierSystemController.ts`'s `apply()` now re-syncs `createdInstance` with
its own `updateInstance` response — `TierRegistrationHost` always passes
`instance={null}` and never re-mounts as the persisted host, so `instance`
resolves from `createdInstance` alone for the rest of that session; without
this sync, every module read stayed frozen at Publish-time data until a full
reload. `TierSystemContent.tsx`'s `accessData` is now draft-preferred: while
`rateSheetHasUnappliedChanges` is true it resolves names from
`c.rateSheetAccess`'s draft ids rather than the persisted `c.projection`
alone — the same behaviour Overview already had by construction, since
Overview's draft state doubles as its own display source. The module's
notification copy was corrected to a single info note (module entry contract:
a non-empty `notes` array is what makes the pill's button interactive at
all), and its card content was reduced to exactly Name (a stacked list, or
"Not configured") and Selected ratesheets.

A new shared `MultiSelectField` component (`drawer-kit/fields`) replaced both
the Rate Sheet Access editor's checkbox list and Tier Overview's own
hand-rolled, always-downward Customer Groups panel — a trigger plus a
floating checklist panel that measures itself against the viewport and opens
upward when there is more room above the trigger than below.

`TierAssignmentSchema::assign()` was corrected to be idempotent for an
already-stored consumer/instance pairing: re-asserting an assignment that
already names the requested instance now returns the unchanged rows instead
of throwing `consumer_already_assigned`. This was reproduced end-to-end
against the real backend classes (publish with a Family selected, Apply
once, edit Rate Sheet Access, Apply again) before and after the fix. Any
other, genuinely conflicting pairing still throws exactly as before.

## Final Architecture

Included Rate Sheets remains the whole-instance module in the one
`TierSystemContent` / `useTierSystemController` / `TierSystemFooter`
composition, placed beside Overview through the same `TIER_SYSTEM_ENTITY`
manifest. `MultiSelectField` joins `fields/` as a dedicated, non-`AdminFieldType`
component (per that module's own boundary — a picker over a candidate pool
"stays a dedicated component," it is not expressed as a field definition),
with two real consumers: Included Rate Sheets and Tier Overview's Customer
Groups.

## Decisions and Invariants

- A module's read card must prefer its own unapplied draft over persisted
  data whenever one exists — the same rule Tier Edition already follows.
- `apply()` must re-sync `createdInstance` from its own mutation response
  whenever it was already set; this is now locked by
  `tier-system-drawer-contract.ts`.
- `TierAssignmentSchema::assign()` is idempotent only for the exact
  already-stored pairing; every other conflict still throws.
- Tier Group's list-row `disabled` → Disabled mapping is unchanged and
  remains locked by `tier-settings-contract.ts` — it is a separate,
  deliberate decision this milestone did not reopen.

## Validation

`npx tsc --noEmit`, `npm run build`, `npm run contract:tier-system-drawer`
(extended with checks for the draft-preferred read, the `createdInstance`
resync, the idempotent-assignment call site, the renamed copy, and the
shared `MultiSelectField`), `npm run contract:drawer-module-entry`,
`npm run contract:tier-connections`, `npm run contract:tier-settings`,
`npm run contract:admin-station-css` (one pre-existing, unrelated failure
confirmed via `git stash` before this work began), `php
tests/tier-assignment-schema.php` (extended with an idempotency case), `php
tests/tier-assignment-family-flow.php`, and `npm run docs:check`.

## Deferred Work

The Tier Group list row's own `disabled` → Disabled presentation remains a
known, deliberately locked inconsistency with the Overview module's own
`disabled` → Pending reading of the identical stored value. Correcting it
requires updating `tier-settings-contract.ts`'s own assertions and is a
decision for the platform's owner, not a follow-up this milestone took.

## Related History

None — this is the first Project History record for the Tier System Rate
Sheet Access module.
