<?php

declare(strict_types=1);

/*
 * Rate Sheet Bundle contract.
 *
 * A Bundle is a Rate Sheet-owned composition space: a named set of COMPLETE
 * Rate Sheet rows, carrying its own permanent identity (`CZPRCB`) and giving
 * each of its rows one of its own (`CZPRCBI`). It is not a second Rate Sheet —
 * it stores no groups and no unit vocabulary, and its rows validate against the
 * owning sheet's.
 *
 * This locks the storage shape, the write-path mint, the identity
 * reserve/bind/tombstone cycle, and the rule that a Bundle row is a SEPARATE
 * record from a sheet row that prices the same supplied content.
 *
 * Like tests/rate-sheet-platform-identity-reconciliation.php, this exercises the
 * real PlatformIdentifierStation, PackagePlatformIdentifierService/Adapters,
 * PackageRepository, PackageManagerSchema, and PackageStationController — only
 * WordPress core functions are stubbed.
 */

$rsbOptions = [];

if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $rsbOptions;
        if (array_key_exists($key, $rsbOptions)) return false;
        $rsbOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $rsbOptions;
        return array_key_exists($key, $rsbOptions) ? $rsbOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $rsbOptions;
        $rsbOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_key')) {
    function sanitize_key(mixed $value): string { return strtolower((string) preg_replace('/[^a-z0-9_\-]/', '', (string) $value)); }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-08-15 00:00:00'; }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post { return $id === 701 ? new WP_Post($id, 'Bundle Host Service') : null; }
}
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response(mixed $value): WP_REST_Response
    {
        return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
    }
}
if (!class_exists('WP_Post')) {
    class WP_Post
    {
        public string $post_type = 'cz_service';
        public function __construct(public int $ID, public string $post_title) {}
    }
}
if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request
    {
        public function __construct(private array $params = [], private array $body = []) {}
        public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
        public function get_json_params(): array { return $this->body; }
    }
}
if (!class_exists('WP_REST_Response')) {
    class WP_REST_Response
    {
        public function __construct(private mixed $data = null, private int $status = 200) {}
        public function get_data(): mixed { return $this->data; }
        public function get_status(): int { return $this->status; }
    }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

$rsbChecks = 0;
function check_bundle(bool $condition, string $message, mixed $detail = null): void
{
    global $rsbChecks;
    if (!$condition) throw new RuntimeException('Rate Sheet Bundle: ' . $message . ($detail === null ? '' : ' — got ' . var_export($detail, true)));
    $rsbChecks++;
    echo "  ok — {$message}\n";
}

function rsb_default_station(): array
{
    return [
        'platform_status' => 'disabled', 'tier_instances' => [], 'tier_assignments' => [],
        'sort_position' => 0, 'bundle' => ['title' => '', 'description' => '', 'price' => null],
        'promotions' => [], 'package_manager' => PackageManagerSchema::defaultManager(),
        'legacy_host_service_id' => 0,
    ];
}

function rsb_body(array $rateSheets): array
{
    return [
        'sources' => [], 'groups' => [], 'item_decisions' => [],
        'rate_sheets' => $rateSheets, 'rate_sheet_deletions' => [],
    ];
}

function rsb_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository(), new PlatformIdentifierStation());
}

$itemA = PackageManagerSchema::deriveItemId('inclusion', 'src-a');
$itemB = PackageManagerSchema::deriveItemId('inclusion', 'src-b');
$itemC = PackageManagerSchema::deriveItemId('inclusion', 'src-c');
$sourceItems = [];
foreach ([['src-a', $itemA], ['src-b', $itemB], ['src-c', $itemC]] as [$sourceId, $itemId]) {
    $sourceItems[] = [
        'item_id' => $itemId, 'source_type' => 'inclusion', 'source_id' => $sourceId,
        'group_id' => null, 'sort_order' => 0, 'disabled' => false,
        'decorated_label' => null, 'draft' => null, 'module_transition' => 'settled',
    ];
}

// ── Storage shape (pure) ─────────────────────────────────────────────────────

echo "Rate Sheet Bundle — storage shape\n";

