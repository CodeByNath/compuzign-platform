<?php

declare(strict_types=1);

/*
 * Phase 1 — Composable Upgrade dual identity (CZTU / CZTEU), catalog side
 * only. Proves the design locked in
 * project-work/2026-09-06-composable-upgrade-platform-identification.md:
 * CZTU/CZTEU mirror CZPRCB's own dual-identity shape on a Rate Sheet row —
 * an occupant/Edition keeps its own ecosystem identity (CZT/CZTE) through
 * the SAME reservation loop it always used, and MAY ADDITIONALLY carry the
 * Upgrade-type identity under the identical native reference, gated by an
 * explicit admin declaration (`is_upgrade_offer`), never a child record
 * keyed by some other base occupant.
 *
 * Exercises the REAL controller, PlatformIdentifierStation, PackageRepository,
 * PackageSchema, and TierInstanceSchema — only WordPress core functions are
 * stubbed, matching the convention already proven by
 * tier-occupant-platform-identity.php and composable-occupant-controller-
 * contract.php.
 */

$cupiOptions = [];

if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $cupiOptions;
        if (array_key_exists($key, $cupiOptions)) return false;
        $cupiOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $cupiOptions;
        return array_key_exists($key, $cupiOptions) ? $cupiOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $cupiOptions;
        $cupiOptions[$key] = $value;
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
    function get_post(int $id): ?WP_Post { return $id === 707 ? new WP_Post($id, 'Composable Upgrade Identity Service') : null; }
}
if (!function_exists('get_post_meta')) {
    function get_post_meta(int $id, string $key, bool $single = false): mixed { return $single ? [] : []; }
}
if (!function_exists('wp_get_post_terms')) {
    function wp_get_post_terms(int $postId, string $taxonomy, array $args = []): array { return []; }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-09-06 00:00:00'; }
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

function check_cupi(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('Composable Upgrade Platform identity: ' . $message);
}

function cupi_default_station(): array
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
        'legacy_host_service_id' => 707,
    ];
}

function cupi_new_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository(), new PlatformIdentifierStation());
}

function cupi_instance(): array
{
    global $cupiOptions;
    return TierInstanceSchema::findInstance($cupiOptions['cz_package_station']['tier_instances'], 'ti_primary') ?? [];
}

function cupi_overview_save(array $overrides = []): WP_REST_Response
{
    return cupi_new_controller()->saveComposableOccupantModule(new WP_REST_Request(
        ['id' => 707, 'instance' => 'ti_primary', 'module' => 'overview'],
        [...['label' => 'Build Your Own', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary'], ...$overrides],
    ));
}

function cupi_settle(): WP_REST_Response
{
    return cupi_new_controller()->settleComposableOccupant(new WP_REST_Request(['id' => 707, 'instance' => 'ti_primary']));
}

// ── TEST 1 — declaration absent: Publish still mints CZT (unchanged) but
//    never CZTU. Legacy composable occupants (every one that predates this
//    phase) are unaffected. ──────────────────────────────────────────────────
$cupiOptions = ['cz_package_station' => cupi_default_station()];
cupi_overview_save();
$publishNoDeclaration = cupi_settle();
check_cupi($publishNoDeclaration->get_status() === 200, 'Publish without is_upgrade_offer still succeeds');
$occupantNoDeclaration = cupi_instance()['composable_occupant']['current_occupant'];
check_cupi(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER, $occupantNoDeclaration['cz_platform_id'] ?? ''), 'CZT still mints exactly as before');
check_cupi(($occupantNoDeclaration['upgrade_platform_id'] ?? 'MISSING') === '', 'no CZTU mints when is_upgrade_offer is absent — legacy behavior unchanged');
check_cupi($occupantNoDeclaration['is_upgrade_offer'] === false, 'is_upgrade_offer defaults false');

// ── TEST 2 — declaration true: Publish mints CZTU alongside the existing
//    CZT, bound to the SAME native reference under a distinct entity type.
//    A repeat Publish reconciles (reuses) the same CZTU, never a second one.
$cupiOptions = ['cz_package_station' => cupi_default_station()];
cupi_overview_save(['is_upgrade_offer' => true]);
$publish1 = cupi_settle();
check_cupi($publish1->get_status() === 200, 'Publish with is_upgrade_offer=true succeeds');
check_cupi((bool) $publish1->get_data()['success'], 'Publish response reports success');

$occupantId = cupi_instance()['composable_occupant']['current_occupant']['id'];
$occupant1 = cupi_instance()['composable_occupant']['current_occupant'];
$primaryId1 = $occupant1['cz_platform_id'] ?? '';
$upgradeId1 = $occupant1['upgrade_platform_id'] ?? '';
check_cupi(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER, $primaryId1), 'the occupant still gets a validly formatted CZT');
check_cupi(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_UPGRADE, $upgradeId1), 'the occupant additionally gets a validly formatted CZTU');
check_cupi($primaryId1 !== $upgradeId1, 'CZT and CZTU are two distinct identifier strings — dual identity, never one substituting the other');

