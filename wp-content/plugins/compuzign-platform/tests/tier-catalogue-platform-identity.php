<?php

declare(strict_types=1);

/*
 * Tier Catalogue dual identity (CZTC / CZTEC), catalog side only. Proves the
 * design locked in
 * project-work/2026-09-06-composable-upgrade-platform-identification.md:
 * CZTC/CZTEC mirror CZPRCB's own dual-identity shape on a Rate Sheet row —
 * an occupant/Edition keeps its own ecosystem identity (CZT/CZTE) through
 * the SAME reservation loop it always used, and ADDITIONALLY carries the
 * Catalogue-type identity under the identical native reference, never a
 * child record keyed by some other base occupant. Unlike CZPRCB (gated by
 * an explicit admin declaration), CZTC/CZTEC mint UNCONDITIONALLY: every
 * settled composable occupant IS the one Tier Catalogue occupant for its
 * Tier Instance, and every one of its Editions IS a Tier Catalogue Edition —
 * there is no separate declaration to gate on.
 *
 * Exercises the REAL controller, PlatformIdentifierStation, PackageRepository,
 * PackageSchema, and TierInstanceSchema — only WordPress core functions are
 * stubbed, matching the convention already proven by
 * tier-occupant-platform-identity.php and composable-occupant-controller-
 * contract.php.
 */

$tcpiOptions = [];

if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $tcpiOptions;
        if (array_key_exists($key, $tcpiOptions)) return false;
        $tcpiOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $tcpiOptions;
        return array_key_exists($key, $tcpiOptions) ? $tcpiOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $tcpiOptions;
        $tcpiOptions[$key] = $value;
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
    function get_post(int $id): ?WP_Post { return $id === 707 ? new WP_Post($id, 'Tier Catalogue Identity Service') : null; }
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

function check_tcpi(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('Tier Catalogue Platform identity: ' . $message);
}

function tcpi_default_station(): array
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

function tcpi_new_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository(), new PlatformIdentifierStation());
}

function tcpi_instance(): array
{
    global $tcpiOptions;
    return TierInstanceSchema::findInstance($tcpiOptions['cz_package_station']['tier_instances'], 'ti_primary') ?? [];
}

function tcpi_overview_save(array $overrides = []): WP_REST_Response
{
    return tcpi_new_controller()->saveComposableOccupantModule(new WP_REST_Request(
        ['id' => 707, 'instance' => 'ti_primary', 'module' => 'overview'],
        [...['label' => 'Build Your Own', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary'], ...$overrides],
    ));
}

function tcpi_settle(): WP_REST_Response
{
    return tcpi_new_controller()->settleComposableOccupant(new WP_REST_Request(['id' => 707, 'instance' => 'ti_primary']));
}

// ── TEST 1 — first Publish of the composable occupant automatically mints
//    CZT (unchanged) AND CZTC, unconditionally — no admin declaration of any
//    kind. Bound to the SAME native reference under a distinct entity type.
//    A repeat Publish reconciles (reuses) both, never minting a second CZTC.
$tcpiOptions = ['cz_package_station' => tcpi_default_station()];
tcpi_overview_save();
$publish1 = tcpi_settle();
check_tcpi($publish1->get_status() === 200, 'Publish succeeds');
check_tcpi((bool) $publish1->get_data()['success'], 'Publish response reports success');

$occupantId = tcpi_instance()['composable_occupant']['current_occupant']['id'];
$occupant1 = tcpi_instance()['composable_occupant']['current_occupant'];
$primaryId1 = $occupant1['cz_platform_id'] ?? '';
$catalogueId1 = $occupant1['catalogue_platform_id'] ?? '';
check_tcpi(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER, $primaryId1), 'the occupant gets a validly formatted CZT');
check_tcpi(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_CATALOGUE, $catalogueId1), 'the occupant automatically ALSO gets a validly formatted CZTC — no declaration required');
check_tcpi($primaryId1 !== $catalogueId1, 'CZT and CZTC are two distinct identifier strings — dual identity, never one substituting the other');

$nativeReference = PackagePlatformNativeReference::tierOccupant('ti_primary', $occupantId);
$primaryForward = $tcpiOptions['cz_platform_identifier_v1_' . $primaryId1];
$catalogueForward = $tcpiOptions['cz_platform_identifier_v1_' . $catalogueId1];
check_tcpi($primaryForward['status'] === PlatformIdentifierStation::STATUS_BOUND && $primaryForward['native_reference'] === $nativeReference, 'CZT is bound to the occupant\'s own native reference');
check_tcpi($catalogueForward['status'] === PlatformIdentifierStation::STATUS_BOUND && $catalogueForward['native_reference'] === $nativeReference, 'CZTC is bound to the EXACT SAME native reference as CZT — same tuple, different entity type, no collision');
check_tcpi($primaryForward['entity_type'] === PlatformIdentifierPolicy::TIER, 'the CZT registry record carries the TIER entity type');
check_tcpi($catalogueForward['entity_type'] === PlatformIdentifierPolicy::TIER_CATALOGUE, 'the CZTC registry record carries the distinct TIER_CATALOGUE entity type — this is what makes the shared native reference safe');

