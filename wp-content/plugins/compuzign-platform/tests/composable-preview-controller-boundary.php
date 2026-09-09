<?php

declare(strict_types=1);

/*
 * Composable preview — REST/controller boundary (not repository-only).
 *
 * project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md,
 * 2026-09-09 round: live customer validation on main@0a13fd14 hit
 * ComposableOfferBrowser's Promise-rejection `.catch()` path (the raw
 * fetch/HTTP-boundary failure — "Could not resolve pricing right now"),
 * never resolveComposableOfferSelection()'s own structured `ok:false`.
 * tests/composable-customer-ux-preview.php already proves the repository
 * layer resolves correctly, including the Edition-swap branch added in
 * 0a13fd14 — but it calls PackageRepository directly, never going through
 * PackageBuilderController::postComposablePreview() (arg extraction,
 * sanitize_text_field on family_id/edition_id, rest_ensure_response) or
 * confirming the returned WP_REST_Response's data actually survives a real
 * json_encode() round-trip (WP_REST_Server ultimately emits the response
 * through wp_json_encode() — a value that cannot cleanly encode, or that
 * decodes back changed, would reach the browser as exactly the malformed/
 * non-JSON response ComposableOfferBrowser.tsx's res.json() would reject
 * on, HTTP 200 or not).
 *
 * This file exercises the actual controller entry point end to end,
 * against the exact family_id/choice/edition_id shapes the real frontend
 * sends (see resources/ts/api/endpoints/package-builder.ts), and locks
 * that the emitted response is valid, round-trippable JSON in every case
 * the live defect could plausibly correspond to: Default (no edition_id
 * key sent at all, matching the frontend's own `...(editionId !== null ?
 * {...} : {})` omission), a real Edition id, an unknown Edition id, and a
 * malformed/wrong-type edition_id a REST client could still send since
 * this route's args carry no validate_callback (see the controller's own
 * registerRoutes()).
 *
 * Auditor round 2 (2026-09-09): the is_scalar() hardening below is real
 * but only demonstrated against a malformed edition_id the real frontend
 * never sends — it does not by itself explain the reported failure on the
 * NORMAL well-formed path. Section 7 below closes that gap: it dispatches
 * a well-formed request (Default and a real Edition id, exactly what
 * ComposableOfferBrowser.tsx sends) through the ACTUAL registered route
 * definition captured by register_rest_route() above — resolving
 * `$routeDef['callback']` and calling THAT (not
 * $controller->postComposablePreview() directly), and invoking
 * `$routeDef['permission_callback']` first — the closest this
 * WordPress-core-less environment can get to a real WP_REST_Server::
 * dispatch() without a full WP install. Two adjacent boundaries were also
 * inspected by hand rather than by a runnable test (no WordPress core is
 * present in this repository to execute against):
 *   - Module wiring: CostBuilderModule.php constructs
 *     `new PackageBuilderController(new PackageFamilyPricingBuilder($packageRepository), $packageRepository)`
 *     — matches this controller's constructor exactly; no DI mismatch.
 *   - Client path construction: AssetLoader.php sets
 *     `apiRoot => rest_url('compuzign/v1/')`; apiClient.ts's
 *     `apiRoot.replace(/\/$/, '') + '/' + path` with
 *     `path = 'package-builder/composable-preview'` therefore builds
 *     exactly `<site>/wp-json/compuzign/v1/package-builder/composable-preview`
 *     — the identical namespace+route this file registers. No mismatch.
 */

// Fail loudly on ANY PHP diagnostic (warning/notice/deprecated) raised
// while exercising the controller — this is the actual regression lock for
// the live defect's own mechanism: a warning that would otherwise print
// silently to STDOUT/STDERR here is exactly what gets echoed into a real
// response body BEFORE the JSON on a host with display_errors on,
// corrupting it into the malformed/non-JSON response the browser's
// res.json() rejects on. Passing tests must never merely tolerate a
// diagnostic that was silently printed alongside "OK".
set_error_handler(static function (int $errno, string $errstr) {
    throw new \ErrorException($errstr, 0, $errno);
});

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
$composablePreviewControllerOption = null;
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-09-09 00:00:00'; }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $composablePreviewControllerOption;
        return $key === 'cz_package_station' ? ($composablePreviewControllerOption ?? $default) : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $composablePreviewControllerOption;
        if ($key === 'cz_package_station') { $composablePreviewControllerOption = $value; }
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
if (!function_exists('add_action')) {
    function add_action(string $hook, callable $callback): bool { return true; }
}
if (!function_exists('__return_true')) {
    function __return_true(): bool { return true; }
}

