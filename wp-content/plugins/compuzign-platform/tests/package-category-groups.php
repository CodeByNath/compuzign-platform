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
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/TierInstanceSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/TierAssignmentSchema.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups as PCG;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema as PMS;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as PS;

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
$tierSlots = [
    // A migrated canonical occupant may still have no explicit binding; its
    // preserved selection resolves against the migrated primary sheet.
    'basic' => ['occupant' => ['rate_sheet_items' => [['item_id' => $rateItemId, 'quantity' => 2]]]],
    'standard' => ['rate_sheet_items' => [['item_id' => 'unrelated', 'quantity' => 1]]],
];
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
    'tier_instances' => [[
        'tier_instance_id' => 'ti_primary',
        'tiers' => $tierSlots,
    ]],
];
$deps = PCG::dependents($station, $model['items'], 'pcg_kairos');
assertSameValue(1, $deps['services'], 'assigned source counts as a dependent service');
assertSameValue(1, $deps['rate_sheet_rows'], 'rate sheet rows supplied by member services count');
assertSameValue(1, $deps['tier_selections'], 'tier selections referencing dependent rows count');

// Canonical dependency scans count every real instance exactly once. A stale
// retired top-level mirror is never treated as authority.
$canonicalStation = $station;
$canonicalStation['tier_instances'][] = [
    'tier_instance_id' => 'ti_secondary',
    'tiers' => ['basic' => $tierSlots['basic']],
];
$canonicalStation['tiers'] = $tierSlots;
$canonicalDeps = PCG::dependents($canonicalStation, $model['items'], 'pcg_kairos');
assertSameValue(2, $canonicalDeps['tier_selections'], 'canonical dependency counts scan each instance once and never double-count the primary mirror');

// Refinement 3 — a Tier bound to a DIFFERENT sheet does not count against this
// Family's rows, even when the item_id collides across sheets.
$otherSheetStation = $station;
$otherSheetStation['tier_instances'][0]['tiers']['premium'] = ['current_occupant' => [
    'rate_sheet_id' => 'rs_other',
    'rate_sheet_items' => [['item_id' => $rateItemId, 'quantity' => 1]],
]];
$scopedDeps = PCG::dependents($otherSheetStation, $model['items'], 'pcg_kairos');
assertSameValue(1, $scopedDeps['tier_selections'], 'a selection in another sheet is not counted against this sheet\'s rows');
assertSameValue([10], PCG::relatedServiceIds($station, 'pcg_kairos'), 'Package Family read projection preserves native related Service IDs');

$noDepGroup = PCG::dependents($station, $model['items'], 'pcg_other');
assertSameValue(['services' => 0, 'rate_sheet_rows' => 0, 'tier_selections' => 0], $noDepGroup, 'unrelated group has no dependents');

// ── Active Tier slot summary — occupied ACTIVE slots vs. fixed capacity ──────
// Independent of tier_selections: a slot counts once regardless of how many
// rate-sheet rows its occupant selects, and a disabled/empty slot never
// counts even though `dependents.tier_selections` would still be nonzero for
// other slots. Cardinality is one assignment per Family, so capacity is
// always the flat 5-slot constant once assigned, never a sum across instances.

assertSameValue(
    ['occupied' => 0, 'capacity' => 0],
    PCG::activeTierSlotSummary($station, 'pcg_kairos'),
    'a Family with no Tier assignment reports zero occupied of zero capacity, not zero of five'
);

$assignedStation = $station;
$assignedStation['tier_assignments'] = [[
    'assignment_id' => 'tasg_kairos', 'consumer_type' => 'package_family',
    'consumer_id' => 'pcg_kairos', 'tier_instance_id' => 'ti_primary',
]];
// 'basic' is an occupant-format slot with an implicit active status (no
// platform_status key — defaults to 'active'); 'standard' is legacy flat
// format with no explicit `enabled` (also defaults active); a third slot is
// occupant-format but explicitly disabled and must not count; the two
// remaining fixed slots ('premium', 'enterprise', 'ultimate') stay empty.
$assignedStation['tier_instances'][0]['tiers']['premium'] = [
    'current_occupant' => ['platform_status' => 'disabled', 'rate_sheet_items' => []],
];
$summary = PCG::activeTierSlotSummary($assignedStation, 'pcg_kairos');
assertSameValue(5, $summary['capacity'], 'capacity is the flat 5 fixed-slot constant once a Tier instance is assigned');
assertSameValue(2, $summary['occupied'], 'only living active occupants count — the disabled slot and the two empty slots are excluded');

$unmatchedAssignmentStation = $station;
$unmatchedAssignmentStation['tier_assignments'] = [[
    'assignment_id' => 'tasg_ghost', 'consumer_type' => 'package_family',
    'consumer_id' => 'pcg_kairos', 'tier_instance_id' => 'ti_missing',
]];
assertSameValue(
    ['occupied' => 0, 'capacity' => 0],
    PCG::activeTierSlotSummary($unmatchedAssignmentStation, 'pcg_kairos'),
    'an assignment pointing at a nonexistent instance reports zero of zero rather than throwing'
);

