<?php

declare(strict_types=1);

/*
 * Rate Sheet Bundle contract.
 *
 * A Bundle is a Rate Sheet-owned composition space carrying its own
 * permanent identity (`CZPRCB`). Commercially it IS a real Rate Sheet row:
 * its `item_id` links to an ordinary member of the owning sheet's `items[]`,
 * carrying its own `CZPRCI` and, on its own Price Options, `CZPRCIO` — the
 * SAME identity a Manager-sourced row gets, through the SAME reservation
 * loop, with no special-casing. `CZPRCB` never replaces `CZPRCI`; the two
 * coexist on two linked records.
 *
 * Supplied content is a Bundle's live references to the exact Rate Sheet
 * rows it compiles — `supplied_content[]`, each entry naming
 * `(source_rate_sheet_id, source_item_id)` and carrying its own
 * "Bundle-inclusion" identity (`CZPRCBI`, a child of the Bundle). A
 * reference is never a copy: the referenced row keeps its own `CZPRCI`
 * completely untouched, and a Bundle may reference rows on OTHER sheets —
 * composing across sheets is the point.
 *
 * This locks the storage shape, the write-path mint/link, the identity
 * reserve/bind/tombstone cycle, and Tier consumption through the ordinary
 * Rate Sheet row route with no Bundle-specific branch.
 *
 * Like tests/rate-sheet-platform-identity-reconciliation.php, this exercises
 * the real PlatformIdentifierStation, PackagePlatformIdentifierService/
 * Adapters, PackageRepository, PackageManagerSchema, and
 * PackageStationController — only WordPress core functions are stubbed.
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
    function current_time(string $type, bool $gmt = false): string { return '2026-08-16 00:00:00'; }
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

/** Strip every Platform ID at any depth — the Tool never sends one back. */
function rsb_strip_platform_ids(array $node): array
{
    unset($node['platform_id'], $node['cz_platform_id']);
    foreach ($node as $key => $value) {
        if (is_array($value)) $node[$key] = rsb_strip_platform_ids($value);
    }
    return $node;
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

// A Bundle's row lives in the SAME items[] list as an ordinary row — carrying
// `bundle_id` instead of `source_item_id` — and its supplied_content
// references the sheet's OWN row plus a row on ANOTHER sheet in the same
// collection, proving composition across sheets survives sanitize().
$sanitised = PackageManagerSchema::sanitize([
    'rate_sheets' => [
        [
            'rate_sheet_id' => 'rs_1', 'title' => 'Sheet One', 'status' => 'active',
            'groups' => [['group_id' => 'g1', 'label' => 'Web', 'sort_order' => 0]],
            'items' => [
                ['item_id' => 'rate_carrot', 'source_item_id' => $itemA, 'unit_price' => 10, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'sort_order' => 0],
            ],
            'bundles' => [[
                'bundle_id' => 'rsb_1', 'status' => 'active', 'sort_order' => 0,
                'supplied_content' => [
                    ['source_rate_sheet_id' => 'rs_1', 'source_item_id' => 'rate_carrot'],
                    ['source_rate_sheet_id' => 'rs_2', 'source_item_id' => 'rate_potato'],
                    // Unknown sheet — dropped at the door.
                    ['source_rate_sheet_id' => 'rs_unknown', 'source_item_id' => 'rate_x'],
                    // Duplicate of the first — collapses to one.
                    ['source_rate_sheet_id' => 'rs_1', 'source_item_id' => 'rate_carrot'],
                ],
            ]],
        ],
        [
            'rate_sheet_id' => 'rs_2', 'title' => 'Sheet Two', 'status' => 'active', 'groups' => [],
            'items' => [
                ['item_id' => 'rate_potato', 'source_item_id' => $itemB, 'unit_price' => 8, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'sort_order' => 0],
            ],
            'bundles' => [],
        ],
    ],
]);
$bundle = $sanitised['rate_sheets'][0]['bundles'][0];
check_bundle(count($sanitised['rate_sheets'][0]['bundles']) === 1, 'a sheet keeps its Bundles through sanitize');
check_bundle($bundle['bundle_id'] === 'rsb_1' && $bundle['status'] === 'active', 'a Bundle keeps its own id and status');
check_bundle(count($bundle['supplied_content']) === 2, 'a duplicate reference collapses and an unknown-sheet reference is dropped', $bundle['supplied_content']);
check_bundle(
    $bundle['supplied_content'][0]['source_rate_sheet_id'] === 'rs_1' && $bundle['supplied_content'][0]['source_item_id'] === 'rate_carrot',
    'the first reference names the owning sheet\'s own row'
);
check_bundle(
    $bundle['supplied_content'][1]['source_rate_sheet_id'] === 'rs_2' && $bundle['supplied_content'][1]['source_item_id'] === 'rate_potato',
    'the second reference names a row on ANOTHER sheet — composing across sheets'
);
check_bundle(!array_key_exists('title', $bundle) && !array_key_exists('unit_price', $bundle) && !array_key_exists('items', $bundle), 'a Bundle stores no name, price, or component rows of its own — those live on its linked row');

$bundleOnly = PackageManagerSchema::sanitize([
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_only', 'title' => '', 'status' => 'active', 'groups' => [],
        'items' => [['item_id' => 'rate_soup', 'bundle_id' => 'rsb_only', 'label' => 'Soup', 'unit_price' => 75, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'sort_order' => 0]],
        'bundles' => [['bundle_id' => 'rsb_only', 'status' => 'active', 'supplied_content' => []]],
    ]],
]);
check_bundle(count($bundleOnly['rate_sheets']) === 1, 'a sheet whose only content is a Bundle and its row is not dropped as empty');

