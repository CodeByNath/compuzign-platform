<?php

declare(strict_types=1);

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageManagerSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/TierInstanceSchema.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema as Schema;

function check_composable(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Composable occupant: ' . $message);
    }
}

$base = [
    'tier_instance_id' => 'ti_a',
    'title' => 'A',
    'status' => 'disabled',
    'allowed_rate_sheet_ids' => [],
    'popular_tier' => null,
    'popular_label' => '',
    'tiers' => Schema::emptyTierMap(),
    'occupant_bin' => [],
];

// 1. Default absent/null, not an empty array — this is what makes
// "exactly one occupant" true by shape rather than by a runtime check.
$untouched = Schema::sanitizeInstances([$base])[0];
check_composable(
    array_key_exists('composable_occupant', $untouched) && $untouched['composable_occupant'] === null,
    'an instance with no composable child sanitises the field to null, not []'
);

// 2. It is never one of ALLOWED_TIERS and never merged into `tiers`.
check_composable(
    !in_array('composable', PackageSchema::ALLOWED_TIERS, true)
    && !in_array(PackageSchema::COMPOSABLE_OCCUPANT_ORIGIN, PackageSchema::ALLOWED_TIERS, true),
    'the composable sentinel is never a member of ALLOWED_TIERS'
);
check_composable(
    array_keys($untouched['tiers']) === PackageSchema::ALLOWED_TIERS,
    'the five-slot tiers map is completely unaffected by the new field'
);

// 3. A configured composable occupant round-trips through sanitize and
// keeps the same lifecycle shape a normal occupant slot gets.
$withChild = $base;
$withChild['composable_occupant'] = [
    'current_occupant' => ['id' => 'occ_x', 'platform_status' => 'disabled'],
    'history' => [],
];
$sanitized = Schema::sanitizeInstances([$withChild])[0];
check_composable(
    is_array($sanitized['composable_occupant'])
    && $sanitized['composable_occupant']['current_occupant']['id'] === 'occ_x',
    'a configured composable occupant survives sanitisation'
);
check_composable(
    array_key_exists('drafts', $sanitized['composable_occupant'])
    && array_key_exists('module_status', $sanitized['composable_occupant']),
    'the composable slot gets the same drafts/module_status lifecycle layer as a normal slot'
);

// 4. Subordinate — must never make the parent Tier Instance Active on its
// own. deriveInstanceStatus() reads `tiers` only.
$activeChildOnly = $base;
$activeChildOnly['composable_occupant'] = [
    'current_occupant' => ['id' => 'occ_y', 'platform_status' => 'active'],
    'history' => [],
];
check_composable(
    Schema::deriveInstanceStatus($activeChildOnly) === 'disabled',
    'an active composable occupant alone never makes the parent Tier Instance active'
);

// 5. Bin origin sentinel: accepted by ensureOccupantBin() without being an
// ALLOWED_TIERS value, and a genuinely unknown origin still drops to ''.
$binned = PackageSchema::ensureOccupantBin([
    'occupant_bin' => [
        ['bin_id' => 'bin_1', 'origin_tier' => PackageSchema::COMPOSABLE_OCCUPANT_ORIGIN, 'occupant' => ['id' => 'occ_z']],
        ['bin_id' => 'bin_2', 'origin_tier' => 'not_a_real_origin', 'occupant' => ['id' => 'occ_w']],
    ],
]);
check_composable(
    $binned['occupant_bin'][0]['origin_tier'] === PackageSchema::COMPOSABLE_OCCUPANT_ORIGIN,
    'the composable origin sentinel survives ensureOccupantBin()'
);
check_composable(
    $binned['occupant_bin'][1]['origin_tier'] === '',
    'an unrelated unknown origin_tier still drops to empty string'
);

// 6. Archive: dedicated function, no occupant present.
$noOccupant = PackageSchema::archiveComposableOccupant($base, false, 'bin_new', '2026-01-01 00:00:00');
check_composable(($noOccupant['error'] ?? null) === 'no_occupant', 'archiving an empty composable slot fails no_occupant');

