# Tier System Registration

**Shared drawer architecture adopted; Package aggregate lifecycle preserved.**

## Purpose and ownership

Tier System registration is the **pending state** of the lifecycle in [Tiers](tiers.md), not a second editor. `tier-register:[familyId]` and persisted `tier-instance:{id}` both mount `TierSystemContent`.

A Tier system enters the pool with title, description, native ID, `CZTG`, and
five empty slots. Registration fills no slot or Rate Sheet access.

## The address

`tier-register:[familyId]` opens the `tier` drawer before any instance exists. Addressing no record, it is decoded before any identity is resolved and never falls through to the occupant fallback. Its optional segment carries only the Family the caller had in hand; an empty one means none was offered.

Settings passes no Family; the unassigned workspace passes its current Family. Both hosts load Family choices and Rate Sheet inventory. Each mounts or refuses on its collection read alone; mutation failures remain inside the mounted composition for retry.

## A Family is not a field

`TierInstanceSchema` carries no consumer, Family, Group, or assignment vocabulary. The link is a row in the separate `tier_assignments[]` ledger:

- choosing a Family writes that row **after** the instance exists;
- clearing it deletes that row;
- re-pointing is a delete then a create, because one assignment row exists per instance.

The instance remains authoritative if a ledger write fails. A token's pre-selected Family is honoured only while it holds none.

Publish assigns permanent `tier_group/CZTG` to the returned `tier_instance_id` in place. A persisted empty group presents its occupant-derived disabled storage fact as Pending.

## Current implementation

- [tierDrawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/tierDrawerTypes.ts) encodes/decodes the address beside the occupant and empty-slot tokens.
- [TierRegistrationHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierRegistrationHost.tsx), [TierInstanceSettingsHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierInstanceSettingsHost.tsx) — pending and persisted hosts.
- [useTierRateSheetInventory.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierRateSheetInventory.ts) reads Manager inventory for the pending host.
- [useTierInstances.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierInstances.ts) separates `loadError` (the collection read's failure, the only fatal one) from `error` (any failure, reported inline).
- [TierSystemContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierSystemContent.tsx) opens readable either way: pending states what a system will be and carries its Pending pill; published, it reads back the stored record. Only Edit opens the editor.
- [useTierSystemController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/useTierSystemController.ts) owns both modules' local drafts, the identity transition, Publish/Apply, guarded Delete, and assignment writes. Save commits a draft locally; `apply()` re-syncs `createdInstance`. See [Lifecycle](lifecycle-system.md).
- [TierSystemFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierSystemFooter.tsx) — Close+Publish pending, Close+Apply+guarded Delete persisted. Enable/Disable/Archive/Trash/Restore are withheld: `status` is derived, not settable.
- [tierRateSheetAccessModel.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierRateSheetAccessModel.ts) projects each Rate Sheet with its existing `groups[]`. Parent access remains `allowed_rate_sheet_ids`; exact nested access persists separately as `allowed_rate_sheet_groups[]` entries keyed by `(rate_sheet_id, group_id)`. The shared picker shows groups under their owning sheet, selecting a child also selects its parent, and clearing a parent clears its children. This boundary does not project rows or change occupant resolution.
- [TierInstanceSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/TierInstanceSchema.php) stores `description` and sanitizes exact Rate Sheet group access against the allowed parent and current Manager inventory; [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) mints the five-slot shell, persists both access levels atomically, and owns the guarded permanent-delete endpoint.

## Invariants

- One controller, one entity manifest, one footer model for both states.
- One creation per publication. No slot is filled, no access granted, no second record minted.
- Rate Sheet access is explicit at both levels: an allowed parent is identified by `rate_sheet_id`, an allowed child by `(rate_sheet_id, group_id)`, and neither empty list implies all candidates.
- A Family is linked through the assignment ledger, never written onto the instance; a smuggled `consumer_id` or `family_id` is dropped by the schema.
- Only Families holding no Tier system are selectable. An absent description stores as empty.
- After Publish, local state adopts the returned `tier_instance_id`; retry resumes that instance rather than minting another.
- Guarded Delete refreshes its opener **before** closing. `close()` drops the wall's refetch handle and `deleteInstance` never refetches, so a notification sent afterwards reaches nothing and the wall keeps binding a deleted `tier_instance_id`.

## Related Code Maps

[Tiers](tiers.md), [Tier Capability](tier-capability.md), [Package Home Settings](package-settings.md), [Lifecycle](lifecycle-system.md), and [Package Station](package-station.md).