$sanitised = PackageManagerSchema::sanitize([
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_1', 'title' => 'Sheet', 'status' => 'active',
        'groups' => [['group_id' => 'g1', 'label' => 'Web', 'sort_order' => 0]],
        'items' => [],
        'bundles' => [[
            'bundle_id' => 'rsb_1', 'title' => 'Digital Banking Website', 'status' => 'active', 'sort_order' => 0,
            'items' => [[
                'source_item_id' => $itemA, 'label' => 'Website', 'unit_price' => 500, 'per' => 'Per item',
                'quantity' => 2, 'group_id' => 'g1', 'sort_order' => 0,
                'price_options' => [['option_id' => '', 'label' => 'Annual', 'unit_price' => 5000]],
            ], [
                // Unknown unit and unknown group both fail closed, exactly as
                // they do on a sheet's own row.
                'source_item_id' => $itemB, 'label' => '', 'unit_price' => -5, 'per' => 'Per fortnight',
                'quantity' => 0, 'group_id' => 'g_missing', 'sort_order' => 1, 'price_options' => [],
            ]],
        ]],
    ]],
]);
$bundle = $sanitised['rate_sheets'][0]['bundles'][0];
check_bundle(count($sanitised['rate_sheets'][0]['bundles']) === 1, 'a sheet keeps its Bundles through sanitize');
check_bundle($bundle['title'] === 'Digital Banking Website' && $bundle['status'] === 'active', 'a Bundle keeps its own title and status');
check_bundle($bundle['items'][0]['item_id'] === PackageManagerSchema::deriveBundleRateItemId('rsb_1', $itemA), 'a Bundle row derives an ordinary Rate Sheet row id, qualified by the Bundle that created it');
check_bundle($bundle['items'][0]['item_id'] !== PackageManagerSchema::deriveRateItemId($itemA), "so it can never collide with the sheet's own row for the same supplied content");
check_bundle($bundle['items'][0]['label'] === 'Website', 'a Bundle row keeps its own editable label');
check_bundle($bundle['items'][0]['quantity'] === 2 && $bundle['items'][0]['per'] === 'Per item', 'a Bundle row keeps quantity and a known unit');
check_bundle(count($bundle['items'][0]['price_options']) === 1, 'a Bundle row keeps its own Price Options');
check_bundle($bundle['items'][1]['per'] === '' && $bundle['items'][1]['group_id'] === null, 'an unknown unit and an unknown group fail closed on a Bundle row too');
check_bundle($bundle['items'][1]['quantity'] === 1 && (float) $bundle['items'][1]['unit_price'] === 0.0, 'a Bundle row clamps quantity and price the same way');
check_bundle(!array_key_exists('groups', $bundle) && !array_key_exists('rate_sheet_units', $bundle), 'a Bundle stores no groups and no unit vocabulary of its own');
check_bundle($bundle['items'][0]['price_options'][0]['option_id'] === '', 'sanitize never mints — a blank option_id survives the read path');

// A Bundle IS the single Rate Sheet row it presents, so it carries the row's
// COMPLETE field set — quantity and group included, validated by the same rules
// a row's are rather than defaulted at projection time.
$bundleRowFields = PackageManagerSchema::sanitize([
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_q', 'title' => 'Sheet', 'status' => 'active',
        'groups' => [['group_id' => 'g1', 'label' => 'Web', 'sort_order' => 0]],
        'items' => [],
        'bundles' => [[
            'bundle_id' => 'rsb_q', 'title' => 'Foundation Bundle', 'status' => 'active',
            'unit_price' => 750, 'per' => 'Per item', 'quantity' => 3, 'group_id' => 'g1',
            'items' => [['source_item_id' => $itemA, 'label' => '', 'unit_price' => 0, 'per' => 'Per item']],
        ], [
            'bundle_id' => 'rsb_q2', 'title' => 'Clamped', 'status' => 'active',
            'unit_price' => 10, 'per' => 'Per item', 'quantity' => 0, 'group_id' => 'g_missing',
            'items' => [['source_item_id' => $itemB, 'label' => '', 'unit_price' => 0, 'per' => 'Per item']],
        ]],
    ]],
]);
$withFields = $bundleRowFields['rate_sheets'][0]['bundles'][0];
$clamped    = $bundleRowFields['rate_sheets'][0]['bundles'][1];
check_bundle($withFields['quantity'] === 3 && $withFields['group_id'] === 'g1', "a Bundle carries its OWN quantity and group, the row's remaining two cells");
check_bundle($clamped['quantity'] === 1 && $clamped['group_id'] === null, 'and clamps/fails them closed exactly as a row does');

