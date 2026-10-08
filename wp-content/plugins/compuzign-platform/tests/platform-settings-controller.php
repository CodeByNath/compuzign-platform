<?php

declare(strict_types=1);

// Platform Settings REST boundary contract (Global Profile Phase 1B):
// exact routes and non-colliding Platform-ID patterns, capability + REST
// nonce on every route, multipart upload error mapping, output-only
// identity, and the success/failure envelope.

$GLOBALS['cz_options'] = [];
$GLOBALS['cz_routes']  = [];
$GLOBALS['cz_can']     = true;

function add_option(string $key, mixed $value, string $deprecated = '', string|bool $autoload = 'yes'): bool
{
    if (array_key_exists($key, $GLOBALS['cz_options'])) {
        return false;
    }
    $GLOBALS['cz_options'][$key] = $value;
    return true;
}
function get_option(string $key, mixed $default = false): mixed { return $GLOBALS['cz_options'][$key] ?? $default; }
function update_option(string $key, mixed $value, string|bool|null $autoload = null): bool
{
    $GLOBALS['cz_options'][$key] = $value;
    return true;
}
function add_action(string $hook, callable $callback): void {}
function register_rest_route(string $namespace, string $route, array $args): void { $GLOBALS['cz_routes'][$route] = $args; }
function current_user_can(string $capability): bool { return $GLOBALS['cz_can'] && $capability === 'manage_compuzign'; }
function wp_verify_nonce(string $nonce, string $action): int|false { return $nonce === 'good-nonce' && $action === 'wp_rest' ? 1 : false; }
function get_current_user_id(): int { return 42; }

final class FakeWpdb
{
    public string $options = 'wp_options';
    public function prepare(string $query, mixed ...$args): string
    {
        $i = 0;
        return preg_replace_callback('/%s/', static function () use (&$i, $args): string {
            return "'" . addslashes((string) $args[$i++]) . "'";
        }, $query);
    }
    public function query(string $sql): int|false
    {
        if (preg_match("/DELETE FROM .* WHERE option_name = '(.*)' AND option_value = '(.*)'/s", $sql, $m)
            && ($GLOBALS['cz_options'][stripslashes($m[1])] ?? null) === stripslashes($m[2])) {
            unset($GLOBALS['cz_options'][stripslashes($m[1])]);
            return 1;
        }
        return 0;
    }
}
$GLOBALS['wpdb'] = new FakeWpdb();