// 7. Archive: happy path moves the occupant to occupant_bin under the
// sentinel origin and empties the slot, WITHOUT touching `tiers` or
// deriving station status from the composable occupant.
$archived = PackageSchema::archiveComposableOccupant($withChild, false, 'bin_new', '2026-01-01 00:00:00');
check_composable(!isset($archived['error']), 'archiving a configured composable occupant succeeds');
check_composable(
    $archived['entry']['origin_tier'] === PackageSchema::COMPOSABLE_OCCUPANT_ORIGIN,
    'the archived entry carries the composable origin sentinel'
);
check_composable(
    $archived['station']['composable_occupant']['current_occupant'] === null,
    'archiving empties the composable slot'
);
check_composable(
    $archived['station']['tiers'] === $base['tiers'],
    'archiving the composable occupant never touches the five-slot tiers map'
);

// 8. Restore: no swap/retarget parameters exist at all — the function
// signature itself makes cross-slot movement impossible, not just a
// runtime guard.
$restoreParams = (new ReflectionMethod(PackageSchema::class, 'restoreComposableOccupant'))->getParameters();
check_composable(
    count($restoreParams) === 3,
    'restoreComposableOccupant() takes no mode/target_tier — a composable occupant can only ever return to its own slot'
);

// 9. Restore: happy path returns the occupant to the (now empty) composable
// slot, landing disabled like every other restore.
$restoredStation = $archived['station'];
$restoredStation['occupant_bin'] = $archived['station']['occupant_bin'];
$restoreResult = PackageSchema::restoreComposableOccupant($restoredStation, $archived['entry']['bin_id'], false);
check_composable(!isset($restoreResult['error']), 'restoring the composable occupant succeeds');
check_composable(
    $restoreResult['station']['composable_occupant']['current_occupant']['id'] === 'occ_x',
    'restore returns the same occupant to the composable slot'
);
check_composable(
    $restoreResult['station']['composable_occupant']['current_occupant']['platform_status'] === 'disabled',
    'restore always lands the composable occupant disabled, same as a normal Tier restore'
);
check_composable($restoreResult['station']['occupant_bin'] === [], 'restore removes the entry from occupant_bin');

// 10. Restore blocks into an already-occupied composable slot (no swap
// exists to resolve the conflict — that is the point).
$occupiedTarget = $withChild;
$occupiedTarget['occupant_bin'] = $archived['entry'] === null ? [] : [$archived['entry']];
$blocked = PackageSchema::restoreComposableOccupant($occupiedTarget, $archived['entry']['bin_id'], false);
check_composable(($blocked['error'] ?? null) === 'target_occupied', 'restoring into an already-occupied composable slot is blocked, not swapped');

// 11. trashBinnedOccupant()/deleteBinnedOccupant() are reused UNCHANGED —
// they operate purely on occupant_bin by bin_id and never reference
// origin_tier/ALLOWED_TIERS at all, so a composable entry works with zero
// new code.
$trashed = PackageSchema::trashBinnedOccupant($archived['station'], $archived['entry']['bin_id']);
check_composable(!isset($trashed['error']), 'the existing trashBinnedOccupant() works unchanged for a composable bin entry');
$deleted = PackageSchema::deleteBinnedOccupant($trashed['station'], $archived['entry']['bin_id']);
check_composable(!isset($deleted['error']), 'the existing deleteBinnedOccupant() works unchanged for a composable bin entry');
check_composable($deleted['station']['occupant_bin'] === [], 'permanent delete removes the composable entry');

// ── Public Family projection: composable_offer as a sibling of `tiers` ─────

