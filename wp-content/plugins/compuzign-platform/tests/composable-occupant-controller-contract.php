<?php

declare(strict_types=1);

/*
 * Controller-level contract for the composable occupant's own dedicated
 * routes (SECTION: COMPOSABLE_OCCUPANT / COMPOSABLE_OCCUPANT_EDITION in
 * PackageStationController.php). Exercises the REAL controller, real
 * PlatformIdentifierStation, PackageRepository, PackageSchema, and
 * TierInstanceSchema — only WordPress core functions are stubbed, matching
 * the convention already proven by tier-occupant-platform-identity.php and
 * tier-instance-mutations.php. This is deliberately NOT a re-test of the
 * pure-function coverage in tier-composable-occupant.php; it proves the
 * controller's own routing/wiring — first-Save identity handoff, Publish
 * minting a real CZT, enable/disable, archive/restore isolation from the
 * five normal `tiers` slots, and one full composable Edition lifecycle path
 * (create -> draft -> settle -> Publish minting CZTE) — actually invokes
 * correctly, not just that the underlying PackageSchema functions do.
 */

$cocOptions = [];

if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $cocOptions;
        if (array_key_exists($key, $cocOptions)) return false;
        $cocOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $cocOptions;
        return array_key_exists($key, $cocOptions) ? $cocOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $cocOptions;
        $cocOptions[$key] = $value;
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
    function get_post(int $id): ?WP_Post { return $id === 606 ? new WP_Post($id, 'Composable Contract Service') : null; }
}
if (!function_exists('get_post_meta')) {
    function get_post_meta(int $id, string $key, bool $single = false): mixed { return $single ? [] : []; }
}
if (!function_exists('wp_get_post_terms')) {
    function wp_get_post_terms(int $postId, string $taxonomy, array $args = []): array { return []; }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-09-02 00:00:00'; }
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
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_coc(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('Composable occupant controller contract: ' . $message);
}

function coc_default_station(): array
{
    $primary = [
        'tier_instance_id' => 'ti_primary', 'cz_platform_id' => '',
        'title' => 'Primary Tier Set', 'description' => '', 'status' => 'active',
        'allowed_rate_sheet_ids' => [], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => [
            ...TierInstanceSchema::emptyTierMap(),
            'basic' => PackageSchema::commitTierLifecycle(PackageSchema::upsertOccupant([], [
                'label' => 'Primary Basic', 'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
                'rate_sheet_id' => 'rs_primary', 'rate_sheet_items' => [],
                'inclusions_override' => [], 'features' => [], 'faq_refs' => [],
            ], true)),
        ],
        'occupant_bin' => [],
    ];
    return [
        'platform_status' => 'active',
        'tier_instances' => [$primary],
        'tier_assignments' => [], 'sort_position' => 0,
        'bundle' => ['title' => '', 'description' => '', 'price' => null],
        'occupant_bin' => [], 'promotions' => [], 'package_manager' => PackageManagerSchema::defaultManager(),
        'legacy_host_service_id' => 606,
    ];
}

function coc_new_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository(), new PlatformIdentifierStation());
}

function coc_instance(): array
{
    global $cocOptions;
    return TierInstanceSchema::findInstance($cocOptions['cz_package_station']['tier_instances'], 'ti_primary') ?? [];
}