$offeredFields = PackageManagerSchema::consumableRateSheetRows($bundleRowFields['rate_sheets'][0]);
check_bundle(count($offeredFields) === 2, 'each active Bundle is still offered upstream as one row');
check_bundle($offeredFields[0]['quantity'] === 3 && $offeredFields[0]['group_id'] === 'g1', "the offered row carries the Bundle's own quantity and group in the ordinary positions");

$legacyFields = PackageManagerSchema::sanitize([
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_lf', 'title' => 'Sheet', 'status' => 'active', 'groups' => [], 'items' => [],
        'bundles' => [['bundle_id' => 'rsb_lf', 'title' => 'Older', 'status' => 'active', 'unit_price' => 5, 'per' => 'Per item', 'items' => []]],
    ]],
]);
$legacyBundle = $legacyFields['rate_sheets'][0]['bundles'][0];
check_bundle($legacyBundle['quantity'] === 1 && $legacyBundle['group_id'] === null, 'a Bundle stored before those fields existed reads back on the defaults the projection used to hardcode');

$bundleOnly = PackageManagerSchema::sanitize([
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_2', 'title' => '', 'status' => 'active', 'groups' => [], 'items' => [],
        'bundles' => [['bundle_id' => 'rsb_2', 'title' => 'Only Bundle', 'status' => 'active', 'items' => []]],
    ]],
]);
check_bundle(count($bundleOnly['rate_sheets']) === 1, 'a sheet whose only content is a Bundle is not dropped as empty');

$legacy = PackageManagerSchema::sanitize([
    'rate_sheets' => [['rate_sheet_id' => 'rs_3', 'title' => 'No bundles key', 'status' => 'active', 'groups' => [], 'items' => []]],
]);
check_bundle($legacy['rate_sheets'][0]['bundles'] === [], 'a sheet stored before Bundles existed reads back with an empty collection');

// ── Write path: mint, identity, and separation from the sheet's own rows ──────

echo "\nRate Sheet Bundle — write path and identity\n";

$rsbOptions = [];
$rsbOptions['cz_package_station'] = [
    ...rsb_default_station(),
    'package_manager' => [...PackageManagerSchema::defaultManager(), 'items' => $sourceItems],
];

$response = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([[
    'rate_sheet_id' => 'rs_live', 'title' => 'Live Sheet', 'status' => 'active', 'groups' => [],
    // The SAME supplied content is priced by the sheet itself and by the Bundle.
    'items' => [['source_item_id' => $itemA, 'unit_price' => 100, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null]],
    'bundles' => [[
        // Blank bundle_id — the Tool never mints; the backend does, on the write path.
        'bundle_id' => '', 'title' => 'Digital Banking Website', 'status' => 'active',
        'unit_price' => 75, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null,
        'price_options' => [['option_id' => '', 'label' => 'Annual', 'unit_price' => 750]],
        'items' => [
            ['source_item_id' => $itemA, 'label' => 'Website', 'unit_price' => 90, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null,
                'price_options' => [['option_id' => '', 'label' => 'Annual', 'unit_price' => 900]]],
            ['source_item_id' => $itemB, 'label' => '', 'unit_price' => 40, 'per' => 'Per item', 'quantity' => 3, 'group_id' => null, 'price_options' => []],
        ],
    ]],
]])));

check_bundle($response->get_status() === 200 && ($response->get_data()['success'] ?? false) === true, 'a sheet carrying a new Bundle saves in one request');
$savedSheet = $response->get_data()['manager']['rate_sheets'][0];
$savedBundle = $savedSheet['bundles'][0];
$savedCompiledRow = array_values(array_filter(
    $savedSheet['items'],
    static fn(array $row): bool => ($row['item_id'] ?? '') === PackageManagerSchema::deriveBundleRowId((string) $savedBundle['bundle_id'])
))[0];

