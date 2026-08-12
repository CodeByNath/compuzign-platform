<?php

declare(strict_types=1);

/*
 * Contract: a Tier Group derives its OWN composition, live, and can only ever
 * compose what its own Tiers reach.
 *
 * This is the downstream half of the Package Family card. The Family knows only
 * which Tier Group it is assigned; it reads that group by the group's own CZTG
 * and consumes the four numbers below without reproducing any of this. So the
 * scope guarantee the Family card depends on lives HERE, not in the browser:
 *
 *   Tier Group → Tiers → occupants → selected inclusions → Rate Sheet rows
 *   → the Service Category → Service provenance those rows already carry
 *
 * The fixture is deliberately adversarial: two Tier Groups draw from ONE shared
 * Rate Sheet, one row is selected by two Tiers of the same group, and the same
 * row id exists in a second sheet. An implementation that scanned the Rate
 * Sheet, counted selections instead of rows, or collapsed on item_id alone
 * would fail here.
 */

$compositionStationOption = null;

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_key')) {
    function sanitize_key(mixed $value): string { return strtolower((string) preg_replace('/[^a-z0-9_\-]/', '', (string) $value)); }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $compositionStationOption;
        return $key === 'cz_package_station' ? $compositionStationOption : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $compositionStationOption;
        if ($key === 'cz_package_station') { $compositionStationOption = $value; }
        return true;
    }
}

// ── The supplying Services and their category-role terms ─────────────────────
// 105 deliberately carries NO Platform ID, and its term carries none either:
// an owner with no CZS/CZC contributes no identity rather than a fabricated one.
const COMPOSITION_SERVICES = [
    101 => ['title' => 'Compute', 'czs' => 'CZS00000101', 'terms' => [201], 'inclusion' => 'inc-compute'],
    102 => ['title' => 'Storage', 'czs' => 'CZS00000102', 'terms' => [201], 'inclusion' => 'inc-storage'],
    103 => ['title' => 'SOC',     'czs' => 'CZS00000103', 'terms' => [202], 'inclusion' => 'inc-soc'],
    104 => ['title' => 'Desk',    'czs' => 'CZS00000104', 'terms' => [203], 'inclusion' => 'inc-desk'],
    105 => ['title' => 'Pilot',   'czs' => '',            'terms' => [204], 'inclusion' => 'inc-pilot'],
];
const COMPOSITION_TERMS = [
    201 => ['name' => 'Cloud Infrastructure', 'czc' => 'CZC00000201'],
    202 => ['name' => 'Security',             'czc' => 'CZC00000202'],
    203 => ['name' => 'Managed Services',     'czc' => 'CZC00000203'],
    204 => ['name' => 'Pilot',                'czc' => ''],
];

