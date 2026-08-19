<?php

declare(strict_types=1);

// Final Phase 9 architecture sentinel. Detailed lifecycle behaviour remains in
// the focused migration, mutation, guard, Family-flow, peer-isolation, and
// public-projection tests; this file verifies the retired storage/route seams
// and the negative ownership constraints that must hold across the subsystem.

$tierCapabilityInvariantRoutes = [];

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_key')) {
    function sanitize_key(mixed $value): string
    {
        return strtolower((string) preg_replace('/[^a-z0-9_\-]/', '', (string) $value));
    }
}
if (!function_exists('register_rest_route')) {
    function register_rest_route(string $namespace, string $route, array $args = [], bool $override = false): bool
    {
        global $tierCapabilityInvariantRoutes;
        $tierCapabilityInvariantRoutes[] = $route;
        return true;
    }
}
if (!function_exists('add_action')) {
    function add_action(string $hook, callable $callback, int $priority = 10, int $args = 1): bool { return true; }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

function check_tier_capability_invariant(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier capability invariants: ' . $message);
    }
}

/** @return list<string> */
function tier_capability_source_files(string $directory): array
{
    if (!is_dir($directory)) {
        return [];
    }

    $files = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($iterator as $file) {
        if (!$file instanceof SplFileInfo || !$file->isFile()) {
            continue;
        }
        if (in_array(strtolower($file->getExtension()), ['php', 'ts', 'tsx'], true)) {
            $files[] = $file->getPathname();
        }
    }
    sort($files);
    return $files;
}

// Run the focused behavioral contracts in isolated PHP processes. Their
// WordPress doubles intentionally use global function names, so process
// isolation preserves each mature fixture instead of copying it into this
// final matrix or weakening it to source text.
$behavioralMatrix = [
    'package-manager-schema.php',
    'active-package-contract.php',
    'tier-instance-schema.php',
    'tier-instance-migration.php',
    'tier-instance-mutations.php',
    'tier-occupant-compatibility.php',
    'tier-occupant-is-addon.php',
    'tier-addon-end-to-end.php',
    'tier-instance-guards.php',
    'tier-assignment-schema.php',
    'tier-assignment-family-flow.php',
    'package-capability-peer-isolation.php',
    'package-category-groups.php',
    'tier-instance-public-projection.php',
    'tier-public-projection-is-addon.php',
    'tier-pricing-parity.php',
];
foreach ($behavioralMatrix as $testFile) {
    $command = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__DIR__ . '/' . $testFile) . ' 2>&1';
    $output = [];
    $status = 0;
    exec($command, $output, $status);
    check_tier_capability_invariant(
        $status === 0,
        "focused contract {$testFile} failed:\n" . implode("\n", $output)
    );
}

// Canonical storage declares the independent peers and no retired global Tier
// mirror. Lossless read lift and atomic write pruning are exercised separately
// by tier-instance-migration.php.
$fresh = (new PackageRepository())->defaultStation();
check_tier_capability_invariant($fresh['tier_instances'] === [], 'fresh station declares an empty Tier-instance collection');
check_tier_capability_invariant($fresh['tier_assignments'] === [], 'fresh station declares an empty assignment ledger');
foreach (['tiers', 'occupant_bin', 'popular_tier', 'popular_label'] as $legacyKey) {
    check_tier_capability_invariant(
        !array_key_exists($legacyKey, $fresh),
        "fresh station contains no retired top-level {$legacyKey} key"
    );
}
foreach (['capabilities', 'capability_assignments', 'activations'] as $genericKey) {
    check_tier_capability_invariant(
        !array_key_exists($genericKey, $fresh),
        "fresh station contains no generic {$genericKey} storage"
    );
}

// Neither peer schema can represent the other. These are hostile behavioral
// inputs, not source scans, so a renamed implementation cannot evade the rule.
$family = PackageCategoryGroups::sanitizeAll([[
    'group_id' => 'pcg_invariant',
    'label' => 'Invariant Family',
    'platform_status' => 'active',
    'tier_instance_id' => 'ti_forbidden',
    'tier_assignments' => [['assignment_id' => 'tasg_forbidden']],
    'assignment_id' => 'tasg_forbidden',
    'capability_key' => 'tier',
]])[0];
foreach (array_keys($family) as $key) {
    check_tier_capability_invariant(
        !preg_match('/^(tier|assignment|capability)/', $key),
        "Family sanitiser rejects cross-peer field {$key}"
    );
}

