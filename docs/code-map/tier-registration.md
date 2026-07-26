# Tier System Registration

## Purpose and ownership

Registering a Tier system is ONE atomic creation, performed in the mature `tier` drawer rather than a second Tier editor. Package Station owns the composition, state, validation, mutation and persistence; Admin Station supplies only the drawer shell.

A Tier system enters the pool with its own title and description. PHP mints its id and its five empty fixed slots. Nothing else is minted, filled, bound, or granted: registration fills no slot, grants no Rate Sheet access, and chains into no workflow. A registered system is reached the ordinary way afterwards — by selecting its Package Family in the workspace engine, which resolves the assignment and loads those empty slots for individual Tier edits.

## The address

`tier-register:[familyId]` opens the `tier` drawer before any instance exists. It addresses no record, so it is decoded before any identity is resolved and never falls through to the occupant fallback. The optional segment carries only the Family the caller already had in hand; an empty segment means none was offered, not that one failed to resolve.

Two callers, one creation. The Settings lane's Tiers launcher passes no Family, because Settings pre-selects nothing from whatever is focused above it. The workspace's no-assignment surface passes the Family it is showing, so the drawer opens with it selected.

## A Family is not a field

`TierInstanceSchema` deliberately carries no consumer, Family, Group, or assignment vocabulary, and registration does not change that. The link is a row in the separate `tier_assignments[]` ledger:

- choosing a Family writes that row **after** the instance exists;
- clearing it deletes that row;
- re-pointing is a delete then a create, because one assignment row exists per instance.

The instance is authoritative either way. A failed ledger write leaves a registered, unassigned Tier system — reported as such — rather than a half-written record. Only Families holding no Tier system are offered, so no existing assignment is silently retargeted, and a pre-selected Family arriving on the token is honoured only while it still holds none.

## Current implementation

- [tierDrawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/tierDrawerTypes.ts) encodes and decodes the address beside the occupant and empty-slot tokens.
- [TierRegistrationContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierRegistrationContent.tsx) presents the record's own defaults and, once registered, its own overview for correction.
- [useTierRegistration.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierRegistration.ts) owns draft state, validation, the create write and the assignment writes.
- [TierRegistrationHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierRegistrationHost.tsx) is a separate host so the Family collection loads only when registering, keeping it out of every ordinary slot and occupant open.
- [TierInstanceSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/TierInstanceSchema.php) stores `description`; [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) accepts it on create and update and mints the five-slot shell.

## Invariants

- One creation per registration. No slot is filled, no access granted, no second record minted.
- A Family is linked through the assignment ledger, never written onto the instance; a smuggled `consumer_id` or `family_id` is dropped by the schema.
- Only Families holding no Tier system are selectable.
- An absent description is stored as empty rather than dropped.

## Validation

Run `php tests/tier-instance-schema.php`, `php tests/tier-capability-invariants.php`, `npm run contract:package-tier-workspace`, `npm run contract:tier-instance-tool`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Tiers](tiers.md), [Tier Capability](tier-capability.md), [Package Home Settings](package-settings.md), and [Package Station](package-station.md).
