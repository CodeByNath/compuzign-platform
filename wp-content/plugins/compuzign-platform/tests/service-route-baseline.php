<?php

declare(strict_types=1);

/*
 * Service Station extraction — route contract baseline (Phase 0, transitional).
 *
 * Focused standalone contract test, in the style of the other tests/ scripts:
 * the plugin has no PHPUnit/bootstrap suite. Route registration is pure apart
 * from the WordPress registration function itself, which is stubbed below to
 * record instead of register. No plugin runtime code is modified or loaded by
 * WordPress because of this file.
 *
 * WHY THIS EXISTS
 * The Service Station extraction moved REST handlers between classes: Package
 * Station and Promotions left the former AdminServicesController, then the
 * Service handlers themselves moved to src/Modules/Service. Every
 * Service-scoped URL, method, permission callback, and argument definition had
 * to survive those moves byte-for-byte. This captures the whole surface so any
 * drift fails loudly.
 *
 * THE KEY DESIGN DECISION: the baseline is deliberately CLASS-AGNOSTIC.
 * A record identifies its callback by method name only ("listServices"), never
 * by owning class. Moving a handler between controllers is therefore a no-op
 * here — which is exactly the point: the fixture proves the *contract* is
 * unchanged while the *ownership* changes. Records are sorted, so registration
 * order may change freely too.
 *
 * As handlers move, add their new class to CONTROLLERS below. The captured
 * union must stay identical. A route that vanishes from the union is a genuine
 * regression; a route that changes class is invisible, by design.
 *
 * LIMIT OF THIS HARNESS: it proves the request contract (path, method,
 * permission, args), not response bodies. Response shapes need a live
 * WordPress runtime and database, which is not available locally. Those remain
 * guarded by the TypeScript interfaces in resources/ts/api/types/admin.ts via
 * `npx tsc --noEmit`.
 *
 * Usage:  php tests/service-route-baseline.php            (compare; exit 1 on drift)
 *         php tests/service-route-baseline.php --update   (rewrite the baseline)
 *
 * Remove this harness when the extraction is complete and its phases are merged.
 */

// ── WordPress stubs (registration-time only) ─────────────────────────────────

/** @var array<int, array<string, mixed>> */
$GLOBALS['cz_captured_routes'] = [];

