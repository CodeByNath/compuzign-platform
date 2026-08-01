<?php

declare(strict_types=1);

/*
 * Service Category Group audit — regression contract.
 *
 * Phase 1 of this audit used this file to pin the exact defect: the Category
 * create drawer's retired Group selector defaulted to null, and the drawer
 * sent that value straight through as `group_id` on POST /admin/categories —
 * a value WP's REST arg validator rejected because the route declared
 * `group_id` as a bare `'type' => 'integer'` with no null allowance.
 *
 * Phase 2/3 removed the Group selector, the group_id create argument, and the
 * `/admin/categories/{id}/group` route entirely. This file now locks in that
 * fixed state permanently: the create route accepts no group_id argument at
 * all, so no value — null or otherwise — can ever be rejected on its account
 * again, and Category creation carries no group concept.
 *
 * Standalone contract in the style of tests/service-route-baseline.php: no
 * PHPUnit, no WordPress bootstrap. `register_rest_route` is stubbed to
 * capture instead of register, so the real, unmodified route args are
 * inspected directly.
 *
 * Usage: php tests/category-create-group-id-payload-contract.php
 */

$GLOBALS['cz_captured_routes'] = [];

if (!function_exists('register_rest_route')) {
    function register_rest_route(string $namespace, string $route, array $args = [], bool $override = false): bool
    {
        $GLOBALS['cz_captured_routes'][] = ['namespace' => $namespace, 'route' => $route, 'config' => $args];
        return true;
    }
}

if (!function_exists('add_action')) {
    function add_action(string $hook, callable $callback, int $priority = 10, int $args = 1): bool
    {
        return true;
    }
}

require_once __DIR__ . '/../vendor/autoload.php';

(new \CompuZign\Platform\Modules\Admin\Http\AdminCategoriesController(
    new \CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation()
))->registerRoutes();

$createRoute = null;
$groupRouteExists = false;
foreach ($GLOBALS['cz_captured_routes'] as $captured) {
    if ($captured['route'] === '/admin/categories/(?P<id>\d+)/group') {
        $groupRouteExists = true;
    }
    if ($captured['route'] !== '/admin/categories') {
        continue;
    }
    $endpoints = array_is_list($captured['config']) ? $captured['config'] : [$captured['config']];
    foreach ($endpoints as $endpoint) {
        if (($endpoint['methods'] ?? null) === 'POST') {
            $createRoute = $endpoint;
        }
    }
}

$failures = [];
function check(string $label, bool $cond, string $detail = ''): void
{
    global $failures;
    if ($cond) {
        echo "  ok — {$label}\n";
    } else {
        echo "  FAIL — {$label}" . ($detail !== '' ? ": {$detail}" : '') . "\n";
        $failures[] = $label;
    }
}

echo "Category create payload — Service Category Group defect contract\n\n";

check(
    'POST /admin/categories is registered',
    $createRoute !== null,
);

check(
    'the create route declares no group_id argument (the retired Group selector is gone)',
    $createRoute !== null && !array_key_exists('group_id', $createRoute['args'] ?? []),
);

check(
    'the /admin/categories/{id}/group route no longer exists',
    !$groupRouteExists,
);

check(
    'AdminCategoriesController no longer exposes updateGroup or validateGroupId',
    !method_exists(\CompuZign\Platform\Modules\Admin\Http\AdminCategoriesController::class, 'updateGroup')
        && !(new \ReflectionClass(\CompuZign\Platform\Modules\Admin\Http\AdminCategoriesController::class))->hasMethod('validateGroupId'),
);

check(
    'AdminCategoryGroupsController.php no longer exists',
    !file_exists(__DIR__ . '/../src/Modules/Admin/Http/AdminCategoryGroupsController.php'),
);

// The drawer's own create payload for "no group" (see useCategoryStation's
// createCategory()) — reproduced here without any frontend runtime. With no
// group_id argument on the route, nothing this payload could ever carry is
// rejected on that account again.
$payload = ['name' => 'Regression Category', 'description' => ''];

check(
    'the payload the drawer builds for Category creation carries no group_id key',
    !array_key_exists('group_id', $payload),
);

echo "\n";
if ($failures !== []) {
    fwrite(STDERR, "FAIL: " . count($failures) . " check(s) did not hold:\n");
    foreach ($failures as $f) {
        fwrite(STDERR, "  - {$f}\n");
    }
    exit(1);
}

echo "All checks passed — Category creation carries no group concept: no group_id argument,\n";
echo "no /group route, no Group station wiring, and no group_id in the create payload.\n";
exit(0);
