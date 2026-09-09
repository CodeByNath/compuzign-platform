<?php

declare(strict_types=1);

/*
 * Composable occupant Edition set — public projection completeness.
 *
 * project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md,
 * 2026-09-09 live-validation round: deployed `main@4a73ed87` showed only
 * `Default` + one real Edition ("Subscriptions") on the composable
 * occupant's Upgrade cue, though the occupant has more active,
 * customer-configured Editions than that. `Default` is a synthetic
 * frontend-only entry (never server data) — only the ONE real server
 * Edition survived.
 *
 * Root cause: `PackageRepository::enrichCompiledOccupantIdentity()`
 * dropped ANY `edition_options` entry whose `edition_platform_id` (CZTE,
 * minted only when an admin transitions that Edition to Active through
 * `updateComposableOccupantEditionStatus()`) resolved empty —
 * `array_filter(..., fn($option) => $option['edition_platform_id'] !== '')`.
 * That mirrors the correct, intentional "never surfaced half-identified"
 * rule for the OCCUPANT itself (no `cz_platform_id` -> the whole
 * composable_offer is null) — but applying the identical rule to each
 * individual Edition-CHILD is too strict for this customer browsing
 * surface: nothing in the actual selection/pricing/resolution path reads
 * `edition_platform_id` at all —
 * `PackageRepository::resolveComposableOfferSelection()` matches an
 * Edition purely by its own `id` (never `edition_platform_id`), and
 * `EditionCueSelector`/`resolveComposableEligibleRows()` on the frontend
 * do the same. `edition_platform_id` only ever reaches the eventually-
 * committed quote item's own `tierEditionPlatformId` field
 * (`buildComposableFamilyTierQuoteItem()` in `ComposableOfferBrowser.tsx`),
 * which already tolerates an empty string there (`?? null` only
 * substitutes on null/undefined, not on `''`) — so gating mere
 * BROWSABILITY on a secondary/reporting identifier that has nothing to do
 * with whether the Edition is selectable or resolvable was the bug: a
 * real, active, customer-configured Edition that simply hasn't been
 * through the identity-minting transition yet (or predates it) was
 * invisible to the customer entirely, with no way to select it.
 *
 * Fix: `enrichCompiledOccupantIdentity()` still ATTACHES
 * `edition_platform_id` (real value when minted, `''` when not) onto
 * every surviving option, but no longer drops an option merely for it
 * being empty. The occupant-level gate (`$tierPlatformId === ''` ->
 * return null for the WHOLE composable_offer) is untouched — the
 * occupant itself must still be identified; only the per-Edition filter
 * changes. `publicTierEditionOptions()` upstream already restricts the
 * candidate set to ACTIVE editions only — disabled/trashed Editions never
 * reach this function at all, so this fix cannot expose one.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
$editionSetOption = null;
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-09-09 00:00:00'; }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $editionSetOption;
        return $key === 'cz_package_station' ? ($editionSetOption ?? $default) : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $editionSetOption;
        if ($key === 'cz_package_station') { $editionSetOption = $value; }
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

function editionSetCheck(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

function editionRow(string $id, string $title, string $rateSheetId, string $platformId): array
{
    return [
        'id' => $id, 'edition_platform_id' => $platformId, 'edition_catalogue_platform_id' => $platformId !== '' ? 'CZTEC-' . strtoupper($id) : '',
        'default_leg_platform_id' => $platformId !== '' ? 'CZTEL-' . strtoupper($id) : '', 'title' => $title, 'admin_description' => '',
        'platform_status' => 'active', 'previous_platform_status' => null, 'is_explicitly_disabled' => false,
        'module_status' => [], 'drafts' => [],
        'rate_sheet_id' => $rateSheetId,
        'rate_sheet_items' => [['item_id' => 'hosting', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []]],
        'price' => 10.0, 'contact' => false, 'billing_cycle' => 'monthly',
        'minimum_term_value' => null, 'minimum_term_unit' => null,
        'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
        'inclusions_override' => [], 'customer_policy' => null, 'faq_refs' => [],
    ];
}

function composableOccupantFixture(array $tierEditions): array
{
    return [
        'id' => 'occ_composable', 'cz_platform_id' => 'CZT-COMPOSABLE', 'addon_platform_id' => '',
        'default_leg_platform_id' => '', 'platform_status' => 'active', 'is_explicitly_disabled' => false,
        'is_addon' => false, 'label' => 'Build Your Own', 'ideal_for' => '',
        'audience_groups' => ['personal_business', 'enterprise'], 'price' => null, 'contact' => false,
        'billing_cycle' => 'monthly', 'minimum_term_value' => null, 'minimum_term_unit' => null,
        'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
        'rate_sheet_id' => 'rs_a',
        'inclusions_override' => [],
        'rate_sheet_items' => [['item_id' => 'hosting', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []]],
        'features' => [], 'faq_refs' => [],
        'customer_policy' => ['items' => [['item_id' => 'hosting', 'mode' => 'required']]],
        'tier_editions' => $tierEditions,
        'tier_edition_bin' => [],
    ];
}

function stationFixture(array $composableOccupant): array
{
    $instance = [
        'tier_instance_id' => 'ti_x', 'cz_platform_id' => 'CZTG-X', 'title' => 'Edition Set Projection',
        'status' => 'active', 'allowed_rate_sheet_ids' => ['rs_a'], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => TIS::emptyTierMap(), 'occupant_bin' => [],
    ];
    $primary = composableOccupantFixture([]);
    $primary['id'] = 'occ_primary';
    $primary['cz_platform_id'] = 'CZT-PRIMARY';
    $instance['tiers']['basic'] = ['current_occupant' => $primary, 'history' => []];
    $instance['composable_occupant'] = ['current_occupant' => $composableOccupant, 'history' => []];

    $manager = [
        'sources' => [], 'groups' => [], 'category_groups' => [[
            'group_id' => 'pcg_x', 'cz_platform_id' => 'CZPG-X', 'label' => 'Edition Set Family',
            'description' => '', 'platform_status' => 'active', 'previous_platform_status' => null,
            'module_status' => ['overview' => 'settled'], 'overview_draft' => null, 'sort_order' => 0,
        ]], 'items' => [],
        'rate_sheets' => [[
            'rate_sheet_id' => 'rs_a', 'title' => 'Rates', 'status' => 'active', 'groups' => [],
            'items' => [
                ['item_id' => 'hosting', 'source_item_id' => '', 'bundle_id' => 'bnd_hosting', 'label' => 'Hosting', 'unit_price' => 100, 'per' => null, 'quantity' => 1, 'group_id' => null, 'price_options' => []],
            ],
        ]],
    ];

    return [
        'platform_status' => 'active', 'tier_instances' => [$instance],
        'tier_assignments' => [[
            'assignment_id' => TAS::deriveAssignmentId('package_family', 'pcg_x', 'ti_x'),
            'consumer_type' => 'package_family', 'consumer_id' => 'pcg_x', 'tier_instance_id' => 'ti_x',
        ]],
        'popular_tier' => null, 'popular_label' => '', 'sort_position' => 0,
        'bundle' => ['title' => '', 'description' => '', 'price' => null], 'occupant_bin' => [], 'promotions' => [],
        'package_manager' => $manager, 'legacy_host_service_id' => 0, 'valid_from' => null, 'valid_until' => null,
    ];
}

function editionOptionsFor(array $station): array
{
    global $editionSetOption;
    $editionSetOption = $station;
    $response = (new PackageFamilyPricingBuilder(new PackageRepository()))->buildResponse();
    $family = $response['families'][0] ?? null;
    return $family['pricing']['composable_offer']['edition_options'] ?? [];
}

// ── 1. Every active Edition minted — all survive (already worked; locks
//    no regression from the fix below). ─────────────────────────────────
$allMinted = editionOptionsFor(stationFixture(composableOccupantFixture([
    editionRow('ed_subs', 'Subscriptions', 'rs_a', 'CZTE-SUBS'),
    editionRow('ed_perpetual', 'Perpetual', 'rs_a', 'CZTE-PERPETUAL'),
    editionRow('ed_enterprise', 'Enterprise', 'rs_a', 'CZTE-ENTERPRISE'),
])));
editionSetCheck(count($allMinted) === 3, '1a. three fully-minted active Editions all survive — got ' . count($allMinted));

// ── 2. THE LIVE DEFECT: some active Editions never minted a Platform ID
//    (edition_platform_id === '') — before the fix, these silently
//    vanished from the customer-facing set entirely. ────────────────────
$mixedMinted = editionOptionsFor(stationFixture(composableOccupantFixture([
    editionRow('ed_subs', 'Subscriptions', 'rs_a', 'CZTE-SUBS'),
    editionRow('ed_perpetual', 'Perpetual', 'rs_a', ''),
    editionRow('ed_enterprise', 'Enterprise', 'rs_a', ''),
])));
editionSetCheck(count($mixedMinted) === 3, '2a. all three ACTIVE Editions survive regardless of minted Platform ID — got ' . count($mixedMinted) . ' (this is the exact live defect: it silently dropped to 1)');
$idsPresent = array_map(static fn(array $o): string => $o['id'], $mixedMinted);
editionSetCheck(in_array('ed_perpetual', $idsPresent, true), '2b. an active but never-minted Edition (Perpetual) is present');
editionSetCheck(in_array('ed_enterprise', $idsPresent, true), '2c. an active but never-minted Edition (Enterprise) is present');
foreach ($mixedMinted as $option) {
    editionSetCheck(array_key_exists('edition_platform_id', $option), '2d. edition_platform_id key is still present on every option (real value or empty string, never dropped as a field)');
}

// ── 3. No Edition minted at all (identity system never reached this
//    occupant yet) — the occupant still shows its full active Edition
//    set; only the id/label/pricing need to be real, not the CZTE. ──────
$noneMinted = editionOptionsFor(stationFixture(composableOccupantFixture([
    editionRow('ed_a', 'A', 'rs_a', ''),
    editionRow('ed_b', 'B', 'rs_a', ''),
])));
editionSetCheck(count($noneMinted) === 2, '3a. zero minted Editions still all survive — got ' . count($noneMinted));

// ── 4. Must-not-substitute: a DISABLED Edition never appears, minted or
//    not — publicTierEditionOptions() already gates on platform_status
//    upstream of the fixed function; this proves the fix didn't loosen
//    that gate. ────────────────────────────────────────────────────────
$withDisabled = composableOccupantFixture([
    editionRow('ed_active', 'Active One', 'rs_a', 'CZTE-ACTIVE'),
]);
$disabledRow = editionRow('ed_disabled', 'Disabled One', 'rs_a', '');
$disabledRow['platform_status'] = 'disabled';
$withDisabled['tier_editions'][] = $disabledRow;
$disabledResult = editionOptionsFor(stationFixture($withDisabled));
editionSetCheck(count($disabledResult) === 1, '4a. a disabled Edition never survives regardless of Platform ID — got ' . count($disabledResult));
editionSetCheck($disabledResult[0]['id'] === 'ed_active', '4b. only the active Edition is present');

// ── 5. Must-preserve: the OCCUPANT-level gate is untouched — no minted
//    occupant CZT still means the WHOLE composable_offer is absent, even
//    if its Editions are all minted. ─────────────────────────────────────
$unidentifiedOccupant = composableOccupantFixture([
    editionRow('ed_a', 'A', 'rs_a', 'CZTE-A'),
]);
$unidentifiedOccupant['cz_platform_id'] = '';
$stationNoOccupantId = stationFixture($unidentifiedOccupant);
global $editionSetOption;
$editionSetOption = $stationNoOccupantId;
$responseNoOccupantId = (new PackageFamilyPricingBuilder(new PackageRepository()))->buildResponse();
$familyNoOccupantId = $responseNoOccupantId['families'][0] ?? null;
editionSetCheck(($familyNoOccupantId['pricing']['composable_offer'] ?? 'absent') === null || !array_key_exists('composable_offer', $familyNoOccupantId['pricing'] ?? []), '5a. an unidentified occupant (no cz_platform_id) still omits the whole composable_offer — the occupant-level gate is untouched by this fix');

echo "Composable Edition set projection contract: PASS\n";
