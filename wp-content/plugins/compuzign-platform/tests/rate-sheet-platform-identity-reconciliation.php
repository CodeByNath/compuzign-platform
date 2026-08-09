<?php

declare(strict_types=1);

/*
 * Regression coverage for the Rate Sheet save/Platform-identity reconciliation
 * defect.
 *
 * ROOT CAUSE (confirmed by reproducing the exact first-save failure and
 * capturing the underlying, previously-swallowed exception — see the "re-add
 * a removed row" test below): PlatformIdentifierStation::claimReverse() keys
 * a native reference's reverse binding purely by (entity_type,
 * native_reference) — the (rate_sheet_id, item_id) address, not by which
 * platform id currently occupies it. Deleting a Rate Sheet row tombstones
 * that reverse record (status -> 'deleted') but leaves it in place at that
 * address. Re-adding a row for the same source later derives the SAME
 * (rate_sheet_id, item_id) address (item_id is a pure hash of source_item_id)
 * but reserves a BRAND NEW random platform id. assign()'s claimReverse() then
 * finds the address already occupied by the old, different, tombstoned id and
 * threw "record identity or version does not match the requested identifier"
 * — always, deterministically, on the very first Save, because the address
 * had already been used and released once. The generic controller catch
 * swallowed that exception into "...reconciliation is required."
 *
 * This is why a bare "retry reconciliation" (resuming the same still-reserved
 * platform id and calling bind() again) does NOT fix this specific cause: the
 * SAME stale reverse record blocks every retry identically, forever — it is a
 * permanent address conflict, not a transient one. The actual fix is in
 * PlatformIdentifierStation::claimReverse(): a reverse record already marked
 * STATUS_DELETED for this exact (entity_type, native_reference) is a properly
 * released address, and a completely different identifier may claim it fresh.
 *
 * The separate reconciliation/self-healing behaviour (never retiring a
 * reservation whose id is already persisted; resuming/reconciling a
 * genuinely-transient bind failure on retry) remains in
 * PackageStationController and is still covered by the tests below — it
 * protects against real partial failures (e.g. a write that fails after the
 * postmeta save), which are a different, legitimate failure mode from this
 * permanent address collision.
 *
 * This exercises the real PlatformIdentifierStation, PackagePlatformIdentifierService/
 * Adapters, PackageRepository, and PackageManagerSchema — only WordPress core
 * functions are stubbed, matching the convention used by tier-instance-mutations.php.
 */

$rsprOptions = [];

if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $rsprOptions;
        if (array_key_exists($key, $rsprOptions)) return false;
        $rsprOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $rsprOptions;
        return array_key_exists($key, $rsprOptions) ? $rsprOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $rsprOptions;
        $rsprOptions[$key] = $value;
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
    function current_time(string $type, bool $gmt = false): string { return '2026-08-05 00:00:00'; }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post { return $id === 626 ? new WP_Post($id, 'Rate Sheet Reconciliation Service') : null; }
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

function check_rate_sheet_reconciliation(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('Rate Sheet identity reconciliation: ' . $message);
}

function rspr_base_body(array $rateSheets): array
{
    return [
        'sources' => [], 'groups' => [], 'item_decisions' => [],
        'rate_sheets' => $rateSheets, 'rate_sheet_deletions' => [],
    ];
}

function rspr_default_station(): array
{
    return [
        'platform_status' => 'disabled', 'tier_instances' => [], 'tier_assignments' => [],
        'sort_position' => 0, 'bundle' => ['title' => '', 'description' => '', 'price' => null],
        'promotions' => [], 'package_manager' => PackageManagerSchema::defaultManager(),
        'legacy_host_service_id' => 0,
    ];
}

function rspr_new_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository(), new PlatformIdentifierStation());
}

$itemA = PackageManagerSchema::deriveItemId('inclusion', 'src-a');
$itemB = PackageManagerSchema::deriveItemId('inclusion', 'src-b');
$sourceItems = [
    ['item_id' => $itemA, 'source_type' => 'inclusion', 'source_id' => 'src-a', 'group_id' => null, 'sort_order' => 0, 'disabled' => false, 'decorated_label' => null, 'draft' => null, 'module_transition' => 'settled'],
    ['item_id' => $itemB, 'source_type' => 'inclusion', 'source_id' => 'src-b', 'group_id' => null, 'sort_order' => 0, 'disabled' => false, 'decorated_label' => null, 'draft' => null, 'module_transition' => 'settled'],
];

