<?php

declare(strict_types=1);

/*
 * Regression coverage for the Tier occupant Publish/settle Platform-identity
 * defect.
 *
 * ROOT CAUSE (confirmed by reading the settle path against the Overview-Save
 * flow that creates the Pending occupant): PackageStationController::
 * settlePackageStationTier() gated its primary Tier identifier reservation on
 * `!$hadOccupant && cz_platform_id === ''`, where $hadOccupant was a snapshot
 * of whether current_occupant already existed BEFORE settleTierSlot() ran.
 * Commit d34db0b ("persist pending occupant on first overview save") moved
 * occupant creation from Publish-time into the Overview module-save endpoint
 * (PackageSchema::ensurePendingOccupant), so by the time Publish is clicked on
 * any normally-created Tier, current_occupant already exists and $hadOccupant
 * is always true — the reservation branch never fired, so CZT was never
 * reserved or bound on Publish, for a brand-new Tier or an existing Pending
 * one alike. No test exercised the real controller settle path (the sibling
 * tier-occupant-first-save.php test only calls the pure PackageSchema
 * function), so this shipped uncaught.
 *
 * The fix drops the stale $hadOccupant guard (matching how the Add-on branch
 * already worked — gated purely on an empty id field) and ports the same
 * reconciliation-safe resume already proven for Rate Sheets in
 * PackageStationController::identityNeedsReconciliation()/
 * reservationForReconciliation() (see rate-sheet-platform-identity-
 * reconciliation.php), so a persisted-but-never-bound id from an interrupted
 * prior request is resumed and completed rather than silently skipped or
 * duplicated.
 *
 * This exercises the real PlatformIdentifierStation, PackagePlatformIdentifierService/
 * Adapters, PackageRepository, PackageSchema, and TierInstanceSchema through the
 * real PackageStationController — only WordPress core functions are stubbed,
 * matching the convention used by tier-instance-mutations.php and
 * rate-sheet-platform-identity-reconciliation.php.
 */

$topiOptions = [];

if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $topiOptions;
        if (array_key_exists($key, $topiOptions)) return false;
        $topiOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $topiOptions;
        return array_key_exists($key, $topiOptions) ? $topiOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $topiOptions;
        $topiOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_key')) {
    function sanitize_key(mixed $value): string { return strtolower((string) preg_replace('/[^a-z0-9_\-]/', '', (string) $value)); }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post { return $id === 909 ? new WP_Post($id, 'Tier Identity Service') : null; }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-08-06 00:00:00'; }
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
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_tier_identity(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('Tier occupant Platform identity: ' . $message);
}

function topi_default_station(): array
{
    $primaryInstance = [
        'tier_instance_id' => 'ti_primary', 'cz_platform_id' => '',
        'title' => 'Primary Tier Set', 'description' => '', 'status' => 'disabled',
        'allowed_rate_sheet_ids' => [], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => TierInstanceSchema::emptyTierMap(), 'occupant_bin' => [],
    ];
    return [
        'platform_status' => 'disabled',
        'tier_instances' => [$primaryInstance],
        'tier_assignments' => [], 'sort_position' => 0,
        'bundle' => ['title' => '', 'description' => '', 'price' => null],
        'promotions' => [], 'package_manager' => PackageManagerSchema::defaultManager(),
        'legacy_host_service_id' => 909,
    ];
}

function topi_new_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository(), new PlatformIdentifierStation());
}

function topi_instance(): array
{
    global $topiOptions;
    return TierInstanceSchema::findInstance($topiOptions['cz_package_station']['tier_instances'], 'ti_primary') ?? [];
}