// The route registration args a real WP_REST_Server would build a schema
// from — captured here (not just discarded) so this test can assert on the
// exact args PackageBuilderController::registerRoutes() declares, the same
// "route/schema" boundary the auditor flagged, without needing the full
// WP_REST_Server dispatch machinery this repo has no WordPress core to run.
$composablePreviewRoutes = [];
if (!function_exists('register_rest_route')) {
    function register_rest_route(string $namespace, string $route, array $definition): bool
    {
        global $composablePreviewRoutes;
        $composablePreviewRoutes[$namespace . $route] = $definition;
        return true;
    }
}
if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request
    {
        public function __construct(private array $params = []) {}
        // Mirrors the real WP_REST_Request::get_param() contract this
        // controller relies on: a key never present in the submitted
        // params returns null — never '', never missing-key undefined
        // behavior — exactly what lets postComposablePreview() distinguish
        // "edition_id omitted" (Default) from an explicit value.
        public function get_param(string $key): mixed
        {
            return array_key_exists($key, $this->params) ? $this->params[$key] : null;
        }
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
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response(mixed $value): WP_REST_Response
    {
        return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
    }
}

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema as TIS;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema as TAS;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\CostBuilder\Services\PackageFamilyPricingBuilder;
use CompuZign\Platform\Modules\CostBuilder\Http\PackageBuilderController;

