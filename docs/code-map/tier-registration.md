# Tier System Registration

**Shared drawer architecture adopted; Package aggregate lifecycle preserved.**

## Purpose and ownership

Tier System registration is the **pending state** of the one Tier System lifecycle described in [Tiers](tiers.md), not a second Tier editor. `tier-register:[familyId]` resolves into the SAME `TierSystemContent` composition the persisted `tier-instance:{id}` route mounts, so Overview, Rate Sheet Access, footer, and identity transition are defined exactly once.

A Tier system enters the pool with title, description, native ID, `CZTG`, and
five empty slots. Registration fills no slot or Rate Sheet access.

## The address

`tier-register:[familyId]` opens the `tier` drawer before any instance exists. Addressing no record, it is decoded before any identity is resolved and never falls through to the occupant fallback. Its optional segment carries only the Family the caller had in hand; an empty one means none was offered.

Settings passes no Family; the unassigned workspace passes its current Family.
Both hosts load Family choices AND the Rate Sheet inventory —
`TierInstanceSettingsHost` through its instance-scoped `usePackageStation`,
`TierRegistrationHost` through `useTierRateSheetInventory`, having no instance
to read through. Publish makes this route persisted **in place**, so an
inventory left to the settings host alone is one this route can never obtain.

Each host mounts or refuses on its **collection read** alone. A rejected
mutation reports inside the mounted composition, which still owns the retry and
whatever Publish already created.

## A Family is not a field

`TierInstanceSchema` carries no consumer, Family, Group, or assignment vocabulary. The link is a row in the separate `tier_assignments[]` ledger:

- choosing a Family writes that row **after** the instance exists;
- clearing it deletes that row;
- re-pointing is a delete then a create, because one assignment row exists per instance.

The instance is authoritative either way: a failed ledger write leaves a published, unassigned Tier system, reported as such, rather than a half-written record. A pre-selected Family on the token is honoured only while it still holds none.

Publish assigns permanent `tier_group/CZTG` to the returned
`tier_instance_id` in the same mounted composition. A persisted empty group
reads its occupant-derived disabled storage fact as Pending presentation.

## Current implementation

- [tierDrawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/tierDrawerTypes.ts) encodes/decodes the address beside the occupant and empty-slot tokens.
- [TierRegistrationHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierRegistrationHost.tsx), [TierInstanceSettingsHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierInstanceSettingsHost.tsx) — the hosts above.
- [useTierRateSheetInventory.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierRateSheetInventory.ts) reads that Manager-global inventory by host Service alone. Read only.
- [useTierInstances.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierInstances.ts) separates `loadError` (the collection read's failure, the only fatal one) from `error` (any failure, reported inline).
- [TierSystemContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierSystemContent.tsx) opens readable either way: pending states what a system will be and carries its Pending pill; published, it reads back the stored record. Only Edit opens the editor.
- [useTierSystemController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/useTierSystemController.ts) owns both modules' local drafts, the identity transition, Publish/Apply, guarded Delete, and assignment writes. Save commits a draft locally; `apply()` re-syncs `createdInstance`. See [Lifecycle](lifecycle-system.md).
- [TierSystemFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierSystemFooter.tsx) — Close+Publish pending, Close+Apply+guarded Delete persisted. Enable/Disable/Archive/Trash/Restore are withheld: `status` is derived, not settable.
- [TierInstanceSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/TierInstanceSchema.php) stores `description`; [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) mints the five-slot shell and owns the guarded permanent-delete endpoint.

## Invariants

- One controller, one entity manifest, one footer model for both states.
- One creation per publication. No slot is filled, no access granted, no second record minted.
- A Family is linked through the assignment ledger, never written onto the instance; a smuggled `consumer_id` or `family_id` is dropped by the schema.
- Only Families holding no Tier system are selectable. An absent description stores as empty.
- The drawer continues in the same mounted composition after Publish — the pending identity is replaced by the returned `tier_instance_id` in local state, never by a routing change. No mutation rejection unmounts it, and a retry resumes the instance the prior attempt created rather than minting a second one.
- Guarded Delete refreshes its opener **before** closing. `close()` drops the wall's refetch handle and `deleteInstance` never refetches, so a notification sent afterwards reaches nothing and the wall keeps binding a deleted `tier_instance_id`.

## Related Code Maps

[Tiers](tiers.md), [Tier Capability](tier-capability.md), [Package Home Settings](package-settings.md), [Lifecycle](lifecycle-system.md), and [Package Station](package-station.md).
