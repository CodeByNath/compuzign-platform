<?php

declare(strict_types=1);

/*
 * Composable occupant Edition catalogue — public projection.
 *
 * project-work/2026-09-10-composable-edition-catalogue-filtering.md.
 * Every Edition tab on the focused composable shell rendered the SAME
 * catalogue as Default, and an Edition policy item that exists only on that
 * Edition's own Rate Sheet silently disappeared.
 *
 * Root cause: `PackageSchema::publicTierEditionOptions()` published each
 * Edition's RAW stored `inclusions_override` (its own, else the occupant's
 * raw one), while `compileOccupantSlotForCostBuilder()` replaced only the
 * OCCUPANT's with rows resolved through `projectTierRateSheetWith()`. On the
 * Rate Sheet-era authoring path nothing writes `inclusions_override` at all
 * (the admin derives that list for display only), so every published
 * `edition_options[].inclusions_override` was empty and the browse surface
 * fell back to the Default occupant's rows.
 *
 * Fix: the per-Edition projection block — which already re-resolves each
 * Edition's own price/commercial_legs/headline pointer — now also resolves
 * that Edition's own browse catalogue through the SAME Rate Sheet projector
 * and the SAME customer-safe decoration the occupant goes through
 * (`projectCustomerInclusionRows()`, extracted for exactly that reuse).
 * Authority is the Edition's own Rate Sheet binding, never
 * `inclusions_override`; an Edition with no binding of its own inherits the
 * occupant's already-resolved rows. Composable occupant only — a normal
 * Tier's Edition set keeps its previous projection.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
$catalogueOption = null;
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-09-10 00:00:00'; }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $catalogueOption;
        return $key === 'cz_package_station' ? ($catalogueOption ?? $default) : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $catalogueOption;
        if ($key === 'cz_package_station') { $catalogueOption = $value; }
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

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema as TIS;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema as TAS;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\CostBuilder\Services\PackageFamilyPricingBuilder;

function catalogueCheck(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

/** @param array<int, string> $itemIds */
function selections(array $itemIds): array
{
    return array_map(
        static fn(string $itemId): array => ['item_id' => $itemId, 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []],
        $itemIds
    );
}

/** @return array<int, string> */
function rowIds(array $rows): array
{
    return array_map(static fn(array $row): string => (string) $row['id'], $rows);
}

function editionRow(string $id, string $title, ?string $rateSheetId, array $itemIds, ?array $customerPolicy = null): array
{
    return [
        'id' => $id, 'edition_platform_id' => 'CZTE-' . strtoupper($id), 'edition_catalogue_platform_id' => 'CZTEC-' . strtoupper($id),
        'default_leg_platform_id' => 'CZTEL-' . strtoupper($id), 'title' => $title, 'admin_description' => '',
        'platform_status' => 'active', 'previous_platform_status' => null, 'is_explicitly_disabled' => false,
        'module_status' => [], 'drafts' => [],
        'rate_sheet_id' => $rateSheetId,
        'rate_sheet_items' => selections($itemIds),
        'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
        'minimum_term_value' => null, 'minimum_term_unit' => null,
        'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
        // Deliberately empty, exactly like every Rate Sheet-era Edition: this
        // field is what the defect wrongly published as the catalogue.
        'inclusions_override' => [], 'customer_policy' => $customerPolicy, 'faq_refs' => [],
    ];
}

function occupantFixture(string $id, string $platformId, array $tierEditions, array $itemIds, ?array $customerPolicy): array
{
    return [
        'id' => $id, 'cz_platform_id' => $platformId, 'addon_platform_id' => '',
        'default_leg_platform_id' => '', 'platform_status' => 'active', 'is_explicitly_disabled' => false,
        'is_addon' => false, 'label' => 'Build Your Own', 'ideal_for' => '',
        'audience_groups' => ['personal_business', 'enterprise'], 'price' => null, 'contact' => false,
        'billing_cycle' => 'monthly', 'minimum_term_value' => null, 'minimum_term_unit' => null,
        'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
        'rate_sheet_id' => 'rs_default',
        'inclusions_override' => [],
        'rate_sheet_items' => selections($itemIds),
        'features' => [], 'faq_refs' => [],
        'customer_policy' => $customerPolicy,
        'tier_editions' => $tierEditions,
        'tier_edition_bin' => [],
    ];
}

