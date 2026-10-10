<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\Account\Support;

/** Another request holds the Account storage lock for longer than the bounded wait; the caller must retry. */
final class AccountStorageBusy extends \RuntimeException {}