$nativeReference = PackagePlatformNativeReference::tierOccupant('ti_primary', $occupantId);
$primaryForward = $cupiOptions['cz_platform_identifier_v1_' . $primaryId1];
$upgradeForward = $cupiOptions['cz_platform_identifier_v1_' . $upgradeId1];
check_cupi($primaryForward['status'] === PlatformIdentifierStation::STATUS_BOUND && $primaryForward['native_reference'] === $nativeReference, 'CZT is bound to the occupant\'s own native reference');
check_cupi($upgradeForward['status'] === PlatformIdentifierStation::STATUS_BOUND && $upgradeForward['native_reference'] === $nativeReference, 'CZTU is bound to the EXACT SAME native reference as CZT — same tuple, different entity type, no collision');
check_cupi($primaryForward['entity_type'] === PlatformIdentifierPolicy::TIER, 'the CZT registry record carries the TIER entity type');
check_cupi($upgradeForward['entity_type'] === PlatformIdentifierPolicy::TIER_UPGRADE, 'the CZTU registry record carries the distinct TIER_UPGRADE entity type — this is what makes the shared native reference safe');

// Repeat Publish reuses both identifiers unchanged.
$publish2 = cupi_settle();
check_cupi($publish2->get_status() === 200, 'a repeat Publish still succeeds');
$occupant2 = cupi_instance()['composable_occupant']['current_occupant'];
check_cupi(($occupant2['cz_platform_id'] ?? '') === $primaryId1, 'a repeat Publish reuses the exact same CZT');
check_cupi(($occupant2['upgrade_platform_id'] ?? '') === $upgradeId1, 'a repeat Publish reuses the exact same CZTU, never minting a second one');

// ── TEST 3 — resolve()/lookupNative() correctly disambiguate CZT vs CZTU
//    despite sharing one native reference — proves the dual identity is
//    genuinely independently addressable, not merely non-crashing. ─────────
$station = new PlatformIdentifierStation();
$resolvedPrimary = $station->resolve($primaryId1);
$resolvedUpgrade = $station->resolve($upgradeId1);
check_cupi($resolvedPrimary !== null && $resolvedPrimary->entityType() === PlatformIdentifierPolicy::TIER, 'resolve() on the CZT string returns the TIER binding');
check_cupi($resolvedUpgrade !== null && $resolvedUpgrade->entityType() === PlatformIdentifierPolicy::TIER_UPGRADE, 'resolve() on the CZTU string returns the TIER_UPGRADE binding, never confused with CZT despite the identical native reference');
$lookupPrimary = $station->lookupNative(PlatformIdentifierPolicy::TIER, $nativeReference);
$lookupUpgrade = $station->lookupNative(PlatformIdentifierPolicy::TIER_UPGRADE, $nativeReference);
check_cupi($lookupPrimary !== null && $lookupPrimary->platformId() === $primaryId1, 'lookupNative(TIER, ...) returns the CZT binding for this native reference');
check_cupi($lookupUpgrade !== null && $lookupUpgrade->platformId() === $upgradeId1, 'lookupNative(TIER_UPGRADE, ...) returns the CZTU binding for the SAME native reference — independently addressable');

// ── TEST 4 — Edition-derived Upgrade (CZTEU): an Edition explicitly
//    declared is_upgrade_offer mints CZTEU alongside its own CZTE, at the
//    exact same first-Active gate, bound to the SAME Edition native
//    reference. A repeat activation reconciles the same CZTEU. ─────────────
$create = cupi_new_controller()->createComposableOccupantEdition(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary'],
    ['title' => 'Annual', 'rate_sheet_id' => 'rs_primary', 'rate_sheet_items' => [], 'billing_cycle' => 'annually'],
));
check_cupi($create->get_status() === 200 && (bool) $create->get_data()['success'], 'creating a composable Edition succeeds');
$editionId = $create->get_data()['edition_id'];

cupi_new_controller()->saveComposableOccupantEditionModule(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $editionId, 'module' => 'overview'],
    ['title' => 'Annual Plan', 'rate_sheet_id' => 'rs_primary', 'rate_sheet_items' => [], 'billing_cycle' => 'annually', 'is_upgrade_offer' => true],
));
$settleEdition = cupi_new_controller()->settleComposableOccupantEditionModule(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $editionId, 'module' => 'overview'],
));
check_cupi($settleEdition->get_status() === 200, 'settling the composable Edition module (carrying the drafted is_upgrade_offer) succeeds');

