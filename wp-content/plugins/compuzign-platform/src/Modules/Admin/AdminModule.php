<?php

namespace CompuZign\Platform\Modules\Admin;

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Modules\Admin\Http\AdminCategoriesController;
use CompuZign\Platform\Modules\Admin\Http\AdminController;
use CompuZign\Platform\Modules\Admin\Http\AdminRequestsController;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

/**
 * AdminModule wires the authenticated admin REST controllers. It owns backend
 * validation and orchestration for Categories, requests, and overview routes.
 * It hosts no frontend surface; the admin frontend is the Admin Station, and
 * access is owned by Core\PlatformAccess.
 */
class AdminModule
{
    public function __construct(private PlatformIdentifierStation $platformIdentifiers) {}

    public function register(): void
    {
        (new AdminController())->register();
        (new AdminRequestsController())->register();
        (new AdminCategoriesController($this->platformIdentifiers))->register();
        Health::register('admin', static fn() => true);
    }
}
