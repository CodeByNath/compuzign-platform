# Tier Capability Instances and Assignments

## Ownership and canonical shape

Package Station owns Tier instances and explicit Package Family usage relationships. Family and instance are independent peers; removing their relationship preserves both.

[`TierInstanceSchema.php`](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/TierInstanceSchema.php) defines stable `ti_…` identity, title, status, Rate Sheet allow-list, popular configuration, five slots, and occupant bin, with no consumer, Family, Group, or assignment fields. [`PackageSchema.php`](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) retains occupant lifecycle and Promotion rules.

[`TierAssignmentSchema.php`](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/TierAssignmentSchema.php) owns removable rows containing only `assignment_id`, `consumer_type`, `consumer_id`, and `tier_instance_id`. Consumers are exactly `package_family`; each peer appears once at most. `admin/package-station/tier-assignments` lists, creates, and deletes them. Assignment blocks permanent Family deletion; archive/trash leave it dormant.

```text
cz_package_station
├─ package_manager.category_groups[]
├─ package_manager.rate_sheets[]
├─ tier_instances[]
└─ tier_assignments[]
```

## Migration and mutation state

`TierInstanceSchema::liftLegacyStation` exposes old top-level Tier/bin/popular data as in-memory `ti_primary` without writing or assigning. `tier_instances[]` is mutation-canonical. Each `saveStation` mutation lifts before removing legacy keys; read-time load bridges never perform retirement.

Service-navigation routes place `tier-instances/{instance}` before `read`, `tiers`, `bin`, and `popular`; handlers resolve it first. No unscoped Tier route remains. `usePackageStation(serviceId, tierInstanceId, …)` stays unloaded for `null`.

Assignments, occupants, bin entries, or drafts block instance deletion. Peer-isolation tests cover both mutation directions and sanitisation.

## Public resolution

`TierInstanceSchema::resolveInstanceForService` follows published Service source → active Family → assignment → ready instance. Missing, null, inactive, unknown, or ambiguous edges fail closed without `ti_primary`, provenance, or cross-Family fallback.

`PackageRepository::findAllActiveIndexedByServiceId` builds one manager read model, projects resolved instances independently, and indexes only their Family's Services for Cost Builder. Covered unresolved Services enter the unavailable path, preventing legacy-price leakage. `PackageStationReadController` emits one Family-scoped admin row per assigned instance and none for unassigned instances.

## Package Family capability flow

The mature `package-family` drawer's own footer creates the Family (`usePackageFamilyStation.createFamily`, its `'new'`-identity Publish action) independently of any Tier capability; the same drawer's Capabilities module then offers Add Tier capability immediately, through `usePackageFamilyCapabilities.addTier`. Close writes nothing beyond whatever Family creation itself already committed; partial failure in Add Tier capability preserves both peers.

`usePackageFamilyCapabilities.ts` reads both peer collections. Absence never affects readiness. Add, Remove, and Open Tier are explicit; confirmed removal deletes only the assignment.

## Package-owned Tier Tool

[`useTierInstances.ts`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierInstances.ts) separates peer collections and mutations. [`tierInstanceModel.ts`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) derives rows, eligibility, slots, sheet options, and migration suggestion. Unassigned instances remain operable.

[`TierSystemSettings.tsx`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx) reads the focused system's Rate Sheet access and launches its owning drawer; it also launches existing Package Manager creation intents. It performs no mutation or assignment, offers no Family picker, suggests no consumer, and keeps no fixed-slot listing of its own. Whole-instance access uses `tier-instance:{instance}`; occupants and empty slots keep their exact instance + occupant or instance + slot routes, dispatched by the workspace engine that lists them. See [Package Home Settings](package-settings.md).

Workspace scope uses exact `resolveFamilyTierAssignment`, never provenance/global fallback. No assignment is neutral and non-writing; direct unassigned-instance management remains operable. Sheet inventory loads independently, applies the instance allow-list, derives occupant users, and joins Family names only through assignments.

## Invariants

- Five slot keys remain `basic`, `standard`, `premium`, `enterprise`, `ultimate` in that order.
- Slot identity and `occ_…` occupant identity stay distinct.
- Sanitisation never mints an instance or occupant id.
- Promotions stay station-scoped.
- Rate Sheet rows remain addressed by `(rate_sheet_id, item_id)`.
- No consumer ownership is inferred from Service or Rate Sheet provenance.
- Health structurally validates the manager and read-lifted instances without writing, repairing, assigning, or minting.
- Public failure never borrows the global copy, another Family's instance, or legacy Service pricing.
- `saveStation` mutation writes contain no top-level `tiers`, `occupant_bin`, `popular_tier`, or `popular_label`, and Tier routes are instance-scoped.
- `tests/tier-capability-invariants.php` executes the cross-phase migration, identity, peer-isolation, lifecycle, resolution, projection, and retirement matrix.

## Validation

Run `php tests/tier-capability-invariants.php`, the focused Tier/assignment PHP tests and TypeScript contracts, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.
