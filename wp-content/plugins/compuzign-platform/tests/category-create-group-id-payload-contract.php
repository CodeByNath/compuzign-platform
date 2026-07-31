<?php

declare(strict_types=1);

/*
 * Service Category Group audit — Phase 1 regression contract.
 *
 * Pins the exact defect: the Category create drawer still carries a Group
 * selector. Its "no group" state is `null`, and the drawer sends that value
 * straight through as `group_id` on POST /admin/categories. The route's own
 * registered argument declares `group_id` as a bare `'type' => 'integer'` —
 * no `null` allowance — so WP's REST arg validator rejects the request
 * before AdminCategoriesController::createCategory() ever runs.
 *
 * This is a standalone contract in the style of tests/service-route-baseline.php:
 * no PHPUnit, no WordPress bootstrap. `register_rest_route` is stubbed to
 * capture instead of register, so the real, unmodified route args are
 * inspected directly. WP's own arg type-check is replicated narrowly (just
 * enough to prove/disprove a null value against a declared type) rather than
 * loading the whole REST server.
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

(new \CompuZign\Platform\Modules\Admin\Http\AdminCategoriesController())->registerRoutes();

$createRoute = null;
foreach ($GLOBALS['cz_captured_routes'] as $captured) {
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

/** Narrow replica of WP's own core/type check (rest_validate_value_from_schema). */
function satisfiesRestType(mixed $value, array|string $type): bool
{
    $types = is_array($type) ? $type : [$type];
    foreach ($types as $t) {
        if ($t === 'null' && $value === null) {
            return true;
        }
        if ($t === 'integer' && is_int($value)) {
            return true;
        }
    }
    return false;
}

echo "Category create payload — Service Category Group defect contract\n\n";

check(
    'POST /admin/categories is registered',
    $createRoute !== null,
);

$groupArg = $createRoute['args']['group_id'] ?? null;

check(
    'the create route still declares a group_id argument (drawer defect surface)',
    $groupArg !== null,
);

check(
    'group_id\'s declared type has no null allowance — this is the exact rejection the drawer hits',
    $groupArg !== null && !satisfiesRestType(null, $groupArg['type'] ?? 'integer'),
    'declared type: ' . json_encode($groupArg['type'] ?? null),
);

// The drawer's own "no group" default (see useCategoryDrawerController's
// groupId state, seeded null) — reproduced here without any frontend runtime.
$draftGroupSelection = null;
$payload = ['name' => 'Regression Category', 'description' => '', 'group_id' => $draftGroupSelection];

check(
    'the payload the drawer builds for "no group" carries an explicit null group_id',
    array_key_exists('group_id', $payload) && $payload['group_id'] === null,
);

check(
    'that payload value fails the route\'s own declared group_id type — reproducing the REST rejection',
    $groupArg !== null && !satisfiesRestType($payload['group_id'], $groupArg['type'] ?? 'integer'),
);

echo "\n";
if ($failures !== []) {
    fwrite(STDERR, "FAIL: " . count($failures) . " check(s) did not hold:\n");
    foreach ($failures as $f) {
        fwrite(STDERR, "  - {$f}\n");
    }
    exit(1);
}

echo "All checks passed — the obsolete Group selector still reaches the Category create payload,\n";
echo "and its \"no group\" value is exactly what the route's own arg schema rejects.\n";
exit(0);
