<?php

namespace CompuZign\Platform\Modules\Service;

use CompuZign\Platform\Modules\Service\Http\ServiceController;

/**
 * Service module — backend only.
 *
 * The single backend owner of the cz_service entity. Holds the catalogue,
 * detail, draft, settle/revert, lifecycle, and pool-creation handlers that
 * previously lived in Admin\Http\AdminServicesController, with route paths,
 * payloads, validation, permissions, and persistence unchanged.
 *
 * This module is the boundary: other modules wire through here and may import
 * Support\ServicePools (the Service-owned pool write path that Package Station
 * legitimately needs). Nothing outside may import ServiceController, its
 * private helpers, or its route registration.
 *
 * Deliberately narrow. cz_service persistence is WordPress post/meta, so there
 * is no repository; the entity's storage keys and REST argument definitions
 * live in Support\ServiceSchema. cz_service_pricing is NOT owned here — Cost
 * Builder remains its sole authority. Post type and taxonomy registration stay
 * with the shared Core registrars, which register every platform entity.
 *
 * There is no Service frontend station in this module; the existing admin UI
 * keeps calling the unchanged URLs.
 */
class ServiceModule
{
    public function register(): void
    {
        (new ServiceController())->register();
    }
}