$legacy = PackageManagerSchema::sanitize([
    'rate_sheets' => [['rate_sheet_id' => 'rs_3', 'title' => 'No bundles key', 'status' => 'active', 'groups' => [], 'items' => []]],
]);
check_bundle($legacy['rate_sheets'][0]['bundles'] === [], 'a sheet stored before Bundles existed reads back with an empty collection');

// A stored bundle from the RETIRED copy-based shape (no `item_id` field at
// all — the sanitizer never wrote one under that shape) has no row to link
// to; item_id resolves to blank rather than a guess, and the Bundle carries
// no supplied_content since that key never existed there either.
$preMigration = PackageManagerSchema::sanitize([
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_pre', 'title' => 'Pre-migration', 'status' => 'active', 'groups' => [], 'items' => [],
        'bundles' => [['bundle_id' => 'rsb_pre', 'title' => 'Old shape', 'status' => 'active', 'unit_price' => 5, 'per' => 'Per item', 'items' => []]],
    ]],
]);
check_bundle($preMigration['rate_sheets'][0]['bundles'][0]['item_id'] === '', 'a Bundle with no linkable row (the retired copy-based shape) resolves to a blank item_id rather than a guess');

// ── Write path: mint, link, and identity ──────────────────────────────────────

echo "\nRate Sheet Bundle — write path, linking, and identity\n";

$rsbOptions = [];
$rsbOptions['cz_package_station'] = [
    ...rsb_default_station(),
    'package_manager' => [...PackageManagerSchema::defaultManager(), 'items' => $sourceItems],
];

// First save: two ordinary sheets, no Bundles yet — the baseline a Bundle
// will later compose from.
$firstResponse = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([
    ['rate_sheet_id' => 'rs_live', 'title' => 'Live Sheet', 'status' => 'active', 'groups' => [],
        'items' => [['source_item_id' => $itemA, 'unit_price' => 10, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null]], 'bundles' => []],
    ['rate_sheet_id' => 'rs_other', 'title' => 'Other Sheet', 'status' => 'active', 'groups' => [],
        'items' => [['source_item_id' => $itemB, 'unit_price' => 8, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null]], 'bundles' => []],
])));
check_bundle(($firstResponse->get_data()['success'] ?? false) === true, 'the baseline sheets save');
$liveSheet0  = $firstResponse->get_data()['manager']['rate_sheets'][0];
$otherSheet0 = $firstResponse->get_data()['manager']['rate_sheets'][1];
$carrotItemId = (string) $liveSheet0['items'][0]['item_id'];
$potatoItemId = (string) $otherSheet0['items'][0]['item_id'];

// Second save: a NEW Bundle (blank bundle_id) plus its OWN new row (the
// reserved sentinel `bundle_id: 'new'`) composed together, referencing the
// Carrot row on THIS sheet and the Potato row on the OTHER sheet — created
// atomically in one request, exactly as the authoring surface's first
// Import does.
$secondPayload = rsb_strip_platform_ids($firstResponse->get_data()['manager']);
$secondPayload['rate_sheets'][0]['items'][] = [
    'item_id' => '', 'bundle_id' => 'new', 'label' => 'Soup',
    'unit_price' => 27, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null,
    'price_options' => [['option_id' => '', 'label' => 'Annual', 'unit_price' => 270]],
];
$secondPayload['rate_sheets'][0]['bundles'][] = [
    'bundle_id' => '', 'status' => 'active', 'sort_order' => 0,
    'supplied_content' => [
        ['source_rate_sheet_id' => 'rs_live', 'source_item_id' => $carrotItemId],
        ['source_rate_sheet_id' => 'rs_other', 'source_item_id' => $potatoItemId],
    ],
];
$response = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body($secondPayload['rate_sheets'])));
check_bundle($response->get_status() === 200 && ($response->get_data()['success'] ?? false) === true, 'a sheet carrying a new Bundle plus its own new row saves in one request');

$savedSheet  = $response->get_data()['manager']['rate_sheets'][0];
$savedBundle = $savedSheet['bundles'][0];
$soupRow     = null;
foreach ($savedSheet['items'] as $candidate) { if (($candidate['bundle_id'] ?? '') !== '') { $soupRow = $candidate; } }
check_bundle($soupRow !== null, 'the Bundle\'s row is a REAL member of the owning sheet\'s items[]', array_column($savedSheet['items'], 'item_id'));