$instance = TierInstanceSchema::sanitizeInstance([
    'tier_instance_id' => 'ti_invariant',
    'title' => 'Invariant Tiers',
    'status' => 'disabled',
    'tiers' => TierInstanceSchema::emptyTierMap(),
    'consumer_type' => 'package_family',
    'consumer_id' => 'pcg_invariant',
    'family_id' => 'pcg_invariant',
    'group_id' => 'pcg_invariant',
]);
check_tier_capability_invariant($instance !== null, 'valid Tier instance sanitises');
foreach (array_keys($instance ?? []) as $key) {
    check_tier_capability_invariant(
        !preg_match('/^(consumer|family|group)/', $key),
        "Tier-instance sanitiser rejects cross-peer field {$key}"
    );
}

// Route capture validates the executable registration contract. It is stronger
// than counting source strings and deliberately does not encode the stale
// blueprint count of retired aliases.
(new PackageStationController(new PackageRepository()))->registerRoutes();
$routeSet = array_fill_keys($tierCapabilityInvariantRoutes, true);
$instanceBase = '/admin/services/(?P<id>\d+)/package-station/tier-instances/(?P<instance>[a-z0-9_]+)';
foreach ([
    '/read',
    '/tiers/(?P<tier>[a-z]+)',
    '/tiers/(?P<tier>[a-z]+)/enabled',
    '/tiers/(?P<tier>[a-z]+)/modules/(?P<module>[a-z_]+)',
    '/tiers/(?P<tier>[a-z]+)/archive',
    '/bin/(?P<bin>[a-z0-9_]+)/restore',
    '/bin/(?P<bin>[a-z0-9_]+)/trash',
    '/bin/(?P<bin>[a-z0-9_]+)',
    '/tiers/(?P<tier>[a-z]+)/modules/(?P<module>overview|features|faqs|commercial_schedule)/revert',
    '/tiers/(?P<tier>[a-z]+)/settle',
    '/popular',
] as $suffix) {
    check_tier_capability_invariant(
        isset($routeSet[$instanceBase . $suffix]),
        "scoped Tier route {$suffix} remains registered"
    );
}

$legacyBase = '/admin/services/(?P<id>\d+)/package-station';
foreach (array_keys($routeSet) as $route) {
    $isLegacyTierRoute = $route === $legacyBase
        || str_starts_with($route, $legacyBase . '/tiers/')
        || str_starts_with($route, $legacyBase . '/bin/')
        || $route === $legacyBase . '/popular';
    check_tier_capability_invariant(!$isLegacyTierRoute, "retired unscoped route {$route} is absent");
}

// Negative symbol sentinels are deliberately exact and source-scoped. They
// complement the behavioral schema tests above; they do not attempt to prove
// architecture through broad words such as "capability" or "instance".
$root = dirname(__DIR__);
$platformSource = '';
foreach (array_merge(
    tier_capability_source_files($root . '/src'),
    tier_capability_source_files($root . '/resources/ts')
) as $file) {
    $platformSource .= "\n" . (string) file_get_contents($file);
}
foreach ([
    'capability_key',
    'capability_assignments',
    'CapabilityActivation',
    'capability_activation',
    'activateCapability',
] as $forbiddenSymbol) {
    check_tier_capability_invariant(
        !str_contains($platformSource, $forbiddenSymbol),
        "forbidden generic symbol {$forbiddenSymbol} is absent"
    );
}

$managerSource = '';
foreach (array_merge(
    tier_capability_source_files($root . '/resources/ts/station-manager'),
    tier_capability_source_files($root . '/src/Modules/StationManager')
) as $file) {
    $managerSource .= "\n" . (string) file_get_contents($file);
}
foreach ([
    'TierAssignment',
    'tier_assignment',
    'tier-instance',
    'tier_instance',
    'eligibleConsumer',
    'package_family',
] as $forbiddenManagerSymbol) {
    check_tier_capability_invariant(
        !str_contains($managerSource, $forbiddenManagerSymbol),
        "Station Manager contains no Package rule {$forbiddenManagerSymbol}"
    );
}

echo "Tier capability invariant checks passed.\n";