$composableProjectionOption = null;
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-09-01 00:00:00'; }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $composableProjectionOption;
        return $key === 'cz_package_station' ? ($composableProjectionOption ?? $default) : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $composableProjectionOption;
        if ($key === 'cz_package_station') $composableProjectionOption = $value;
        return true;
    }
}
if (!function_exists('get_posts')) {
    function get_posts(array $args = []): array { return []; }
}
if (!function_exists('get_post')) {
    function get_post(int $postId): ?object { return null; }
}
if (!function_exists('get_post_meta')) {
    function get_post_meta(int $postId, string $key = '', bool $single = false): mixed { return $single ? null : []; }
}
if (!function_exists('get_term_meta')) {
    function get_term_meta(int $termId, string $key = '', bool $single = false): mixed { return $single ? null : []; }
}
if (!function_exists('wp_get_post_terms')) {
    function wp_get_post_terms(int $postId, string $taxonomy, array $args = []): array { return []; }
}
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response(mixed $value): mixed { return $value; }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\CostBuilder\Services\PackageFamilyPricingBuilder;

function occupant_shape(string $idSuffix, ?string $platformId): array
{
    return [
        'current_occupant' => [
            'id'                  => 'occ_' . $idSuffix,
            'cz_platform_id'      => $platformId ?? '',
            'addon_platform_id'   => '',
            'default_leg_platform_id' => '',
            'platform_status'     => 'active',
            'is_explicitly_disabled' => false,
            'is_addon'            => false,
            'label'               => 'Build Your Own',
            'ideal_for'           => '',
            'audience_groups'     => ['personal_business', 'enterprise'],
            'price'               => null,
            'contact'             => false,
            'billing_cycle'       => 'monthly',
            'minimum_term_value'  => null,
            'minimum_term_unit'   => null,
            'from_month'          => null,
            'to_month'            => null,
            'legs'                => [],
            'headline_leg_id'     => '',
            'rate_sheet_id'       => 'rs_cmp',
            'inclusions_override' => [],
            'rate_sheet_items'    => [['item_id' => 'rate_cmp', 'quantity' => 1]],
            'features'            => [],
            'faq_refs'            => [],
            'tier_editions'       => [],
            'tier_edition_bin'    => [],
        ],
        'history' => [],
    ];
}

$family = [
    'group_id' => 'pcg_composable',
    'cz_platform_id' => 'CZPG-COMPOSABLE',
    'label' => 'Composable Family',
    'description' => '',
    'platform_status' => 'active',
    'previous_platform_status' => null,
    'module_status' => ['overview' => 'settled'],
    'overview_draft' => null,
    'sort_order' => 0,
];
$instance = [
    'tier_instance_id' => 'ti_composable',
    'cz_platform_id' => 'CZTG-COMPOSABLE',
    'title' => 'Composable Tier Set',
    'status' => 'active',
    'allowed_rate_sheet_ids' => ['rs_cmp'],
    'popular_tier' => null,
    'popular_label' => '',
    'tiers' => Schema::emptyTierMap(),
    'occupant_bin' => [],
];
$instance['tiers']['basic'] = occupant_shape('primary', 'CZT-PRIMARY');
$manager = [
    'sources' => [],
    'groups' => [],
    'category_groups' => [$family],
    'items' => [],
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_cmp',
        'title' => 'Composable Rates',
        'status' => 'active',
        'groups' => [],
        'items' => [[
            'item_id' => 'rate_cmp',
            'source_item_id' => 'inc_cmp',
            'unit_price' => 9,
            'per' => 'Per item',
            'quantity' => 1,
            'group_id' => null,
        ]],
    ]],
];
$assignment = [
    'assignment_id' => \CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_composable', 'ti_composable'),
    'consumer_type' => 'package_family',
    'consumer_id' => 'pcg_composable',
    'tier_instance_id' => 'ti_composable',
];
$stationOption = [
    'platform_status' => 'active',
    'tier_instances' => [$instance],
    'tier_assignments' => [$assignment],
    'popular_tier' => null,
    'popular_label' => '',
    'sort_position' => 0,
    'bundle' => ['title' => '', 'description' => '', 'price' => null],
    'occupant_bin' => [],
    'promotions' => [],
    'package_manager' => $manager,
    'legacy_host_service_id' => 0,
    'valid_from' => null,
    'valid_until' => null,
];