check_bundle(str_starts_with((string) $savedBundle['bundle_id'], 'rsb_'), 'the backend minted the Bundle id on the write path');
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_BUNDLE, (string) $savedBundle['platform_id']),
    'the Bundle carries a valid CZPRCB'
);
check_bundle($savedBundle['item_id'] === $soupRow['item_id'], 'the Bundle CZPRCB links to its row by item_id — the ↕ relationship');
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM, (string) $soupRow['platform_id']),
    "the Bundle's linked row carries a normal, valid CZPRCI — the SAME identity any Rate Sheet row gets"
);
check_bundle($savedBundle['platform_id'] !== $soupRow['platform_id'], 'CZPRCB never replaces CZPRCI — the Bundle and its row are two coexisting identities');
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM_OPTION, (string) $soupRow['price_options'][0]['platform_id']),
    "the Bundle's row carries a normal CZPRCIO Price Option — no separate Bundle pricing route"
);
check_bundle(count($savedBundle['supplied_content']) === 2, 'both supplied-content references survived the round trip');
foreach ($savedBundle['supplied_content'] as $reference) {
    check_bundle(
        PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_BUNDLE_ITEM, (string) $reference['platform_id']),
        'each supplied-content reference carries a valid Bundle-inclusion Platform ID (CZPRCBI)'
    );
}
check_bundle(
    $savedSheet['items'][0]['platform_id'] !== $soupRow['platform_id'],
    "the referenced Carrot row's own CZPRCI is untouched and distinct from the Bundle row's"
);
check_bundle((float) $soupRow['unit_price'] === 27.0, "the Bundle's own commercial price is independent of what Carrot ($10) + Potato ($8) sum to ($18)");

$mintedBundleId = (string) $savedBundle['bundle_id'];
$bundleRecord = $rsbOptions['cz_platform_identifier_v1_' . $savedBundle['platform_id']];
check_bundle($bundleRecord['status'] === PlatformIdentifierStation::STATUS_BOUND, 'the Bundle registry record is bound, not merely reserved');
check_bundle($bundleRecord['native_reference'] === PackagePlatformNativeReference::rateSheetBundle('rs_live', $mintedBundleId), 'it is bound to (rate_sheet_id, bundle_id)');
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $soupRow['platform_id']]['native_reference']
        === PackagePlatformNativeReference::rateSheetItem('rs_live', (string) $soupRow['item_id']),
    "the row is bound as an ORDINARY rate-sheet-item native reference — no Bundle-specific reference shape for it"
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $savedBundle['supplied_content'][0]['platform_id']]['native_reference']
        === PackagePlatformNativeReference::rateSheetBundleInclusion('rs_live', $mintedBundleId, 'rs_live', $carrotItemId),
    'a supplied-content reference is bound to (rate_sheet_id, bundle_id, source_rate_sheet_id, source_item_id)'
);

// ── Stability: re-saving and renaming never re-mints identity ────────────────

echo "\nRate Sheet Bundle — stability\n";

check_bundle(
    (rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([$savedSheet, $otherSheet0])))->get_data()['success'] ?? null) === false,
    'a request that echoes a Platform ID back is rejected as an immutable-identity mutation'
);

$reSubmit = rsb_strip_platform_ids($savedSheet);
foreach ($reSubmit['items'] as &$reItem) {
    if (($reItem['bundle_id'] ?? '') !== '') { $reItem['label'] = 'Vegetable Soup'; }
}
unset($reItem);
$response2 = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([$reSubmit, rsb_strip_platform_ids($otherSheet0)])));
check_bundle(($response2->get_data()['success'] ?? false) === true, 'renaming the Bundle Name saves');
$savedSheet2 = $response2->get_data()['manager']['rate_sheets'][0];
$savedBundle2 = $savedSheet2['bundles'][0];
$soupRow2 = null;
foreach ($savedSheet2['items'] as $candidate) { if (($candidate['bundle_id'] ?? '') !== '') { $soupRow2 = $candidate; } }
check_bundle($soupRow2['label'] === 'Vegetable Soup', 'the Bundle Name (the row\'s own label) changed');
check_bundle($soupRow2['item_id'] === $soupRow['item_id'], 'renaming never remints item_id');
check_bundle($soupRow2['platform_id'] === $soupRow['platform_id'], 'renaming never remints CZPRCI');
check_bundle($savedBundle2['bundle_id'] === $mintedBundleId, 'renaming never remints the Bundle\'s native id');
check_bundle($savedBundle2['platform_id'] === $savedBundle['platform_id'], 'renaming never remints CZPRCB');
check_bundle(
    $savedBundle2['supplied_content'][0]['platform_id'] === $savedBundle['supplied_content'][0]['platform_id'],
    'a stable supplied-content reference keeps its own CZPRCBI across the save'
);

// ── Removal: tombstones only the Bundle's own identities ──────────────────────

echo "\nRate Sheet Bundle — removal\n";

