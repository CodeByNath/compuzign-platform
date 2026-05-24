<?php

namespace CompuZign\Platform\Modules\Requests;

use CompuZign\Platform\Modules\Requests\Http\RequestsController;

class RequestsModule
{
    public function register(): void
    {
        (new RequestsController())->register();
    }
}
