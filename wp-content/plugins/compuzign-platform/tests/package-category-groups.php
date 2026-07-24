<?php

declare(strict_types=1);

// Focused standalone contract test for the Package Category Group station
// (Package-owned commercial buckets, e.g. KAIROS). Same harness style as
// package-manager-schema.php: no PHPUnit, no WordPress bootstrap.
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string
    {
        return trim(strip_tags((string) $value));
    }
}

require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageCategoryGroups.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageManagerSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageStationSchema.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups as PCG;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema as PMS;

function assertSameValue(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

function assertThrows(callable $fn, string $class, string $message): void
{
    try {
        $fn();
    } catch (\Throwable $e) {
        if ($e instanceof $class) {
            return;
        }
        fwrite(STDERR, "FAIL: {$message} — wrong exception " . get_class($e) . "\n");
        exit(1);
    }
    fwrite(STDERR, "FAIL: {$message} — no exception thrown\n");
    exit(1);
}

// ── Create: born disabled, overview pending (station create semantics) ────────

$created = PCG::create([], 'KAIROS', 'Branded commercial bucket.', 'pcg_kairos');
$groups  = $created['groups'];
assertSameValue(1, count($groups), 'create adds one group');
assertSameValue('pcg_kairos', $groups[0]['group_id'], 'explicit identity is honoured');
assertSameValue('disabled', $groups[0]['platform_status'], 'group is born disabled');
assertSameValue('pending', $groups[0]['module_status']['overview'], 'overview is pending on creation');
assertSameValue(null, $groups[0]['overview_draft'], 'no draft on creation');

assertThrows(fn() => PCG::create($groups, 'APTOS', '', 'pcg_kairos'), \InvalidArgumentException::class, 'duplicate identity is rejected');
assertThrows(fn() => PCG::create($groups, '   '), \InvalidArgumentException::class, 'empty name is rejected');

// ── Overview draft → settle / revert ──────────────────────────────────────────

$groups = PCG::saveOverviewDraft($groups, 'pcg_kairos', 'KAIROS Prime', 'Updated description.');
assertSameValue(['label' => 'KAIROS Prime', 'description' => 'Updated description.'], $groups[0]['overview_draft'], 'draft carries pending edits');
assertSameValue('pending', $groups[0]['module_status']['overview'], 'draft save marks overview pending');
assertSameValue('KAIROS', $groups[0]['label'], 'settled label untouched by draft save');

$projection = PCG::projection($groups[0]);
assertSameValue('KAIROS Prime', $projection['label'], 'projection prefers the draft');
assertSameValue(true, $projection['has_draft'], 'projection reports the draft');

$reverted = PCG::revertOverview($groups, 'pcg_kairos');
assertSameValue(null, $reverted[0]['overview_draft'], 'revert discards the draft');
assertSameValue('KAIROS', $reverted[0]['label'], 'revert leaves settled data unchanged');
assertSameValue('settled', $reverted[0]['module_status']['overview'], 'revert re-derives settled from complete label');

$groups = PCG::saveOverviewDraft($groups, 'pcg_kairos', 'KAIROS Prime', 'Updated description.');
$groups = PCG::settleOverview($groups, 'pcg_kairos');
assertSameValue('KAIROS Prime', $groups[0]['label'], 'settle commits the draft label');
assertSameValue('Updated description.', $groups[0]['description'], 'settle commits the draft description');
assertSameValue(null, $groups[0]['overview_draft'], 'settle clears the draft');
assertSameValue('settled', $groups[0]['module_status']['overview'], 'settle marks overview settled');

// ── Lifecycle: engine transitions only ────────────────────────────────────────

$groups = PCG::applyStatus($groups, 'pcg_kairos', 'active');
assertSameValue('active', $groups[0]['platform_status'], 'publish activates');

$groups = PCG::applyStatus($groups, 'pcg_kairos', 'archived');
assertSameValue('archived', $groups[0]['platform_status'], 'archive transitions');
assertSameValue('active', $groups[0]['previous_platform_status'], 'archive captures previous live status');

$groups = PCG::applyStatus($groups, 'pcg_kairos', 'trashed');
assertSameValue('trashed', $groups[0]['platform_status'], 'archived to trashed is legal');
assertSameValue('active', $groups[0]['previous_platform_status'], 'bin-to-bin keeps original previous status');

$groups = PCG::restore($groups, 'pcg_kairos');
assertSameValue('disabled', $groups[0]['platform_status'], 'restore always lands disabled — never straight to active');
assertSameValue(null, $groups[0]['previous_platform_status'], 'restore clears previous status');

assertThrows(fn() => PCG::restore($groups, 'pcg_kairos'), \InvalidArgumentException::class, 'restore from a live state is illegal');
assertThrows(fn() => PCG::applyStatus($groups, 'pcg_kairos', 'draft'), \InvalidArgumentException::class, 'draft is not a requestable target');
assertThrows(fn() => PCG::applyStatus($groups, 'missing', 'active'), \InvalidArgumentException::class, 'unknown identity 404s');

// ── Delete: trashed-only + dependency guard ───────────────────────────────────

$noDeps = ['services' => 0, 'rate_sheet_rows' => 0, 'tier_selections' => 0];
assertThrows(fn() => PCG::delete($groups, 'pcg_kairos', $noDeps), \InvalidArgumentException::class, 'delete outside trashed is illegal');

$groups = PCG::applyStatus($groups, 'pcg_kairos', 'trashed');
assertThrows(
    fn() => PCG::delete($groups, 'pcg_kairos', ['services' => 1, 'rate_sheet_rows' => 0, 'tier_selections' => 0]),
    \RuntimeException::class,
    'connected services block permanent delete'
);
$deleted = PCG::delete($groups, 'pcg_kairos', $noDeps);
assertSameValue([], $deleted, 'guard-clean trashed group deletes');

// ── Manager sanitize: assignment normalisation + registry preservation ────────

$manager = PMS::sanitize([
    'sources' => [
        ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 10, 'category_group_id' => 'pcg_kairos'],
        ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 22, 'category_group_id' => 'pcg_ghost'],
    ],
    'category_groups' => [[
        'group_id' => 'pcg_kairos', 'label' => 'KAIROS', 'description' => '',
        'platform_status' => 'active', 'module_status' => ['overview' => 'settled'],
    ]],
]);
assertSameValue('pcg_kairos', $manager['sources'][0]['category_group_id'], 'live assignment is preserved');
assertSameValue(null, $manager['sources'][1]['category_group_id'], 'unknown group assignment reassigns to null, never drops the source');
assertSameValue(1, count($manager['category_groups']), 'group registry survives sanitize');
assertSameValue(true, PMS::hasConfiguration($manager), 'a group registry marks the Manager configured');

