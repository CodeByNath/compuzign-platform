<?php

namespace CompuZign\Platform\Modules\Requests;

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Modules\Requests\Http\RequestsController;
use CompuZign\Platform\Modules\Requests\Support\RequestMetaSchema;

class RequestsModule
{
    public function register(): void
    {
        (new RequestsController())->register();
        (new RequestMetaSchema())->register();

        Health::register('requests',      static fn() => function_exists('wp_verify_nonce'));
        Health::register('request_store', static fn() => post_type_exists('cz_request'));
    }
}
