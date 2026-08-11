<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Commands;

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;

final class DeclarationBackfillCommand
{
    public function __invoke(array $args, array $assocArgs): void
    {
        $result = (new PackageRepository())->backfillCustomerDeclarations();
        \WP_CLI::log((string) json_encode($result));
        if ($result['failed'] > 0) {
            \WP_CLI::warning('Some declarations could not be resolved and remain unmarked.');
        }
        \WP_CLI::success('Package declaration backfill completed.');
    }
}
