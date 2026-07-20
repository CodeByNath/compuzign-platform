# Package Manager Capability Host — Working Blueprint

**Status:** Implemented; static/build validation complete, runtime verification unavailable
**Date:** 2026-07-20
**Scope:** Package Manager capability registration and assignment, Tier presentation adapter, and Admin Station composition
**Current source navigation:** [Package Manager Code Map](../code-map/package-manager.md)

## Audit conclusion

The requested model can be added without a destructive migration, a Tier identity change, replacement of the five-slot authority, or an incompatible route change.

The live Package is not a standalone `cz_surface_package` entity. Historical posts remain registered only for read compatibility; current writes use the one independent `cz_package_station` option through `PackageRepository`. A Service ID in `/admin/services/{id}/package-station/...` is navigation and pool context, never Package ownership. Package Families are Package-owned records in `package_manager.category_groups`; their Service membership is stored on Package-owned source relationships as `category_group_id`.

Tier authority is already lazy at occupant level. `PackageRepository::defaultStation()` stores `tiers: []`. The five names (`basic`, `standard`, `premium`, `enterprise`, `ultimate`) are fixed logical slot addresses from `PackageSchema::ALLOWED_TIERS`, projected on every detail read. An empty projection is not an occupant. Tier authority mints `current_occupant.id` only when a Tier save or settle crosses `PackageStationController`; it preserves that value as `occupant_id`. The slot key remains the mutation address and restore/swap/retarget target, not record identity.

Archive moves the settled occupant into `occupant_bin`; restore returns it disabled, while swap and retarget operate atomically through `PackageSchema`. Draft save/revert, settle/publish, enable/disable, pricing projection, inclusions, FAQs, popular Tier, conflicts, and bin travel all remain in `PackageSchema`, `PackageStationController`, `usePackageStation`, and the mature Tier drawer composition.

At audit time, Command Centre rendered `PackageManagerTierCards`. Admin Station had a registered but unbound `useServiceTierCards` source and a mature `TierDrawerHost`; card intents carried `occupant_id`, and the drawer re-resolved the current slot after loading. The station binding, data-source, template-kit, and drawer registries provided the correct presentation extension points. Relation-provider `capabilities` describe editable relationship fields and are not a Package capability assignment system.

Promotion has real persistence, controller, hook, provider, and lifecycle boundaries, but no registered Admin Station capability source/template/drawer composition. Bundle is only legacy Package/Service pricing data and a read-only Command Centre page. Campaign exists only as Package type/promotion copy fields. None will be registered as a capability until its real source, identity, drawer, and authority exist.

## Persistence authority and owner scope

Capability assignments will be an additive `package_manager.capability_assignments` collection inside `cz_package_station`. Enabling a capability writes one assignment row and nothing under `station.tiers`. Disabling retains all Tier occupants and lifecycle data.

The first supported owner is the proven singleton Package Manager identity:

```ts
{
  ownerType: 'package-manager',
  ownerId: 'package-station',
  capabilityKey: 'tiers',
  enabled: true,
  order: 10,
}
```

`package-family` is not enabled as an assignment owner in this phase because current Tier slots, bin state, popular selection, and Cost Builder projection are station-global. Pretending each Family owned them would make one mutation appear local while changing every Family. Service is also not an owner; it is a Package source relationship and compatibility route context. Family and Service IDs are valid Tier **collection filters** through existing source/rate-sheet provenance. Additional owner types require a real persistence/authority decision before joining the supported-owner registry.

No database migration or write-on-read is required. Missing assignments sanitize to an empty collection. Existing Command Centre Tier management remains available; the new Admin Station Package capability section begins disabled until explicitly assigned.

## Capability-host contract

The frontend capability registry will hold only composition metadata:

```ts
{
  capabilityKey: 'tiers',
  label: 'Tiers',
  dataSourceKey: 'package-tiers',
  templateKitKey: 'tier-list',
  drawerTemplateKey: 'tier',
  authorityKey: 'package-tier',
  supportedOwnerTypes: ['package-manager'],
  order: 10,
  available: true,
}
```