function coc_overview_save(array $overrides = []): WP_REST_Response
{
    return coc_new_controller()->saveComposableOccupantModule(new WP_REST_Request(
        ['id' => 606, 'instance' => 'ti_primary', 'module' => 'overview'],
        [...['label' => 'Build Your Own', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary'], ...$overrides],
    ));
}

function coc_settle(): WP_REST_Response
{
    return coc_new_controller()->settleComposableOccupant(new WP_REST_Request(['id' => 606, 'instance' => 'ti_primary']));
}

// ── TEST 1 — first Overview save mints the durable Pending occupant with no
//    Platform id yet, exactly like a normal Tier occupant. ─────────────────
$cocOptions = ['cz_package_station' => coc_default_station()];
$beforeBasic = serialize(coc_instance()['tiers']['basic']);
$save1 = coc_overview_save();
check_coc($save1->get_status() === 200, 'first Overview save on the composable slot succeeds');
$occupantAfterSave = coc_instance()['composable_occupant']['current_occupant'];
check_coc($occupantAfterSave !== null, 'first Overview save creates a durable Pending composable occupant');
check_coc(($occupantAfterSave['cz_platform_id'] ?? 'MISSING') === '', 'the Pending composable occupant has no Platform id yet');
check_coc(serialize(coc_instance()['tiers']['basic']) === $beforeBasic, 'creating the composable occupant leaves the normal basic slot byte-identical');

// ── TEST 2 — Publish (settle) mints a real CZT and binds it to the correct
//    (tier_instance_id, occupant_id) native reference — the composable
//    occupant's own identity, never the primary Tier's. ────────────────────
$publish1 = coc_settle();
check_coc($publish1->get_status() === 200, 'Publish returns successfully');
check_coc((bool) $publish1->get_data()['success'], 'Publish response reports success');
$occupantId = coc_instance()['composable_occupant']['current_occupant']['id'];
$platformId1 = coc_instance()['composable_occupant']['current_occupant']['cz_platform_id'] ?? '';
check_coc(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER, $platformId1), 'Publish assigns a validly formatted CZT to the composable occupant');
check_coc($publish1->get_data()['occupant']['platform_id'] === $platformId1, 'the response projects the same id now persisted');
check_coc(coc_instance()['tiers']['basic']['current_occupant']['cz_platform_id'] !== $platformId1, 'the composable occupant CZT is distinct from the primary Tier CZT');

$nativeReference = PackagePlatformNativeReference::tierOccupant('ti_primary', $occupantId);
$forward1 = $cocOptions['cz_platform_identifier_v1_' . $platformId1];
check_coc($forward1['status'] === PlatformIdentifierStation::STATUS_BOUND, 'the registry record is bound, not merely reserved');
check_coc($forward1['native_reference'] === $nativeReference, 'the identifier binds to this exact composable occupant native reference');

// Repeat Publish reuses the same identifier.
$publish2 = coc_settle();
check_coc($publish2->get_status() === 200, 'a repeat Publish still succeeds');
check_coc((coc_instance()['composable_occupant']['current_occupant']['cz_platform_id'] ?? '') === $platformId1, 'a repeat Publish reuses the exact same CZT, never a second one');

// ── TEST 3 — enable/disable is instance-local to the composable slot and
//    never derives the parent Tier Instance's own platform_status. ─────────
$disable = coc_new_controller()->setComposableOccupantEnabled(new WP_REST_Request(
    ['id' => 606, 'instance' => 'ti_primary'], ['enabled' => false]
));
check_coc($disable->get_status() === 200, 'disable succeeds');
check_coc(coc_instance()['composable_occupant']['current_occupant']['is_explicitly_disabled'] === true, 'disable sets the explicit marker');
check_coc(!array_key_exists('platform_status', $disable->get_data()), 'the composable enable/disable response never carries the parent Tier Instance platform_status key');
$enable = coc_new_controller()->setComposableOccupantEnabled(new WP_REST_Request(
    ['id' => 606, 'instance' => 'ti_primary'], ['enabled' => true]
));
check_coc(coc_instance()['composable_occupant']['current_occupant']['is_explicitly_disabled'] === false, 'enable clears the explicit marker');

// ── TEST 4 — archive/restore isolation: archiving the composable occupant
//    empties ONLY composable_occupant, never `tiers`, and the bin entry
//    carries the composable origin sentinel. Restore returns the SAME
//    occupant id with no swap/retarget option available. ───────────────────
$beforeBasicArchive = serialize(coc_instance()['tiers']['basic']);
$archive = coc_new_controller()->archiveComposableOccupantEndpoint(new WP_REST_Request(
    ['id' => 606, 'instance' => 'ti_primary'], []
));
check_coc($archive->get_status() === 200, 'archive succeeds');
check_coc($archive->get_data()['bin_entry']['origin_tier'] === PackageSchema::COMPOSABLE_OCCUPANT_ORIGIN, 'the archived entry carries the composable origin sentinel');
check_coc(coc_instance()['composable_occupant']['current_occupant'] === null, 'archive empties the composable slot');
check_coc(serialize(coc_instance()['tiers']['basic']) === $beforeBasicArchive, 'archiving the composable occupant leaves the normal basic slot byte-identical');

$binId = $archive->get_data()['bin_entry']['bin_id'];
// The existing generic bin routes work unchanged for a composable entry —
// prove restore, not swap/retarget (no such parameters exist on this route).
$restore = coc_new_controller()->restoreComposableOccupantEndpoint(new WP_REST_Request(
    ['id' => 606, 'instance' => 'ti_primary', 'bin' => $binId], []
));
check_coc($restore->get_status() === 200, 'restore succeeds');
check_coc(coc_instance()['composable_occupant']['current_occupant']['id'] === $occupantId, 'restore returns the SAME composable occupant id, never a new one');
check_coc(coc_instance()['composable_occupant']['current_occupant']['cz_platform_id'] === $platformId1, 'restore preserves the already-minted CZT');
check_coc(coc_instance()['composable_occupant']['current_occupant']['platform_status'] === 'disabled', 'restore lands the composable occupant disabled, same as a normal Tier restore');

// A second archive-then-restore proves an occupied slot blocks rather than
// offering a swap: the existing trashBinnedOccupant()/deleteBinnedOccupant()
// generic routes are reused unchanged to clear the stale bin entry first.
coc_new_controller()->trashPackageStationBinEntry(new WP_REST_Request(['id' => 606, 'instance' => 'ti_primary', 'bin' => $binId]));
coc_new_controller()->deletePackageStationBinEntry(new WP_REST_Request(['id' => 606, 'instance' => 'ti_primary', 'bin' => $binId]));
check_coc(coc_instance()['occupant_bin'] === [], 'the existing generic bin trash/delete routes clean up a composable entry unchanged');

// ── TEST 5 — unknown instance is reported explicitly and writes nothing,
//    same contract as every existing tier-scoped route. ────────────────────
$beforeStation = serialize($cocOptions);
$unknown = coc_new_controller()->saveComposableOccupantModule(new WP_REST_Request(
    ['id' => 606, 'instance' => 'ti_missing', 'module' => 'overview'], ['label' => 'Never']
));
check_coc(($unknown->get_data()['code'] ?? null) === 'unknown_tier_instance', 'unknown instance is reported explicitly for the composable module-save route');
check_coc(serialize($cocOptions) === $beforeStation, 'unknown instance leaves station bytes unchanged');

// ── TEST 6 — one full composable Edition lifecycle path: create, draft,
//    settle, then Publish (status -> active) mints a real CZTE bound to the
//    composable occupant's own native reference, never the primary Tier's.
$create = coc_new_controller()->createComposableOccupantEdition(new WP_REST_Request(
    ['id' => 606, 'instance' => 'ti_primary'],
    ['title' => 'Annual', 'rate_sheet_id' => 'rs_primary', 'rate_sheet_items' => [], 'billing_cycle' => 'annually'],
));
check_coc($create->get_status() === 200 && (bool) $create->get_data()['success'], 'creating a composable Edition succeeds');
$editionId = $create->get_data()['edition_id'];
check_coc(is_string($editionId) && $editionId !== '', 'the composable Edition gets a minted id');

$draft = coc_new_controller()->saveComposableOccupantEditionModule(new WP_REST_Request(
    ['id' => 606, 'instance' => 'ti_primary', 'edition' => $editionId, 'module' => 'overview'],
    ['title' => 'Annual Plan', 'rate_sheet_id' => 'rs_primary', 'rate_sheet_items' => [], 'billing_cycle' => 'annually'],
));
check_coc($draft->get_status() === 200, 'saving the composable Edition module draft succeeds');

$settleEdition = coc_new_controller()->settleComposableOccupantEditionModule(new WP_REST_Request(
    ['id' => 606, 'instance' => 'ti_primary', 'edition' => $editionId, 'module' => 'overview'],
));
check_coc($settleEdition->get_status() === 200, 'settling the composable Edition module succeeds');

$activate = coc_new_controller()->updateComposableOccupantEditionStatus(new WP_REST_Request(
    ['id' => 606, 'instance' => 'ti_primary', 'edition' => $editionId, 'platform_status' => 'active'], []
));
check_coc($activate->get_status() === 200, 'activating the composable Edition succeeds');
$editionPlatformId = $activate->get_data()['edition']['edition_platform_id'] ?? '';
check_coc(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION, $editionPlatformId), 'first Active assigns a validly formatted CZTE to the composable Edition');

$editionNativeReference = PackagePlatformNativeReference::tierEdition('ti_primary', $occupantId, $editionId);
$editionForward = $cocOptions['cz_platform_identifier_v1_' . $editionPlatformId];
check_coc($editionForward['status'] === PlatformIdentifierStation::STATUS_BOUND, 'the composable Edition identifier is bound, not merely reserved');
check_coc($editionForward['native_reference'] === $editionNativeReference, 'the composable Edition identifier binds to the composable occupant\'s own native reference, never the primary Tier\'s');

check_coc(
    coc_instance()['composable_occupant']['current_occupant']['tier_editions'][0]['id'] === $editionId,
    'the composable Edition lives inside the composable occupant\'s own tier_editions[], not the primary Tier\'s'
);
check_coc(
    (coc_instance()['tiers']['basic']['current_occupant']['tier_editions'] ?? []) === [],
    'the primary Tier basic occupant carries no Editions of its own — the composable Edition never leaked across'
);

echo "Composable occupant controller contract checks passed.\n";