// Repeat Publish reuses both identifiers unchanged.
$publish2 = tcpi_settle();
check_tcpi($publish2->get_status() === 200, 'a repeat Publish still succeeds');
$occupant2 = tcpi_instance()['composable_occupant']['current_occupant'];
check_tcpi(($occupant2['cz_platform_id'] ?? '') === $primaryId1, 'a repeat Publish reuses the exact same CZT');
check_tcpi(($occupant2['catalogue_platform_id'] ?? '') === $catalogueId1, 'a repeat Publish reuses the exact same CZTC, never minting a second one');

// ── TEST 2 — resolve()/lookupNative() correctly disambiguate CZT vs CZTC
//    despite sharing one native reference — proves the dual identity is
//    genuinely independently addressable, not merely non-crashing. ─────────
$station = new PlatformIdentifierStation();
$resolvedPrimary = $station->resolve($primaryId1);
$resolvedCatalogue = $station->resolve($catalogueId1);
check_tcpi($resolvedPrimary !== null && $resolvedPrimary->entityType() === PlatformIdentifierPolicy::TIER, 'resolve() on the CZT string returns the TIER binding');
check_tcpi($resolvedCatalogue !== null && $resolvedCatalogue->entityType() === PlatformIdentifierPolicy::TIER_CATALOGUE, 'resolve() on the CZTC string returns the TIER_CATALOGUE binding, never confused with CZT despite the identical native reference');
$lookupPrimary = $station->lookupNative(PlatformIdentifierPolicy::TIER, $nativeReference);
$lookupCatalogue = $station->lookupNative(PlatformIdentifierPolicy::TIER_CATALOGUE, $nativeReference);
check_tcpi($lookupPrimary !== null && $lookupPrimary->platformId() === $primaryId1, 'lookupNative(TIER, ...) returns the CZT binding for this native reference');
check_tcpi($lookupCatalogue !== null && $lookupCatalogue->platformId() === $catalogueId1, 'lookupNative(TIER_CATALOGUE, ...) returns the CZTC binding for the SAME native reference — independently addressable');

// ── TEST 3 — Edition-derived Catalogue (CZTEC): creating and activating a
//    composable Edition automatically mints CZTEC alongside its own CZTE, at
//    the exact same first-Active gate, bound to the SAME Edition native
//    reference — again with no admin declaration. A repeat activation
//    reconciles the same CZTEC. ─────────────────────────────────────────────
$create = tcpi_new_controller()->createComposableOccupantEdition(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary'],
    ['title' => 'Annual', 'rate_sheet_id' => 'rs_primary', 'rate_sheet_items' => [], 'billing_cycle' => 'annually'],
));
check_tcpi($create->get_status() === 200 && (bool) $create->get_data()['success'], 'creating a composable Edition succeeds');
$editionId = $create->get_data()['edition_id'];

tcpi_new_controller()->saveComposableOccupantEditionModule(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $editionId, 'module' => 'overview'],
    ['title' => 'Annual Plan', 'rate_sheet_id' => 'rs_primary', 'rate_sheet_items' => [], 'billing_cycle' => 'annually'],
));
$settleEdition = tcpi_new_controller()->settleComposableOccupantEditionModule(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $editionId, 'module' => 'overview'],
));
check_tcpi($settleEdition->get_status() === 200, 'settling the composable Edition module succeeds');

$activate1 = tcpi_new_controller()->updateComposableOccupantEditionStatus(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $editionId, 'platform_status' => 'active'], []
));
check_tcpi($activate1->get_status() === 200, 'activating the composable Edition succeeds');
$editionPlatformId1 = $activate1->get_data()['edition']['edition_platform_id'] ?? '';
$editionCatalogueId1 = $activate1->get_data()['edition']['edition_catalogue_platform_id'] ?? '';
check_tcpi(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION, $editionPlatformId1), 'first Active still assigns a validly formatted CZTE');
check_tcpi(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION_CATALOGUE, $editionCatalogueId1), 'first Active automatically ALSO assigns a validly formatted CZTEC — no declaration required');
check_tcpi($editionPlatformId1 !== $editionCatalogueId1, 'CZTE and CZTEC are two distinct identifier strings');