function stationFixture(array $composableOccupant, array $primaryEditions = []): array
{
    $instance = [
        'tier_instance_id' => 'ti_cat', 'cz_platform_id' => 'CZTG-CAT', 'title' => 'Edition Catalogue',
        'status' => 'active', 'allowed_rate_sheet_ids' => ['rs_default', 'rs_edition'], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => TIS::emptyTierMap(), 'occupant_bin' => [],
    ];
    $primary = occupantFixture('occ_primary', 'CZT-PRIMARY', $primaryEditions, ['hosting'], null);
    $instance['tiers']['basic'] = ['current_occupant' => $primary, 'history' => []];
    $instance['composable_occupant'] = ['current_occupant' => $composableOccupant, 'history' => []];

    // Bundle-backed rows (bundle_id set, no bundles[] entry required) are the
    // only ordinary-row shape buildReadModel() marks self_priced, i.e. the one
    // fixture convenience that yields resolvable, source-independent priced
    // rows through the REAL sanitize pipeline — the same device
    // tests/composable-customer-ux-preview.php already uses.
    $manager = [
        'sources' => [], 'groups' => [], 'category_groups' => [[
            'group_id' => 'pcg_cat', 'cz_platform_id' => 'CZPG-CAT', 'label' => 'Catalogue Family',
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
                'rate_sheet_id' => 'rs_edition', 'title' => 'Edition Rates', 'status' => 'active', 'groups' => [],
                'items' => [
                    ['item_id' => 'gpu', 'source_item_id' => '', 'bundle_id' => 'bnd_gpu', 'label' => 'GPU Node', 'unit_price' => 500, 'per' => null, 'quantity' => 1, 'group_id' => null, 'price_options' => []],
                    ['item_id' => 'residency', 'source_item_id' => '', 'bundle_id' => 'bnd_residency', 'label' => 'Data Residency', 'unit_price' => 75, 'per' => null, 'quantity' => 1, 'group_id' => null, 'price_options' => []],
                    // The SAME underlying inclusion id as rs_default's own
                    // 'hosting' row, priced and Bundled differently here. Row
                    // identity is (rate_sheet_id, item_id), so the two never
                    // mix — case 7 proves it.
                    ['item_id' => 'hosting', 'source_item_id' => '', 'bundle_id' => 'bnd_hosting_edition', 'label' => 'Hosting (Sovereign)', 'unit_price' => 130, 'per' => null, 'quantity' => 1, 'group_id' => null, 'price_options' => []],
                ],
            ],
        ],
    ];

    return [
        'platform_status' => 'active', 'tier_instances' => [$instance],
        'tier_assignments' => [[
            'assignment_id' => TAS::deriveAssignmentId('package_family', 'pcg_cat', 'ti_cat'),
            'consumer_type' => 'package_family', 'consumer_id' => 'pcg_cat', 'tier_instance_id' => 'ti_cat',
        ]],
        'popular_tier' => null, 'popular_label' => '', 'sort_position' => 0,
        'bundle' => ['title' => '', 'description' => '', 'price' => null], 'occupant_bin' => [], 'promotions' => [],
        'package_manager' => $manager, 'legacy_host_service_id' => 0, 'valid_from' => null, 'valid_until' => null,
    ];
}

function familyFor(array $station): array
{
    global $catalogueOption;
    $catalogueOption = $station;
    $response = (new PackageFamilyPricingBuilder(new PackageRepository()))->buildResponse();
    return $response['families'][0] ?? [];
}

$defaultPolicy = ['items' => [
    ['item_id' => 'hosting', 'mode' => 'required'],
    ['item_id' => 'support', 'mode' => 'optional', 'default_selected' => false],
]];
// Names a row that exists ONLY on the Edition's own Rate Sheet — the case the
// defect silently dropped, because the join ran against Default's rows.
$editionPolicy = ['items' => [
    ['item_id' => 'gpu', 'mode' => 'required'],
    ['item_id' => 'residency', 'mode' => 'optional', 'default_selected' => true],
]];

