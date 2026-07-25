# Cost Builder Backend Boundary

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

- `CostBuilderModule.php` — module wiring.
- `Http/CostBuilderController.php` — public projection and privileged import/dry-run routes.
- `Services/PricingBuilder.php` — public catalogue, Package, Promotion, Bundle, and FAQ projection.
- `Services/CatalogImporter.php` — validated catalogue import.
- `Repositories/ServiceRepository.php` — Service catalogue queries/projection inputs.
- `Support/MetaSchema.php` / `PriceParser.php` — pricing shape and parsing.

## Boundaries

This module owns the public pricing projection and `cz_service_pricing`, not Service lifecycle or Package Station persistence. Package data comes from `SurfacePackages/Repositories/PackageRepository.php` already indexed through active Family assignments; covered unresolved Services fail closed without legacy pricing. Do not duplicate admin lifecycle, request submission, public frontend state, or Package schemas here.

Read [Cost Builder](../../../../../../docs/code-map/cost-builder.md), [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md), and [Tiers](../../../../../../docs/code-map/tiers.md).

## Validation

From the plugin root: `php tests/tier-instance-public-projection.php`, `php tests/tier-pricing-parity.php`, `npm run contract:cost-builder-isolation`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