// ── TEST 1 — a brand new row saves and binds on the first request ─────────────
$rsprOptions = [];
$rsprOptions['cz_package_station'] = [...rspr_default_station(), 'package_manager' => [...PackageManagerSchema::defaultManager(), 'items' => $sourceItems]];

$sheetId = 'rs_happy';
$response1 = rspr_new_controller()->savePackageStationManager(new WP_REST_Request(['id' => 626], rspr_base_body([
    ['rate_sheet_id' => $sheetId, 'title' => 'Happy Sheet', 'status' => 'active', 'groups' => [],
        'items' => [['source_item_id' => $itemA, 'unit_price' => 10, 'per' => 'Per VM', 'quantity' => 1, 'group_id' => null]]],
])));
check_rate_sheet_reconciliation($response1->get_status() === 200, 'a newly added row saves successfully on the first request');
$sheetAfter1 = $response1->get_data()['manager']['rate_sheets'][0];
$platformIdA = $sheetAfter1['items'][0]['platform_id'] ?? '';
check_rate_sheet_reconciliation(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM, $platformIdA), 'its Platform ID is active and correctly formatted after that request');

$stored1 = $rsprOptions['cz_package_station']['package_manager']['rate_sheets'][0]['items'][0];
check_rate_sheet_reconciliation(($stored1['cz_platform_id'] ?? '') === $platformIdA, 'the persisted row carries the same id the response projected');
$forward1 = $rsprOptions['cz_platform_identifier_v1_' . $platformIdA];
check_rate_sheet_reconciliation($forward1['status'] === PlatformIdentifierStation::STATUS_BOUND, 'the registry record is bound, not merely reserved');
check_rate_sheet_reconciliation(!isset($rsprOptions['cz_platform_identifier_v1_' . $platformIdA]['retired']), 'no retired/orphaned identifier remains for a clean first save');

// ── TEST 2 — reconciling a row stuck at "reserved" (prior save persisted the
//    row but never completed binding) performs REAL reconciliation, not a skip,
//    and does not require a "save twice" workaround: one retry request suffices.
$stuckStation = new PlatformIdentifierStation();
$stuckReservation = null;
$rsprOptions = [];
// Mint a syntactically valid id and leave its registry record at RESERVED —
// exactly the state a persisted-but-unbound row would have left behind.
$reflectionStation = new PlatformIdentifierStation();
$stuckIdentifier = $reflectionStation->generate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM)->value();
$rsprOptions['cz_platform_identifier_v1_' . $stuckIdentifier] = [
    'version' => 1, 'platform_id' => $stuckIdentifier, 'entity_type' => PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM,
    'native_reference' => null, 'status' => PlatformIdentifierStation::STATUS_RESERVED,
    'created_at' => '2026-08-05T00:00:00+00:00', 'updated_at' => '2026-08-05T00:00:00+00:00',
];
$stuckSheetId = 'rs_stuck';
$rsprOptions['cz_package_station'] = [
    ...rspr_default_station(),
    'package_manager' => [
        ...PackageManagerSchema::defaultManager(),
        'items' => $sourceItems,
        'rate_sheets' => [[
            'rate_sheet_id' => $stuckSheetId, 'cz_platform_id' => '', 'title' => 'Stuck Sheet', 'status' => 'active',
            'groups' => [],
            'items' => [[
                'item_id' => PackageManagerSchema::deriveRateItemId($itemA), 'cz_platform_id' => $stuckIdentifier,
                'source_item_id' => $itemA, 'unit_price' => 10, 'per' => 'Per VM', 'quantity' => 1,
                'group_id' => null, 'sort_order' => 0,
            ]],
        ]],
    ],
];

