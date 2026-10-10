<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\Account\Support;

/** Other writers kept committing first for the whole bounded retry budget; nothing was written and the caller must retry. */
final class AccountStorageBusy extends \RuntimeException {}