check_bundle(str_starts_with((string) $savedBundle['bundle_id'], 'rsb_'), 'the backend minted the Bundle id on the write path');
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_BUNDLE, (string) $savedBundle['platform_id']),
    'the Bundle carries a valid CZPRCB'
);
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM, (string) $savedCompiledRow['platform_id']),
    'the compiled output carries its own valid CZPRCI'
);
check_bundle($savedCompiledRow['platform_id'] !== $savedBundle['platform_id'], 'the compiled CZPRCI is distinct from the Bundle CZPRCB');
check_bundle($savedCompiledRow['bundle_platform_id'] === $savedBundle['platform_id'], 'the compiled row traces back to the Bundle CZPRCB');
check_bundle($savedBundle['compiled_item_platform_id'] === $savedCompiledRow['platform_id'], 'the Bundle persists the compiled-row CZPRCI linkage');
check_bundle($savedCompiledRow['unit_price'] === 75.0, 'the compiled CZPRCI carries the Bundle configured price');
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_BUNDLE_OPTION, (string) $savedBundle['price_options'][0]['platform_id']),
    'the Bundle keeps its own CZPRCBO Price Option identity'
);
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_BUNDLE_ITEM, (string) $savedBundle['items'][0]['platform_id']),
    'each Bundle row carries a valid CZPRCBI'
);
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_BUNDLE_ITEM_OPTION, (string) $savedBundle['items'][0]['price_options'][0]['platform_id']),
    'a Bundle row Price Option carries a valid CZPRCBIO'
);
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM, (string) $savedSheet['items'][0]['platform_id']),
    "the sheet's own row keeps its own CZPRCI, untouched by the Bundle"
);
check_bundle(
    $savedSheet['items'][0]['platform_id'] !== $savedBundle['items'][0]['platform_id'],
    'the same supplied content priced in both places is TWO records with two identities'
);
check_bundle(
    $savedSheet['items'][0]['unit_price'] === 100.0 && $savedBundle['items'][0]['unit_price'] === 90.0,
    'each of those records carries its own price'
);
check_bundle($savedBundle['items'][1]['label'] === '', 'a Bundle row that inherits its label stores a blank one, never a copied string');

$mintedBundleId = (string) $savedBundle['bundle_id'];
$compiledItemId = PackageManagerSchema::deriveBundleRowId($mintedBundleId);
$bundleReference = PackagePlatformNativeReference::rateSheetBundle('rs_live', $mintedBundleId);
$compiledReference = PackagePlatformNativeReference::rateSheetItem('rs_live', $compiledItemId);
$bundleRecord = $rsbOptions['cz_platform_identifier_v1_' . $savedBundle['platform_id']];
$compiledRecord = $rsbOptions['cz_platform_identifier_v1_' . $savedCompiledRow['platform_id']];
check_bundle($bundleRecord['status'] === PlatformIdentifierStation::STATUS_BOUND, 'the Bundle registry record is bound, not merely reserved');
check_bundle($bundleRecord['native_reference'] === $bundleReference, 'it is bound to (rate_sheet_id, bundle_id)');
check_bundle($compiledRecord['status'] === PlatformIdentifierStation::STATUS_BOUND, 'the compiled CZPRCI registry record is bound');
check_bundle($compiledRecord['native_reference'] === $compiledReference, 'the compiled CZPRCI uses the normal (rate_sheet_id, item_id) native reference');
$identityRepository = new PackageRepository();
check_bundle(
    $identityRepository->rateSheetPlatformId($compiledReference, 'item') === $savedCompiledRow['platform_id'],
    'normal Rate Sheet Item lookup resolves the Bundle-produced CZPRCI'
);
check_bundle(
    in_array($compiledReference, $identityRepository->rateSheetAssignmentPage(null, 500, 'item')['items'], true),
    'normal Rate Sheet Item enumeration includes the compiled row native reference'
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $savedBundle['items'][0]['platform_id']]['native_reference']
        === PackagePlatformNativeReference::rateSheetBundleItem('rs_live', $mintedBundleId, (string) $savedBundle['items'][0]['item_id']),
    'a Bundle row is bound to (rate_sheet_id, bundle_id, item_id)'
);

// ── A second save preserves identity; removing a Bundle tombstones only it ────

echo "\nRate Sheet Bundle — stability and removal\n";