$response2 = rspr_new_controller()->savePackageStationManager(new WP_REST_Request(['id' => 626], rspr_base_body([
    ['rate_sheet_id' => $stuckSheetId, 'title' => 'Stuck Sheet', 'status' => 'active', 'groups' => [],
        'items' => [['source_item_id' => $itemA, 'unit_price' => 15, 'per' => 'Per VM', 'quantity' => 1, 'group_id' => null]]],
])));
check_rate_sheet_reconciliation($response2->get_status() === 200, 'retrying a previously partially persisted row succeeds on a single retry request, no repeated save needed');
$stuckItemAfter = $rsprOptions['cz_package_station']['package_manager']['rate_sheets'][0]['items'][0];
check_rate_sheet_reconciliation(($stuckItemAfter['cz_platform_id'] ?? '') === $stuckIdentifier, 'reconciliation completes the SAME identifier the row already carried, rather than minting a replacement');
$forward2 = $rsprOptions['cz_platform_identifier_v1_' . $stuckIdentifier];
check_rate_sheet_reconciliation($forward2['status'] === PlatformIdentifierStation::STATUS_BOUND, 'the stuck reservation is now genuinely bound');
$reverseKeyPrefix = 'cz_platform_identifier_native_v1_' . PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM . '_';
$reverseHit = null;
foreach ($rsprOptions as $key => $value) {
    if (str_starts_with($key, $reverseKeyPrefix) && is_array($value) && ($value['platform_id'] ?? null) === $stuckIdentifier) { $reverseHit = $value; break; }
}
check_rate_sheet_reconciliation($reverseHit !== null && $reverseHit['status'] === PlatformIdentifierStation::STATUS_BOUND, 'the reverse (native-reference) binding resolves to the correct Rate Sheet row entity');

// ── TEST 3 — one-time cleanup of a pre-existing RETIRED/orphaned identifier
//    (the exact corruption the old code could leave behind before this fix) —
//    the row cannot resume a dead reservation, so a fresh one is minted and no
//    request ever crashes on it.
$rsprOptions = [];
$deadIdentifier = (new PlatformIdentifierStation())->generate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM)->value();
$rsprOptions['cz_platform_identifier_v1_' . $deadIdentifier] = [
    'version' => 1, 'platform_id' => $deadIdentifier, 'entity_type' => PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM,
    'native_reference' => null, 'status' => PlatformIdentifierStation::STATUS_RETIRED,
    'created_at' => '2026-08-05T00:00:00+00:00', 'updated_at' => '2026-08-05T00:00:00+00:00',
];
$deadSheetId = 'rs_dead';
$rsprOptions['cz_package_station'] = [
    ...rspr_default_station(),
    'package_manager' => [
        ...PackageManagerSchema::defaultManager(),
        'items' => $sourceItems,
        'rate_sheets' => [[
            'rate_sheet_id' => $deadSheetId, 'cz_platform_id' => '', 'title' => 'Dead Sheet', 'status' => 'active',
            'groups' => [],
            'items' => [[
                'item_id' => PackageManagerSchema::deriveRateItemId($itemB), 'cz_platform_id' => $deadIdentifier,
                'source_item_id' => $itemB, 'unit_price' => 10, 'per' => 'Per VM', 'quantity' => 1,
                'group_id' => null, 'sort_order' => 0,
            ]],
        ]],
    ],
];

$response3 = rspr_new_controller()->savePackageStationManager(new WP_REST_Request(['id' => 626], rspr_base_body([
    ['rate_sheet_id' => $deadSheetId, 'title' => 'Dead Sheet', 'status' => 'active', 'groups' => [],
        'items' => [['source_item_id' => $itemB, 'unit_price' => 10, 'per' => 'Per VM', 'quantity' => 1, 'group_id' => null]]],
])));
check_rate_sheet_reconciliation($response3->get_status() === 200, 'a legacy row holding a retired identifier reconciles without crashing');
$deadItemAfter = $rsprOptions['cz_package_station']['package_manager']['rate_sheets'][0]['items'][0];
$freshIdentifier = $deadItemAfter['cz_platform_id'] ?? '';
check_rate_sheet_reconciliation($freshIdentifier !== '' && $freshIdentifier !== $deadIdentifier, 'a dead reservation cannot be resumed, so the row is re-identified with a fresh, valid id');
check_rate_sheet_reconciliation(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM, $freshIdentifier), 'the replacement id is correctly formatted');
check_rate_sheet_reconciliation($rsprOptions['cz_platform_identifier_v1_' . $freshIdentifier]['status'] === PlatformIdentifierStation::STATUS_BOUND, 'the replacement id is bound');
check_rate_sheet_reconciliation($rsprOptions['cz_platform_identifier_v1_' . $deadIdentifier]['status'] === PlatformIdentifierStation::STATUS_RETIRED, 'the old dead record is left inert, never reused or resurrected');

