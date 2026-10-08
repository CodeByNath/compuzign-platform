<?php

declare(strict_types=1);

// Calls the REAL AccountController handlers against an in-memory WordPress
// options stub — not a reimplementation of the controller's logic. Follows
// the same minimal-stub pattern as tests/service-lifecycle-mask.php and
// tests/platform-identifier-station.php.

$__wpOptions  = [];
$__attachments = [2101 => true]; // a fake real image attachment id for resolveAttachmentId checks.

if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', string|bool $autoload = 'yes'): bool
    {
        global $__wpOptions;
        if (array_key_exists($key, $__wpOptions)) {
            return false;
        }
        $__wpOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $__wpOptions;
        return $__wpOptions[$key] ?? $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, string|bool|null $autoload = null): bool
    {
        global $__wpOptions;
        $changed = !array_key_exists($key, $__wpOptions) || $__wpOptions[$key] !== $value;
        $__wpOptions[$key] = $value;
        return $changed;
    }
}
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('wp_attachment_is_image')) {
    function wp_attachment_is_image(int $id): bool
    {
        global $__attachments;
        return isset($__attachments[$id]);
    }
}
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response(mixed $value): WP_REST_Response
    {
        return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
    }
}
if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request
    {
        public function __construct(private array $params = []) {}
        public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
        public function has_param(string $key): bool { return array_key_exists($key, $this->params); }
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

use CompuZign\Platform\Modules\Account\Http\AccountController;
use CompuZign\Platform\Modules\Account\Support\AccountIdentity;
use CompuZign\Platform\Modules\Account\Support\AccountRepository;
use CompuZign\Platform\Modules\Account\Support\AccountSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function checkAccount(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "  ok — {$message}\n";
}

// ── fetchDetail is strictly read-only on an unbootstrapped install ─────────
$platformIdentifiers = new PlatformIdentifierStation();
$controller = new AccountController($platformIdentifiers);

$before = $controller->fetchDetail(new WP_REST_Request())->get_data();
checkAccount($before['bootstrapped'] === false, 'an unbootstrapped install reads back bootstrapped=false');
checkAccount($before['nodes']['profile']['platform_id'] === '', 'GET never mints an identity');
checkAccount($__wpOptions === [], 'GET writes nothing to the options table at all');

// ── first Save bootstraps all four nodes, in parent order, in one request ─
$saved = $controller->saveProfile(new WP_REST_Request([
    'name' => 'CompuZign', 'code' => 'cz-1!', 'logo_attachment_id' => 2101, 'favicon_attachment_id' => null,
]))->get_data();
checkAccount($saved['success'] === true, 'first Save succeeds');
checkAccount($saved['draft']['code'] === 'CZ', 'Brand Code sanitizes to uppercase letters only');
checkAccount($saved['draft']['logo_attachment_id'] === 2101, 'a real image attachment id is accepted');
checkAccount($saved['module_status']['brand'] === 'pending', 'Save marks Brand pending, never settled');

$repository = new AccountRepository();
$nodes = $repository->readNodes();
foreach (['account_station' => null, 'settings' => 'account_station', 'tools' => 'settings', 'profile' => 'tools'] as $node => $parentNode) {
    checkAccount(PlatformIdentifierPolicy::validate(
        match ($node) {
            'account_station' => PlatformIdentifierPolicy::ACCOUNT_STATION,
            'settings'        => PlatformIdentifierPolicy::ACCOUNT_SETTINGS,
            'tools'           => PlatformIdentifierPolicy::ACCOUNT_TOOLS,
            'profile'         => PlatformIdentifierPolicy::ACCOUNT_PROFILE,
        },
        $nodes[$node]['platform_id']
    ), "{$node} is bound to a valid identifier of its own type");
    $expectedParent = $parentNode === null ? null : $nodes[$parentNode]['platform_id'];
    checkAccount($nodes[$node]['parent_platform_id'] === $expectedParent, "{$node} names its real parent id");
}

// ── bootstrap is idempotent: a second call mints nothing new ───────────────
$firstProfileId = $nodes['profile']['platform_id'];
(new AccountIdentity($platformIdentifiers, $repository))->bootstrap();
checkAccount($repository->readNodePlatformId('profile') === $firstProfileId, 'a repeated bootstrap resumes without minting a second identity');

// ── settle commits the draft to canonical; Brand always settles (blanks valid) ─
$settled = $controller->settleProfile(new WP_REST_Request())->get_data();
checkAccount($settled['brand']['name'] === 'CompuZign', 'settle promotes the draft to canonical Brand');
checkAccount($settled['module_status']['brand'] === 'settled', 'Brand settles unconditionally — no required field');
checkAccount($repository->readBrandDraft() === null, 'settle clears the draft');

// ── an invalid attachment id fails the whole Save closed, writing nothing ──
$before = $repository->readBrandDraft();
$rejected = $controller->saveProfile(new WP_REST_Request(['logo_attachment_id' => 999999]));
checkAccount($rejected->get_status() === 422, 'a non-existent attachment id is rejected, not silently cleared');
checkAccount($repository->readBrandDraft() === $before, 'a rejected Save leaves the draft completely untouched');

// ── Publish: disabled -> active only ────────────────────────────────────────
$publishRejected = $controller->updateStatus(new WP_REST_Request(['platform_status' => 'active']));
// Fresh install's platform_status is 'disabled' by default, so this should succeed once.
checkAccount($publishRejected->get_status() === 200, 'Publish succeeds from the default disabled state');
checkAccount($repository->readLifecycle()['platform_status'] === 'active', 'Publish activates the Account Profile');

$republish = $controller->updateStatus(new WP_REST_Request(['platform_status' => 'active']));
checkAccount($republish->get_status() === 422, 'Publish is rejected once already active — never re-applied silently');

// ── Disable masks active, preserving module settlement; Enable never re-activates ─
$controller->updateStatus(new WP_REST_Request(['action' => 'disable']));
$disabled = $repository->readLifecycle();
checkAccount($disabled['platform_status'] === 'disabled', 'Disable writes the raw disabled state');
checkAccount($disabled['previous_platform_status'] === 'active', 'Disable captures what the Profile was');
checkAccount($disabled['module_status']['brand'] === 'settled', 'Disable never touches module settlement');

$controller->updateStatus(new WP_REST_Request(['action' => 'enable']));
$enabled = $repository->readLifecycle();
checkAccount($enabled['platform_status'] === 'disabled', 'Enable lands in unmasked disabled (Pending), never straight to active');
checkAccount($enabled['previous_platform_status'] === '', 'Enable clears the mask');

echo "Account Station contract: PASS\n";
