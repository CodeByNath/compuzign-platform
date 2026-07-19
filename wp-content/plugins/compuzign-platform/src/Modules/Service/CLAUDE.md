# Service Backend Boundary

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

This module owns `cz_service` lifecycle, Service meta/drafts, category relationships written by its handlers, and Service inclusion/FAQ pools.

- `ServiceModule.php` — module wiring.
- `Http/ServiceController.php` — the 14 Service routes and their validation/orchestration.
- `Support/ServiceSchema.php` — Service keys, module vocabulary, sanitization, and route arguments.
- `Support/ServicePools.php` — the one public pool-write contract used by Service and Package Tier saves.

## Boundaries

There is no pass-through repository; WordPress post/meta persistence remains cohesive here. Cost Builder exclusively owns `cz_service_pricing`. Core registrars own centralized post-type/taxonomy declaration. Shared lifecycle/capability/pool-reference infrastructure remains in `Admin/Support`. Service-nested Package/Promotion URLs do not transfer their ownership here. Nothing outside this module imports `ServiceController` internals.

Frontend contracts/state live in `resources/ts/admin-station/stations/service/`; host-neutral UI lives in `resources/ts/entity-drawers/service/`.

Read [Service Station](../../../../../../docs/code-map/service-station.md) and [Service Catalogue](../../../../../../docs/code-map/service-catalogue.md).

## Validation

From the plugin root: `php tests/service-route-baseline.php`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