$withoutBundle = rsb_strip_platform_ids($savedSheet2);
// Deleting the Bundle removes BOTH the Bundle record AND its own row — the
// Bundle IS that row, exactly as the authoring surface's Remove already does.
$withoutBundle['bundles'] = [];
$withoutBundle['items'] = array_values(array_filter($withoutBundle['items'], static fn(array $item): bool => ($item['bundle_id'] ?? '') === ''));
$response3 = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([$withoutBundle, rsb_strip_platform_ids($otherSheet0)])));
$sheetAfterRemoval = $response3->get_data()['manager']['rate_sheets'][0];
check_bundle($sheetAfterRemoval['bundles'] === [], 'removing a Bundle removes it from the sheet');
check_bundle(count($sheetAfterRemoval['items']) === 1, 'and its own row is gone too — the Bundle IS that row');
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $savedBundle2['platform_id']]['status'] === PlatformIdentifierStation::STATUS_DELETED,
    "the removed Bundle's CZPRCB is tombstoned, never reused"
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $soupRow2['platform_id']]['status'] === PlatformIdentifierStation::STATUS_DELETED,
    "the removed Bundle's linked row's CZPRCI is tombstoned through the ordinary item-removal path"
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $savedBundle2['supplied_content'][0]['platform_id']]['status'] === PlatformIdentifierStation::STATUS_DELETED,
    "the removed Bundle's supplied-content CZPRCBI references are tombstoned with it"
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $sheetAfterRemoval['items'][0]['platform_id']]['status'] === PlatformIdentifierStation::STATUS_BOUND,
    "the referenced Carrot row itself is completely unaffected — the dependency is one-way"
);
$otherAfterRemoval = $response3->get_data()['manager']['rate_sheets'][1];
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $otherAfterRemoval['items'][0]['platform_id']]['status'] === PlatformIdentifierStation::STATUS_BOUND,
    'the referenced Potato row, on the OTHER sheet, is equally unaffected'
);

// ── Live composition reconciliation: a dangling reference is silently
//    dropped, never the Bundle itself. Self-contained fixture (its own fresh
//    sheets), proven from a save that never even touches the Bundle's OWN
//    sheet — the reconciliation runs against the FINAL merged collection,
//    not per-submitted-sheet. ─────────────────────────────────────────────

echo "\nRate Sheet Bundle — live composition reconciliation\n";

$p5First = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([
    ['rate_sheet_id' => 'rs_p5_bundle', 'title' => 'P5 Bundle Sheet', 'status' => 'active', 'groups' => [],
        'items' => [['source_item_id' => $itemA, 'unit_price' => 10, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null]], 'bundles' => []],
    ['rate_sheet_id' => 'rs_p5_source', 'title' => 'P5 Source Sheet', 'status' => 'active', 'groups' => [],
        'items' => [['source_item_id' => $itemC, 'unit_price' => 8, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null]], 'bundles' => []],
])));
check_bundle(($p5First->get_data()['success'] ?? false) === true, 'Phase 5 fixture: two fresh sheets save');
// Looked up BY ID, never by index — the manager carries every sheet this
// whole file has accumulated by this point, in storage order, not just
// these two.
$p5FindSheet = static function (array $manager, string $id): ?array {
    foreach ($manager['rate_sheets'] as $sheet) { if ($sheet['rate_sheet_id'] === $id) { return $sheet; } }
    return null;
};
$p5BundleSheet0 = $p5FindSheet($p5First->get_data()['manager'], 'rs_p5_bundle');
$p5SourceSheet0 = $p5FindSheet($p5First->get_data()['manager'], 'rs_p5_source');
$p5OwnRowItemId = (string) $p5BundleSheet0['items'][0]['item_id'];
$p5SourceRowItemId = (string) $p5SourceSheet0['items'][0]['item_id'];

// A Bundle on rs_p5_bundle referencing ONE row on its own sheet AND ONE row
// on rs_p5_source — minted together with its own row atomically, exactly as
// the authoring surface's first Import does. A cross-sheet reference is only
// VALID against sheet ids present in THIS submission (sanitizeSuppliedContent's
// own allowlist), so rs_p5_source rides along here unchanged — it is the
// LATER removal below that proves reconciliation needs no such thing.
$p5BundleSheetWithRow = rsb_strip_platform_ids($p5BundleSheet0);
$p5BundleSheetWithRow['items'][] = [
    'item_id' => '', 'bundle_id' => 'new', 'label' => 'Bundle P5',
    'unit_price' => 15, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null,
    'price_options' => [],
];
$p5BundleSheetWithRow['bundles'][] = [
    'bundle_id' => '', 'status' => 'active', 'sort_order' => 0,
    'supplied_content' => [
        ['source_rate_sheet_id' => 'rs_p5_bundle', 'source_item_id' => $p5OwnRowItemId],
        ['source_rate_sheet_id' => 'rs_p5_source', 'source_item_id' => $p5SourceRowItemId],
    ],
];
$p5Response = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([
    $p5BundleSheetWithRow,
    rsb_strip_platform_ids($p5SourceSheet0),
])));
check_bundle(($p5Response->get_data()['success'] ?? false) === true, 'Phase 5 fixture: a Bundle referencing a same-sheet row AND a cross-sheet row saves');
$p5Sheet = $p5FindSheet($p5Response->get_data()['manager'], 'rs_p5_bundle');
$p5Bundle = $p5Sheet['bundles'][0];
check_bundle(count($p5Bundle['supplied_content']) === 2, 'Phase 5 fixture: the Bundle compiles both references before removal');
$p5MintedBundleId = (string) $p5Bundle['bundle_id'];
$p5BundleRowItemId = null;
foreach ($p5Sheet['items'] as $candidate) { if (($candidate['bundle_id'] ?? '') !== '') { $p5BundleRowItemId = (string) $candidate['item_id']; } }
$p5CrossSheetReferencePlatformId = null;
foreach ($p5Bundle['supplied_content'] as $reference) {
    if ($reference['source_rate_sheet_id'] === 'rs_p5_source') { $p5CrossSheetReferencePlatformId = (string) $reference['platform_id']; }
}
check_bundle($p5CrossSheetReferencePlatformId !== null, 'Phase 5 fixture: the cross-sheet reference carries a valid CZPRCBI before removal');

