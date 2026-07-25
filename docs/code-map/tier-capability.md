# Tier Capability Instances and Assignments

## Ownership and canonical shape

Package Station owns Tier capability instances and the explicit relationships that record which Package Family uses an instance. A Package Family and a Tier instance are independent peers; neither sanitiser can represent the other, and removing their relationship leaves both records intact.

[`TierInstanceSchema.php`](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/TierInstanceSchema.php) defines the focused instance envelope: stable `ti_…` identity, title, status, Rate Sheet allow-list, popular-Tier configuration, the unchanged five-slot Tier map, and that instance's occupant bin. It deliberately contains no consumer, Family, Group, or assignment fields. [`PackageSchema.php`](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) remains the authority for the established occupant, draft, module-state, bin, and Promotion rules.

[`TierAssignmentSchema.php`](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/TierAssignmentSchema.php) owns the removable usage edge. Its rows contain only derived `assignment_id`, `consumer_type`, `consumer_id`, and `tier_instance_id`. The current consumer vocabulary is exactly `package_family`; one Family and one instance may each appear in at most one row. Invalid join rows are dropped during sanitation. The global admin route family at `admin/package-station/tier-assignments` lists, creates, and deletes these rows. Family permanent deletion is blocked while a row exists; archive and trash leave it dormant.

```text
cz_package_station
├─ package_manager.category_groups[]
├─ package_manager.rate_sheets[]
├─ tier_instances[]
└─ tier_assignments[]
```

The old `cz_package` meta schema on `cz_surface_package` is retired. The historical post type remains registered for queryability, but live Package and Tier state is stored only through `PackageRepository::OPTION_KEY` (`cz_package_station`).

## Mutation and compatibility state

`TierInstanceSchema::liftLegacyStation` exposes an in-memory, idempotent `ti_primary` for a legacy station. It copies the Tier map and occupant bin verbatim, writes nothing during reads, and creates no assignment. `tier_instances[]` is canonical for every Tier and bin mutation. `TierInstanceSchema::withInstance` replaces exactly one peer, re-derives its readiness, and mirrors `ti_primary` to the temporary legacy Tier/bin/popular projections until compatibility retirement.

The scoped Service-navigation route family inserts `tier-instances/{instance}` before `read`, `tiers`, `bin`, and `popular`. Every handler resolves the instance before resolving a slot or bin. The old unscoped routes remain temporary aliases to `ti_primary`; scoped response envelopes include `tier_instance_id`. `usePackageStation(serviceId, tierInstanceId, …)` owns the corresponding client state and holds an unloaded state when the instance id is `null`.

Instance deletion is blocked by assignments, occupants, bin entries, or drafts. Deleting an empty unassigned instance leaves every Family unchanged. The peer-isolation suite covers assignment removal, every Tier-instance mutation class, and both structural sanitisation boundaries.

## Package-owned Tier Tool

[`useTierInstances.ts`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/useTierInstances.ts) reads the instance and assignment collections separately, and exposes explicit create, assign, unassign, and allow-list mutations. [`tierInstanceModel.ts`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts) derives rows, counts, eligibility, all five slot states, allowed-sheet options, and the optional single-candidate migration suggestion without writing anything. Unassigned instances remain fully operable.

[`TierInstancePanel.tsx`](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/presentation/package-tier-workspace/TierInstancePanel.tsx) is the Package-owned instance selector/configuration surface. Opening an instance reuses the existing Focus/Grid engine, lower deck, and `tier` drawer. Drawer routing carries both instance and occupant identities while the card retains its native `occ_…` id. No new drawer template or generic CRUD/ownership framework exists.

## Invariants

- Five slot keys remain `basic`, `standard`, `premium`, `enterprise`, `ultimate` in that order.
- Slot identity and `occ_…` occupant identity stay distinct.
- Sanitisation never mints an instance or occupant id.
- Promotions stay station-scoped.
- Rate Sheet rows remain addressed by `(rate_sheet_id, item_id)`.
- No consumer ownership is inferred from Service or Rate Sheet provenance.
- The Package Station health check reports live legacy Tier data without a valid active-Family assignment; it never repairs or auto-assigns.

## Validation

From the plugin root run `php tests/tier-instance-schema.php`, `php tests/tier-instance-migration.php`, `php tests/tier-assignment-schema.php`, `php tests/tier-instance-mutations.php`, `php tests/tier-instance-guards.php`, `php tests/package-capability-peer-isolation.php`, `npm run contract:tier-instance-scope`, `npm run contract:tier-instance-tool`, the pre-existing contracts, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
