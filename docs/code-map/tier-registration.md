# Tier System Creation

## Purpose and ownership

Creating a Tier system is ONE atomic sequence, performed in the mature `tier` drawer rather than a second editor or a parallel host. Package Station owns the composition, state, validation, mutation and persistence; Admin Station supplies only the drawer shell.

A Tier system enters the pool with its own title and its first fixed slot (`basic`) settled with whatever the Tier Overview module was given. PHP mints the instance id and its five empty slots in the same sequence that settles that first slot. Afterwards it is reached the ordinary way: selecting its linked Family in the workspace engine resolves the assignment and loads the remaining four slots.

## The address

`tier-instance:new[:familyId]` opens the `tier` drawer before any instance exists — the whole-instance route's own "no instance yet" identity, the same pattern as the Family drawer's `'new'` sentinel. `TierDrawerHost` decodes it before any other identity, never falling through to the occupant fallback. The optional segment carries only the Family the caller already had in hand; empty means none was offered, not that one failed to resolve.

Two callers, one creation. Settings' Create Tier launcher passes no Family, since Settings pre-selects nothing. The workspace's no-assignment surface passes the Family it is showing, so creation links it once the instance exists.

## A Family is not a field

`TierInstanceSchema` carries no consumer, Family, Group, or assignment vocabulary, and creation does not change that. The link is a row in the separate `tier_assignments[]` ledger, written once at creation — never a reassignable picker, matching the settled rule (see [Tier Capability](tier-capability.md)) of exactly Add/Remove/Open, no reassign. A standalone-created system stays standalone until a Family's Capabilities module adds a *different* instance. A failed ledger write leaves a created, unassigned system — reported as such — rather than blocking the creation that already succeeded.

## Current implementation

- [tierDrawerTypes.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/tierDrawerTypes.ts) encodes/decodes `tier-instance:new[:familyId]` beside the ordinary whole-instance, occupant and empty-slot tokens, checked with priority so the literal `new` segment is never misread as a real instance id.
- [TierCreateContent.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierCreateContent.tsx) renders the SAME `TIER_ENTITY` an existing occupant uses — Overview, Included Features, Common Questions — each in its ordinary empty/Pending state. Only Overview is editable; the other two need the parent Service's resolved Rate Sheet catalogue, unavailable before an instance exists, so Edit stays withheld until hand-off. Module Edit/Save only ever touches a local draft, never an endpoint.
- [useTierCreate.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/useTierCreate.ts) owns that draft and the one authoritative `create()` sequence: mint the instance (`createTierInstance`), link the optional Family (`createTierAssignment`), persist the drafted overview and settle the first occupant (`saveServicePackageStationTierModule` / `settleServicePackageStationTier` — the SAME calls the empty-slot cycle already uses). Its one gate is a non-empty label, the same bar Family creation uses.
- [TierDrawerFooter.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierDrawerFooter.tsx)'s `'create'` mode is the sole caller of that sequence — one more mode on the SAME footer every other Tier state uses, not a bespoke footer.
- [TierDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx) resolves the create address before the ordinary instance/occupant/slot routes and mounts `TierCreateContent`. On success it remembers the real identity locally and mounts the ordinary, unmodified `TierDrawerContent` from then on — the same hand-off any other record gets.
- [TierInstanceSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/TierInstanceSchema.php) mints the instance and its five-slot shell; [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) settles the first slot through the same `settleTierSlot` every occupant uses.

## Invariants

- One creation sequence, exactly once per footer click. No second slot is filled, no second record minted.
- A Family is linked through the assignment ledger, never written onto the instance; a smuggled `consumer_id`/`family_id` is dropped by the schema.
- Included Features and Common Questions render but are not editable until hand-off — never a broken editor with no data behind it.
- No `tier-register:` token or bespoke registration host/content/hook/entity/schema/editor remain; their responsibilities are absorbed into the mature Tier drawer above.

## Validation

Run `php tests/tier-instance-schema.php`, `php tests/tier-capability-invariants.php`, `npm run contract:package-tier-workspace`, `npm run contract:drawer-module-entry`, `npm run contract:tier-instance-tool`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Tiers](tiers.md), [Tier Capability](tier-capability.md), [Package Home Settings](package-settings.md), and [Package Station](package-station.md).