function boundaryCheck(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

function occupantFixture(string $idSuffix, string $platformId, ?array $customerPolicy, array $tierEditions = []): array
{
    return [
        'current_occupant' => [
            'id' => 'occ_' . $idSuffix, 'cz_platform_id' => $platformId, 'addon_platform_id' => '',
            'default_leg_platform_id' => '', 'platform_status' => 'active', 'is_explicitly_disabled' => false,
            'is_addon' => false, 'label' => 'Build Your Own', 'ideal_for' => '',
            'audience_groups' => ['personal_business', 'enterprise'], 'price' => null, 'contact' => false,
            'billing_cycle' => 'monthly', 'minimum_term_value' => null, 'minimum_term_unit' => null,
            'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
            'rate_sheet_id' => 'rs_cb',
            'inclusions_override' => [],
            'rate_sheet_items' => [
                ['item_id' => 'hosting', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []],
            ],
            'features' => [], 'faq_refs' => [],
            'customer_policy' => $customerPolicy,
            'tier_editions' => $tierEditions, 'tier_edition_bin' => [],
        ],
        'history' => [],
    ];
}

function stationFixture(array $composableOccupant): array
{
    $instance = [
        'tier_instance_id' => 'ti_cb', 'cz_platform_id' => 'CZTG-CB', 'title' => 'Controller Boundary Set',
        'status' => 'active', 'allowed_rate_sheet_ids' => ['rs_cb'], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => TIS::emptyTierMap(), 'occupant_bin' => [],
    ];
    $instance['tiers']['basic'] = occupantFixture('primary', 'CZT-PRIMARY-CB', null);
    $instance['composable_occupant'] = $composableOccupant;

    $manager = [
        'sources' => [], 'groups' => [], 'category_groups' => [[
            'group_id' => 'pcg_cb', 'cz_platform_id' => 'CZPG-CB', 'label' => 'Controller Boundary Family',
            'description' => '', 'platform_status' => 'active', 'previous_platform_status' => null,
            'module_status' => ['overview' => 'settled'], 'overview_draft' => null, 'sort_order' => 0,
        ]], 'items' => [],
        'rate_sheets' => [[
            'rate_sheet_id' => 'rs_cb', 'title' => 'CB Rates', 'status' => 'active', 'groups' => [],
            'items' => [
                ['item_id' => 'hosting', 'source_item_id' => '', 'bundle_id' => 'bnd_hosting', 'label' => 'Hosting', 'unit_price' => 100, 'per' => null, 'quantity' => 1, 'group_id' => null, 'price_options' => []],
            ],
        ]],
    ];

    return [
        'platform_status' => 'active', 'tier_instances' => [$instance],
        'tier_assignments' => [[
            'assignment_id' => TAS::deriveAssignmentId('package_family', 'pcg_cb', 'ti_cb'),
            'consumer_type' => 'package_family', 'consumer_id' => 'pcg_cb', 'tier_instance_id' => 'ti_cb',
        ]],
        'popular_tier' => null, 'popular_label' => '', 'sort_position' => 0,
        'bundle' => ['title' => '', 'description' => '', 'price' => null], 'occupant_bin' => [], 'promotions' => [],
        'package_manager' => $manager, 'legacy_host_service_id' => 0, 'valid_from' => null, 'valid_until' => null,
    ];
}

$policy = ['items' => [['item_id' => 'hosting', 'mode' => 'required']]];
$edition = [
    'id' => 'ed_1', 'edition_platform_id' => 'CZTE-1', 'edition_catalogue_platform_id' => 'CZTEC-1',
    'default_leg_platform_id' => '', 'title' => 'Pro Edition', 'admin_description' => '',
    'platform_status' => 'active', 'previous_platform_status' => null, 'is_explicitly_disabled' => false,
    'module_status' => [], 'drafts' => [],
    'rate_sheet_id' => 'rs_cb',
    'rate_sheet_items' => [['item_id' => 'hosting', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []]],
    'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
    'minimum_term_value' => null, 'minimum_term_unit' => null,
    'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
    'inclusions_override' => [], 'customer_policy' => null, 'faq_refs' => [],
];

global $composablePreviewControllerOption;
$composablePreviewControllerOption = stationFixture(occupantFixture('composable', 'CZT-COMPOSABLE-CB', $policy, [$edition]));

$controller = new PackageBuilderController(
    new PackageFamilyPricingBuilder(new PackageRepository()),
    new PackageRepository()
);
$controller->register();
$controller->registerRoutes();

// ── 1. Route/schema boundary ────────────────────────────────────────────
global $composablePreviewRoutes;
$routeKey = 'compuzign/v1/package-builder/composable-preview';
boundaryCheck(isset($composablePreviewRoutes[$routeKey]), '1a. the composable-preview route is actually registered');
$routeDef = $composablePreviewRoutes[$routeKey];
boundaryCheck($routeDef['methods'] === 'POST', '1b. registered as POST');
boundaryCheck(($routeDef['args']['edition_id']['required'] ?? null) === false, '1c. edition_id is optional, matching the frontend omitting it for Default');

// ── 2. Default (edition_id key entirely absent) — the exact shape the
//    frontend sends via resolveComposablePreview(family, choice, null),
//    since `...(editionId !== null ? { edition_id: editionId } : {})`
//    omits the key rather than sending null. ───────────────────────────
$reqDefault = new WP_REST_Request(['family_id' => 'pcg_cb', 'choice' => [['item_id' => 'hosting']]]);
$resDefault = $controller->postComposablePreview($reqDefault);
boundaryCheck($resDefault->get_status() === 200, '2a. controller returns HTTP 200 for a valid Default request');
$dataDefault = $resDefault->get_data();
boundaryCheck($dataDefault['ok'] === true, '2b. resolves ok through the full controller boundary, not just the repository directly');
$jsonDefault = json_encode($dataDefault, JSON_THROW_ON_ERROR);
boundaryCheck(is_string($jsonDefault) && $jsonDefault !== '', '2c. the response data round-trips through json_encode() cleanly (JSON_THROW_ON_ERROR would already have thrown otherwise) — this is what WP_REST_Server ultimately emits to the browser');
$decodedDefault = json_decode($jsonDefault, true);
boundaryCheck($decodedDefault['ok'] === true, '2d. decodes back to the same structure — no NAN/INF/invalid-UTF8 silently corrupting the wire payload');

// ── 3. Real Edition id — the new branch added in 0a13fd14, through the
//    controller's own sanitize_text_field()/get_param() extraction, not
//    called directly on the repository. ─────────────────────────────────
$reqEdition = new WP_REST_Request(['family_id' => 'pcg_cb', 'choice' => [['item_id' => 'hosting']], 'edition_id' => 'ed_1']);
$resEdition = $controller->postComposablePreview($reqEdition);
boundaryCheck($resEdition->get_status() === 200, '3a. HTTP 200 for a real active Edition id through the controller');
$dataEdition = $resEdition->get_data();
boundaryCheck($dataEdition['ok'] === true, '3b. resolves ok through the controller for the Edition-swap branch');
json_encode($dataEdition, JSON_THROW_ON_ERROR);
boundaryCheck(true, '3c. Edition-swap response also round-trips through json_encode() cleanly');

// ── 4. Unknown Edition id — fails closed, still a clean 200 + ok:false,
//    never an uncaught exception reaching rest_ensure_response(). ───────
$reqUnknown = new WP_REST_Request(['family_id' => 'pcg_cb', 'choice' => [['item_id' => 'hosting']], 'edition_id' => 'does_not_exist']);
$resUnknown = $controller->postComposablePreview($reqUnknown);
boundaryCheck($resUnknown->get_status() === 200, '4a. an unknown Edition id still returns HTTP 200 (structured ok:false), never a thrown error reaching the client as a non-2xx/malformed response');
boundaryCheck($resUnknown->get_data()['ok'] === false, '4b. structured ok:false, not a silent Default fallback');

// ── 5. Malformed edition_id types a real (unvalidated — no
//    validate_callback on this arg) REST client could still send: this
//    route's own args carry 'type' => 'string' but no validate_callback,
//    so nothing rejects a non-string edition_id before it reaches the
//    controller's own sanitize_text_field((string) ...) cast. Proves that
//    cast, not WP's schema, is what has to hold. ─────────────────────────
foreach ([['edition_id' => ['ed_1']], ['edition_id' => 123], ['edition_id' => true]] as $malformed) {
    $reqMalformed = new WP_REST_Request(['family_id' => 'pcg_cb', 'choice' => [['item_id' => 'hosting']]] + $malformed);
    $resMalformed = $controller->postComposablePreview($reqMalformed);
    boundaryCheck($resMalformed->get_status() === 200, '5a. a non-string edition_id (' . json_encode($malformed['edition_id']) . ') never throws through the controller — the (string) cast absorbs it rather than a TypeError reaching rest_ensure_response()');
    json_encode($resMalformed->get_data(), JSON_THROW_ON_ERROR);
}

// ── 6. Missing/garbage choice — controller's own is_array() guard, not
//    the repository's. ───────────────────────────────────────────────────
$reqNoChoice = new WP_REST_Request(['family_id' => 'pcg_cb']);
$resNoChoice = $controller->postComposablePreview($reqNoChoice);
boundaryCheck($resNoChoice->get_status() === 200, '6a. an entirely absent choice param never throws — the controller coerces it to []');

// ── 7. Actual REST dispatch boundary — well-formed requests only,
//    exactly the shapes the real frontend sends. Resolves the callback
//    and permission_callback FROM the route definition
//    register_rest_route() actually captured above, rather than calling
//    postComposablePreview() directly — proving the registered route
//    itself resolves to working behavior, not just that the method does
//    when called by hand. Required-params presence is checked the same
//    way WP_REST_Server::dispatch()'s own has_valid_params() does, from
//    the route's own captured `args` schema. ───────────────────────────
function dispatchThroughRegisteredRoute(array $routeDef, WP_REST_Request $request): WP_REST_Response
{
    foreach ($routeDef['args'] ?? [] as $key => $argSchema) {
        if (($argSchema['required'] ?? false) === true) {
            boundaryCheck($request->get_param($key) !== null, "7-required. missing required param '{$key}' would be rejected by WP_REST_Server::dispatch() before the callback ever runs");
        }
    }
    $permission = call_user_func($routeDef['permission_callback'], $request);
    boundaryCheck($permission === true, '7-permission. permission_callback must pass for an anonymous customer request');
    $response = call_user_func($routeDef['callback'], $request);
    boundaryCheck($response instanceof WP_REST_Response, '7-shape. the resolved route callback returns a WP_REST_Response');
    return $response;
}

// 7a. Default — the exact request ComposableOfferBrowser.tsx sends on
// first mount/browsing with no Edition switch (activeEditionId === null).
$dispatchedDefault = dispatchThroughRegisteredRoute($routeDef, new WP_REST_Request(['family_id' => 'pcg_cb', 'choice' => [['item_id' => 'hosting', 'selected' => true]]]));
boundaryCheck($dispatchedDefault->get_status() === 200, '7b. dispatched-through-the-real-route Default request returns HTTP 200');
boundaryCheck($dispatchedDefault->get_data()['ok'] === true, '7c. resolves ok, end to end, through the actually-registered route');
json_encode($dispatchedDefault->get_data(), JSON_THROW_ON_ERROR);

// 7d. A real, active Edition id — the exact request sent after the
// customer clicks a real Default/Edition destination on the cue.
$dispatchedEdition = dispatchThroughRegisteredRoute($routeDef, new WP_REST_Request(['family_id' => 'pcg_cb', 'choice' => [['item_id' => 'hosting', 'selected' => true]], 'edition_id' => 'ed_1']));
boundaryCheck($dispatchedEdition->get_status() === 200, '7e. dispatched-through-the-real-route Edition request returns HTTP 200');
boundaryCheck($dispatchedEdition->get_data()['ok'] === true, '7f. resolves ok, end to end, through the actually-registered route, for the Edition-swap branch specifically');
json_encode($dispatchedEdition->get_data(), JSON_THROW_ON_ERROR);

echo "Composable preview controller boundary contract: PASS\n";