if (!class_exists('WP_Post')) {
    class WP_Post
    {
        public string $post_type = 'cz_service';
        public function __construct(public int $ID, public string $post_title) {}
    }
}
if (!class_exists('WP_Term')) {
    class WP_Term
    {
        public function __construct(public int $term_id, public string $name) {}
    }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post
    {
        return isset(COMPOSITION_SERVICES[$id])
            ? new WP_Post($id, COMPOSITION_SERVICES[$id]['title'])
            : null;
    }
}
if (!function_exists('get_post_meta')) {
    function get_post_meta(int $id, string $key, bool $single = false): mixed
    {
        $service = COMPOSITION_SERVICES[$id] ?? null;
        if ($service === null) { return ''; }
        return match ($key) {
            'cz_service_meta'       => ['platform_status' => 'active'],
            'cz_service_inclusions' => ['inclusions' => [['id' => $service['inclusion'], 'label' => $service['title'] . ' inclusion']]],
            'cz_service_faqs'       => [['id' => 'faq-1', 'question' => 'Q', 'answer' => 'A']],
            'cz_platform_id'        => $service['czs'],
            default                 => '',
        };
    }
}
if (!function_exists('wp_get_post_terms')) {
    function wp_get_post_terms(int $id, string $taxonomy, array $args = []): array
    {
        $service = COMPOSITION_SERVICES[$id] ?? null;
        if ($service === null) { return []; }
        return array_map(
            static fn(int $termId): WP_Term => new WP_Term($termId, COMPOSITION_TERMS[$termId]['name']),
            $service['terms']
        );
    }
}
if (!function_exists('get_term_meta')) {
    function get_term_meta(int $termId, string $key, bool $single = false): mixed
    {
        // '' for cz_category_meta keeps CategoryMeta's lazy 'category' role default.
        return $key === 'cz_platform_id' ? (COMPOSITION_TERMS[$termId]['czc'] ?? '') : '';
    }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

function check_composition(bool $condition, string $message): void
{
    if (!$condition) { throw new RuntimeException('Tier Group composition: ' . $message); }
}

/**
 * The manager item id a supplied inclusion reconciles to. Pool ids are
 * service-prefixed for every source that is not the legacy host service
 * (`PackageRepository::sourcePools`), and this fixture has no legacy host, so
 * every id carries its `service:{id}:` prefix.
 */
function composition_source(int $serviceId, string $inclusionId): string
{
    return PackageManagerSchema::deriveItemId('inclusion', "service:{$serviceId}:{$inclusionId}");
}

/** One Rate Sheet row. Row identity is the (rate_sheet_id, item_id) pair. */
function composition_row(string $itemId, string $sourceItemId): array
{
    return [
        'item_id' => $itemId, 'source_item_id' => $sourceItemId,
        'unit_price' => 10, 'per' => 'Per month', 'quantity' => 1,
        'group_id' => null, 'sort_order' => 0, 'price_options' => [],
    ];
}

function composition_occupant(string $occupantId, string $rateSheetId, array $itemIds): array
{
    return ['current_occupant' => [
        'id' => $occupantId,
        'platform_status' => 'active',
        'rate_sheet_id' => $rateSheetId,
        'rate_sheet_items' => array_map(
            static fn(string $itemId): array => ['item_id' => $itemId, 'quantity' => 1],
            $itemIds
        ),
    ]];
}

function composition_instance(string $id, array $occupantsBySlot): array
{
    $instance = [
        'tier_instance_id' => $id, 'cz_platform_id' => 'CZTG' . strtoupper(substr($id, 3, 6)),
        'title' => $id, 'status' => 'active', 'allowed_rate_sheet_ids' => [],
        'popular_tier' => null, 'popular_label' => '',
        'tiers' => TierInstanceSchema::emptyTierMap(), 'occupant_bin' => [],
    ];
    foreach ($occupantsBySlot as $slotId => $occupant) {
        $instance['tiers'][$slotId] = $occupant;
    }
    return $instance;
}

// ── Station: one shared Rate Sheet plus a second sheet reusing a row id ───────

$sharedRows = [
    composition_row('row_compute', composition_source(101, 'inc-compute')),
    composition_row('row_storage', composition_source(102, 'inc-storage')),
    composition_row('row_soc',     composition_source(103, 'inc-soc')),
    composition_row('row_desk',    composition_source(104, 'inc-desk')),
    composition_row('row_pilot',   composition_source(105, 'inc-pilot')),
    // A FAQ-sourced row: real, priced, and NOT an inclusion.
    composition_row('row_faq',     PackageManagerSchema::deriveItemId('faq', 'service:101:faq-1')),
];

$station = [
    'platform_status' => 'active',
    'legacy_host_service_id' => 0,
    'promotions' => [],
    'package_manager' => [
        ...PackageManagerSchema::defaultManager(),
        'sources' => array_map(
            static fn(int $serviceId): array => [
                'provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => $serviceId,
            ],
            array_keys(COMPOSITION_SERVICES)
        ),
        'rate_sheets' => [
            ['rate_sheet_id' => 'rs_shared', 'title' => 'Shared', 'status' => 'active', 'groups' => [], 'items' => $sharedRows],
            // Same row id, different sheet — a genuinely different row.
            ['rate_sheet_id' => 'rs_other', 'title' => 'Other', 'status' => 'active', 'groups' => [],
             'items' => [composition_row('row_compute', composition_source(101, 'inc-compute'))]],
        ],
    ],
    'tier_instances' => [
        composition_instance('ti_kairos', [
            // row_compute is selected by BOTH of these Tiers — one row, not two.
            'basic'    => composition_occupant('occ_k_basic', 'rs_shared', ['row_compute', 'row_storage']),
            'standard' => composition_occupant('occ_k_standard', 'rs_shared', ['row_compute', 'row_soc']),
            // Same row id in a different sheet — a fourth distinct row.
            'premium'  => composition_occupant('occ_k_premium', 'rs_other', ['row_compute']),
        ]),
        composition_instance('ti_aptos', [
            // A FAQ row and a row this sheet does not hold are both excluded.
            'basic' => composition_occupant('occ_a_basic', 'rs_shared', ['row_desk', 'row_pilot', 'row_faq', 'row_ghost']),
        ]),
        composition_instance('ti_empty', []),
    ],
    'tier_assignments' => [],
];
update_option('cz_package_station', $station);

$repository = new PackageRepository();
$compose = static function (string $instanceId) use ($repository): array {
    $projection = $repository->tierGroupProjection(PackagePlatformNativeReference::tierGroup($instanceId));
    check_composition(is_array($projection), "{$instanceId} projects");
    check_composition(is_array($projection['composition'] ?? null), "{$instanceId} carries its own derived composition");
    return $projection['composition'];
};

$kairos = $compose('ti_kairos');
$aptos  = $compose('ti_aptos');
$empty  = $compose('ti_empty');

// ── The Tier Group composes exactly its own downstream structure ─────────────

check_composition($kairos['tiers'] === 3, 'Tiers counts the group\'s own registered occupants');
check_composition(
    $kairos['inclusions'] === 4,
    'Inclusions counts DISTINCT rows: row_compute selected by two Tiers is one row, and the same row id in a second sheet is another'
);
check_composition($kairos['services'] === 3, 'Services is the distinct CZS those rows carry, counted once across Tiers and sheets');
check_composition($kairos['service_categories'] === 2, 'Service Categories is the distinct CZC those rows carry, deduplicated across two Services sharing one category');

check_composition($aptos['tiers'] === 1, 'a second Tier Group reports only its own occupant');
check_composition($aptos['inclusions'] === 2, 'a FAQ-sourced row and a row the bound sheet does not hold are both excluded');
check_composition($aptos['services'] === 1, 'the Platform-ID-less Service adds an Inclusion but no Service identity');
check_composition($aptos['service_categories'] === 1, 'its Platform-ID-less category adds no Category identity either');

// ── Neither group can reach the other, though both draw on one Rate Sheet ────

check_composition(
    $kairos['inclusions'] + $aptos['inclusions'] === 6,
    'the two groups compose six rows between them — neither absorbs the other\'s'
);
check_composition(
    $kairos['services'] !== 5 && $aptos['services'] !== 5,
    'neither group reports every supplying Service on the shared Rate Sheet, only what its own Tiers select'
);
check_composition(
    $empty === ['tiers' => 0, 'service_categories' => 0, 'services' => 0, 'inclusions' => 0],
    'a Tier Group with no occupants composes zeros, never the station\'s Rate Sheet inventory'
);

// ── Derived, never persisted ────────────────────────────────────────────────

$storedInstances = get_option('cz_package_station')['tier_instances'] ?? [];
foreach ($storedInstances as $storedInstance) {
    check_composition(
        !array_key_exists('composition', $storedInstance),
        'the composition is output-only — reading a Tier Group never writes a counter back to storage'
    );
}

// Recomputed live on every read: change one occupant's selections and the next
// projection reflects it with no invalidation step.
$mutated = get_option('cz_package_station');
$mutated['tier_instances'][0]['tiers']['basic']['current_occupant']['rate_sheet_items'] = [
    ['item_id' => 'row_compute', 'quantity' => 1],
];
update_option('cz_package_station', $mutated);
$repositoryAfter = new PackageRepository();
$recomputed = $repositoryAfter->tierGroupProjection(PackagePlatformNativeReference::tierGroup('ti_kairos'))['composition'];
check_composition(
    $recomputed['inclusions'] === 3 && $recomputed['services'] === 2,
    'dropping a selection immediately lowers the composition — the figure is derived on read, never a stored counter'
);

// ── Identity boundary ───────────────────────────────────────────────────────

check_composition(
    $repositoryAfter->tierGroupProjection(PackagePlatformNativeReference::tierGroup('ti_missing')) === null,
    'an unknown Tier Group resolves to null rather than an empty composition'
);

// ── The batch form the Package Family wall reads through ────────────────────
//
// One Family card wall asks for many Tier Groups at once. That must be a
// performance detail only: identical answers, and the SAME closed identity
// boundary as the canonical CZTG read — otherwise the batch becomes a second,
// weaker way to reach a composition that could not be addressed by Platform ID.

$restored = get_option('cz_package_station');
$restored['tier_instances'][0]['tiers']['basic']['current_occupant']['rate_sheet_items'] = [
    ['item_id' => 'row_compute', 'quantity' => 1],
    ['item_id' => 'row_storage', 'quantity' => 1],
];
// A Tier Group with real occupants but NO Platform ID. It composes perfectly
// well; it simply is not addressable, so the batch must refuse to answer for it.
$restored['tier_instances'][] = [
    'tier_instance_id' => 'ti_unidentified', 'cz_platform_id' => '',
    'title' => 'Unidentified', 'status' => 'active', 'allowed_rate_sheet_ids' => [],
    'popular_tier' => null, 'popular_label' => '',
    'tiers' => [...TierInstanceSchema::emptyTierMap(),
        'basic' => composition_occupant('occ_u_basic', 'rs_shared', ['row_desk'])],
    'occupant_bin' => [],
];
update_option('cz_package_station', $restored);

$batchRepository = new PackageRepository();
$batch = $batchRepository->tierGroupCompositions([
    'ti_kairos', 'ti_aptos', 'ti_empty', 'ti_unidentified', 'ti_missing', '',
]);

check_composition(
    $batch['ti_kairos'] === $batchRepository->tierGroupProjection(
        PackagePlatformNativeReference::tierGroup('ti_kairos')
    )['composition'],
    'the batch returns exactly what the canonical CZTG read returns for the same group'
);
check_composition(
    $batch['ti_aptos']['inclusions'] === 2 && $batch['ti_aptos']['services'] === 1,
    'each group in one batch still composes only its own structure'
);
check_composition(
    $batch['ti_empty'] === ['tiers' => 0, 'service_categories' => 0, 'services' => 0, 'inclusions' => 0],
    'an occupant-less group still reports genuine zeros through the batch'
);
check_composition(
    !array_key_exists('ti_unidentified', $batch),
    'a Tier Group with no CZTG is OMITTED, never answered for under its native id — the batch fails closed'
);
check_composition(
    !array_key_exists('ti_missing', $batch) && !array_key_exists('', $batch),
    'unknown and empty instance ids are omitted rather than composing zeros'
);
check_composition(
    $batchRepository->tierGroupCompositions([]) === []
        && $batchRepository->tierGroupCompositions(['ti_unidentified']) === [],
    'a batch with nothing addressable returns nothing at all'
);

$stored = get_option('cz_package_station')['tier_instances'] ?? [];
foreach ($stored as $storedInstance) {
    check_composition(
        !array_key_exists('composition', $storedInstance),
        'the batch is output-only too — reading a wall of Families writes no counter back'
    );
}

echo "Tier Group composition contract passed.\n";