$editions = [
    editionRow('ed_own', 'Sovereign', 'rs_edition', ['gpu', 'residency'], $editionPolicy),
    editionRow('ed_inherit', 'Standard Terms', null, [], null),
    editionRow('ed_bound_no_rows', 'Bound But Empty', 'rs_edition', [], null),
];
$family = familyFor(stationFixture(occupantFixture('occ_composable', 'CZT-COMPOSABLE', $editions, ['hosting', 'support'], $defaultPolicy)));
$offer = $family['pricing']['composable_offer'] ?? [];
$options = [];
foreach ($offer['edition_options'] ?? [] as $option) {
    $options[$option['id']] = $option;
}

// ── 1. Default and an Edition with its own Rate Sheet publish DISTINCT
//    catalogues. This is the whole live defect: both used to be Default's. ──
catalogueCheck(rowIds($offer['inclusions'] ?? []) === ['hosting', 'support'], '1a. the occupant publishes its own resolved rows — got ' . implode(',', rowIds($offer['inclusions'] ?? [])));
catalogueCheck(isset($options['ed_own']), '1b. the Edition with its own Rate Sheet is published');
catalogueCheck(rowIds($options['ed_own']['inclusions_override']) === ['gpu', 'residency'], '1c. that Edition publishes ITS OWN Rate Sheet rows, not Default\'s — got ' . implode(',', rowIds($options['ed_own']['inclusions_override'])));
catalogueCheck(rowIds($options['ed_own']['inclusions_override']) !== rowIds($offer['inclusions']), '1d. Default and Edition catalogues are genuinely different row sets');

// ── 2. An Edition policy item that exists only on that Edition's own sheet
//    now has a matching row to join against, instead of being dropped. ──────
$editionPolicyIds = array_map(static fn(array $item): string => (string) $item['item_id'], $options['ed_own']['customer_policy']['items'] ?? []);
catalogueCheck($editionPolicyIds === ['gpu', 'residency'], '2a. the Edition publishes its own customer_policy — got ' . implode(',', $editionPolicyIds));
$joinable = array_values(array_intersect($editionPolicyIds, rowIds($options['ed_own']['inclusions_override'])));
catalogueCheck($joinable === ['gpu', 'residency'], '2b. every Edition policy item has a matching published row (the customer-visible join is complete) — got ' . implode(',', $joinable));
catalogueCheck(array_intersect($editionPolicyIds, rowIds($offer['inclusions'])) === [], '2c. none of those items exist on the Default catalogue — before the fix the join dropped all of them');

// ── 3. Binding is the whole boundary: no binding inherits, a binding owns
//    its catalogue outright — including when it selects nothing. ────────────
catalogueCheck($options['ed_inherit']['inclusions_override'] === $offer['inclusions'], '3a. an Edition with no Rate Sheet binding inherits the occupant\'s resolved rows verbatim');
catalogueCheck($options['ed_bound_no_rows']['inclusions_override'] === [], '3b. an Edition BOUND to a sheet but selecting no rows publishes an EMPTY catalogue — never Default\'s rows, which would leak one declaration\'s catalogue into another\'s — got ' . implode(',', rowIds($options['ed_bound_no_rows']['inclusions_override'])));

// ── 4. Browse metadata survives on Edition rows — same decoration as the
//    occupant's own, never a weaker shape. ──────────────────────────────────
$gpu = $options['ed_own']['inclusions_override'][0];
foreach (['id', 'label', 'quantity', 'unit_price', 'line_total', 'categories', 'service'] as $key) {
    catalogueCheck(array_key_exists($key, $gpu), "4a. Edition row carries the browse field '{$key}'");
}
catalogueCheck($gpu['label'] === 'GPU Node' && $gpu['unit_price'] === 500.0 && $gpu['line_total'] === 500.0, '4b. Edition row carries its own resolved label/price — got ' . json_encode([$gpu['label'], $gpu['unit_price'], $gpu['line_total']]));
catalogueCheck(($gpu['bundle_id'] ?? null) === 'bnd_gpu' && array_key_exists('includes', $gpu), '4c. Bundle identity and read-only display children survive on Edition rows');
catalogueCheck(array_keys($gpu) === array_keys($offer['inclusions'][0]), '4d. Edition rows carry exactly the occupant row shape — one decoration rule, never a parallel one');

