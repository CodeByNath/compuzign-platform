<?php

namespace CompuZign\Platform\Modules\Promotions;

use CompuZign\Platform\Modules\Promotions\Http\PromotionsController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;

/**
 * Promotions module — backend only.
 *
 * Owns the Promotion REST handlers that previously lived in
 * AdminServicesController. Deliberately narrow: Promotions are a child
 * collection of the Package Station and hold no storage, schema, or repository
 * of their own — every read/write goes through PackageRepository
 * (cz_package_station), which remains the single commercial authority.
 *
 * This module therefore wires one controller and nothing else. Do not add
 * repositories, schemas, or providers here unless Promotions genuinely acquire
 * state that the Package Station does not already own.
 *
 * There is no Promotions frontend station or UI; the existing admin UI keeps
 * calling the unchanged nested URLs.
 */
class PromotionsModule
{
    public function register(): void
    {
        (new PromotionsController(new PackageRepository()))->register();
    }
}
