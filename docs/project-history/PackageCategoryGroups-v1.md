# Package Category Groups v1 — Package-Owned Commercial Buckets

## Date

2026-07-13 (implementation completed and validated); recorded 2026-07-14.

## Scope

Package Manager (Station Manager drawer), Package Station persistence, admin REST, and Rate Sheet filtering. Frontend: `wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/`. Backend: `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/` and `wp-content/plugins/compuzign-platform/src/Modules/Admin/`.

## Goal

Give the platform a real commercial bucket — a **Package Category Group** such as KAIROS — that groups connected Services commercially, without creating another parallel group system. Before this milestone three group encodings existed (taxonomy Category Groups over Service Categories, manager relationship groups, Rate Sheet groups) and none had a downstream consumer; the KAIROS concept had no representation because the singleton Package Station implicitly *was* the one bucket.

## What Changed

- New station collection `package_manager.category_groups` inside the single `cz_package_station` option; new nullable `category_group_id` on each Package source relationship. Additive keys — no migration; old stations sanitize clean.
- New pure support class `src/Modules/SurfacePackages/Support/PackageCategoryGroups.php` and REST family `/admin/package-category-groups` (`src/Modules/Admin/Http/AdminPackageCategoryGroupsController.php`), mirroring the taxonomy Category Group station's route grammar.
- Package Manager UI: package-provider sub-tabs relabelled **Services / Service Connections / Settings**; a Services table (`PackageServicesTable.tsx`) where the group dropdown is the connect-and-assign gesture; group station management (`PackageCategoryGroupsSection.tsx`) under Service Connections; provenance filters (`PackageRateSheetFilters.tsx`) on the Rate Sheet read view.
- Read model now carries live supplying-Service provenance (`source_service_id`, `source_service_title`, `source_categories`) resolved by `PackageRepository::sourcePools`; `/admin/services` catalog gained `inclusion_count`/`faq_count`.

## Final Architecture

**Ownership.** Package Manager owns Package Category Groups; they live only in the Package Station option, never as taxonomy terms. Services, Service Categories, descriptions, Inclusion Groups, Inclusions, and FAQs stay Service-owned. A Package Category Group is *not* a Service Category (KAIROS is a branded commercial bucket, not a technical category like Compute) and *not* an Inclusion Group (Rate Sheet groups organise catalogue rows; Package Category Groups group whole Services). Membership is recorded on the Package-owned source relationship (`category_group_id`), never on the Service record — no bare data-to-data pointers.

**Lifecycle.** Groups are full station entities on the shared `StationLifecycle` engine: born disabled with the overview module pending; overview draft → settle/revert; publish/disable; archive/trash; restore always lands disabled; permanent delete is legal only from trashed. No custom lifecycle vocabulary was introduced.

**Assignment.** Selecting a group in the Services table connects an unconnected Service (creates the source relationship) and assigns it in one gesture, inside the package provider draft — persisted by the existing manager Save flow. Unassigning does not disconnect. An assignment referencing a deleted group sanitizes to null (reassign-not-delete); it survives the group being binned.

**Dependency guards.** Delete is blocked (HTTP 409) while dependents exist: assigned Services, Rate Sheet rows supplied by member Services, and Tier selections referencing those rows. Group registry mutations never occur through the manager configuration commit — `commitConfiguration` preserves `category_groups` untouched.

**Rate Sheet provenance and filtering.** Rows keep their reference chain (`source_item_id` → manager item → namespaced Service child id) and are filterable by Package Category Group (via the supplying Service's assignment), Service Category, Service, Inclusion Group, availability, and search. Provenance is resolved live and never persisted on rows; the Service structure is never flattened, and provenance never enters commercial projections.

## Decisions and Invariants

- Do not add new group shapes; extend this registry.
- Group CRUD goes through the station endpoints; assignment goes through the manager save.
- The taxonomy Category Group station (groups of Service Categories) remains a separate concern; `station_role='group'` terms were not overloaded with Service membership.
- Deleting or archiving a source Service degrades rows (`source_missing` / unavailable) — commercial records are never silently deleted.

## Validation

`php -l` on all touched PHP; standalone contract tests `tests/package-manager-schema.php`, `tests/package-category-groups.php` (new), `tests/active-package-contract.php`, `tests/tier-pricing-parity.php`, `tests/tier-occupant-compatibility.php` — all passing; TypeScript contract scripts (provider, coordinator, active-package read-only, tier-pricing parity) — all passing after repairing pre-existing fixture drift; full `tsc --noEmit` and production Vite build clean. Runtime verification deferred to Hostinger deploy (no local WP runtime).

## Deferred Work

- **Cost Builder projection**: groups do not yet reach the public payload. Deferred so the projection can be designed once (group description, member Services, tiers, bundles, selectable inclusions) rather than leaking partial data now; `PricingBuilder` is unchanged.
- **Per-group Tier sets**: "five KAIROS Tiers" currently means the single station's five fixed tiers — exact while KAIROS is the only group. If APTOS/OMNIA later need their own tier sets, the station becomes per-group; the group registry (identity + lifecycle) is the pivot point.
- Category workstation group column (bulk assignment from the Service Category table) was not implemented in this milestone.

## Related History

None — this is the first milestone document in this directory.
