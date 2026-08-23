<?php

declare(strict_types=1);

/*
 * Commercial Legs — the Tier occupant's own minted Default Leg identity
 * (CZTL) must survive PackageSchema::extractTierForCostBuilder() and reach
 * PackageManagerSchema::resolveCommercialLegTimeline() as the emitted
 * Default component's identity, exactly like the Tier Edition path already
 * does. extractTierForCostBuilder()'s occupant-format whitelist previously
 * omitted default_leg_platform_id entirely, so the resolver's own
 * component-identity substitution (PackageManagerSchema::
 * resolveCommercialLegTimeline()) always fell back to the literal string
 * 'default' for every Tier, regardless of whether it had a real minted
 * identity — the Edition path never went through a whitelist at all, so it
 * never showed the bug.
 *
 * Deliberately narrow: exercises exactly extractTierForCostBuilder() ->
 * resolveCommercialLegTimeline() with a genuinely minted CZTL (via the real
 * controller/identity stack, mirroring tier-leg-platform-identity.php's own
 * convention). No resolver, minting, identity, or pricing logic touched.
 */

$tdlOptions = [];

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_key')) {
    function sanitize_key(mixed $value): string { return strtolower((string) preg_replace('/[^a-z0-9_\-]/', '', (string) $value)); }
}
if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $tdlOptions;
        if (array_key_exists($key, $tdlOptions)) return false;
        $tdlOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $tdlOptions;
        return array_key_exists($key, $tdlOptions) ? $tdlOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $tdlOptions;
        $tdlOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post { return $id === 911 ? new WP_Post($id, 'Default Leg Identity Service') : null; }
}
if (!function_exists('get_post_meta')) {
    function get_post_meta(int $id, string $key, bool $single = false): mixed { return $single ? [] : []; }
}
if (!function_exists('wp_get_post_terms')) {
    function wp_get_post_terms(int $postId, string $taxonomy, array $args = []): array { return []; }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-08-23 00:00:00'; }
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
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_default_leg_identity(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('Tier Default Leg identity (Cost Builder path): ' . $message);
}

function tdl_default_station(): array
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
        'legacy_host_service_id' => 911,
    ];
}

function tdl_new_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository(), new PlatformIdentifierStation());
}

function tdl_instance(): array
{
    global $tdlOptions;
    return TierInstanceSchema::findInstance($tdlOptions['cz_package_station']['tier_instances'], 'ti_primary') ?? [];
}

// ═══════════════════════════════════════════════════════════════════════════
// Mint a real Default Leg identity for a Tier occupant via the real
// controller/identity stack (mirrors tier-leg-platform-identity.php), then
// verify extractTierForCostBuilder() carries it through to the resolver's
// own emitted component identity.
// ═══════════════════════════════════════════════════════════════════════════

$tdlOptions = ['cz_package_station' => tdl_default_station()];

tdl_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 911, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'overview'],
    ['label' => 'Starter Cloud', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary'],
));
tdl_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 911, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'pricing_rules'],
    ['rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'monthly'],
));

$publish = tdl_new_controller()->settlePackageStationTier(new WP_REST_Request(
    ['id' => 911, 'instance' => 'ti_primary', 'tier' => 'basic'],
));
check_default_leg_identity($publish->get_status() === 200, 'Publish succeeds');

$occupant = tdl_instance()['tiers']['basic']['current_occupant'];
$defaultLegPlatformId = (string) ($occupant['default_leg_platform_id'] ?? '');
check_default_leg_identity($defaultLegPlatformId !== '', 'Publish mints a real Default Leg identity (CZTL) on the occupant');
check_default_leg_identity(str_starts_with($defaultLegPlatformId, 'CZTL'), 'the minted identity is a genuine CZTL, not a placeholder');

// extractTierForCostBuilder() — the exact function the Cost Builder
// projection feeds into resolveCommercialLegTimeline() — must carry it.
$extracted = PackageSchema::extractTierForCostBuilder(tdl_instance()['tiers']['basic']);
check_default_leg_identity(
    ($extracted['default_leg_platform_id'] ?? '') === $defaultLegPlatformId,
    'extractTierForCostBuilder() carries the occupant\'s own default_leg_platform_id through unchanged'
);

// resolveCommercialLegTimeline() must now emit that same real identity as
// the Default component's source — never the literal string 'default'.
$readModel = ['items' => [], 'rate_sheets' => [[
    'rate_sheet_id' => 'rs_primary',
    'items' => [[
        'item_id' => 'hosting', 'source_item_id' => '', 'self_priced' => true,
        'label' => 'Hosting', 'unit_price' => 100.0, 'per' => null, 'group_id' => null, 'includes' => null,
        'price_options' => [],
    ]],
]]];
$extracted['rate_sheet_items'] = [['item_id' => 'hosting', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []]];
$timeline = PackageManagerSchema::resolveCommercialLegTimeline($readModel, $extracted);
check_default_leg_identity(count($timeline) === 1, 'one resolved period (Default-only, indefinite)');
$sources = array_map(static fn(array $c): string => $c['source'], $timeline[0]['components']);
check_default_leg_identity(in_array($defaultLegPlatformId, $sources, true), 'the emitted Default component is addressed by its real CZTL identity');
check_default_leg_identity(!in_array('default', $sources, true), 'the literal string \'default\' is never emitted once the Tier has a minted Default Leg identity');

echo "Tier Default Leg identity (Cost Builder path) contract: PASS\n";