// The Tool never sends a Platform ID back — it is output-only, and the request
// guard rejects any body that carries one, at any depth, Bundles included.
$stripPlatformIds = static function (array $node) use (&$stripPlatformIds): array {
    unset($node['platform_id'], $node['cz_platform_id']);
    foreach ($node as $key => $value) {
        if (is_array($value)) $node[$key] = $stripPlatformIds($value);
    }
    return $node;
};
check_bundle(
    (rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([$savedSheet])))->get_data()['success'] ?? null) === false,
    'a request that echoes a Bundle Platform ID back is rejected as an immutable-identity mutation'
);

$reSubmit = $stripPlatformIds($savedSheet);
$reSubmit['bundles'][0]['title'] = 'Digital Banking Website v2';
$reSubmit['bundles'][0]['unit_price'] = 77;
$reSubmit['bundles'][0]['quantity'] = 4;
$reSubmit['bundles'][0]['price_options'][0]['label'] = 'Annual revised';
$reSubmit['bundles'][0]['price_options'][0]['unit_price'] = 770;
array_pop($reSubmit['bundles'][0]['items']);
$response2 = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([$reSubmit])));
$savedSheet2 = $response2->get_data()['manager']['rate_sheets'][0];
$savedBundle2 = $savedSheet2['bundles'][0];
check_bundle($savedBundle2['bundle_id'] === $mintedBundleId, 're-saving a Bundle keeps its native id');
check_bundle($savedBundle2['platform_id'] === $savedBundle['platform_id'], 'renaming a Bundle never re-mints its Platform ID');
check_bundle($savedBundle2['compiled_item_platform_id'] === $savedBundle['compiled_item_platform_id'], 'republishing keeps the compiled CZPRCI');
check_bundle($savedBundle2['price_options'][0]['platform_id'] === $savedBundle['price_options'][0]['platform_id'], 'Bundle Price Option changes keep the existing CZPRCBO');
check_bundle(count($savedBundle2['items']) === 1, 'component changes persist without replacing the Bundle');
check_bundle($savedBundle2['items'][0]['platform_id'] === $savedBundle['items'][0]['platform_id'], "its rows' identities are equally stable");
check_bundle($savedBundle2['items'][0]['price_options'][0]['platform_id'] === $savedBundle['items'][0]['price_options'][0]['platform_id'], "its rows' Price Option identities are equally stable");
check_bundle(
    count(array_filter($savedSheet2['items'], static fn(array $row): bool => ($row['item_id'] ?? '') === $compiledItemId)) === 1,
    're-publish produces exactly one compiled Bundle row, never a saved-source duplicate'
);
check_bundle(
    $compiledItemId === PackageManagerSchema::deriveBundleRowId($savedBundle2['bundle_id']),
    'name, price, and quantity changes leave the compiled item_id unchanged'
);

$withoutBundle = $stripPlatformIds($response2->get_data()['manager']['rate_sheets'][0]);
$withoutBundle['bundles'] = [];
$response3 = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([$withoutBundle])));
$sheetAfterRemoval = $response3->get_data()['manager']['rate_sheets'][0];
check_bundle($sheetAfterRemoval['bundles'] === [], 'removing a Bundle removes it from the sheet');
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $savedBundle['platform_id']]['status'] === PlatformIdentifierStation::STATUS_DELETED,
    "the removed Bundle's identity is tombstoned, never reused"
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $savedCompiledRow['platform_id']]['status'] === PlatformIdentifierStation::STATUS_DELETED,
    "the removed Bundle's compiled CZPRCI is tombstoned with its published row"
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $savedBundle['items'][0]['platform_id']]['status'] === PlatformIdentifierStation::STATUS_DELETED,
    "its rows' identities are tombstoned with it"
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $sheetAfterRemoval['items'][0]['platform_id']]['status'] === PlatformIdentifierStation::STATUS_BOUND,
    "the sheet's own row for the same supplied content is completely unaffected"
);

// ── Tier consumption: a Bundle-created row IS an ordinary Rate Sheet row ─────
//
// The Bundle distinction lives entirely inside Rate Sheet ownership. A Tier
// consumes a Bundle-created row through the SAME pipeline as any other row:
// the same `{ item_id, quantity, price_option_id? }` selection, the same
// projector, the same pricing engine. Nothing downstream knows Bundles exist.