// ── 5. Must-preserve: the Edition's own commercial projection is untouched
//    by this change. ────────────────────────────────────────────────────────
catalogueCheck($options['ed_own']['price'] === 575.0, '5a. the Edition still prices from its own Rate Sheet selections — got ' . var_export($options['ed_own']['price'], true));
catalogueCheck(array_key_exists('commercial_legs', $options['ed_own']) && array_key_exists('headline_leg_id', $options['ed_own']), '5b. per-Edition commercial_legs/headline_leg_id projection is unchanged');
catalogueCheck($options['ed_own']['edition_platform_id'] === 'CZTE-ED_OWN', '5c. real Edition identity (CZTE) is untouched');

// ── 6. Scope containment: a NORMAL Tier's Editions keep their previous
//    projection — this fix is the composable browse surface only. ───────────
$normalFamily = familyFor(stationFixture(
    occupantFixture('occ_composable', 'CZT-COMPOSABLE', [], ['hosting', 'support'], $defaultPolicy),
    [editionRow('ed_normal', 'Normal Tier Edition', 'rs_edition', ['gpu'], null)]
));
$normalOption = $normalFamily['pricing']['tiers']['basic']['edition_options'][0] ?? null;
catalogueCheck(is_array($normalOption), '6a. the normal Tier occupant still publishes its Edition');
catalogueCheck($normalOption['inclusions_override'] === [], '6b. a normal Tier Edition keeps the previous raw inclusions_override projection — the composable-only narrowing holds');
catalogueCheck($normalOption['price'] === 500.0, '6c. its own per-Edition price projection is still applied');

// ── 7. Rate Sheet identity is the boundary: the SAME underlying inclusion
//    id lives on both sheets, priced and Bundled differently. Each side must
//    resolve it in its OWN Rate Sheet context, never the other's. ───────────
$sharedFamily = familyFor(stationFixture(occupantFixture('occ_composable', 'CZT-COMPOSABLE', [
    editionRow('ed_shared', 'Sovereign Hosting', 'rs_edition', ['hosting'], ['items' => [['item_id' => 'hosting', 'mode' => 'required']]]),
], ['hosting', 'support'], $defaultPolicy)));
$sharedOffer = $sharedFamily['pricing']['composable_offer'] ?? [];
$sharedEdition = $sharedOffer['edition_options'][0] ?? [];
$defaultHosting = $sharedOffer['inclusions'][0];
$editionHosting = $sharedEdition['inclusions_override'][0];
catalogueCheck($defaultHosting['id'] === 'hosting' && $editionHosting['id'] === 'hosting', '7a. both catalogues carry the same underlying inclusion id');
catalogueCheck($defaultHosting['unit_price'] === 100.0 && $editionHosting['unit_price'] === 130.0, '7b. each resolves that id\'s price from its OWN Rate Sheet — got ' . json_encode([$defaultHosting['unit_price'], $editionHosting['unit_price']]));
catalogueCheck($defaultHosting['label'] === 'Hosting' && $editionHosting['label'] === 'Hosting (Sovereign)', '7c. each resolves that id\'s label from its own Rate Sheet row');
catalogueCheck($defaultHosting['bundle_id'] === 'bnd_hosting' && $editionHosting['bundle_id'] === 'bnd_hosting_edition', '7d. Bundle identity is scoped to the owning Rate Sheet — no cross-sheet mixing');
catalogueCheck($sharedEdition['price'] === 130.0, '7e. the Edition prices from its own sheet too — got ' . var_export($sharedEdition['price'], true));

echo "Composable Edition catalogue projection contract: PASS\n";
