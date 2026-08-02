<?php

declare(strict_types=1);

$packageFamilyRouteOptions = [];
$packageFamilyRoutes = [];

function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
function get_option(string $key, mixed $default = false): mixed
{
    global $packageFamilyRouteOptions;
    return $packageFamilyRouteOptions[$key] ?? $default;
}
function add_option(string $key, mixed $value, string $deprecated = '', string|bool $autoload = 'yes'): bool
{
    global $packageFamilyRouteOptions;
    if (array_key_exists($key, $packageFamilyRouteOptions)) return false;
    $packageFamilyRouteOptions[$key] = $value;
    return true;
}
function update_option(string $key, mixed $value, bool $autoload = false): bool
{
    global $packageFamilyRouteOptions;
    $packageFamilyRouteOptions[$key] = $value;
    return true;
}
function get_posts(array $args = []): array { return []; }
function get_post_meta(int $postId, string $key = '', bool $single = false): mixed { return $single ? null : []; }
function add_action(string $hook, callable $callback): bool { return true; }
function current_user_can(string $capability): bool { return true; }
function register_rest_route(string $namespace, string $route, array $definition): bool
{
    global $packageFamilyRoutes;
    $packageFamilyRoutes[$route] = $definition;
    return true;
}
function rest_ensure_response(mixed $value): WP_REST_Response
{
    return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
}

class WP_REST_Request
{
    public function __construct(private array $params = []) {}
    public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
    public function get_json_params(): array { return $this->params; }
}
class WP_REST_Response
{
    public function __construct(private mixed $data = null, private int $status = 200) {}
    public function get_data(): mixed { return $this->data; }
    public function get_status(): int { return $this->status; }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Http\PackageFamiliesController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function route_check(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

$identifiers = new PlatformIdentifierStation(static fn(int $minimum, int $maximum): int => 0);
$controller = new PackageFamiliesController($identifiers);
$controller->registerRoutes();

$route = '/admin/package-families/(?P<platform_id>CZ[A-Z0-9]+)';
route_check(isset($packageFamilyRoutes[$route]), 'canonical Package Family Platform route is registered');
route_check($packageFamilyRoutes[$route]['methods'] === 'GET', 'canonical Platform route is read-only');
route_check(
    count(array_filter(array_keys($packageFamilyRoutes), static fn(string $path): bool => str_starts_with($path, '/admin/package-families/'))) === 1,
    'no Platform-ID mutation sibling route is registered'
);

$created = $controller->createGroup(new WP_REST_Request(['name' => 'KAIROS', 'description' => 'Route contract.']));
route_check($created->get_status() === 200, 'integrated new Family creation succeeds');
$family = $created->get_data()['group'];
$platformId = $family['platform_id'];
$groupId = $family['group_id'];
$forwardKey = 'cz_platform_identifier_v1_' . $platformId;
$boundForward = $packageFamilyRouteOptions[$forwardKey];

$read = (new PackageFamiliesController($identifiers))->fetchGroupByPlatformId(new WP_REST_Request(['platform_id' => $platformId]));
route_check($read->get_status() === 200, 'bound CZPG resolves');
route_check($read->get_data()['group'] === $family, 'route returns the authoritative Package Family projection');

foreach (['reserved', 'retired', 'deleted'] as $status) {
    $packageFamilyRouteOptions[$forwardKey] = [
        ...$boundForward,
        'native_reference' => $status === 'reserved' || $status === 'retired' ? null : $groupId,
        'status' => $status,
    ];
    $result = (new PackageFamiliesController($identifiers))->fetchGroupByPlatformId(new WP_REST_Request(['platform_id' => $platformId]));
    route_check($result->get_status() === 404, "{$status} binding is rejected");
}

$packageFamilyRouteOptions[$forwardKey] = [...$boundForward, 'native_reference' => 'pcg_missing'];
$missing = (new PackageFamiliesController($identifiers))->fetchGroupByPlatformId(new WP_REST_Request(['platform_id' => $platformId]));
route_check($missing->get_status() === 404, 'missing native Family is rejected');

$packageFamilyRouteOptions['cz_platform_identifier_v1_CZS22222'] = [
    ...$boundForward,
    'platform_id' => 'CZS22222',
    'entity_type' => PlatformIdentifierPolicy::SERVICE,
    'native_reference' => 41,
];
$wrongEntity = (new PackageFamiliesController($identifiers))->fetchGroupByPlatformId(new WP_REST_Request(['platform_id' => 'CZS22222']));
route_check($wrongEntity->get_status() === 404, 'wrong-entity binding is rejected');

$packageFamilyRouteOptions[$forwardKey] = [...$boundForward, 'version' => 99];
$conflict = (new PackageFamiliesController($identifiers))->fetchGroupByPlatformId(new WP_REST_Request(['platform_id' => $platformId]));
route_check($conflict->get_status() === 409, 'registry conflict is rejected');

$packageFamilyRouteOptions[$forwardKey] = $boundForward;
$station = $packageFamilyRouteOptions[PackageRepository::OPTION_KEY];
$station['package_manager']['category_groups'][0]['cz_platform_id'] = 'CZPG99999';
$packageFamilyRouteOptions[PackageRepository::OPTION_KEY] = $station;
$storedConflict = (new PackageFamiliesController($identifiers))->fetchGroupByPlatformId(new WP_REST_Request(['platform_id' => $platformId]));
route_check($storedConflict->get_status() === 409, 'stored scalar mismatch is rejected');

echo "Package Family Platform route contract passed.\n";