// A manager configuration commit never creates or removes groups.
$committed = PMS::commitConfiguration(
    $manager,
    [],
    [],
    [['id' => 'inc-a', 'label' => 'Feature A']],
    [],
    null,
    $manager['sources']
);
assertSameValue($manager['category_groups'], $committed['category_groups'], 'commitConfiguration preserves the group registry untouched');
assertSameValue('pcg_kairos', $committed['sources'][0]['category_group_id'], 'commit preserves source assignments');

// ── Read model: registry projection + provenance passthrough ─────────────────

$pool = [[
    'id' => 'inc-a', 'label' => 'Feature A', '_source_available' => true,
    '_source_service_id' => 10, '_source_service_title' => 'Virtual Machines',
    '_source_categories' => ['Compute'],
]];
$model = PMS::buildReadModel(10, $manager, $pool, [], 'active');
assertSameValue('KAIROS', $model['category_groups'][0]['label'], 'read model projects the group registry');
assertSameValue(10, $model['items'][0]['source_service_id'], 'read model carries supplying-service provenance');
assertSameValue('Virtual Machines', $model['items'][0]['source_service_title'], 'read model carries supplying-service title');
assertSameValue(['Compute'], $model['items'][0]['source_categories'], 'read model carries Service-owned category names');

// Pools without provenance (legacy callers) stay null-safe.
$bareModel = PMS::buildReadModel(10, $manager, [['id' => 'inc-a', 'label' => 'Feature A']], [], 'active');
assertSameValue(null, $bareModel['items'][0]['source_service_id'], 'provenance is null-safe for bare pools');

// ── Dependency counting across the station ────────────────────────────────────

$rateItemId = 'rate_dep_row';
$station = [
    'package_manager' => [
        'sources' => $manager['sources'],
        'category_groups' => $manager['category_groups'],
        'groups' => [],
        'items' => [],
        'rate_sheets' => [[
            'rate_sheet_id' => 'rs_primary',
            'title' => 'Catalogue',
            'status' => 'active',
            'groups' => [],
            'items' => [[
                'item_id' => $rateItemId,
                'source_item_id' => $model['items'][0]['item_id'],
                'unit_price' => 5.0, 'per' => 'Per item', 'quantity' => 1,
                'group_id' => null, 'sort_order' => 0,
            ]],
        ]],
    ],
    'tiers' => [
        // basic carries no rate_sheet_id — a legacy occupant defaults to the
        // migrated primary sheet, matching the row above by (rate_sheet_id, item_id).
        'basic' => ['occupant' => ['rate_sheet_items' => [['item_id' => $rateItemId, 'quantity' => 2]]]],
        'standard' => ['rate_sheet_items' => [['item_id' => 'unrelated', 'quantity' => 1]]],
    ],
];
$deps = PCG::dependents($station, $model['items'], 'pcg_kairos');
assertSameValue(1, $deps['services'], 'assigned source counts as a dependent service');
assertSameValue(1, $deps['rate_sheet_rows'], 'rate sheet rows supplied by member services count');
assertSameValue(1, $deps['tier_selections'], 'tier selections referencing dependent rows count');

// Refinement 3 — a Tier bound to a DIFFERENT sheet does not count against this
// Family's rows, even when the item_id collides across sheets.
$otherSheetStation = $station;
$otherSheetStation['tiers']['premium'] = ['current_occupant' => [
    'rate_sheet_id' => 'rs_other',
    'rate_sheet_items' => [['item_id' => $rateItemId, 'quantity' => 1]],
]];
$scopedDeps = PCG::dependents($otherSheetStation, $model['items'], 'pcg_kairos');
assertSameValue(1, $scopedDeps['tier_selections'], 'a selection in another sheet is not counted against this sheet\'s rows');
assertSameValue([10], PCG::relatedServiceIds($station, 'pcg_kairos'), 'Package Family read projection preserves native related Service IDs');

$noDepGroup = PCG::dependents($station, $model['items'], 'pcg_other');
assertSameValue(['services' => 0, 'rate_sheet_rows' => 0, 'tier_selections' => 0], $noDepGroup, 'unrelated group has no dependents');

fwrite(STDOUT, "PackageCategoryGroups contract tests passed.\n");
