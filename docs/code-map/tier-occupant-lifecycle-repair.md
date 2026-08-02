# Tier Occupant Lifecycle

**Status:** Current conforming implementation. Related: [Tiers](tiers.md), [Tier Add-on](tier-addon.md), [Lifecycle](lifecycle-system.md).

## Purpose and scope

Repair occupants, including `is_addon: true`. Pending dim means incomplete; Pending full means ready but unpublished. Active means published; Disabled means administrator-disabled.

## Storage and transitions

Canonical fact: `is_explicitly_disabled: boolean`; not history. Never use `previous_platform_status` or `disable_mask`.

| Action | `platform_status` | Explicit marker | Drafts/modules | Presentation |
|---|---|---|---|---|
| First incomplete configuration | `disabled` | `false` | saved draft / edited module `pending` | Pending dim until ready |
| Ready module Save | unchanged | unchanged | save draft only / only edited module `pending` | edited module Pending full |
| Publish/Settle | `active` | `false` | clear drafts / settle modules | Active |
| Disable | `disabled` | `true` | preserve | Disabled |
| Enable | `disabled` | `false` | preserve | Pending dim/full by readiness |
| Restore | `disabled` | `false` | existing restore contract | Pending dim/full by readiness |
| Archive/trash/delete | existing behavior | travels/persists/is removed with occupant | existing behavior | existing travel state |
| Swap/retarget | existing mechanics; restored occupant inactive/unmasked | travels with each occupant | existing behavior | restored occupant Pending |

Publish alone activates and clears the marker. Preserve first-settlement ordering: settle/persist native occupant, reserve/persist/bind CZT, conditionally CZTA, return authority. Never persist Active without required identity orchestration; do not change identity code.

## Projection and notifications

Overview, Features, and FAQs each receive own `hasDraft`, `moduleTransition`, occupant `platformStatus`, effective `disabled`, and existing parent context. Own draft/`pending` makes only that ready module Pending full; incomplete remains dim. Siblings retain state. Tier Group status is not occupant truth.

Notification precedence: Disabled; own draft/pending; incomplete guidance; inactive-unmasked publication guidance; Active/no note. Reuse “Draft saved — settle to publish.” Evaluator changes are Tier-opt-in; rerun locked-entity contracts.

Whole-Tier fold: Disabled; any configured draft/pending → Pending full; no ready configuration → Pending dim; inactive-unmasked ready → Pending full; settled Active → Active. Drawer/cards consume one status/notes result.

The toggle endpoint returns authoritative occupant status, marker, drafts, and module statuses. Frontend patches it, never synthetic `slot.enabled`. After Enable the footer offers Disable.

## Compatibility and Add-ons

Detect absence with `array_key_exists`. Markerless legacy Active remains Active; Disabled remains conservatively Disabled. Enable/Restore persist `false`; no migration. Preserve occupant ID, `is_addon`, CZT/CZTA/dormant reuse, Rate Sheet binding, slot/bin identity, travel, deletion, and tombstones. Add-on tests prove identical lifecycle without Add-on production code.

## Authoritative implementation

| Area | Files/responsibility |
|---|---|
| Backend | `PackageSchema.php`: marker compatibility/preservation, Publish activation, Restore facts. `PackageStationController.php`: existing toggle transition and authoritative response only; identity and routes untouched. |
| Frontend | `types.ts`; `usePackageStation.ts`; `moduleStatus.tsx`; `moduleNotifications/shared.ts` (opt-in only); `moduleNotifications/tier.ts`; `tierDetailModel.ts`; `TierDrawerFooter.tsx`; `TierDrawerContent.tsx`; `useTierDrawerController.ts`; `tierOccupantCard.ts`: types, independent projection, canonical notes, authoritative patch/footer. |
| Tests | New PHP lifecycle and TS resolver contracts; update occupant compatibility/Add-on contracts; mounted drawer regression; `package.json` only for test command. |

## Validation gates

The implementation is locked by backend lifecycle tests, TypeScript resolver
contracts, and the mounted Tier drawer regression.

Static: Save never settles/identifies; Enable never activates; Publish activates safely; marker reloads/travels; Restore clears it; Add-on identity is byte-identical. Mounted: same drawer shows Save Pending/note, Publish Active, Disable Disabled, Enable Pending, republish Active; independently test three modules/Add-on. Browser: reload each transition; smoke travel; verify CZT/CZTA, role, identity, binding.

## Locked boundary

This conformance covers the Tier occupant and the same occupant with
`is_addon = true`. It does not promote Tier Group / Tier System or change
Platform Identifier, Rate Sheet, Promotion, child locks, archive/bin mechanics,
Add-on ownership, endpoint families, Cost Builder, quote cart, registration,
repository, or identity code.
