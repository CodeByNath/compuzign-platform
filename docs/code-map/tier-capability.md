# Tier Capability Instances and Assignments

## Ownership and canonical shape

Package Station owns Tier instances and the explicit relationships recording which Package Family uses one. Family and instance are independent peers; removing their relationship leaves both intact.

[`TierInstanceSchema.php`](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/TierInstanceSchema.php) defines stable `ti_…` identity, title, status, Rate Sheet allow-list, popular-Tier configuration, five-slot map, and occupant bin. It contains no consumer, Family, Group, or assignment fields. [`PackageSchema.php`](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) retains occupant lifecycle and Promotion rules.

[`TierAssignmentSchema.php`](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/TierAssignmentSchema.php) owns the removable edge containing only `assignment_id`, `consumer_type`, `consumer_id`, and `tier_instance_id`. Consumers are exactly `package_family`; each peer appears at most once. `admin/package-station/tier-assignments` lists, creates, and deletes rows. Assignment blocks Family permanent deletion; archive/trash leave it dormant.

```text
cz_package_station
├─ package_manager.category_groups[]
├─ package_manager.rate_sheets[]
├─ tier_instances[]
└─ tier_assignments[]
```

## Mutation and compatibility state

`TierInstanceSchema::liftLegacyStation` exposes in-memory `ti_primary`, copying Tier/bin data without read writes or assignment. `tier_instances[]` is mutation-canonical. `withInstance` replaces one peer and temporarily mirrors `ti_primary` to legacy projections.

Scoped Service-navigation routes insert `tier-instances/{instance}` before `read`, `tiers`, `bin`, and `popular`; handlers resolve instance first. Temporary unscoped aliases address `ti_primary`. `usePackageStation(serviceId, tierInstanceId, …)` stays unloaded when the instance id is `null`.

Instance deletion is blocked by assignments, occupants, bin entries, or drafts. Peer-isolation tests cover both mutation directions and sanitisation boundaries.

## Public resolution

`TierInstanceSchema::resolveInstanceForService` follows one exact edge chain: published Service source → active Package Family → assignment → ready Tier instance. Missing, null, inactive, unknown, or ambiguous edges fail closed; there is no `ti_primary`, provenance, or cross-Family fallback.

`PackageRepository::findAllActiveIndexedByServiceId` builds the Package Manager read model once, projects each resolved instance independently, and indexes only its Family's Services for Cost Builder. Covered but unresolved Services enter the existing unavailable path so legacy pricing cannot leak through. `PackageStationReadController` emits one admin summary row per assigned instance with Family-scoped Service refs; unassigned instances emit no row. Temporary legacy storage and route aliases remain until the held retirement phase.

## Package Family capability flow

`PackageFamilyCreateContent.tsx` saves the Family before optional instance creation and assignment. Decline/close writes nothing; partial failure preserves both peers.

`usePackageFamilyCapabilities.ts` reads both peer collections. Capability absence never affects readiness. Actions are Add, Remove, and Open Tier; confirmed removal deletes only the assignment.

## Package-owned Tier Tool

[`useTierInstances.ts`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierInstances.ts) keeps peer collections and explicit mutations separate. [`tierInstanceModel.ts`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) derives rows, eligibility, slots, sheet options, and the explicit migration suggestion. Unassigned instances remain operable.

[`TierSystemSettings.tsx`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx) hosts guided but still-separate create/assign/remove operations, system Rate Sheet access, and direct fixed-slot configuration through the existing drawer. A Family without an assignment shows no fabricated slot shell; an assigned empty instance reports setup progress and its next slot action. Occupied drawer targets carry instance + occupant identity; empty targets carry instance + slot and mint only on save. Repeated Package-owned management hand-offs scroll/focus the selected workspace instead of silently reselecting it.

Workspace scope uses exact `resolveFamilyTierAssignment`, never provenance/global fallback. No assignment is a neutral, non-writing Settings state; direct unassigned-instance management remains operable. Rate Sheet inventory loads independently, applies the instance allow-list, derives users from occupant bindings, and joins Family names only through assignments.

## Invariants

- Five slot keys remain `basic`, `standard`, `premium`, `enterprise`, `ultimate` in that order.
- Slot identity and `occ_…` occupant identity stay distinct.
- Sanitisation never mints an instance or occupant id.
- Promotions stay station-scoped.
- Rate Sheet rows remain addressed by `(rate_sheet_id, item_id)`.
- No consumer ownership is inferred from Service or Rate Sheet provenance.
- The Package Station health check reports live legacy Tier data without a valid active-Family assignment; it never repairs or auto-assigns.
- Public failure never borrows the global copy, another Family's instance, or legacy Service pricing.

## Validation

Run the Tier/assignment PHP tests including `php tests/tier-instance-public-projection.php`, all TypeScript contracts, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.
