# Tier System Registration

**Shared drawer architecture adopted; Package aggregate lifecycle preserved.**

## Purpose and ownership

Tier System registration is the **pending state** of the one Tier System lifecycle described in [Tiers](tiers.md), not a second Tier editor or a separate workflow. `tier-register:[familyId]` resolves into the SAME `TierSystemContent` composition the persisted `tier-instance:{id}` route mounts, so Overview, Rate Sheet Access, footer, and identity-transition mechanics are defined exactly once.

Tier system enters the pool with title, description, native ID, `CZTG`, and
five empty slots. Registration fills no slot or Rate Sheet access.

## The address

`tier-register:[familyId]` opens the `tier` drawer before any instance exists. It addresses no record, so it is decoded before any identity is resolved and never falls through to the occupant fallback. The optional segment carries only the Family the caller had in hand; an empty segment means none was offered, not that one failed to resolve.

Settings passes no Family; the unassigned workspace passes its current Family.
`TierRegistrationHost` loads pending Family choices, while
`TierInstanceSettingsHost` loads persisted Rate Sheet inventory; both delegate
to the same composition.

## A Family is not a field

`TierInstanceSchema` carries no consumer, Family, Group, or assignment vocabulary, unchanged once published. The link is a row in the separate `tier_assignments[]` ledger:

- choosing a Family writes that row **after** the instance exists;
- clearing it deletes that row;
- re-pointing is a delete then a create, because one assignment row exists per instance.

The instance is authoritative either way. A failed ledger write leaves a published, unassigned Tier system, reported as such, rather than a half-written record. Only Families holding no Tier system are offered, and a pre-selected Family on the token is honoured only while it still holds none.

Publish assigns permanent `tier_group/CZTG` to the returned
`tier_instance_id` in the same mounted composition. Persisted empty groups
consume their occupant-derived disabled storage fact as Pending presentation,
with guidance that active occupants activate the group. Their explicit footer
remains local Close/Publish and persisted Close/Apply/guarded Delete; unsupported
Enable, Disable, Archive, Trash, and Restore actions are never inferred.

## Current implementation

- [tierDrawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/tierDrawerTypes.ts) encodes/decodes the address beside the occupant and empty-slot tokens.
- [TierRegistrationHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierRegistrationHost.tsx) and [TierInstanceSettingsHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierInstanceSettingsHost.tsx) — the two hosts above.
- [TierSystemContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierSystemContent.tsx) opens readable either way: the pending module states what a system will be and carries its Pending pill; published, it reads back the stored record. Only Edit opens the editor.
- [useTierSystemController.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/useTierSystemController.ts) owns both modules' local drafts, the identity transition, Publish/Apply, guarded Delete, and assignment writes. Save commits a draft locally only; footer Publish or Apply is the sole authoritative write. See [Lifecycle](lifecycle-system.md).
- [TierSystemFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierSystemFooter.tsx) — Close+Publish pending, Close+Apply+guarded Delete persisted. Enable/Disable/Archive/Trash/Restore are withheld: `status` is derived, not settable, so no backend seam exists yet.
- [TierInstanceSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/TierInstanceSchema.php) stores `description`; [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) mints the five-slot shell and exposes the guarded permanent-delete endpoint now wired end to end.

## Invariants

- One controller, one entity manifest, one footer model for both pending and persisted Tier Systems.
- One creation per publication. No slot is filled, no access granted, no second record minted.
- A Family is linked through the assignment ledger, never written onto the instance; a smuggled `consumer_id` or `family_id` is dropped by the schema.
- Only Families holding no Tier system are selectable. An absent description is stored as empty rather than dropped.
- The drawer continues in the same mounted composition after Publish — the pending identity is replaced by the returned `tier_instance_id` in local state, never by a routing change.

## Related Code Maps

[Tiers](tiers.md), [Tier Capability](tier-capability.md), [Package Home Settings](package-settings.md), [Lifecycle](lifecycle-system.md), and [Package Station](package-station.md).