$editionNativeReference = PackagePlatformNativeReference::tierEdition('ti_primary', $occupantId, $editionId);
$editionForward = $tcpiOptions['cz_platform_identifier_v1_' . $editionPlatformId1];
$editionCatalogueForward = $tcpiOptions['cz_platform_identifier_v1_' . $editionCatalogueId1];
check_tcpi($editionForward['native_reference'] === $editionNativeReference, 'CZTE binds to this Edition\'s own native reference');
check_tcpi($editionCatalogueForward['native_reference'] === $editionNativeReference, 'CZTEC binds to the EXACT SAME Edition native reference as CZTE — same tuple, different entity type');

$activate2 = tcpi_new_controller()->updateComposableOccupantEditionStatus(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $editionId, 'platform_status' => 'active'], []
));
check_tcpi($activate2->get_status() === 200, 'a repeat activation still succeeds');
check_tcpi(($activate2->get_data()['edition']['edition_platform_id'] ?? '') === $editionPlatformId1, 'a repeat activation reuses the exact same CZTE');
check_tcpi(($activate2->get_data()['edition']['edition_catalogue_platform_id'] ?? '') === $editionCatalogueId1, 'a repeat activation reuses the exact same CZTEC, never minting a second one');

// ── TEST 4 — a SECOND, independently created composable Edition ALSO
//    automatically mints its own distinct CZTEC on first Active — proving
//    unconditional minting isn't a one-time fluke tied to whichever Edition
//    happened to be created first. ──────────────────────────────────────────
$createSecond = tcpi_new_controller()->createComposableOccupantEdition(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary'],
    ['title' => 'Quarterly', 'rate_sheet_id' => 'rs_primary', 'rate_sheet_items' => [], 'billing_cycle' => 'monthly'],
));
$secondEditionId = $createSecond->get_data()['edition_id'];
tcpi_new_controller()->saveComposableOccupantEditionModule(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $secondEditionId, 'module' => 'overview'],
    ['title' => 'Quarterly Plan', 'rate_sheet_id' => 'rs_primary', 'rate_sheet_items' => [], 'billing_cycle' => 'monthly'],
));
tcpi_new_controller()->settleComposableOccupantEditionModule(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $secondEditionId, 'module' => 'overview'],
));
$activateSecond = tcpi_new_controller()->updateComposableOccupantEditionStatus(new WP_REST_Request(
    ['id' => 707, 'instance' => 'ti_primary', 'edition' => $secondEditionId, 'platform_status' => 'active'], []
));
$secondEditionCatalogueId = $activateSecond->get_data()['edition']['edition_catalogue_platform_id'] ?? '';
check_tcpi(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION_CATALOGUE, $secondEditionCatalogueId), 'a second composable Edition also automatically gets its own validly formatted CZTEC');
check_tcpi($secondEditionCatalogueId !== $editionCatalogueId1, 'the second Edition\'s CZTEC is distinct from the first Edition\'s own CZTEC');

// ── TEST 5 — migration/assignment enumeration lists the one Tier Catalogue
//    occupant (the composable occupant) and its Editions unconditionally,
//    but NEVER an ordinary Tier slot's occupant — no ordinary Tier occupant
//    can ever be a Tier Catalogue occupant, so enumeration must not merely
//    fail to filter one out, it must never scan that location at all.
//    Enumeration itself is a pure read: it never mints. ─────────────────────
$tcpiOptions['cz_package_station']['tier_instances'][0]['tiers']['basic']['current_occupant'] = [
    'id' => 'occ_ordinary', 'cz_platform_id' => 'CZT23456', 'catalogue_platform_id' => '',
];
$repo = new PackageRepository();
$cataloguePage = $repo->tierCatalogueAssignmentPage(null, 500);
check_tcpi(in_array($nativeReference, $cataloguePage['items'], true), 'the composable occupant is enumerated as an eligible CZTC assignment target');
$ordinaryOccupantReference = PackagePlatformNativeReference::tierOccupant('ti_primary', 'occ_ordinary');
check_tcpi(!in_array($ordinaryOccupantReference, $cataloguePage['items'], true), 'an ordinary Tier slot\'s occupant is never enumerated as a Tier Catalogue assignment target, even though it carries its own real id and CZT');

$editionCataloguePage = $repo->tierEditionCatalogueAssignmentPage(null, 500);
check_tcpi(in_array($editionNativeReference, $editionCataloguePage['items'], true), 'the composable occupant\'s first Edition is enumerated as an eligible CZTEC assignment target');
$secondEditionNativeReference = PackagePlatformNativeReference::tierEdition('ti_primary', $occupantId, $secondEditionId);
check_tcpi(in_array($secondEditionNativeReference, $editionCataloguePage['items'], true), 'the composable occupant\'s second Edition is ALSO enumerated as an eligible CZTEC assignment target');
// Enumeration alone must not have minted anything beyond what settle/activate already did.
check_tcpi(count(array_unique($editionCataloguePage['items'])) === count($editionCataloguePage['items']), 'no duplicate references appear in the eligible CZTEC page');

echo "Tier Catalogue Platform identity checks passed.\n";