function topi_overview_save(string $tier = 'basic', array $overrides = []): WP_REST_Response
{
    return topi_new_controller()->savePackageStationTierModule(new WP_REST_Request(
        ['id' => 909, 'instance' => 'ti_primary', 'tier' => $tier, 'module' => 'overview'],
        [...['label' => 'Starter Cloud', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary'], ...$overrides],
    ));
}

function topi_settle(string $tier = 'basic'): WP_REST_Response
{
    return topi_new_controller()->settlePackageStationTier(new WP_REST_Request(
        ['id' => 909, 'instance' => 'ti_primary', 'tier' => $tier],
    ));
}

// ── TEST 1/2/3 — a Pending occupant with no cz_platform_id gets one on
//    Publish, the response succeeds, and it binds to the correct native
//    Tier occupant reference. ────────────────────────────────────────────────
$topiOptions = ['cz_package_station' => topi_default_station()];
topi_overview_save();
$occupantBeforePublish = topi_instance()['tiers']['basic']['current_occupant'];
check_tier_identity(($occupantBeforePublish['cz_platform_id'] ?? 'MISSING') === '', 'Overview Save alone mints the Pending occupant without a Platform id');

$publish1 = topi_settle();
check_tier_identity($publish1->get_status() === 200, 'Publish returns successfully');
check_tier_identity((bool) $publish1->get_data()['success'], 'Publish response reports success');

$occupantId = topi_instance()['tiers']['basic']['current_occupant']['id'];
$platformId1 = topi_instance()['tiers']['basic']['current_occupant']['cz_platform_id'] ?? '';
check_tier_identity(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER, $platformId1), 'Publish assigns a validly formatted CZT to the previously-Pending occupant');
check_tier_identity($publish1->get_data()['tier']['platform_id'] === $platformId1, 'the response projects the same id now persisted on the occupant');

$nativeReference = PackagePlatformNativeReference::tierOccupant('ti_primary', $occupantId);
$forward1 = $topiOptions['cz_platform_identifier_v1_' . $platformId1];
check_tier_identity($forward1['status'] === PlatformIdentifierStation::STATUS_BOUND, 'the registry record is bound, not merely reserved');
check_tier_identity($forward1['native_reference'] === $nativeReference, 'the identifier binds to this exact Tier occupant native reference');

// ── TEST 4 — retrying Publish (e.g. a second click, or a client retry after
//    an uncertain response) reuses the same identifier rather than minting a
//    second one. ──────────────────────────────────────────────────────────────
$publish2 = topi_settle();
check_tier_identity($publish2->get_status() === 200, 'a repeat Publish still succeeds');
$platformId2 = topi_instance()['tiers']['basic']['current_occupant']['cz_platform_id'] ?? '';
check_tier_identity($platformId2 === $platformId1, 'a repeat Publish reuses the exact same CZT, never a second one');

// ── TEST 5/6 — a reservation persisted but never bound (the interrupted-
//    request case: persistTierInstance() succeeded, bind() never completed)
//    is reconciled — resumed and completed — on retry, not skipped and not
//    duplicated. ─────────────────────────────────────────────────────────────
$topiOptions = ['cz_package_station' => topi_default_station()];
$stuckIdentifier = (new PlatformIdentifierStation())->generate(PlatformIdentifierPolicy::TIER)->value();
$topiOptions['cz_platform_identifier_v1_' . $stuckIdentifier] = [
    'version' => 1, 'platform_id' => $stuckIdentifier, 'entity_type' => PlatformIdentifierPolicy::TIER,
    'native_reference' => null, 'status' => PlatformIdentifierStation::STATUS_RESERVED,
    'created_at' => '2026-08-06T00:00:00+00:00', 'updated_at' => '2026-08-06T00:00:00+00:00',
];
topi_overview_save('standard');
// Simulate the interrupted request: the occupant's cz_platform_id was already
// written to storage (the same write persistTierInstance() makes before
// bind() runs) but the registry record above was never transitioned to bound.
$stuckInstance = topi_instance();
$stuckInstance['tiers']['standard']['current_occupant']['cz_platform_id'] = $stuckIdentifier;
$topiOptions['cz_package_station'] = TierInstanceSchema::withInstance($topiOptions['cz_package_station'], 'ti_primary', $stuckInstance);

$publishStuck = topi_settle('standard');
check_tier_identity($publishStuck->get_status() === 200, 'reconciling a stuck reservation succeeds on a single retry, no repeated Publish needed');
$stuckOccupantAfter = topi_instance()['tiers']['standard']['current_occupant'];
check_tier_identity(($stuckOccupantAfter['cz_platform_id'] ?? '') === $stuckIdentifier, 'reconciliation completes the SAME identifier the occupant already carried, never a replacement');
$forwardStuck = $topiOptions['cz_platform_identifier_v1_' . $stuckIdentifier];
check_tier_identity($forwardStuck['status'] === PlatformIdentifierStation::STATUS_BOUND, 'the stuck reservation is now genuinely bound');
$stuckNativeReference = PackagePlatformNativeReference::tierOccupant('ti_primary', $stuckOccupantAfter['id']);
check_tier_identity($forwardStuck['native_reference'] === $stuckNativeReference, 'the completed binding resolves to the correct Tier occupant');

$boundCount = 0;
foreach ($topiOptions as $key => $value) {
    if (str_starts_with((string) $key, 'cz_platform_identifier_v1_')
        && is_array($value)
        && ($value['entity_type'] ?? null) === PlatformIdentifierPolicy::TIER
        && ($value['status'] ?? null) === PlatformIdentifierStation::STATUS_BOUND
    ) { $boundCount++; }
}
check_tier_identity($boundCount === 1, 'reconciliation never allocates a second identifier alongside the resumed one');

// ── TEST 7 — Tier Add-on identity assignment on Publish remains correct
//    (unaffected by the primary-id guard fix; it never had the stale
//    condition). ──────────────────────────────────────────────────────────────
$topiOptions = ['cz_package_station' => topi_default_station()];
topi_overview_save('premium', ['is_addon' => true]);
$addonPublish = topi_settle('premium');
check_tier_identity($addonPublish->get_status() === 200, 'Publishing an add-on Tier still succeeds');
$addonOccupant = topi_instance()['tiers']['premium']['current_occupant'];
check_tier_identity($addonOccupant['is_addon'] === true, 'the add-on designation settles from the draft');
check_tier_identity(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER, $addonOccupant['cz_platform_id'] ?? ''), 'the add-on occupant still receives its primary CZT');
check_tier_identity(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_ADDON, $addonOccupant['addon_platform_id'] ?? ''), 'the add-on occupant also receives its CZTA');
$addonNativeReference = PackagePlatformNativeReference::tierOccupant('ti_primary', $addonOccupant['id']);
$addonForward = $topiOptions['cz_platform_identifier_v1_' . $addonOccupant['addon_platform_id']];
check_tier_identity($addonForward['status'] === PlatformIdentifierStation::STATUS_BOUND && $addonForward['native_reference'] === $addonNativeReference, 'CZTA binds to the same Tier occupant native reference');

// ── TEST 8 — an already fully-bound occupant is left byte-identical by a
//    repeat Publish: no re-reservation, no re-binding, no churn. ────────────
$topiOptions = ['cz_package_station' => topi_default_station()];
topi_overview_save('enterprise');
topi_settle('enterprise');
$beforeIdempotent = serialize(topi_instance()['tiers']['enterprise']);
$publishAgain = topi_settle('enterprise');
check_tier_identity($publishAgain->get_status() === 200, 'publishing an already-published Tier still succeeds');
check_tier_identity(serialize(topi_instance()['tiers']['enterprise']) === $beforeIdempotent, 'an already-bound occupant is left byte-identical by a repeat Publish');

echo "Tier occupant Platform identity checks passed.\n";