// ── Regression: empty/pending slots must never count, regardless of the ────
// parent Tier System's own status (bug fixed 2026-07-30 — the Family card
// read "5 of 5 active" for an APTOS instance whose five fixed slots were all
// Empty/Not-configured). The prior code's flat-slot branch tested
// `!empty($slot)`, but every slot — including a genuinely empty one — has
// already passed through PackageSchema::ensureTierLifecycle() by the time it
// is read back from storage, which unconditionally adds drafts/module_status
// bookkeeping keys. That made `!empty($slot)` true for every slot, and a
// missing `enabled` key defaulted to true, so all five empty slots counted
// as occupied. These fixtures build slots the same way the real read path
// does (via ensureTierLifecycle), which the raw-literal fixtures above do
// not, so only these catch that regression.

$emptyTiers = [];
foreach (PS::ALLOWED_TIERS as $tierId) {
    $emptyTiers[$tierId] = PS::ensureTierLifecycle([]);
}
$emptyInstanceStation = [
    'tier_assignments' => [[
        'assignment_id' => 'tasg_r1', 'consumer_type' => 'package_family',
        'consumer_id' => 'pcg_r1', 'tier_instance_id' => 'ti_r1',
    ]],
    'tier_instances' => [[
        'tier_instance_id' => 'ti_r1', 'status' => 'active', 'tiers' => $emptyTiers,
    ]],
];
assertSameValue(
    ['occupied' => 0, 'capacity' => 5],
    PCG::activeTierSlotSummary($emptyInstanceStation, 'pcg_r1'),
    'an active Tier System whose five fixed slots are all empty reports 0 of 5 — a fixed slot definition is capacity only, never an occupant'
);

$pendingTiers = [];
foreach (PS::ALLOWED_TIERS as $tierId) {
    $pendingTiers[$tierId] = PS::ensureTierLifecycle([]);
}
$pendingTiers['basic'] = PS::ensureTierLifecycle([
    'current_occupant' => null,
    'module_status'    => ['overview' => 'pending'],
]);
$pendingInstanceStation = [
    'tier_assignments' => [[
        'assignment_id' => 'tasg_r2', 'consumer_type' => 'package_family',
        'consumer_id' => 'pcg_r2', 'tier_instance_id' => 'ti_r2',
    ]],
    'tier_instances' => [[
        'tier_instance_id' => 'ti_r2', 'status' => 'active', 'tiers' => $pendingTiers,
    ]],
];
assertSameValue(
    ['occupied' => 0, 'capacity' => 5],
    PCG::activeTierSlotSummary($pendingInstanceStation, 'pcg_r2'),
    'an active Tier System with one slot mid-draft (Overview pending, no committed occupant) reports 0 of 5 — a pending draft is not an assigned, active occupant'
);

$activeOccupantTiers = [];
foreach (PS::ALLOWED_TIERS as $tierId) {
    $activeOccupantTiers[$tierId] = PS::ensureTierLifecycle([]);
}
$activeOccupantTiers['basic'] = PS::commitTierLifecycle(PS::upsertOccupant([], ['label' => 'Basic'], true));
$activeInstanceStation = [
    'tier_assignments' => [[
        'assignment_id' => 'tasg_r3', 'consumer_type' => 'package_family',
        'consumer_id' => 'pcg_r3', 'tier_instance_id' => 'ti_r3',
    ]],
    'tier_instances' => [[
        'tier_instance_id' => 'ti_r3', 'status' => 'active', 'tiers' => $activeOccupantTiers,
    ]],
];
assertSameValue(
    ['occupied' => 1, 'capacity' => 5],
    PCG::activeTierSlotSummary($activeInstanceStation, 'pcg_r3'),
    'an active Tier System with one genuinely active, configured occupant reports 1 of 5'
);

// DECISION (documented per audit request): an occupant's own active status is
// intrinsic and is never inherited from, or gated by, the parent Tier
// System's own status — activeTierSlotSummary() does not read
// $instance['status'] at all, by design. This is the symmetric counterpart
// of "an active Tier System must not make its slots active": a
// disabled/archived Tier System likewise must not zero out a slot whose
// occupant is genuinely active. So a disabled Tier System with one active
// occupant still reports 1 of 5, matching [[tier-system-is-atomic]] — every
// entity (instance and occupant alike) owns its own lifecycle independently.
$disabledInstanceStation = $activeInstanceStation;
$disabledInstanceStation['tier_assignments'][0]['assignment_id'] = 'tasg_r4';
$disabledInstanceStation['tier_assignments'][0]['consumer_id']   = 'pcg_r4';
$disabledInstanceStation['tier_instances'][0]['status']          = 'disabled';
assertSameValue(
    ['occupied' => 1, 'capacity' => 5],
    PCG::activeTierSlotSummary($disabledInstanceStation, 'pcg_r4'),
    'DECISION: a disabled/inactive Tier System with one genuinely active occupant still reports 1 of 5 — occupant activity is intrinsic to the occupant, never derived from or gated by the parent instance status'
);

fwrite(STDOUT, "PackageCategoryGroups contract tests passed.\n");