// Remove the cross-sheet row from ITS OWN sheet — a request that submits
// ONLY rs_p5_source. rs_p5_bundle (the Bundle's own sheet) is never part of
// this payload at all.
$p5SourceForRemoval = $p5FindSheet($p5Response->get_data()['manager'], 'rs_p5_source');
$p5SourceWithoutRow = rsb_strip_platform_ids($p5SourceForRemoval);
$p5SourceWithoutRow['items'] = [];
$p5RemovalResponse = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([$p5SourceWithoutRow])));
check_bundle(($p5RemovalResponse->get_data()['success'] ?? false) === true, "removing the referenced row from ITS OWN sheet saves, with the Bundle's sheet absent from the request entirely");

$p5BundleSheetAfter = $p5FindSheet($p5RemovalResponse->get_data()['manager'], 'rs_p5_bundle');
check_bundle($p5BundleSheetAfter !== null, "the Bundle's sheet still reads back in the response even though this request never submitted it");
$p5BundleAfter = $p5BundleSheetAfter['bundles'][0];
check_bundle(
    count($p5BundleAfter['supplied_content']) === 1,
    'the dangling cross-sheet reference is silently pruned — the Bundle now compiles just the one still-live, same-sheet reference',
    $p5BundleAfter['supplied_content']
);
check_bundle(
    $p5BundleAfter['supplied_content'][0]['source_item_id'] === $p5OwnRowItemId,
    'the SURVIVING reference is the still-live, same-sheet row, completely untouched'
);
check_bundle($p5BundleAfter['bundle_id'] === $p5MintedBundleId, 'the Bundle itself SURVIVES — never deleted just because one reference went dangling');
check_bundle($p5BundleAfter['platform_id'] === $p5Bundle['platform_id'], "the Bundle's own CZPRCB is unchanged");
$p5RowAfter = null;
foreach ($p5BundleSheetAfter['items'] as $candidate) { if (($candidate['bundle_id'] ?? '') !== '') { $p5RowAfter = $candidate; } }
check_bundle(
    $p5RowAfter['item_id'] === $p5BundleRowItemId && (float) $p5RowAfter['unit_price'] === 15.0,
    "the Bundle's own row is completely unaffected — identity and price both"
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $p5CrossSheetReferencePlatformId]['status'] === PlatformIdentifierStation::STATUS_DELETED,
    "the dangling reference's own CZPRCBI is tombstoned as a plain consequence of the diff — no separate cleanup mechanism"
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $p5BundleAfter['supplied_content'][0]['platform_id']]['status'] === PlatformIdentifierStation::STATUS_BOUND,
    "the SURVIVING reference's own CZPRCBI stays bound, completely unaffected"
);

// ── Bundle edit lifecycle: ADD (a later Import) and REMOVE (one reference,
//    not the whole Bundle) never affect a source row's own identity or
//    price. Rename/reprice are proven above (Stability); whole-Bundle
//    deletion is proven above (Removal). Self-contained fixture. ──────────

echo "\nRate Sheet Bundle — edit lifecycle\n";

$p6First = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([
    ['rate_sheet_id' => 'rs_p6_bundle', 'title' => 'P6 Bundle Sheet', 'status' => 'active', 'groups' => [],
        'items' => [['source_item_id' => $itemA, 'unit_price' => 10, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null]], 'bundles' => []],
    ['rate_sheet_id' => 'rs_p6_other', 'title' => 'P6 Other Sheet', 'status' => 'active', 'groups' => [],
        'items' => [['source_item_id' => $itemB, 'unit_price' => 6, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null]], 'bundles' => []],
])));
check_bundle(($p6First->get_data()['success'] ?? false) === true, 'Phase 6 fixture: two fresh sheets save');
$p6FindSheet = static function (array $manager, string $id): ?array {
    foreach ($manager['rate_sheets'] as $sheet) { if ($sheet['rate_sheet_id'] === $id) { return $sheet; } }
    return null;
};
$p6FindRow = static function (array $sheet, string $itemId): ?array {
    foreach ($sheet['items'] as $item) { if ($item['item_id'] === $itemId) { return $item; } }
    return null;
};
$p6FindBundleRow = static function (array $sheet): ?array {
    foreach ($sheet['items'] as $item) { if (($item['bundle_id'] ?? '') !== '') { return $item; } }
    return null;
};
$p6BundleSheet0 = $p6FindSheet($p6First->get_data()['manager'], 'rs_p6_bundle');
$p6OtherSheet0 = $p6FindSheet($p6First->get_data()['manager'], 'rs_p6_other');
$p6CarrotItemId = (string) $p6BundleSheet0['items'][0]['item_id'];
$p6NoodlesItemId = (string) $p6OtherSheet0['items'][0]['item_id'];

