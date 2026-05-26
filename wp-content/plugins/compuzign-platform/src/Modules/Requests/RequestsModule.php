<?php

namespace CompuZign\Platform\Modules\Requests;

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Modules\Requests\Http\RequestsController;

class RequestsModule
{
    public function register(): void
    {
        (new RequestsController())->register();

        Health::register('requests', static fn() => function_exists('wp_verify_nonce'));
    }
}