if (!function_exists('register_rest_route')) {
    function register_rest_route(string $namespace, string $route, array $args = [], bool $override = false): bool
    {
        $GLOBALS['cz_captured_routes'][] = [
            'namespace' => $namespace,
            'route'     => $route,
            'config'    => $args,
        ];
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

// ── Controllers under contract ───────────────────────────────────────────────
//
// Every class that registers a route touched by the extraction. Add new owners
// here as phases move handlers; do not remove an entry until its routes are
// genuinely retired. Factories rather than class names, because controllers may
// take constructor dependencies (the repositories they already used before the
// move — construction here must mirror the module's real wiring).
$controllers = [
    static fn() => new \CompuZign\Platform\Modules\Service\Http\ServiceController(),
    static fn() => new \CompuZign\Platform\Modules\Admin\Http\AdminCategoriesController(),
    static fn() => new \CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationController(
        new \CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository()
    ),
    static fn() => new \CompuZign\Platform\Modules\Promotions\Http\PromotionsController(
        new \CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository()
    ),
];

// ── Capture ──────────────────────────────────────────────────────────────────

/** Reduce a callback to a stable, class-agnostic identity. */
function normalizeCallback(mixed $callback): string
{
    if (is_string($callback)) {
        return $callback;
    }
    if (is_array($callback) && count($callback) === 2) {
        // [$this, 'method'] — the method name is the stable part.
        return (string) $callback[1];
    }
    if ($callback instanceof \Closure) {
        return '<closure>';
    }
    return '<unknown>';
}

/** Recursively normalize an argument definition into deterministic order. */
function normalizeArgs(mixed $value): mixed
{
    if (!is_array($value)) {
        return is_scalar($value) || $value === null ? $value : normalizeCallback($value);
    }

    $isList = array_is_list($value);
    $out    = [];
    foreach ($value as $key => $item) {
        $out[$key] = in_array($key, ['sanitize_callback', 'validate_callback', 'permission_callback'], true)
            ? normalizeCallback($item)
            : normalizeArgs($item);
    }

    // Lists keep their order (enums are order-sensitive); maps are sorted.
    if (!$isList) {
        ksort($out);
    }

    return $out;
}

/** Expand one register_rest_route() call into one record per endpoint. */
function normalizeEndpoints(string $namespace, string $route, array $config): array
{
    // register_rest_route accepts a single endpoint config or a list of them.
    $endpoints = array_is_list($config) ? $config : [$config];
    $records   = [];

    foreach ($endpoints as $endpoint) {
        if (!is_array($endpoint) || !isset($endpoint['methods'])) {
            continue;
        }

        $methods = $endpoint['methods'];
        $records[] = [
            'route'               => $namespace . $route,
            'methods'             => is_array($methods) ? implode(',', $methods) : (string) $methods,
            'callback'            => normalizeCallback($endpoint['callback'] ?? null),
            'permission_callback' => normalizeCallback($endpoint['permission_callback'] ?? null),
            'args'                => normalizeArgs($endpoint['args'] ?? []),
        ];
    }

    return $records;
}

foreach ($controllers as $makeController) {
    $makeController()->registerRoutes();
}

$records = [];
foreach ($GLOBALS['cz_captured_routes'] as $captured) {
    foreach (normalizeEndpoints($captured['namespace'], $captured['route'], $captured['config']) as $record) {
        $records[] = $record;
    }
}

// Deterministic order: registration order is free to change as handlers move.
usort($records, static function (array $a, array $b): int {
    return [$a['route'], $a['methods'], $a['callback']] <=> [$b['route'], $b['methods'], $b['callback']];
});

$snapshot = [
    'contract' => 'service-route-baseline.v1',
    'routes'   => $records,
];

$encoded = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
if ($encoded === false) {
    fwrite(STDERR, "FAIL: unable to encode snapshot\n");
    exit(1);
}

// ── Compare or update ────────────────────────────────────────────────────────

$fixture = __DIR__ . '/fixtures/service-route-baseline.json';
$update  = in_array('--update', $argv, true);

if ($update || !file_exists($fixture)) {
    file_put_contents($fixture, $encoded);
    printf("Baseline written: %d routes → tests/fixtures/service-route-baseline.json\n", count($records));
    exit(0);
}

$expected = file_get_contents($fixture);
if ($expected === $encoded) {
    printf("OK: %d routes match the baseline.\n", count($records));
    exit(0);
}

// Report the drift in contract terms rather than as a raw text diff.
$expectedRoutes = json_decode($expected, true)['routes'] ?? [];
$key = static fn(array $r): string => $r['methods'] . ' ' . $r['route'];

$before = [];
foreach ($expectedRoutes as $r) {
    $before[$key($r)] = $r;
}
$after = [];
foreach ($records as $r) {
    $after[$key($r)] = $r;
}

fwrite(STDERR, "FAIL: route contract drift.\n");
foreach (array_diff_key($before, $after) as $k => $_) {
    fwrite(STDERR, "  REMOVED: {$k}\n");
}
foreach (array_diff_key($after, $before) as $k => $_) {
    fwrite(STDERR, "  ADDED:   {$k}\n");
}
foreach (array_intersect_key($before, $after) as $k => $r) {
    if ($r !== $after[$k]) {
        fwrite(STDERR, "  CHANGED: {$k}\n");
        fwrite(STDERR, "    expected: " . json_encode($r, JSON_UNESCAPED_SLASHES) . "\n");
        fwrite(STDERR, "    actual:   " . json_encode($after[$k], JSON_UNESCAPED_SLASHES) . "\n");
    }
}
fwrite(STDERR, "\nIf this change is intended, re-run with --update and review the fixture diff.\n");
exit(1);