class WP_REST_Request
{
    public function __construct(private array $params = [], private array $headers = [], private array $files = []) {}
    public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
    public function has_param(string $key): bool { return array_key_exists($key, $this->params); }
    public function get_header(string $key): ?string { return $this->headers[strtolower($key)] ?? null; }
    public function get_file_params(): array { return $this->files; }
}
class WP_REST_Response
{
    public function __construct(private mixed $data = null, private int $status = 200) {}
    public function get_data(): mixed { return $this->data; }
    public function get_status(): int { return $this->status; }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;
use CompuZign\Platform\PlatformSettings\BrandImageProcessor;
use CompuZign\Platform\PlatformSettings\PlatformSettingsController;
use CompuZign\Platform\PlatformSettings\PlatformSettingsRepository;
use CompuZign\Platform\PlatformSettings\PlatformSettingsStation;
use CompuZign\Platform\PlatformSettings\UploadsBrandAssetStore;

function check(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "  ok — {$message}\n";
}

function png(int $size): string
{
    $image = imagecreatetruecolor($size, $size);
    ob_start();
    imagepng($image);
    return (string) ob_get_clean();
}

$assetDir = sys_get_temp_dir() . '/cz-brand-http-' . bin2hex(random_bytes(4));
$uploads  = ['/tmp/php-logo' => png(40), '/tmp/php-favicon' => png(32)];
$controller = new PlatformSettingsController(
    new PlatformSettingsStation(
        new PlatformIdentifierStation(),
        new PlatformSettingsRepository(),
        new UploadsBrandAssetStore($assetDir, 'https://example.test/brand'),
        new BrandImageProcessor()
    ),
    static fn(string $path): ?string => $uploads[$path] ?? null
);
$controller->registerRoutes();

echo "Routes\n";
$routes = $GLOBALS['cz_routes'];
check(array_keys($routes) === [
    '/admin/platform-settings',
    '/admin/platform-settings/(?P<platform_id>CZPS[2-9A-HJKMNP-TV-Z]{5})',
    '/admin/platform-settings/profile',
    '/admin/platform-settings/profiles/(?P<platform_id>CZPSP[2-9A-HJKMNP-TV-Z]{5})',
], 'exactly the four approved route paths are registered');
$matches = static fn(string $route, string $path): bool => preg_match('@^' . $route . '$@i', $path) === 1;
check(!$matches(array_keys($routes)[1], '/admin/platform-settings/profile'), '`profile` never matches the CZPS read-by-id route');
check(!$matches(array_keys($routes)[1], '/admin/platform-settings/CZPSP2A7KZ'), 'a CZPSP id never matches the CZPS route');
check($matches(array_keys($routes)[3], '/admin/platform-settings/profiles/CZPSP2A7KZ'), 'a CZPSP id matches its own route');
$methods = [];
foreach ($routes as $route => $args) {
    foreach (isset($args['methods']) ? [$args] : $args as $endpoint) {
        $methods[] = $endpoint['methods'];
        check($endpoint['permission_callback'] === [$controller, 'requirePlatformAccess'], "{$endpoint['methods']} {$route} is permission-gated");
    }
}
check($methods === ['GET', 'GET', 'GET', 'POST', 'GET'], 'GET everywhere plus one POST Save');

echo "Capability and REST nonce\n";
$authed = ['x-wp-nonce' => 'good-nonce'];
check($controller->requirePlatformAccess(new WP_REST_Request([], $authed)), 'capability + valid nonce is allowed');
check(!$controller->requirePlatformAccess(new WP_REST_Request([], [])), 'a missing nonce is denied');
check(!$controller->requirePlatformAccess(new WP_REST_Request([], ['x-wp-nonce' => 'forged'])), 'an invalid nonce is denied');
$GLOBALS['cz_can'] = false;
check(!$controller->requirePlatformAccess(new WP_REST_Request([], $authed)), 'a user without manage_compuzign is denied');
$GLOBALS['cz_can'] = true;

echo "Save over HTTP\n";
$upload = static fn(string $tmp, int $error = UPLOAD_ERR_OK): array => ['tmp_name' => $tmp, 'error' => $error, 'size' => 1];
$base = ['expected_revision' => '0', 'name' => 'Acme', 'code' => 'ac'];
$response = $controller->saveProfile(new WP_REST_Request($base + ['platform_id' => 'CZPSP2A7KZ'], $authed));
check($response->get_status() === 422 && $response->get_data()['code'] === 'identity_immutable', 'client-sent platform_id is refused');
$response = $controller->saveProfile(new WP_REST_Request($base, $authed, ['logo' => $upload('/tmp/php-logo', UPLOAD_ERR_INI_SIZE)]));
check($response->get_status() === 413 && $response->get_data()['fields']['logo'] !== '', 'an over-limit upload maps to 413 on its field');
$response = $controller->saveProfile(new WP_REST_Request($base, $authed, ['logo' => $upload('/tmp/php-logo', UPLOAD_ERR_PARTIAL)]));
check($response->get_status() === 400 && $response->get_data()['code'] === 'image_upload_failed', 'a partial upload is refused');
$response = $controller->saveProfile(new WP_REST_Request($base, $authed, ['logo' => $upload('/tmp/not-uploaded')]));
check($response->get_status() === 400, 'a file that is not a real upload is refused');
check(!isset($GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION]), 'refused Saves stored nothing');

$response = $controller->saveProfile(new WP_REST_Request($base, $authed, [
    'logo'    => $upload('/tmp/php-logo'),
    'favicon' => $upload('/tmp/php-favicon'),
    'unused'  => $upload('', UPLOAD_ERR_NO_FILE),
]));
$profile = $response->get_data()['profile'] ?? [];
check($response->get_status() === 200 && $response->get_data()['success'] === true, 'a valid multipart Save returns 200');
check($profile['revision'] === 1 && $profile['brand']['code'] === 'AC' && $profile['brand']['favicon']['width'] === 32, 'the response is the committed projection');

$stale = $controller->saveProfile(new WP_REST_Request($base, $authed));
check($stale->get_status() === 409 && $stale->get_data()['code'] === 'revision_conflict', 'a stale revision returns 409');

echo "Reads\n";
$settings = $controller->getSettings(new WP_REST_Request([], $authed))->get_data()['settings'];
check($settings['sections']['profile']['platform_id'] === $profile['platform_id'], 'GET settings exposes the linked Profile id');
$byId = $controller->getProfileByPlatformId(new WP_REST_Request(['platform_id' => strtolower($profile['platform_id'])], $authed));
check($byId->get_status() === 200 && $byId->get_data()['profile']['platform_id'] === $profile['platform_id'], 'read-by-id normalises case and returns the Profile');
$missing = $controller->getSettingsByPlatformId(new WP_REST_Request(['platform_id' => 'CZPS22222'], $authed));
check($missing->get_status() === 404 && $missing->get_data()['success'] === false, 'an unknown CZPS id returns 404');
check($controller->getProfile(new WP_REST_Request([], $authed))->get_data()['profile'] == $profile, 'GET profile matches the Save response');

foreach (array_diff(scandir($assetDir) ?: [], ['.', '..']) as $name) { unlink("{$assetDir}/{$name}"); }
@rmdir($assetDir);
echo "Platform Settings controller contract: PASS\n";
