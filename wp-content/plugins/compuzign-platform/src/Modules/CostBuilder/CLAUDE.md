# Cost Builder Backend Boundary

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

- `CostBuilderModule.php` — module wiring.
- `Http/CostBuilderController.php` — public projection and privileged import/dry-run routes.
- `Services/PricingBuilder.php` — public catalogue, Package, Promotion, Bundle, and FAQ projection.
- `Http/PackageBuilderController.php` / `Services/PackageFamilyPricingBuilder.php`
  — narrow direct Family-assignment customer read; never resolve through a Service.
- `Services/CatalogImporter.php` — validated catalogue import.
- `Repositories/ServiceRepository.php` — Service catalogue queries/projection inputs.
- `Support/MetaSchema.php` / `PriceParser.php` — pricing shape and parsing.

## Boundaries

This module owns the public pricing projection and `cz_service_pricing`, not Service lifecycle or Package Station persistence. Package data comes from `SurfacePackages/Repositories/PackageRepository.php` already indexed through active Family assignments; covered unresolved Services fail closed without legacy pricing. Do not duplicate admin lifecycle, request submission, public frontend state, or Package schemas here.

The Package builder terminology is locked: Family is commercial assignment
consumer; Tier Instance is the Tier-system container; occupants are plans or
add-ons; Editions are occupant children. Native IDs may support backend logic,
but existing Platform IDs travel alongside as printed commercial identifiers.

Read [Cost Builder](../../../../../../docs/code-map/cost-builder.md), [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md), [Tiers](../../../../../../docs/code-map/tiers.md), [Tier Add-on Selection](../../../../../../docs/code-map/tier-addon.md), and [Tier Edition](../../../../../../docs/code-map/tier-edition.md).

## Validation

From the plugin root: `php tests/tier-capability-invariants.php`, `php tests/tier-instance-public-projection.php`, `php tests/tier-public-projection-is-addon.php`, `php tests/tier-pricing-parity.php`, `php tests/tier-edition-public-projection.php`, `php tests/composable-customer-ux-preview.php`, `npm run contract:cost-builder-isolation`, `npm run contract:tier-addon-flow`, `npm run contract:tier-edition-switch`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