echo "\nRate Sheet Bundle — Tier consumption\n";

$readModel = PackageManagerSchema::buildReadModel(
    701,
    PackageManagerSchema::sanitize([
        'items' => $sourceItems,
        'rate_sheets' => [[
            'rate_sheet_id' => 'rs_tier', 'title' => 'Tier Sheet', 'status' => 'active', 'groups' => [],
            'items' => [
                ['item_id' => '', 'source_item_id' => $itemA, 'unit_price' => 100, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'sort_order' => 0,
                    'price_options' => [['option_id' => 'opt_sheet', 'label' => 'Annual', 'unit_price' => 1000]]],
                ['item_id' => '', 'source_item_id' => $itemB, 'unit_price' => 200, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'sort_order' => 1,
                    'price_options' => []],
            ],
            'bundles' => [[
                'bundle_id' => 'rsb_tier', 'title' => 'Digital Banking Website', 'status' => 'active', 'sort_order' => 0,
                // Chef's Soup: its own commercial price, deliberately NOT the
                // sum of its ingredients (80 + 30×2 = 140).
                'unit_price' => 75, 'per' => 'Per item',
                'price_options' => [['option_id' => 'opt_soup_annual', 'label' => 'Annual', 'unit_price' => 750]],
                'items' => [
                    // The SAME supplied content as the sheet's own row above, at
                    // this Bundle's own price — a different record, same item_id.
                    ['item_id' => '', 'source_item_id' => $itemA, 'label' => 'Website (bundled)', 'unit_price' => 80, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null,
                        'price_options' => [['option_id' => 'opt_bundle', 'label' => 'Annual', 'unit_price' => 800]]],
                    ['item_id' => '', 'source_item_id' => $itemB, 'label' => '', 'unit_price' => 30, 'per' => 'Per item', 'quantity' => 2, 'group_id' => null, 'price_options' => []],
                ],
            ]],
        ]],
    ]),
    [
        ['id' => 'src-a', 'label' => 'Website'],
        ['id' => 'src-b', 'label' => 'Online Banking'],
        ['id' => 'src-c', 'label' => 'Member Portal'],
    ],
    [],
    'active'
);
$carrot    = PackageManagerSchema::deriveRateItemId($itemA);
$potato    = PackageManagerSchema::deriveRateItemId($itemB);
$soupRow   = PackageManagerSchema::deriveBundleRowId('rsb_tier');
$ingredient = PackageManagerSchema::deriveBundleRateItemId('rsb_tier', $itemA);
$offered   = array_column($readModel['rate_sheets'][0]['items'], 'item_id');

check_bundle(in_array($carrot, $offered, true), "the sheet's own row stays individually sellable");
check_bundle(in_array($potato, $offered, true), 'a second normal CZPRCI row is offered beside it');
check_bundle(!array_key_exists('consumable_items', $readModel['rate_sheets'][0]), 'the Bundle needs no new read-model field — it is in the rows every consumer already reads');
check_bundle(in_array($soupRow, $offered, true), 'the Bundle is offered upstream as ONE priced row');
check_bundle(!in_array($ingredient, $offered, true), 'its component rows are ingredients, not separately chargeable rows');
check_bundle(count($offered) === 3, 'two normal rows plus one compiled Bundle row share the owning sheet items[]', json_encode($offered));
check_bundle(str_starts_with($soupRow, 'rate_'), "the Bundle's row id is an ordinary Rate Sheet row id");
$compiledSoup = array_values(array_filter(
    $readModel['rate_sheets'][0]['items'],
    static fn(array $row): bool => ($row['item_id'] ?? '') === $soupRow
))[0];
check_bundle(!array_key_exists('self_priced', $compiledSoup), 'the published row carries no Bundle-origin pricing switch');
check_bundle($compiledSoup['source_item_id'] === '', 'the empty source_item_id remains only as the authoring round-trip guard');