Registry rows generate ordinary Admin Station surface bindings; there is no second surface registry or section shell. Registry order is the single section-order authority, and persisted assignment projections normalise to it rather than accepting a client override. The existing `StationPresentationShell` remains the only ordered section loop. `StationSurfaceHost` understands the generic assignment state supplied by a capability data source: disabled capability content is not mounted or fetched, while a host-level activation control opens the assignment drawer. Enabled capability content uses the same binding, section chrome, kit, drawer intent path, and originating-source refresh handle.

The backend registry validates keys, supported owner types, availability, and assignment identity only. It contains no Tier slot, lifecycle, endpoint, or mutation rules. A dedicated Package-owned assignment controller is the sole write boundary.

## Tier adapter, identity, and lazy activation

The Tier collection source will accept optional `{ serviceId }` or `{ packageFamilyId }` conditions. With no scope it projects all settled occupants. Service scope follows a Tier selection through `rate_sheet_items.item_id` → Rate Sheet `source_item_id` → Package Manager item `source_service_id`. Family scope first resolves member Services from Package-owned source relationships and uses the same chain. These are read filters over one authority, never copied ownership.

Each rendered occupant carries:

- `occupant_id` as the card/drawer record identity;
- a valid Service ID as parent route/drawer context;
- optional Service or Package Family scope context;
- `slotId` only in opaque mutation context.

When enabled with no configured occupants, the Tier kit renders `No tiers configured` and `Create first tier`. The action carries the Package Manager owner identity plus the first authorable fixed slot in intent context. `TierDrawerHost` opens the mature `TierDrawerContent` with `initialTierId` and its Overview editor; saves and settle still cross `usePackageStation` and Package Tier endpoints. No presentation component creates an occupant.

Drawer mutations call the opening section's existing `refetch` handle. Capability enable/disable opens from the same binding, so the targeted refresh changes that section between activation control and Tier collection without a broadcast or global event bus.

## Files in scope

Create:

- Package capability assignment schema/controller and focused PHP contract;
- Admin Station Package capability registry, hook, and assignment drawer adapter;
- Tier collection source, scope projection, and Tier list kit;
- a focused capability-host architecture contract script.

Modify:

- `PackageManagerSchema`, `SurfacePackagesModule`, Package Station response types/endpoints;
- Admin Station surface bindings, data-source/template registries, surface host, drawer intent/context contracts, and Tier drawer adapter;
- affected Code Maps, local SurfacePackages guidance, and current platform architecture guidance;
- generated `dist` assets through the normal build.

Explicitly do not modify:

- Tier slot constants, occupant/bin/lifecycle algorithms, Cost Builder projection rules, Promotion handlers, Service persistence, `StationLifecycle`, drawer-kit renderers, completed Project History, historical Package posts, or existing compatibility URLs;
- Bundle/Campaign endpoints, records, drawers, or placeholders.

## Rollback points

1. Remove the assignment controller/schema and the additive manager key; old stored rows become ignored data and Tier persistence is untouched.
2. Remove the generated Package capability binding/registry row; Command Centre and all Tier APIs remain unchanged.
3. Remove the Tier collection kit/source and intent context extension; the mature Tier drawer remains available to existing hosts.
4. Revert generated assets last. No rollback step rewrites or migrates stored occupants.

## Validation plan

- PHP contracts when PHP is available: Package Manager schema, Package relationships, Package Families, Tier occupant compatibility, Tier pricing, active Package, Service route baseline, and the new assignment contract.
- TypeScript/build: `npx tsc --noEmit`, focused coordinator/provider/Tier contracts, module/mode snapshots, `npm run build`.
- Static architecture contract: one capability registry drives existing bindings; Package host contains no Tier lifecycle branch; activation does not write Tier slots; `occupant_id` is action identity; `slotId` is context only; presentation imports no endpoint; future capability keys are absent; drawer refresh remains originating-section scoped.
- Documentation: `npm run docs:check`, canonical path/link checks, `git diff --check`.
- Browser verification only if a WordPress runtime is locally available; otherwise it will be reported as not performed.

## Validation outcome

Documentation checks, TypeScript compilation, the capability-host/coordinator/provider/Tier contracts, mode/module snapshots, production build, dependency-cycle audit, and diff checks pass. `dist` was rebuilt and its superseded hashed drawer chunk removed. PHP contracts were not run because PHP is unavailable. Browser verification was not performed because the repository exposes no local WordPress runtime configuration; consequently no Project History milestone was created.
