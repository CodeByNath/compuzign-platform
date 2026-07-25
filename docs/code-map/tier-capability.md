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

## Package Family capability flow

`PackageFamilyCreateContent.tsx` saves the Family before optional instance creation and assignment. Decline/close writes nothing; partial failure preserves both peers.

`usePackageFamilyCapabilities.ts` reads the two peer collections separately. The Family drawer places its Capabilities shell after Connected Records on Connections. Capability absence is valid and never affects overview readiness. Its only capability actions are Add Tier capability, Remove Tier capability, and Open Tier tool. Remove deletes only the assignment behind inline confirmation.

## Package-owned Tier Tool

[`useTierInstances.ts`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierInstances.ts) keeps peer collections and explicit mutations separate. [`tierInstanceModel.ts`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) derives rows, eligibility, slots, sheet options, and the explicit migration suggestion. Unassigned instances remain operable.

[`TierSystemSettings.tsx`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx) is the Package-owned instance configuration lane inside the workspace's existing Settings tab. It provides explicit attach/create/remove/open actions, clear allow-list semantics, all five fixed slots, and a collapsed advanced instance inventory. The old standalone instance slab is retired. Opening an occupied Tier carries instance plus occupant identity; opening an empty slot carries instance plus slot identity and lets the existing drawer mint an occupant only on authoritative save. No new drawer template or generic CRUD/ownership framework exists.

Family workspace scope uses `resolveFamilyTierAssignment`: exact `package_family` consumer match → assigned instance, with no Service/Rate Sheet inference or global fallback. No assignment is a neutral shell whose action opens Settings without writing. The same five Tier tabs, focused compartment, and Details/Connections/Settings deck remain present. Settings offers eligible unassigned instances before independent creation; creation never auto-assigns. Directly opened unassigned instances stay operable in a labelled non-Family mode.

The Settings Rate Sheet inventory loads through the existing Package Manager read endpoint independently of an instance-scoped Tier read. Availability follows each instance allow-list (empty means all active and is not exclusive); current users come from occupant `rate_sheet_id` bindings. Family names are joined only through `tier_assignments[]`.

## Invariants

- Five slot keys remain `basic`, `standard`, `premium`, `enterprise`, `ultimate` in that order.
- Slot identity and `occ_…` occupant identity stay distinct.
- Sanitisation never mints an instance or occupant id.
- Promotions stay station-scoped.
- Rate Sheet rows remain addressed by `(rate_sheet_id, item_id)`.
- No consumer ownership is inferred from Service or Rate Sheet provenance.
- The Package Station health check reports live legacy Tier data without a valid active-Family assignment; it never repairs or auto-assigns.

## Validation

Run the Tier/assignment PHP tests, all TypeScript contracts, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.