// The Bundle's own commercial price — deliberately NOT the sum of its rows.
$soup = PackageManagerSchema::projectTierRateSheetWith(
    $readModel, [['item_id' => $soupRow, 'quantity' => 1]], 'rs_tier'
);
check_bundle($soup['price'] === 75.0, "consuming the Bundle charges the Bundle's own price, not the sum of its rows", $soup['price']);
check_bundle($soup['selections'][0]['label'] === 'Digital Banking Website', 'the Bundle row names itself');
check_bundle($soup['selections'][0]['available'] === true && $soup['selections'][0]['resolved'] === true, 'and resolves on its own, needing no supplied content behind it');
check_bundle(count($soup['selections'][0]['includes']) === 2, 'carrying its ingredients for the Includes presentation');
check_bundle(!array_key_exists('bundle_id', $soup['selections'][0]), 'a resolved selection carries no Bundle-shaped field');
check_bundle($soup['pricing']['unresolved'] === [] && $soup['pricing']['complete'] === true, 'the shared pricing engine reports it complete', json_encode($soup['pricing']['unresolved']));

// An ordinary row is completely unaffected by any of it.
$plain = PackageManagerSchema::projectTierRateSheetWith(
    $readModel, [['item_id' => $carrot, 'quantity' => 1]], 'rs_tier'
);
check_bundle($plain['price'] === 100.0, "the sheet's own row prices exactly as before");
check_bundle($plain['selections'][0]['label'] === 'Website', 'carrying its supplied content label');

// Both, together: one commercial item plus one ordinary row.
$both = PackageManagerSchema::projectTierRateSheetWith($readModel, [
    ['item_id' => $carrot, 'quantity' => 1],
    ['item_id' => $soupRow, 'quantity' => 1],
], 'rs_tier');
check_bundle($both['price'] === 175.0, 'selecting both charges the row plus the Bundle price, never the ingredients twice', $both['price']);

$edition = PackageManagerSchema::projectEditionPrices($readModel, [[
    'edition_id' => 'edition_bundle',
    'rate_sheet_id' => 'rs_tier',
    'rate_sheet_items' => [['item_id' => $soupRow, 'quantity' => 1]],
]]);
check_bundle($edition[0]['price'] === 75.0, 'Edition pricing consumes the same compiled row through the shared projector');

// The Bundle's own Price Options behave like any row's.
$soupAnnual = PackageManagerSchema::projectTierRateSheetWith(
    $readModel, [['item_id' => $soupRow, 'quantity' => 1, 'price_option_id' => 'opt_soup_annual']], 'rs_tier'
);
check_bundle($soupAnnual['price'] === 750.0, "the Bundle's own Price Option prices it");
$foreign = PackageManagerSchema::projectTierRateSheetWith(
    $readModel, [['item_id' => $soupRow, 'quantity' => 1, 'price_option_id' => 'opt_sheet']], 'rs_tier'
);
check_bundle($foreign['selections'][0]['unit_price'] === null, "another row's Price Option does not resolve against it");

// An archived Bundle offers nothing upstream.
$archivedModel = PackageManagerSchema::buildReadModel(701, PackageManagerSchema::sanitize([
    'items' => $sourceItems,
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_arch', 'title' => 'Archived', 'status' => 'active', 'groups' => [], 'items' => [],
        'bundles' => [['bundle_id' => 'rsb_arch', 'title' => 'Retired Soup', 'status' => 'archived', 'unit_price' => 75, 'per' => 'Per item', 'items' => []]],
    ]],
]), [['id' => 'src-a', 'label' => 'Website']], [], 'active');
check_bundle($archivedModel['rate_sheets'][0]['items'] === [], 'an archived Bundle offers nothing, mirroring an archived sheet');

// Tier selection storage is untouched by any of this.
$stored = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::sanitizeTierRateSheetSelections([
    ['item_id' => $carrot, 'quantity' => 2],
    ['item_id' => $soupRow, 'quantity' => 1, 'price_option_id' => 'opt_soup_annual'],
]);
check_bundle(
    $stored === [
        ['item_id' => $carrot, 'quantity' => 2, 'price_option_id' => null],
        ['item_id' => $soupRow, 'quantity' => 1, 'price_option_id' => 'opt_soup_annual'],
    ],
    'stored Tier selections keep the pre-Bundle shape exactly: { item_id, quantity, price_option_id }',
    json_encode($stored)
);

echo "\nRate Sheet Bundle contract: PASS ({$rsbChecks} checks)\n";