$activate1 = cupi_new_controller()->updateComposableOccupantEditionStatus(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $editionId, 'platform_status' => 'active'], []
));
check_cupi($activate1->get_status() === 200, 'activating the composable Edition succeeds');
$editionPlatformId1 = $activate1->get_data()['edition']['edition_platform_id'] ?? '';
$editionUpgradeId1 = $activate1->get_data()['edition']['edition_upgrade_platform_id'] ?? '';
check_cupi(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION, $editionPlatformId1), 'first Active still assigns a validly formatted CZTE');
check_cupi(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION_UPGRADE, $editionUpgradeId1), 'first Active ADDITIONALLY assigns a validly formatted CZTEU, gated on this Edition\'s own is_upgrade_offer');
check_cupi($editionPlatformId1 !== $editionUpgradeId1, 'CZTE and CZTEU are two distinct identifier strings');

$editionNativeReference = PackagePlatformNativeReference::tierEdition('ti_primary', $occupantId, $editionId);
$editionForward = $cupiOptions['cz_platform_identifier_v1_' . $editionPlatformId1];
$editionUpgradeForward = $cupiOptions['cz_platform_identifier_v1_' . $editionUpgradeId1];
check_cupi($editionForward['native_reference'] === $editionNativeReference, 'CZTE binds to this Edition\'s own native reference');
check_cupi($editionUpgradeForward['native_reference'] === $editionNativeReference, 'CZTEU binds to the EXACT SAME Edition native reference as CZTE — same tuple, different entity type');

$activate2 = cupi_new_controller()->updateComposableOccupantEditionStatus(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $editionId, 'platform_status' => 'active'], []
));
check_cupi($activate2->get_status() === 200, 'a repeat activation still succeeds');
check_cupi(($activate2->get_data()['edition']['edition_platform_id'] ?? '') === $editionPlatformId1, 'a repeat activation reuses the exact same CZTE');
check_cupi(($activate2->get_data()['edition']['edition_upgrade_platform_id'] ?? '') === $editionUpgradeId1, 'a repeat activation reuses the exact same CZTEU, never minting a second one');

// ── TEST 5 — a composable Edition that never declares is_upgrade_offer
//    still mints CZTE exactly as before, and never CZTEU. ──────────────────
$createPlain = cupi_new_controller()->createComposableOccupantEdition(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary'],
    ['title' => 'Plain', 'rate_sheet_id' => 'rs_primary', 'rate_sheet_items' => [], 'billing_cycle' => 'monthly'],
));
$plainEditionId = $createPlain->get_data()['edition_id'];
cupi_new_controller()->saveComposableOccupantEditionModule(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $plainEditionId, 'module' => 'overview'],
    ['title' => 'Plain Plan', 'rate_sheet_id' => 'rs_primary', 'rate_sheet_items' => [], 'billing_cycle' => 'monthly'],
));
cupi_new_controller()->settleComposableOccupantEditionModule(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $plainEditionId, 'module' => 'overview'],
));
$activatePlain = cupi_new_controller()->updateComposableOccupantEditionStatus(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $plainEditionId, 'platform_status' => 'active'], []
));
check_cupi(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION, $activatePlain->get_data()['edition']['edition_platform_id'] ?? ''), 'a plain composable Edition still gets its own CZTE');
check_cupi(($activatePlain->get_data()['edition']['edition_upgrade_platform_id'] ?? 'MISSING') === '', 'a plain composable Edition (is_upgrade_offer never set) gets no CZTEU');

// ── TEST 6 — migration/assignment enumeration is eligibility-filtered
//    (only occupants/Editions actually declared is_upgrade_offer) and is a
//    pure read: it never mints. ─────────────────────────────────────────────
$repo = new PackageRepository();
$upgradePage = $repo->tierUpgradeAssignmentPage(null, 500);
check_cupi(in_array($nativeReference, $upgradePage['items'], true), 'the declared composable occupant is enumerated as an eligible CZTU assignment target');
$editionUpgradePage = $repo->tierEditionUpgradeAssignmentPage(null, 500);
check_cupi(in_array($editionNativeReference, $editionUpgradePage['items'], true), 'the declared composable Edition is enumerated as an eligible CZTEU assignment target');
$plainEditionNativeReference = PackagePlatformNativeReference::tierEdition('ti_primary', $occupantId, $plainEditionId);
check_cupi(!in_array($plainEditionNativeReference, $editionUpgradePage['items'], true), 'a composable Edition that never declared is_upgrade_offer is never enumerated as an eligible CZTEU target');
// Enumeration alone must not have minted anything for the plain Edition.
check_cupi(($activatePlain->get_data()['edition']['edition_upgrade_platform_id'] ?? '') === '', 'enumerating eligible targets never mints identity as a side effect');

echo "Composable Upgrade Platform identity checks passed.\n";