// First Import: the Bundle (Stew) composes ONLY Carrot, same-sheet.
$p6WithBundle = rsb_strip_platform_ids($p6BundleSheet0);
$p6WithBundle['items'][] = [
    'item_id' => '', 'bundle_id' => 'new', 'label' => 'Stew',
    'unit_price' => 20, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'price_options' => [],
];
$p6WithBundle['bundles'][] = [
    'bundle_id' => '', 'status' => 'active', 'sort_order' => 0,
    'supplied_content' => [['source_rate_sheet_id' => 'rs_p6_bundle', 'source_item_id' => $p6CarrotItemId]],
];
$p6Response1 = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([$p6WithBundle])));
check_bundle(($p6Response1->get_data()['success'] ?? false) === true, 'Phase 6 fixture: the Bundle composes just Carrot at first');
$p6Sheet1 = $p6FindSheet($p6Response1->get_data()['manager'], 'rs_p6_bundle');
$p6Bundle1 = $p6Sheet1['bundles'][0];
$p6MintedBundleId = (string) $p6Bundle1['bundle_id'];
$p6BundlePlatformId = (string) $p6Bundle1['platform_id'];
$p6Row1 = $p6FindBundleRow($p6Sheet1);
$p6RowItemId = (string) $p6Row1['item_id'];
$p6RowPlatformId = (string) $p6Row1['platform_id'];
check_bundle(count($p6Bundle1['supplied_content']) === 1, 'Phase 6 fixture: exactly one reference before the add');

// ── ADD: a LATER Import adds Noodles from another sheet — proves an
//    already-composed reference and the Bundle's own row/price/identity are
//    untouched by composing further, and Noodles' own row is never copied.
$p6WithNoodles = rsb_strip_platform_ids($p6Sheet1);
$p6WithNoodles['bundles'][0]['supplied_content'][] = ['source_rate_sheet_id' => 'rs_p6_other', 'source_item_id' => $p6NoodlesItemId];
$p6AddResponse = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([
    $p6WithNoodles,
    rsb_strip_platform_ids($p6OtherSheet0),
])));
check_bundle(($p6AddResponse->get_data()['success'] ?? false) === true, 'adding Noodles through a LATER Import saves');
$p6SheetAfterAdd = $p6FindSheet($p6AddResponse->get_data()['manager'], 'rs_p6_bundle');
$p6BundleAfterAdd = $p6SheetAfterAdd['bundles'][0];
check_bundle(count($p6BundleAfterAdd['supplied_content']) === 2, 'the Bundle now compiles Carrot AND Noodles');
check_bundle($p6BundleAfterAdd['bundle_id'] === $p6MintedBundleId, "adding a reference never remints the Bundle's own id");
check_bundle($p6BundleAfterAdd['platform_id'] === $p6BundlePlatformId, 'adding a reference never remints CZPRCB');
$p6RowAfterAdd = $p6FindBundleRow($p6SheetAfterAdd);
check_bundle(
    $p6RowAfterAdd['item_id'] === $p6RowItemId && $p6RowAfterAdd['platform_id'] === $p6RowPlatformId,
    "adding a reference never remints the Bundle's own row identity"
);
check_bundle((float) $p6RowAfterAdd['unit_price'] === 20.0, "adding Noodles never re-touches the Bundle's own price — still \$20, not recomputed from its ingredients");
$p6CarrotRefAfter = null; $p6NoodlesRefAfter = null;
foreach ($p6BundleAfterAdd['supplied_content'] as $reference) {
    if ($reference['source_item_id'] === $p6CarrotItemId) { $p6CarrotRefAfter = $reference; }
    if ($reference['source_item_id'] === $p6NoodlesItemId) { $p6NoodlesRefAfter = $reference; }
}
check_bundle($p6CarrotRefAfter['platform_id'] === $p6Bundle1['supplied_content'][0]['platform_id'], "the ALREADY-composed Carrot reference keeps its own CZPRCBI, untouched by the add");
check_bundle(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_BUNDLE_ITEM, (string) $p6NoodlesRefAfter['platform_id']),
    "the NEW Noodles reference mints its own, fresh CZPRCBI"
);
check_bundle($p6NoodlesRefAfter['platform_id'] !== $p6CarrotRefAfter['platform_id'], 'the two references carry two DIFFERENT identities, never shared');
$p6CarrotRowAfterAdd = $p6FindRow($p6SheetAfterAdd, $p6CarrotItemId);
check_bundle(
    (float) $p6CarrotRowAfterAdd['unit_price'] === 10.0,
    "Carrot's own row is untouched by being referenced — same row, same price"
);
$p6NoodlesRowAfterAdd = $p6FindRow($p6FindSheet($p6AddResponse->get_data()['manager'], 'rs_p6_other'), $p6NoodlesItemId);
check_bundle(
    (float) $p6NoodlesRowAfterAdd['unit_price'] === 6.0,
    "Noodles' own row on its OWN sheet is completely unmodified by being referenced — no copy, same row, same price"
);