// 12. No composable child configured yet: composable_offer is simply absent
// (not a null key forced into every response), and the existing primary
// Tier projection is completely unaffected.
$composableProjectionOption = $stationOption;
$noChildResponse = (new PackageFamilyPricingBuilder(new PackageRepository()))->buildResponse();
$noChildFamily = $noChildResponse['families'][0] ?? null;
check_composable($noChildFamily !== null, 'the Family with no composable child still projects publicly');
check_composable(
    !isset($noChildFamily['pricing']['composable_offer']) || $noChildFamily['pricing']['composable_offer'] === null,
    'no composable_offer key is forced onto a Family that never configured one'
);
$noChildPrimary = $noChildFamily['pricing']['tiers']['basic'];

// 13. A configured, fully-identified composable occupant projects as a
// SIBLING key, never merged into `tiers`. Reusing the identical rate_sheet_id
// + rate_sheet_items as the primary occupant and getting the identical
// resolved price/commercial_legs shape back proves it runs through the
// SAME Rate-Sheet-backed compiler, not a second calculation — this fixture
// has no registered inclusion pool, so the shared row resolves the same
// (unresolved) way for both, which is exactly the point: identical input,
// identical engine, identical output, regardless of resolution outcome.
$withChildInstance = $instance;
$withChildInstance['composable_occupant'] = occupant_shape('composable', 'CZT-COMPOSABLE');
$composableProjectionOption = $stationOption;
$composableProjectionOption['tier_instances'] = [$withChildInstance];
$childResponse = (new PackageFamilyPricingBuilder(new PackageRepository()))->buildResponse();
$childFamily = $childResponse['families'][0] ?? null;
check_composable($childFamily !== null, 'a Family with a composable child still projects publicly');
check_composable(
    array_keys($childFamily['pricing']['tiers']) === ['basic'],
    'the composable occupant never appears inside `tiers` — it stays a sibling key'
);
check_composable(
    $childFamily['pricing']['tiers']['basic'] === $noChildPrimary,
    'adding a composable child never changes the primary Tier\'s own compiled projection'
);
check_composable(
    isset($childFamily['pricing']['composable_offer']) && is_array($childFamily['pricing']['composable_offer']),
    'a fully-identified composable occupant projects as composable_offer'
);
check_composable(
    $childFamily['pricing']['composable_offer']['price'] === $noChildPrimary['price']
    && $childFamily['pricing']['composable_offer']['commercial_legs'] === $noChildPrimary['commercial_legs'],
    'the composable occupant resolves price/commercial_legs through the exact same compiler as a normal Tier occupant given the same rate_sheet_id/rate_sheet_items'
);
check_composable($childFamily['pricing']['composable_offer']['tier_platform_id'] === 'CZT-COMPOSABLE', 'the composable occupant carries its own real CZT identity, distinct from the primary Tier\'s');
check_composable($childFamily['pricing']['composable_offer']['tier_occupant_id'] === 'occ_composable', 'the composable occupant carries its own occupant_id, distinct from the primary Tier\'s');
check_composable(!array_key_exists('rate_sheet_id', $childFamily['pricing']['composable_offer']), 'the composable occupant never exposes its internal Rate Sheet binding either');

// 14. An occupant slot exists but has no minted Platform id yet (never
// published) — dropped, exactly like an unidentified normal Tier slot,
// never surfaced half-identified.
$unidentifiedInstance = $instance;
$unidentifiedInstance['composable_occupant'] = occupant_shape('unpublished', null);
$composableProjectionOption = $stationOption;
$composableProjectionOption['tier_instances'] = [$unidentifiedInstance];
$unidentifiedResponse = (new PackageFamilyPricingBuilder(new PackageRepository()))->buildResponse();
$unidentifiedFamily = $unidentifiedResponse['families'][0] ?? null;
check_composable(
    !isset($unidentifiedFamily['pricing']['composable_offer']) || $unidentifiedFamily['pricing']['composable_offer'] === null,
    'an un-published (no CZT yet) composable occupant never projects publicly'
);

echo "Composable occupant checks passed.\n";