// ── TEST 4 — a genuinely TRANSIENT binding failure after persistence (e.g. an
//    unrelated concurrent claim on the same address, still fully occupied and
//    not tombstoned) does not retire the reservation it already wrote onto
//    the row, and a same-payload retry resumes and completes that exact
//    identifier once the transient cause is gone. This is the reconciliation/
//    self-healing safety net for real partial failures — a DIFFERENT failure
//    class from TEST 5 below, which is the actual, permanent, always-
//    reproducing defect this investigation traced and fixed.
$rsprOptions = [];
$rsprOptions['cz_package_station'] = [...rspr_default_station(), 'package_manager' => [...PackageManagerSchema::defaultManager(), 'items' => $sourceItems]];
$conflictSheetId = 'rs_conflict';
$conflictItemId = PackageManagerSchema::deriveRateItemId($itemA);
$conflictNativeReference = PackagePlatformNativeReference::rateSheetItem($conflictSheetId, $conflictItemId);
$conflictReverseKey = 'cz_platform_identifier_native_v1_' . PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM . '_' . hash('sha256', 'string:' . $conflictNativeReference);
// Plant a reverse binding for THIS exact row's native reference, already
// claimed by a different (bogus) identifier — forces claimReverse() to throw
// once the controller reserves its own fresh id for the new row, simulating
// any real-world cause of a post-persistence bind failure.
$bogusIdentifier = (new PlatformIdentifierStation())->generate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM)->value();
$rsprOptions[$conflictReverseKey] = [
    'version' => 1, 'platform_id' => $bogusIdentifier, 'entity_type' => PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM,
    'native_reference' => $conflictNativeReference, 'status' => PlatformIdentifierStation::STATUS_BOUND,
    'created_at' => '2026-08-05T00:00:00+00:00', 'updated_at' => '2026-08-05T00:00:00+00:00',
];

$conflictBody = rspr_base_body([
    ['rate_sheet_id' => $conflictSheetId, 'title' => 'Conflict Sheet', 'status' => 'active', 'groups' => [],
        'items' => [['source_item_id' => $itemA, 'unit_price' => 10, 'per' => 'Per VM', 'quantity' => 1, 'group_id' => null]]],
]);
$response4a = rspr_new_controller()->savePackageStationManager(new WP_REST_Request(['id' => 626], $conflictBody));
check_rate_sheet_reconciliation($response4a->get_status() === 500, 'a genuine binding failure surfaces as a failed response');
check_rate_sheet_reconciliation(str_contains((string) $response4a->get_data()['message'], 'reconciliation is required'), 'the failure names reconciliation, not a silent success');

$persistedAfterFailure = $rsprOptions['cz_package_station']['package_manager']['rate_sheets'][0]['items'][0]['cz_platform_id'] ?? '';
check_rate_sheet_reconciliation($persistedAfterFailure !== '', 'the Rate Sheet row persists despite the reconciliation failure (matches the observed symptom)');
check_rate_sheet_reconciliation(
    $rsprOptions['cz_platform_identifier_v1_' . $persistedAfterFailure]['status'] === PlatformIdentifierStation::STATUS_RESERVED,
    'the reservation behind the persisted row is left open, never retired out from under already-persisted data'
);

// Clear the artificial conflict (the transient cause is gone) and retry with
// the identical payload — the literal "press Save again" the user performed.
unset($rsprOptions[$conflictReverseKey]);
$response4b = rspr_new_controller()->savePackageStationManager(new WP_REST_Request(['id' => 626], $conflictBody));
check_rate_sheet_reconciliation($response4b->get_status() === 200, 'retrying after the transient failure clears succeeds');
$persistedAfterRetry = $rsprOptions['cz_package_station']['package_manager']['rate_sheets'][0]['items'][0]['cz_platform_id'] ?? '';
check_rate_sheet_reconciliation($persistedAfterRetry === $persistedAfterFailure, 'the retry completes the SAME identifier the first request already persisted, not a new one');
check_rate_sheet_reconciliation(
    $rsprOptions['cz_platform_identifier_v1_' . $persistedAfterRetry]['status'] === PlatformIdentifierStation::STATUS_BOUND,
    'the identifier is now genuinely bound after reconciliation'
);

// ── TEST 5 — THE ACTUAL DEFECT: a brand new row saves and binds on the very
//    first request, with no prior failure or corruption seeded — the row's
//    source was simply added to this sheet before, removed, and is now being
//    added back. This is a completely ordinary "add a Rate Sheet row" Save,
//    reproduced through the same real reserve/save/bind path every other Save
//    goes through; nothing here is artificially forced. Before the
//    claimReverse() fix, this failed with status 500 on the FIRST attempt,
//    every time, deterministically — not a transient/environment-dependent
//    failure — because the row's (rate_sheet_id, item_id) address already
//    held a tombstoned reverse record from its earlier removal, and a fresh
//    reservation's different platform id could never satisfy that record's
//    exact-identity check. A retry with the OLD reconciliation-only fix would
//    have hit the identical permanent conflict forever; only the claimReverse()
//    fix (a tombstoned address is reclaimable) makes the FIRST request work.
$rsprOptions = [];
$rsprOptions['cz_package_station'] = [...rspr_default_station(), 'package_manager' => [...PackageManagerSchema::defaultManager(), 'items' => $sourceItems]];
$readdSheetId = 'rs_readd';