// ── REMOVE: dropping ONE reference (not the whole Bundle) leaves the OTHER
//    reference, the Bundle, its row, and BOTH source rows completely
//    untouched.
$p6WithoutNoodles = rsb_strip_platform_ids($p6SheetAfterAdd);
$p6WithoutNoodles['bundles'][0]['supplied_content'] = array_values(array_filter(
    $p6WithoutNoodles['bundles'][0]['supplied_content'],
    static fn(array $reference): bool => $reference['source_item_id'] !== $p6NoodlesItemId
));
$p6RemoveResponse = rsb_controller()->savePackageStationManager(new WP_REST_Request(['id' => 701], rsb_body([$p6WithoutNoodles])));
check_bundle(($p6RemoveResponse->get_data()['success'] ?? false) === true, 'removing ONE reference (Noodles), leaving the Bundle otherwise intact, saves');
$p6SheetAfterRemove = $p6FindSheet($p6RemoveResponse->get_data()['manager'], 'rs_p6_bundle');
$p6BundleAfterRemove = $p6SheetAfterRemove['bundles'][0];
check_bundle(count($p6BundleAfterRemove['supplied_content']) === 1, 'exactly one reference remains — Carrot');
check_bundle($p6BundleAfterRemove['supplied_content'][0]['source_item_id'] === $p6CarrotItemId, 'the SURVIVING reference is Carrot, completely untouched');
check_bundle(
    $p6BundleAfterRemove['supplied_content'][0]['platform_id'] === $p6CarrotRefAfter['platform_id'],
    "Carrot's own reference keeps its CZPRCBI across the removal of a SIBLING reference"
);
check_bundle(
    $p6BundleAfterRemove['bundle_id'] === $p6MintedBundleId && $p6BundleAfterRemove['platform_id'] === $p6BundlePlatformId,
    'the Bundle itself survives, identity unchanged, from removing just one reference'
);
$p6RowAfterRemove = $p6FindBundleRow($p6SheetAfterRemove);
check_bundle(
    $p6RowAfterRemove['item_id'] === $p6RowItemId && $p6RowAfterRemove['platform_id'] === $p6RowPlatformId && (float) $p6RowAfterRemove['unit_price'] === 20.0,
    "the Bundle's own row is untouched — identity and price both"
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $p6NoodlesRefAfter['platform_id']]['status'] === PlatformIdentifierStation::STATUS_DELETED,
    'removing the Noodles reference tombstones its OWN CZPRCBI'
);
check_bundle(
    $rsbOptions['cz_platform_identifier_v1_' . $p6BundleAfterRemove['supplied_content'][0]['platform_id']]['status'] === PlatformIdentifierStation::STATUS_BOUND,
    "the SURVIVING Carrot reference's CZPRCBI stays bound"
);
$p6NoodlesRowAfterRemove = $p6FindRow($p6FindSheet($p6RemoveResponse->get_data()['manager'], 'rs_p6_other'), $p6NoodlesItemId);
check_bundle(
    (float) $p6NoodlesRowAfterRemove['unit_price'] === 6.0,
    "Noodles' own row survives completely untouched — removing a REFERENCE never touches the referenced row, wherever it lives"
);

