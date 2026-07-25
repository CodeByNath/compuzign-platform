# Tier Capability Instances and Assignments

## Ownership and canonical shape

Package Station owns Tier capability instances and, from the assignment phase onward, the explicit relationships that record which Package Family uses an instance. A Package Family and a Tier instance are independent peers; neither sanitiser can represent the other, and removing their relationship must leave both records intact.

[`TierInstanceSchema.php`](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/TierInstanceSchema.php) defines the focused instance envelope: stable `ti_…` identity, title, status, Rate Sheet allow-list, popular-Tier configuration, the unchanged five-slot Tier map, and that instance's occupant bin. It deliberately contains no consumer, Family, Group, or assignment fields. [`PackageSchema.php`](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) remains the authority for the established occupant, draft, module-state, bin, and Promotion rules.

```text
cz_package_station
├─ package_manager.category_groups[]
├─ package_manager.rate_sheets[]
├─ tier_instances[]
└─ tier_assignments[]
```

The old `cz_package` meta schema on `cz_surface_package` is retired. The historical post type remains registered for queryability, but live Package and Tier state is stored only through `PackageRepository::OPTION_KEY` (`cz_package_station`).

## Phase state

Phase 1 defines and validates the instance schema only. No read or mutation path consumes `tier_instances[]` yet, and existing global Tier endpoint responses remain unchanged. Migration, assignment authority, instance-scoped mutations, explicit Family resolution, and public fail-closed projection land in their ordered phases.

## Invariants

- Five slot keys remain `basic`, `standard`, `premium`, `enterprise`, `ultimate` in that order.
- Slot identity and `occ_…` occupant identity stay distinct.
- Sanitisation never mints an instance or occupant id.
- Promotions stay station-scoped.
- Rate Sheet rows remain addressed by `(rate_sheet_id, item_id)`.
- No consumer ownership is inferred from Service or Rate Sheet provenance.

## Validation

From the plugin root run `php tests/tier-instance-schema.php`, the pre-existing PHP contracts, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
