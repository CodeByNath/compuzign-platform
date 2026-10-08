<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\Account;

use CompuZign\Platform\Modules\Account\Http\AccountController;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

/**
 * Account module — backend only (Phase 1).
 *
 * The single backend owner of Account Station's singleton Settings -> Tools
 * -> Profile tree. Settings, Tools, and Profile are Account-owned child
 * records, never separate peer Stations. No frontend Station registration
 * exists yet; Phase 2 adds the Admin-hosted presentation and drawer.
 */
final class AccountModule
{
    public function __construct(private PlatformIdentifierStation $platformIdentifiers)
    {
    }

    public function register(): void
    {
        (new AccountController($this->platformIdentifiers))->register();
    }
}
