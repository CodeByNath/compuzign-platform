# Cost Builder Backend Boundary

## Audit metadata

Last audited: 2026-07-13 21:51 Australia/Brisbane
Audited commit: `7026fd74a339805cc29e98c1340a01349c4fa2d6` (current working-tree changes reviewed)
Audited paths:
- `wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/CostBuilderModule.php`
- `wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Http/CostBuilderController.php`
- `wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Repositories/ServiceRepository.php`
- `wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PricingBuilder.php`
- `wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/CatalogImporter.php`
- `wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Support/MetaSchema.php`
- `wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Support/PriceParser.php`
Changes in audited revision: Current public projection, catalogue repository, import, metadata, and price parsing boundaries were reviewed; no folder-local working-tree source changes were present.

## Entry guide

This module owns the public Cost Builder backend and catalogue import boundary. `CostBuilderModule.php` wires the module; `CostBuilderController.php` registers the public projection plus privileged import/dry-run routes; `PricingBuilder.php` assembles visible categories, Services, Tiers, packages, promotions, bundles, and FAQs; `CatalogImporter.php` validates/imports catalogue data; `PriceParser.php` normalizes price input.

`ServiceRepository.php` is the Service query/projection boundary, while WordPress posts, taxonomies, and registered metadata remain persistence authorities. Package data comes from `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php`. Do not duplicate Package Station storage, admin lifecycle, public frontend state, request submission, metadata schemas, or visibility/readiness rules.

Read [Cost Builder](../../../../../../docs/code-map/cost-builder.md), [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md), [Tiers](../../../../../../docs/code-map/tiers.md), and [Quote Builder](../../../../../../docs/code-map/quote-builder.md). Read [Project History guidance](../../../../../../docs/project-history/000-README.md); [Package Category Groups v1](../../../../../../docs/project-history/PackageCategoryGroups-v1.md) records why Package Category Groups are deliberately not yet projected into this module's public payload.

On entry: compare audited paths with current files. If the projection/import boundary still matches, audit only changed or undocumented areas.

## Exit guide

After relevant changes, replace audit metadata and stale current-state information. Update related Code Maps and, with user approval, a new Project History milestone for significant architecture, behavior, ownership, migration, lifecycle, or important design changes. Verify every path; never append audit logs.

With multiple agents, declare non-overlapping scopes, never reset/clean/restore unrelated work, and report overlap before finishing.
