<?php

declare(strict_types=1);

/*
 * Rate Sheet Bundle contract.
 *
 * A Bundle is a Rate Sheet-owned composition space: it keeps `CZPRCB`, its
 * compiled Bundle Item keeps `CZPRCBI` plus ordinary `CZPRCI`, and each
 * `CZPRCBII` inclusion wraps an exact existing Rate Sheet row/CZPRCI.
 *
 * This locks the storage shape, write-path mint, identity lifecycle, atomic
 * source-row reconciliation, and normal compiled-row publication contract.
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
                'rate_sheet_id' => 'rs_1', 'rate_sheet_item_id' => PackageManagerSchema::deriveRateItemId($itemA),
                'source_item_id' => $itemA, 'label' => 'Website', 'unit_price' => 500, 'per' => 'Per item',
                'quantity' => 2, 'group_id' => 'g1', 'sort_order' => 0,
                'price_options' => [['option_id' => '', 'label' => 'Annual', 'unit_price' => 5000]],
            ], [
                // Unknown unit and unknown group both fail closed, exactly as
                // they do on a sheet's own row.
                'rate_sheet_id' => 'rs_1', 'rate_sheet_item_id' => PackageManagerSchema::deriveRateItemId($itemB),
                'source_item_id' => $itemB, 'label' => '', 'unit_price' => -5, 'per' => 'Per fortnight',
                'quantity' => 0, 'group_id' => 'g_missing', 'sort_order' => 1, 'price_options' => [],
            ]],
        ]],
    ]],
]);
$bundle = $sanitised['rate_sheets'][0]['bundles'][0];
check_bundle(count($sanitised['rate_sheets'][0]['bundles']) === 1, 'a sheet keeps its Bundles through sanitize');
check_bundle($bundle['title'] === 'Digital Banking Website' && $bundle['status'] === 'active', 'a Bundle keeps its own title and status');
check_bundle($bundle['items'][0]['item_id'] === PackageManagerSchema::deriveBundleRateItemId('rsb_1', 'rs_1:' . PackageManagerSchema::deriveRateItemId($itemA)), 'a Bundle membership derives its own stable native id from the exact referenced row');
check_bundle($bundle['items'][0]['item_id'] !== PackageManagerSchema::deriveRateItemId($itemA), 'included membership identity never replaces or collides with the referenced CZPRCI row identity');
check_bundle($bundle['items'][0]['rate_sheet_id'] === 'rs_1' && $bundle['items'][0]['rate_sheet_item_id'] === PackageManagerSchema::deriveRateItemId($itemA), 'sanitize preserves the exact Rate Sheet-row membership address');
check_bundle($bundle['items'][0]['label'] === 'Website', 'a Bundle membership keeps its editable display override');
check_bundle($bundle['items'][0]['quantity'] === 2 && $bundle['items'][0]['per'] === 'Per item', 'a Bundle membership keeps its established authoring fields');
check_bundle(count($bundle['items'][0]['price_options']) === 1, 'a Bundle membership keeps its own Price Options');
check_bundle($bundle['items'][1]['per'] === '' && $bundle['items'][1]['group_id'] === null, 'an unknown unit and unknown group fail closed on a membership too');
check_bundle($bundle['items'][1]['quantity'] === 1 && (float) $bundle['items'][1]['unit_price'] === 0.0, 'membership authoring fields retain their existing clamp rules');
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
$rowAId = PackageManagerSchema::deriveRateItemId($itemA);
$rowBId = PackageManagerSchema::deriveRateItemId($itemB);

$atomicResponse = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([[
    'rate_sheet_id' => 'rs_live', 'title' => 'Live Sheet', 'status' => 'active', 'groups' => [],
    'items' => [
        ['source_item_id' => $itemA, 'unit_price' => 100, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null],
        ['source_item_id' => $itemB, 'unit_price' => 200, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null],
    ],
    'bundles' => [],
], [
    // The same Manager source also has a row elsewhere. Deleting rs_live/B
    // must remove its exact membership, never retarget it to this row.
    'rate_sheet_id' => 'rs_other', 'title' => 'Other Sheet', 'status' => 'active', 'groups' => [],
    'items' => [
        ['source_item_id' => $itemB, 'unit_price' => 999, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null],
    ],
    'bundles' => [],
]])));
$atomicSheet = $atomicResponse->get_data()['manager']['rate_sheets'][0];
$atomicRowAPlatformId = (string) $atomicSheet['items'][0]['platform_id'];
$atomicRowBPlatformId = (string) $atomicSheet['items'][1]['platform_id'];
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM, $atomicRowAPlatformId)
        && PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM, $atomicRowBPlatformId),
    'normal rows A and B exist with durable CZPRCI identities before joining a Bundle'
);

$response = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([[
    'rate_sheet_id' => 'rs_live', 'title' => 'Live Sheet', 'status' => 'active', 'groups' => [],
    'items' => [
        ['source_item_id' => $itemA, 'unit_price' => 100, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null],
        ['source_item_id' => $itemB, 'unit_price' => 200, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null],
    ],
    'bundles' => [[
        // Blank bundle_id — the Tool never mints; the backend does, on the write path.
        'bundle_id' => '', 'title' => 'Digital Banking Website', 'status' => 'active',
        'unit_price' => 75, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null,
        'price_options' => [['option_id' => '', 'label' => 'Annual', 'unit_price' => 750]],
        'items' => [
            ['rate_sheet_id' => 'rs_live', 'rate_sheet_item_id' => $rowAId,
                'source_item_id' => $itemA, 'label' => 'Website', 'unit_price' => 90, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null,
                'price_options' => [['option_id' => '', 'label' => 'Annual', 'unit_price' => 900]]],
            ['rate_sheet_id' => 'rs_live', 'rate_sheet_item_id' => $rowBId,
                'source_item_id' => $itemB, 'label' => '', 'unit_price' => 40, 'per' => 'Per item', 'quantity' => 3, 'group_id' => null, 'price_options' => []],
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
check_bundle($savedBundle['compiled_item_platform_id'] === $savedCompiledRow['platform_id'], 'the Bundle persists the compiled-row CZPRCI linkage');
check_bundle($savedCompiledRow['unit_price'] === 75.0, 'the compiled CZPRCI carries the Bundle configured price');
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM_OPTION, (string) $savedBundle['price_options'][0]['platform_id']),
    'the compiled Bundle row uses ordinary CZPRCIO Price Option identity'
);
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_BUNDLE_ITEM, (string) $savedBundle['bundle_item_platform_id']),
    'the compiled Bundle Item carries a valid CZPRCBI'
);
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_BUNDLE_INCLUDED_ITEM, (string) $savedBundle['items'][0]['platform_id']),
    'each included relationship carries a valid CZPRCBII'
);
check_bundle(
    (string) ($savedBundle['items'][0]['price_options'][0]['platform_id'] ?? '') === '',
    'an unmatched included-row option never receives an independent Bundle option identity'
);
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM, (string) $savedSheet['items'][0]['platform_id']),
    "the sheet's own row keeps its own CZPRCI, untouched by the Bundle"
);
check_bundle(
    $savedSheet['items'][0]['platform_id'] === $atomicRowAPlatformId
        && $savedSheet['items'][1]['platform_id'] === $atomicRowBPlatformId,
    'joining the Bundle does not modify or remint CZPRCI-A or CZPRCI-B'
);
check_bundle(
    $savedBundle['items'][0]['rate_sheet_item_id'] === $savedSheet['items'][0]['item_id']
        && $savedBundle['items'][0]['rate_sheet_item_platform_id'] === $savedSheet['items'][0]['platform_id'],
    'membership A retains the exact original Rate Sheet row item_id and CZPRCI'
);
check_bundle(
    $savedBundle['items'][1]['rate_sheet_item_id'] === $savedSheet['items'][1]['item_id']
        && $savedBundle['items'][1]['rate_sheet_item_platform_id'] === $savedSheet['items'][1]['platform_id'],
    'membership B retains the exact original Rate Sheet row item_id and CZPRCI'
);
check_bundle($savedBundle['items'][1]['label'] === '', 'a Bundle membership that inherits its label stores a blank override');

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
    $rsbOptions['cz_platform_identifier_v1_' . $savedBundle['bundle_item_platform_id']]['native_reference']
        === PackagePlatformNativeReference::rateSheetBundleItem('rs_live', $mintedBundleId, $compiledItemId),
    'the Bundle Item CZPRCBI is bound to the compiled peer row'
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $savedBundle['items'][0]['platform_id']]['native_reference']
        === PackagePlatformNativeReference::rateSheetBundleIncludedItem('rs_live', $mintedBundleId, (string) $savedBundle['items'][0]['item_id']),
    'an included relationship is bound to (rate_sheet_id, bundle_id, item_id)'
);

// ── Source-row removal reconciles memberships atomically ────────────────────

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
$reSubmit['items'] = array_values(array_filter(
    $reSubmit['items'],
    static fn(array $row): bool => ($row['item_id'] ?? '') !== $rowBId
));
$guardedResponse = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([$reSubmit])));
check_bundle(
    ($guardedResponse->get_data()['success'] ?? null) === false
        && str_contains((string) ($guardedResponse->get_data()['message'] ?? ''), 'still included by Bundle'),
    'deleting a source row cannot silently change a Bundle recipe'
);
$reSubmit['bundles'][0]['items'] = array_values(array_filter(
    $reSubmit['bundles'][0]['items'],
    static fn(array $member): bool => ($member['rate_sheet_item_id'] ?? '') !== $rowBId
));
$memberAPlatformId = (string) $savedBundle['items'][0]['platform_id'];
$memberBPlatformId = (string) $savedBundle['items'][1]['platform_id'];
$bundleItemPlatformId = (string) $savedBundle['bundle_item_platform_id'];
$bundleOptionPlatformId = (string) $savedBundle['price_options'][0]['platform_id'];
$rowAPlatformId = (string) $savedSheet['items'][0]['platform_id'];
$rowBPlatformId = (string) $savedSheet['items'][1]['platform_id'];
$response2 = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([$reSubmit])));
$savedSheet2 = $response2->get_data()['manager']['rate_sheets'][0];
$savedBundle2 = $savedSheet2['bundles'][0];
check_bundle($savedBundle2['bundle_id'] === $mintedBundleId, 're-saving a Bundle keeps its native id');
check_bundle($savedBundle2['platform_id'] === $savedBundle['platform_id'], 'renaming a Bundle never re-mints its Platform ID');
check_bundle($savedBundle2['compiled_item_platform_id'] === $savedBundle['compiled_item_platform_id'], 'republishing keeps the compiled CZPRCI');
check_bundle($savedBundle2['price_options'][0]['platform_id'] === $savedBundle['price_options'][0]['platform_id'], 'Bundle Price Option changes keep the existing compiled-row CZPRCIO');
check_bundle(count($savedBundle2['items']) === 1, 'removing normal row B removes its Bundle membership through reconciliation');
check_bundle($savedBundle2['items'][0]['rate_sheet_id'] === 'rs_live', 'deleted exact membership B never retargets to another sheet row sharing its Manager source');
check_bundle($savedBundle2['bundle_item_platform_id'] === $savedBundle['bundle_item_platform_id'], 'compiled Bundle Item CZPRCBI is stable');
check_bundle($savedBundle2['items'][0]['platform_id'] === $savedBundle['items'][0]['platform_id'], 'remaining CZPRCBII inclusion identity is stable');
check_bundle($savedBundle2['items'][0]['rate_sheet_item_platform_id'] === $rowAPlatformId, 'remaining membership A still points to unchanged CZPRCI-A');
check_bundle($rsbOptions['cz_platform_identifier_v1_' . $memberBPlatformId]['status'] === PlatformIdentifierStation::STATUS_DELETED, 'removed row B tombstones inclusion CZPRCBII-B');
check_bundle($rsbOptions['cz_platform_identifier_v1_' . $rowBPlatformId]['status'] === PlatformIdentifierStation::STATUS_DELETED, 'normal source row CZPRCI-B follows its existing removal lifecycle');
check_bundle($rsbOptions['cz_platform_identifier_v1_' . $memberAPlatformId]['status'] === PlatformIdentifierStation::STATUS_BOUND, 'inclusion CZPRCBII-A remains bound');
check_bundle(
    count(array_filter($savedSheet2['items'], static fn(array $row): bool => ($row['item_id'] ?? '') === $compiledItemId)) === 1,
    're-publish produces exactly one compiled Bundle row, never a saved-source duplicate'
);
check_bundle(
    $compiledItemId === PackageManagerSchema::deriveBundleRowId($savedBundle2['bundle_id']),
    'name, price, and quantity changes leave the compiled item_id unchanged'
);

$zeroSubmit = $stripPlatformIds($savedSheet2);
$zeroSubmit['items'] = [];
$zeroSubmit['bundles'][0]['items'] = [];
$zeroResponse = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([$zeroSubmit])));
$zeroSheet = $zeroResponse->get_data()['manager']['rate_sheets'][0];
$zeroBundle = $zeroSheet['bundles'][0];
check_bundle($zeroBundle['items'] === [], 'removing normal row A leaves the durable Bundle with zero memberships');
check_bundle($zeroSheet['items'] === [], 'a zero-member Bundle exposes no compiled purchasable row');
check_bundle($zeroBundle['platform_id'] === $savedBundle['platform_id'], 'zero-member state preserves the Bundle CZPRCB');
check_bundle($zeroBundle['compiled_item_platform_id'] === $savedBundle['compiled_item_platform_id'], 'zero-member state preserves the compiled CZPRCI linkage');
check_bundle($rsbOptions['cz_platform_identifier_v1_' . $memberAPlatformId]['status'] === PlatformIdentifierStation::STATUS_DELETED, 'removing row A tombstones its inclusion CZPRCBII-A');
check_bundle($rsbOptions['cz_platform_identifier_v1_' . $rowAPlatformId]['status'] === PlatformIdentifierStation::STATUS_DELETED, 'normal source row CZPRCI-A follows its existing removal lifecycle');
check_bundle($rsbOptions['cz_platform_identifier_v1_' . $savedBundle['platform_id']]['status'] === PlatformIdentifierStation::STATUS_BOUND, 'zero-member Bundle identity remains bound');
check_bundle($rsbOptions['cz_platform_identifier_v1_' . $savedCompiledRow['platform_id']]['status'] === PlatformIdentifierStation::STATUS_BOUND, 'zero-member compiled identity remains bound for reuse');
check_bundle($rsbOptions['cz_platform_identifier_v1_' . $bundleItemPlatformId]['status'] === PlatformIdentifierStation::STATUS_BOUND, 'zero-member Bundle Item identity remains bound for reuse');

$withoutBundle = $stripPlatformIds($zeroSheet);
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
check_bundle($rsbOptions['cz_platform_identifier_v1_' . $bundleItemPlatformId]['status'] === PlatformIdentifierStation::STATUS_DELETED, 'the removed Bundle tombstones its CZPRCBI');
check_bundle($rsbOptions['cz_platform_identifier_v1_' . $bundleOptionPlatformId]['status'] === PlatformIdentifierStation::STATUS_DELETED, 'the removed Bundle tombstones its compiled-row CZPRCIO');

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
                    ['item_id' => '', 'rate_sheet_id' => 'rs_tier', 'rate_sheet_item_id' => PackageManagerSchema::deriveRateItemId($itemA),
                        'source_item_id' => $itemA, 'label' => 'Website (bundled)', 'unit_price' => 80, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null,
                        'price_options' => [['option_id' => 'opt_bundle', 'label' => 'Annual', 'unit_price' => 800]]],
                    ['item_id' => '', 'rate_sheet_id' => 'rs_tier', 'rate_sheet_item_id' => PackageManagerSchema::deriveRateItemId($itemB),
                        'source_item_id' => $itemB, 'label' => '', 'unit_price' => 30, 'per' => 'Per item', 'quantity' => 2, 'group_id' => null, 'price_options' => []],
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
$ingredient = PackageManagerSchema::deriveBundleRateItemId('rsb_tier', 'rs_tier:' . $carrot);
$offered   = array_column($readModel['rate_sheets'][0]['items'], 'item_id');

check_bundle(in_array($carrot, $offered, true), "the sheet's own row stays individually sellable");
check_bundle(in_array($potato, $offered, true), 'a second normal CZPRCI row is offered beside it');
check_bundle(!array_key_exists('consumable_items', $readModel['rate_sheets'][0]), 'the Bundle needs no new read-model field — it is in the rows every consumer already reads');
check_bundle(in_array($soupRow, $offered, true), 'the Bundle is offered upstream as ONE priced row');
check_bundle(!in_array($ingredient, $offered, true), 'its membership identities are not separately chargeable rows');
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
check_bundle(
    ($soup['selections'][0]['includes'][0]['source_type'] ?? null) === 'inclusion'
        && ($soup['selections'][0]['includes'][0]['source_id'] ?? null) === 'src-a',
    'compiled children retain resolved inclusion provenance through the Tier projector'
);
$soupInclusions = PackageManagerSchema::projectTierInclusions($soup['selections']);
check_bundle(
    array_column($soupInclusions, 'id') === ['src-a', 'src-b'],
    'the shared backend inclusion projection expands Bundle children without charging them'
);
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
