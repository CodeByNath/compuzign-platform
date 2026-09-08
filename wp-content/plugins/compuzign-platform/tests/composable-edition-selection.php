<?php

declare(strict_types=1);

/*
 * Composable Tier occupant — own Default/Edition selection path.
 *
 * project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md
 * ("Reject primary-bound Upgrade cue and require composable-occupant
 * variant path"). The auditor found the deployed Upgrade cue wired to the
 * PRIMARY Tier's own domain object (family.pricing.tiers[selectedTierId])
 * instead of the composable occupant's own family.pricing.composable_offer
 * + its own edition_options[]. This locks the corrected backend contract:
 *
 *   - PackageRepository::resolveComposableOfferSelection() with no
 *     `$editionId` (or null) resolves against the composable occupant's own
 *     Default container — unchanged behavior, still exercised by
 *     tests/composable-customer-ux-preview.php.
 *   - Passed a real, ACTIVE composable Edition id, it resolves against THAT
 *     Edition's own rate_sheet_id/rate_sheet_items — a genuinely different
 *     authoritative container, never the Default's or the primary Tier's.
 *   - An Edition with no customer_policy of its own inherits the occupant's
 *     Default policy — the same inherit-when-absent rule
 *     PackageSchema::publicTierEditionOptions() already applies to the
 *     public projection, re-derived independently here.
 *   - A Pending/Disabled Edition id, or an id that does not exist at all,
 *     resolves `not_found` — never a silent fallback to Default.
 *   - The public projection's `composable_offer.edition_options[]` carries
 *     the Edition's own `edition_platform_id` and a Rate-Sheet-resolved,
 *     priced/categorized `inclusions_override` (unit_price/categories/
 *     service) — the same browse-metadata shape the occupant's own Default
 *     inclusions already carry, never the raw admin-authored declaration
 *     list a normal Tier Edition's own inclusions_override stays (see
 *     tests/tier-edition-public-projection.php, unaffected by this file).
 *   - The primary Tier occupant ('basic') is never read or mutated by any
 *     of this — the underlying station option is byte-identical before and
 *     after every call.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
$composableEditionProjectionOption = null;
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-09-08 00:00:00'; }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $composableEditionProjectionOption;
        return $key === 'cz_package_station' ? ($composableEditionProjectionOption ?? $default) : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $composableEditionProjectionOption;
        if ($key === 'cz_package_station') { $composableEditionProjectionOption = $value; }
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
require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as PS;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema as TIS;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\CostBuilder\Services\PackageFamilyPricingBuilder;
use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;

function assertSameValue(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

function assertTrue(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

function totalForItem(array $periods, string $itemId): ?float
{
    foreach ($periods as $period) {
        foreach ($period['components'] ?? [] as $component) {
            foreach ($component['items'] ?? [] as $row) {
                if (($row['item_id'] ?? null) === $itemId) {
                    return $row['line_total'] ?? $row['unit_price'] ?? null;
                }
            }
        }
    }
    return null;
}

$defaultPolicy = [
    'items' => [
        ['item_id' => 'hosting', 'mode' => 'required',
            'price_option' => ['mode' => 'fixed', 'allowed_price_option_ids' => null, 'default_price_option_id' => null],
            'featured' => true],
        ['item_id' => 'support', 'mode' => 'optional', 'default_selected' => false,
            'quantity' => ['default' => 2, 'min' => 1, 'max' => 5, 'step' => 1]],
    ],
];

$proPolicy = [
    'items' => [
        ['item_id' => 'compute', 'mode' => 'required',
            'price_option' => ['mode' => 'fixed', 'allowed_price_option_ids' => null, 'default_price_option_id' => null],
            'featured' => true],
    ],
];

$composableOccupant = [
    'current_occupant' => [
        'id' => 'occ_composable', 'cz_platform_id' => 'CZT-COMPOSABLE-ED', 'addon_platform_id' => '',
        'default_leg_platform_id' => '', 'platform_status' => 'active', 'is_explicitly_disabled' => false,
        'is_addon' => false, 'label' => 'Build Your Own', 'ideal_for' => '',
        'audience_groups' => ['personal_business', 'enterprise'], 'price' => null, 'contact' => false,
        'billing_cycle' => 'monthly', 'minimum_term_value' => null, 'minimum_term_unit' => null,
        'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
        'rate_sheet_id' => 'rs_default',
        'inclusions_override' => [],
        'rate_sheet_items' => [
            ['item_id' => 'hosting', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []],
            ['item_id' => 'support', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []],
        ],
        'features' => [], 'faq_refs' => [],
        'customer_policy' => $defaultPolicy,
        'tier_editions' => [
            // ed_pro — its OWN rate sheet/items/policy, genuinely different
            // from the occupant's own Default above.
            [
                'id' => 'ed_pro', 'edition_platform_id' => 'CZTE-PRO', 'edition_catalogue_platform_id' => '',
                'default_leg_platform_id' => '', 'title' => 'Pro', 'admin_description' => '',
                'platform_status' => StationLifecycle::STATUS_ACTIVE, 'previous_platform_status' => null,
                'is_explicitly_disabled' => false, 'module_status' => [], 'drafts' => [],
                'rate_sheet_id' => 'rs_pro',
                'rate_sheet_items' => [
                    ['item_id' => 'compute', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []],
                ],
                'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
                'minimum_term_value' => null, 'minimum_term_unit' => null,
                'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
                'inclusions_override' => [],
                'customer_policy' => $proPolicy,
                'faq_refs' => [],
            ],
            // ed_inherit — no customer_policy of its own (key omitted, not
            // merely null) and no rate_sheet_items of its own: must inherit
            // the occupant's own Default policy/pricing when resolved.
            [
                'id' => 'ed_inherit', 'edition_platform_id' => 'CZTE-INHERIT', 'edition_catalogue_platform_id' => '',
                'default_leg_platform_id' => '', 'title' => 'Inherit', 'admin_description' => '',
                'platform_status' => StationLifecycle::STATUS_ACTIVE, 'previous_platform_status' => null,
                'is_explicitly_disabled' => false, 'module_status' => [], 'drafts' => [],
                'rate_sheet_id' => 'rs_default',
                'rate_sheet_items' => [
                    ['item_id' => 'hosting', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []],
                ],
                'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
                'minimum_term_value' => null, 'minimum_term_unit' => null,
                'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
                'inclusions_override' => [],
                'faq_refs' => [],
                // 'customer_policy' key deliberately absent — sanitizeTierEdition()
                // resolves this to null (array_key_exists gate), the inherit signal.
            ],
            // ed_disabled — a real id, but never offered to a customer.
            [
                'id' => 'ed_disabled', 'edition_platform_id' => 'CZTE-DISABLED', 'edition_catalogue_platform_id' => '',
                'default_leg_platform_id' => '', 'title' => 'Disabled', 'admin_description' => '',
                'platform_status' => StationLifecycle::STATUS_DISABLED, 'previous_platform_status' => null,
                'is_explicitly_disabled' => true, 'module_status' => [], 'drafts' => [],
                'rate_sheet_id' => 'rs_pro',
                'rate_sheet_items' => [
                    ['item_id' => 'compute', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []],
                ],
                'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
                'minimum_term_value' => null, 'minimum_term_unit' => null,
                'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
                'inclusions_override' => [],
                'customer_policy' => $proPolicy,
                'faq_refs' => [],
            ],
        ],
        'tier_edition_bin' => [],
    ],
    'history' => [],
];

function primaryOccupantFixture(): array
{
    return [
        'current_occupant' => [
            'id' => 'occ_primary', 'cz_platform_id' => 'CZT-PRIMARY-ED', 'addon_platform_id' => '',
            'default_leg_platform_id' => '', 'platform_status' => 'active', 'is_explicitly_disabled' => false,
            'is_addon' => false, 'label' => 'Primary', 'ideal_for' => '',
            'audience_groups' => ['personal_business', 'enterprise'], 'price' => 10, 'contact' => false,
            'billing_cycle' => 'monthly', 'minimum_term_value' => null, 'minimum_term_unit' => null,
            'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
            'rate_sheet_id' => null, 'inclusions_override' => [], 'rate_sheet_items' => [],
            'features' => [], 'faq_refs' => [], 'customer_policy' => null,
            'tier_editions' => [], 'tier_edition_bin' => [],
        ],
        'history' => [],
    ];
}

function stationFixture(array $composableOccupant): array
{
    $instance = [
        'tier_instance_id' => 'ti_ed', 'cz_platform_id' => 'CZTG-ED', 'title' => 'Edition Set',
        'status' => 'active', 'allowed_rate_sheet_ids' => ['rs_default', 'rs_pro'], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => TIS::emptyTierMap(), 'occupant_bin' => [],
    ];
    $instance['tiers']['basic'] = primaryOccupantFixture();
    $instance['composable_occupant'] = $composableOccupant;

    $manager = [
        'sources' => [], 'groups' => [], 'category_groups' => [[
            'group_id' => 'pcg_ed', 'cz_platform_id' => 'CZPG-ED', 'label' => 'Edition Family',
            'description' => '', 'platform_status' => 'active', 'previous_platform_status' => null,
            'module_status' => ['overview' => 'settled'], 'overview_draft' => null, 'sort_order' => 0,
        ]], 'items' => [],
        'rate_sheets' => [
            [
                'rate_sheet_id' => 'rs_default', 'title' => 'Default Rates', 'status' => 'active', 'groups' => [],
                'items' => [
                    ['item_id' => 'hosting', 'source_item_id' => '', 'bundle_id' => 'bnd_hosting', 'label' => 'Hosting', 'unit_price' => 100, 'per' => null, 'quantity' => 1, 'group_id' => null, 'price_options' => []],
                    ['item_id' => 'support', 'source_item_id' => '', 'bundle_id' => 'bnd_support', 'label' => 'Support', 'unit_price' => 20, 'per' => null, 'quantity' => 1, 'group_id' => null, 'price_options' => []],
                ],
            ],
            [
                'rate_sheet_id' => 'rs_pro', 'title' => 'Pro Rates', 'status' => 'active', 'groups' => [],
                'items' => [
                    ['item_id' => 'compute', 'source_item_id' => '', 'bundle_id' => 'bnd_compute', 'label' => 'Compute', 'unit_price' => 300, 'per' => null, 'quantity' => 1, 'group_id' => null, 'price_options' => []],
                ],
            ],
        ],
    ];

    return [
        'platform_status' => 'active', 'tier_instances' => [$instance],
        'tier_assignments' => [[
            'assignment_id' => \CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_ed', 'ti_ed'),
            'consumer_type' => 'package_family', 'consumer_id' => 'pcg_ed', 'tier_instance_id' => 'ti_ed',
        ]],
        'popular_tier' => null, 'popular_label' => '', 'sort_position' => 0,
        'bundle' => ['title' => '', 'description' => '', 'price' => null], 'occupant_bin' => [], 'promotions' => [],
        'package_manager' => $manager, 'legacy_host_service_id' => 0, 'valid_from' => null, 'valid_until' => null,
    ];
}

global $composableEditionProjectionOption;
$composableEditionProjectionOption = stationFixture($composableOccupant);

$repo = new PackageRepository();

// ── 1. No editionId — unchanged Default resolution ──────────────────────────

$rDefault = $repo->resolveComposableOfferSelection('pcg_ed', [['item_id' => 'hosting']]);
assertTrue($rDefault['ok'], '1a. Default (no editionId) resolves ok');
assertSameValue(100.0, totalForItem($rDefault['periods'], 'hosting'), '1b. Default resolves hosting at the OCCUPANT own rate sheet price');
assertSameValue(null, totalForItem($rDefault['periods'], 'compute'), '1c. compute (Pro-only) never appears in the Default container');

// ── 2. ed_pro — a genuinely different authoritative container ───────────────

$rPro = $repo->resolveComposableOfferSelection('pcg_ed', [['item_id' => 'compute']], 'ed_pro');
assertTrue($rPro['ok'], '2a. ed_pro resolves ok for its own item');
assertSameValue(300.0, totalForItem($rPro['periods'], 'compute'), '2b. ed_pro resolves compute at its OWN rate sheet price, never the occupant Default');
assertSameValue(null, totalForItem($rPro['periods'], 'hosting'), '2c. hosting (Default-only) never appears in the ed_pro container');

$rProRejectsHosting = $repo->resolveComposableOfferSelection('pcg_ed', [['item_id' => 'hosting']], 'ed_pro');
assertSameValue(false, $rProRejectsHosting['ok'], '2d. submitting a Default-only item_id against ed_pro is rejected — proves the policy/rate-sheet join is genuinely edition-scoped, not merely a relabel');

// ── 3. ed_inherit — no customer_policy of its own: inherits the occupant's
//    own Default policy, and resolves against its own (here Default-priced)
//    rate_sheet_items ──────────────────────────────────────────────────────

$rInherit = $repo->resolveComposableOfferSelection('pcg_ed', [['item_id' => 'hosting']], 'ed_inherit');
assertTrue($rInherit['ok'], '3a. ed_inherit resolves ok using the occupant Default policy (hosting is required there)');
assertSameValue(100.0, totalForItem($rInherit['periods'], 'hosting'), '3b. ed_inherit prices from its OWN rate_sheet_items, independent of the policy source');

// ── 4. Unknown / inactive edition ids never resolve, never fall back to Default ─

$rUnknownEdition = $repo->resolveComposableOfferSelection('pcg_ed', [['item_id' => 'hosting']], 'does_not_exist');
assertSameValue(false, $rUnknownEdition['ok'], '4a. an unknown editionId never resolves');
assertSameValue('not_found', $rUnknownEdition['code'], '4b. structured not_found reason');

$rDisabledEdition = $repo->resolveComposableOfferSelection('pcg_ed', [['item_id' => 'compute']], 'ed_disabled');
assertSameValue(false, $rDisabledEdition['ok'], '4c. a Disabled Edition id never resolves, even though it exists in storage');
assertSameValue('not_found', $rDisabledEdition['code'], '4d. structured not_found reason — never silently substituting Default');

// ── 5. No mutation of the underlying station option, for either container ──

$before = $composableEditionProjectionOption;
$repo2 = new PackageRepository();
$repo2->resolveComposableOfferSelection('pcg_ed', [['item_id' => 'compute']], 'ed_pro');
assertSameValue($before, $composableEditionProjectionOption, '5. resolveComposableOfferSelection() never mutates the underlying station option, editionId branch included');

// ── 6. Public projection: composable_offer.edition_options carries the
//    Edition's own edition_platform_id and Rate-Sheet-resolved,
//    priced/categorized inclusions_override — never the raw admin list a
//    normal Tier Edition's own inclusions_override stays ──────────────────

$response = (new PackageFamilyPricingBuilder(new PackageRepository()))->buildResponse();
$family = $response['families'][0] ?? null;
assertTrue($family !== null, '6a. the Edition family renders publicly');
$editionOptions = $family['pricing']['composable_offer']['edition_options'] ?? [];
$proOption = null;
foreach ($editionOptions as $option) {
    if (($option['id'] ?? null) === 'ed_pro') { $proOption = $option; break; }
}
assertTrue($proOption !== null, '6b. ed_pro appears in the public composable_offer.edition_options');
assertSameValue('CZTE-PRO', $proOption['edition_platform_id'] ?? null, '6c. carries its own edition_platform_id (CZTE)');
$proInclusions = $proOption['inclusions_override'] ?? [];
$computeRow = null;
foreach ($proInclusions as $row) { if (($row['id'] ?? null) === 'compute') { $computeRow = $row; break; } }
assertTrue($computeRow !== null, '6d. compute appears in ed_pro\'s own resolved inclusions_override');
assertSameValue(300.0, $computeRow['unit_price'] ?? null, '6e. resolved against ed_pro\'s own rate sheet (300), never the occupant Default\'s');
assertTrue(array_key_exists('categories', $computeRow) && array_key_exists('service', $computeRow), '6f. carries the same browse-metadata fields (categories/service) the occupant Default already gets — never the raw admin-authored declaration list');

// A Disabled Edition is never surfaced publicly at all — same lifecycle gate
// PackageSchema::publicTierEditionOptions() already applies.
foreach ($editionOptions as $option) {
    assertTrue(($option['id'] ?? null) !== 'ed_disabled', '6g. a Disabled Edition never appears in the public edition_options list');
}

// ── 7. The primary Tier occupant is never touched by any of this ───────────

$primaryBefore = $composableEditionProjectionOption['tier_instances'][0]['tiers']['basic'];
$repo3 = new PackageRepository();
$repo3->resolveComposableOfferSelection('pcg_ed', [['item_id' => 'compute']], 'ed_pro');
assertSameValue($primaryBefore, $composableEditionProjectionOption['tier_instances'][0]['tiers']['basic'], '7. the primary Tier occupant is byte-identical before and after an Upgrade-cue-style composable Edition resolve');

echo "Composable Edition selection contract: PASS\n";