$readdController = rspr_new_controller();
$create = $readdController->savePackageStationManager(new WP_REST_Request(['id' => 626], rspr_base_body([
    ['rate_sheet_id' => $readdSheetId, 'title' => 'Readd Sheet', 'status' => 'active', 'groups' => [],
        'items' => [['source_item_id' => $itemA, 'unit_price' => 10, 'per' => 'Per VM', 'quantity' => 1, 'group_id' => null]]],
])));
check_rate_sheet_reconciliation($create->get_status() === 200, 'setup: the row saves successfully the first time it is added');

$remove = $readdController->savePackageStationManager(new WP_REST_Request(['id' => 626], rspr_base_body([
    ['rate_sheet_id' => $readdSheetId, 'title' => 'Readd Sheet', 'status' => 'active', 'groups' => [], 'items' => []],
])));
check_rate_sheet_reconciliation($remove->get_status() === 200, 'setup: removing the row (tombstoning its identity) succeeds');

$reAddBody = rspr_base_body([
    ['rate_sheet_id' => $readdSheetId, 'title' => 'Readd Sheet', 'status' => 'active', 'groups' => [],
        'items' => [['source_item_id' => $itemA, 'unit_price' => 15, 'per' => 'Per VM', 'quantity' => 1, 'group_id' => null]]],
]);
$reAdd = $readdController->savePackageStationManager(new WP_REST_Request(['id' => 626], $reAddBody));
check_rate_sheet_reconciliation($reAdd->get_status() === 200, 'a normal newly added row (its source previously used, then removed, in this sheet) succeeds on the FIRST Save — the actual reported defect');
check_rate_sheet_reconciliation((bool) ($reAdd->get_data()['success'] ?? false), 'the first request reports success, not a reconciliation failure');

$reAddSheet = $reAdd->get_data()['manager']['rate_sheets'][0];
$reAddItem = $reAddSheet['items'][0];
check_rate_sheet_reconciliation((float) ($reAddItem['unit_price'] ?? 0) === 15.0, 'the row is genuinely persisted (its new price took), not merely echoed back');
check_rate_sheet_reconciliation(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM, (string) ($reAddItem['platform_id'] ?? '')),
    'its Platform ID is active immediately, requiring no second Save'
);
$reAddPlatformId = $reAddItem['platform_id'];
check_rate_sheet_reconciliation(
    $rsprOptions['cz_platform_identifier_v1_' . $reAddPlatformId]['status'] === PlatformIdentifierStation::STATUS_BOUND,
    'the identifier is bound in the registry, not left reserved'
);

// A same-payload retry (equivalent to pressing Save again) must also succeed
// and must not mint yet another identifier — the row is already fully bound.
$reAddRetry = $readdController->savePackageStationManager(new WP_REST_Request(['id' => 626], $reAddBody));
check_rate_sheet_reconciliation($reAddRetry->get_status() === 200, 'a redundant retry of the same payload remains harmless');
check_rate_sheet_reconciliation(
    $reAddRetry->get_data()['manager']['rate_sheets'][0]['items'][0]['platform_id'] === $reAddPlatformId,
    'the identifier stays stable across a redundant resave — no churn from a false "needs reconciliation" read'
);

// ── TEST 6 — Price Option: a brand new option, nested under a brand new row,
//    saves and binds its own CZPRCIO on the first request — never sharing or
//    reusing the row's own CZPRCI ─────────────────────────────────────────────
$rsprOptions = [];
$rsprOptions['cz_package_station'] = [...rspr_default_station(), 'package_manager' => [...PackageManagerSchema::defaultManager(), 'items' => $sourceItems]];