// ── Tier consumption: a Bundle-backed row IS an ordinary Rate Sheet row ─────
//
// The Bundle distinction lives entirely inside Rate Sheet ownership. A Tier
// consumes a Bundle-backed row through the SAME pipeline as any other row:
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
                ['item_id' => 'rate_carrot_tier', 'source_item_id' => $itemA, 'unit_price' => 10, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'sort_order' => 0,
                    'price_options' => [['option_id' => 'opt_sheet', 'label' => 'Annual', 'unit_price' => 100]]],
                ['item_id' => 'rate_potato_tier', 'source_item_id' => $itemB, 'unit_price' => 8, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'sort_order' => 1],
                // Chef's Soup: its own commercial price, deliberately NOT the
                // sum of its ingredients (10 + 8 = 18).
                ['item_id' => 'rate_soup_tier', 'bundle_id' => 'rsb_tier', 'label' => 'Digital Banking Website',
                    'unit_price' => 75, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'sort_order' => 2,
                    'price_options' => [['option_id' => 'opt_soup_annual', 'label' => 'Annual', 'unit_price' => 750]]],
            ],
            'bundles' => [[
                'bundle_id' => 'rsb_tier', 'status' => 'active', 'sort_order' => 0,
                'supplied_content' => [
                    ['source_rate_sheet_id' => 'rs_tier', 'source_item_id' => 'rate_carrot_tier'],
                    ['source_rate_sheet_id' => 'rs_tier', 'source_item_id' => 'rate_potato_tier'],
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
$offered = array_column($readModel['rate_sheets'][0]['items'], 'item_id');
check_bundle(in_array('rate_carrot_tier', $offered, true) && in_array('rate_potato_tier', $offered, true), 'the sheet\'s own rows stay individually sellable');
check_bundle(in_array('rate_soup_tier', $offered, true), 'the Bundle\'s row is offered upstream as ONE priced row — it was already physically in items[]');
check_bundle(count($offered) === 3, 'exactly the three stored rows are offered — nothing synthesized, nothing duplicated', $offered);

$bundleRow = null;
foreach ($readModel['rate_sheets'][0]['items'] as $row) { if ($row['item_id'] === 'rate_soup_tier') { $bundleRow = $row; } }
check_bundle($bundleRow['self_priced'] === true, 'the Bundle-backed row projects self_priced — it resolves on its own, needing no Manager source');
check_bundle(count($bundleRow['includes']) === 2, 'its supplied content resolves live into includes[] for presentation');
check_bundle($bundleRow['includes'][0]['label'] === 'Website' && $bundleRow['includes'][1]['label'] === 'Online Banking', 'each included row\'s CURRENT label resolves live, not a frozen copy');

$soup = PackageManagerSchema::projectTierRateSheetWith($readModel, [['item_id' => 'rate_soup_tier', 'quantity' => 1]], 'rs_tier');
check_bundle($soup['price'] === 75.0, "consuming the Bundle charges the row's own price, not the sum of its supplied content", $soup['price']);
check_bundle($soup['selections'][0]['label'] === 'Digital Banking Website', 'the Bundle row names itself');
check_bundle($soup['selections'][0]['available'] === true && $soup['selections'][0]['resolved'] === true, 'and resolves on its own');
check_bundle(count($soup['selections'][0]['includes']) === 2, 'carrying its live-resolved ingredients for the Includes presentation');
check_bundle(!array_key_exists('bundle_id', $soup['selections'][0]), 'a resolved selection carries no Bundle-shaped field');
check_bundle($soup['pricing']['unresolved'] === [] && $soup['pricing']['complete'] === true, 'the shared pricing engine reports it complete', json_encode($soup['pricing']['unresolved']));

$plain = PackageManagerSchema::projectTierRateSheetWith($readModel, [['item_id' => 'rate_carrot_tier', 'quantity' => 1]], 'rs_tier');
check_bundle($plain['price'] === 10.0, "an ordinary row prices exactly as before, completely unaffected");

$both = PackageManagerSchema::projectTierRateSheetWith($readModel, [
    ['item_id' => 'rate_carrot_tier', 'quantity' => 1],
    ['item_id' => 'rate_soup_tier', 'quantity' => 1],
], 'rs_tier');
check_bundle($both['price'] === 85.0, 'selecting both charges the row plus the Bundle price, never the ingredients twice', $both['price']);

$soupAnnual = PackageManagerSchema::projectTierRateSheetWith($readModel, [['item_id' => 'rate_soup_tier', 'quantity' => 1, 'price_option_id' => 'opt_soup_annual']], 'rs_tier');
check_bundle($soupAnnual['price'] === 750.0, "the Bundle row's own CZPRCIO Price Option prices it through the ordinary route");
$foreign = PackageManagerSchema::projectTierRateSheetWith($readModel, [['item_id' => 'rate_soup_tier', 'quantity' => 1, 'price_option_id' => 'opt_sheet']], 'rs_tier');
check_bundle($foreign['selections'][0]['unit_price'] === null, "another row's Price Option does not resolve against it");

// An archived Bundle's row still exists in storage but offers nothing upstream.
$archivedModel = PackageManagerSchema::buildReadModel(701, PackageManagerSchema::sanitize([
    'items' => $sourceItems,
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_arch', 'title' => 'Archived', 'status' => 'active', 'groups' => [],
        'items' => [['item_id' => 'rate_soup_arch', 'bundle_id' => 'rsb_arch', 'label' => 'Retired Soup', 'unit_price' => 75, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'sort_order' => 0]],
        'bundles' => [['bundle_id' => 'rsb_arch', 'status' => 'archived', 'sort_order' => 0, 'supplied_content' => []]],
    ]],
]), [['id' => 'src-a', 'label' => 'Website']], [], 'active');
check_bundle($archivedModel['rate_sheets'][0]['items'] === [], 'an archived Bundle offers nothing upstream, mirroring an archived sheet');

// Tier selection storage is untouched by any of this.
$stored = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::sanitizeTierRateSheetSelections([
    ['item_id' => 'rate_carrot_tier', 'quantity' => 2],
    ['item_id' => 'rate_soup_tier', 'quantity' => 1, 'price_option_id' => 'opt_soup_annual'],
]);
check_bundle(
    $stored === [
        ['item_id' => 'rate_carrot_tier', 'quantity' => 2, 'price_option_id' => null, 'leg_index' => null, 'leg_assignments' => []],
        ['item_id' => 'rate_soup_tier', 'quantity' => 1, 'price_option_id' => 'opt_soup_annual', 'leg_index' => null, 'leg_assignments' => []],
    ],
    'stored Tier selections keep the pre-Bundle shape exactly: { item_id, quantity, price_option_id, leg_index, leg_assignments }',
    json_encode($stored)
);

echo "\nRate Sheet Bundle contract: PASS ({$rsbChecks} checks)\n";