$optionSheetId = 'rs_options';
$response6 = rspr_new_controller()->savePackageStationManager(new WP_REST_Request(['id' => 626], rspr_base_body([
    ['rate_sheet_id' => $optionSheetId, 'title' => 'Options Sheet', 'status' => 'active', 'groups' => [],
        'items' => [[
            'source_item_id' => $itemA, 'unit_price' => 10, 'per' => 'Per VM', 'quantity' => 1, 'group_id' => null,
            'price_options' => [['option_id' => '', 'label' => 'Annual', 'unit_price' => 100]],
        ]]],
])));
check_rate_sheet_reconciliation($response6->get_status() === 200, 'a row with a brand new price option saves successfully on the first request');
$itemAfter6 = $response6->get_data()['manager']['rate_sheets'][0]['items'][0];
$rowPlatformId6 = $itemAfter6['platform_id'] ?? '';
$optionAfter6 = $itemAfter6['price_options'][0];
$optionPlatformId6 = $optionAfter6['platform_id'] ?? '';
check_rate_sheet_reconciliation(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM, $rowPlatformId6), "the row's own CZPRCI is active and correctly formatted");
check_rate_sheet_reconciliation(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM_OPTION, $optionPlatformId6), "the price option's own CZPRCIO is active and correctly formatted");
check_rate_sheet_reconciliation($optionPlatformId6 !== $rowPlatformId6, "a price option's Platform ID is never the same identifier as its row's — a real, independent child identity");

$storedOption6 = $rsprOptions['cz_package_station']['package_manager']['rate_sheets'][0]['items'][0]['price_options'][0];
check_rate_sheet_reconciliation(($storedOption6['cz_platform_id'] ?? '') === $optionPlatformId6, 'the persisted option carries the same id the response projected');
$optionForward6 = $rsprOptions['cz_platform_identifier_v1_' . $optionPlatformId6];
check_rate_sheet_reconciliation($optionForward6['status'] === PlatformIdentifierStation::STATUS_BOUND, "the option's registry record is bound, not merely reserved");

// ── TEST 7 — Price Option: removing an option then re-adding one for the SAME
//    row reclaims a tombstoned (rate_sheet_id,item_id,option_id) address
//    correctly on the very first retry — the exact TEST 5 defect class, one
//    level deeper. Reuses the row/option saved in TEST 6. ────────────────────
$rowItemId6 = $itemAfter6['item_id'];
$removeOptionController = rspr_new_controller();
$removeResponse = $removeOptionController->savePackageStationManager(new WP_REST_Request(['id' => 626], rspr_base_body([
    ['rate_sheet_id' => $optionSheetId, 'title' => 'Options Sheet', 'status' => 'active', 'groups' => [],
        'items' => [[
            'item_id' => $rowItemId6, 'source_item_id' => $itemA, 'unit_price' => 10, 'per' => 'Per VM', 'quantity' => 1, 'group_id' => null,
            'price_options' => [],
        ]]],
])));
check_rate_sheet_reconciliation($removeResponse->get_status() === 200, 'removing the price option saves successfully');
check_rate_sheet_reconciliation(
    ($removeResponse->get_data()['manager']['rate_sheets'][0]['items'][0]['price_options'] ?? ['x']) === [],
    'the option no longer appears on the row after removal'
);
check_rate_sheet_reconciliation(
    $rsprOptions['cz_platform_identifier_v1_' . $optionPlatformId6]['status'] === PlatformIdentifierStation::STATUS_DELETED,
    'the removed option is tombstoned in the registry, not silently dropped'
);

$readdController = rspr_new_controller();
$readdResponse = $readdController->savePackageStationManager(new WP_REST_Request(['id' => 626], rspr_base_body([
    ['rate_sheet_id' => $optionSheetId, 'title' => 'Options Sheet', 'status' => 'active', 'groups' => [],
        'items' => [[
            'item_id' => $rowItemId6, 'source_item_id' => $itemA, 'unit_price' => 10, 'per' => 'Per VM', 'quantity' => 1, 'group_id' => null,
            'price_options' => [['option_id' => '', 'label' => 'Annual', 'unit_price' => 100]],
        ]]],
])));
check_rate_sheet_reconciliation($readdResponse->get_status() === 200, 'a fresh option re-added to the same row saves on the FIRST attempt — the exact address-reclaim proof TEST 5 established at the row level');
$readdOptionPlatformId = $readdResponse->get_data()['manager']['rate_sheets'][0]['items'][0]['price_options'][0]['platform_id'] ?? '';
check_rate_sheet_reconciliation(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM_OPTION, $readdOptionPlatformId), 'the re-added option receives a freshly bound, correctly formatted CZPRCIO');
check_rate_sheet_reconciliation($readdOptionPlatformId !== $optionPlatformId6, 'the re-added option is a genuinely new identity, never reusing the tombstoned one');

echo "Rate Sheet Platform identity reconciliation: OK\n";
