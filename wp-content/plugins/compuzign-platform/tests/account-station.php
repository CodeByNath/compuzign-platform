<?php

declare(strict_types=1);

// Calls the REAL AccountController handlers against an in-memory WordPress
// options stub — not a reimplementation of the controller's logic. Follows
// the same minimal-stub pattern as tests/service-lifecycle-mask.php and
// tests/platform-identifier-station.php.

$__wpOptions  = [];
$__attachments = [2101 => true]; // a fake real image attachment id for resolveAttachmentId checks.
$__capturedRoutes = [];
$__currentUserCanResult = true;
$__lastCapabilityChecked = null;
$__uploadsBase = sys_get_temp_dir() . '/cz-account-uploads-' . getmypid(); // real on-disk uploads root for AccountMedia.
$__uploadsError = false; // set to a string to make wp_upload_dir() report an unusable uploads location.

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
if (!function_exists('wp_get_attachment_url')) {
    function wp_get_attachment_url(int $id): string|false
    {
        global $__attachments;
        return isset($__attachments[$id]) ? "https://cz-test.local/attachment-{$id}.png" : false;
    }
}
if (!function_exists('wp_upload_dir')) {
    function wp_upload_dir(): array
    {
        global $__uploadsBase, $__uploadsError;
        return ['basedir' => $__uploadsBase, 'baseurl' => 'https://cz-test.local/wp-content/uploads', 'error' => $__uploadsError];
    }
}
if (!function_exists('wp_mkdir_p')) {
    function wp_mkdir_p(string $target): bool { return is_dir($target) || @mkdir($target, 0755, true); }
}
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response(mixed $value): WP_REST_Response
    {
        return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
    }
}
if (!function_exists('register_rest_route')) {
    // Records the real registration call instead of registering it, in the
    // same style as tests/service-route-baseline.php's route capture.
    function register_rest_route(string $namespace, string $route, array $args = [], bool $override = false): bool
    {
        global $__capturedRoutes;
        $__capturedRoutes[] = ['namespace' => $namespace, 'route' => $route, 'args' => $args];
        return true;
    }
}
if (!function_exists('current_user_can')) {
    // Controllable both ways via $__currentUserCanResult — unlike every other
    // stub of this function in tests/, which always returns true and so can
    // only prove the allowed case, never the denied one.
    function current_user_can(string $capability): bool
    {
        global $__currentUserCanResult, $__lastCapabilityChecked;
        $__lastCapabilityChecked = $capability;
        return $__currentUserCanResult;
    }
}
if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request
    {
        public function __construct(private array $params = [], private array $files = []) {}
        public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
        public function has_param(string $key): bool { return array_key_exists($key, $this->params); }
        public function get_file_params(): array { return $this->files; }
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

use CompuZign\Platform\Core\PlatformAccess;
use CompuZign\Platform\Modules\Account\Http\AccountController;
use CompuZign\Platform\Modules\Account\Support\AccountIdentity;
use CompuZign\Platform\Modules\Account\Support\AccountMedia;
use CompuZign\Platform\Modules\Account\Support\AccountRepository;
use CompuZign\Platform\Modules\Account\Support\AccountSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierConflict;
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

function accountExpectConflict(callable $operation, string $message): void
{
    try {
        $operation();
    } catch (PlatformIdentifierConflict) {
        echo "  ok — {$message}\n";
        return;
    }
    fwrite(STDERR, "FAIL: {$message}\n");
    exit(1);
}

// ── an interrupted bootstrap resumes from whichever node is already bound ──
// (isolated probe — resets $__wpOptions afterward; shares no state with the
// main narrative below.)
$probeIdentifiers = new PlatformIdentifierStation();
$probeRepository  = new AccountRepository();
$probeIdentity    = new AccountIdentity($probeIdentifiers, $probeRepository);

$accountBinding = $probeIdentifiers->ensure(
    PlatformIdentifierPolicy::ACCOUNT_STATION,
    AccountIdentity::NATIVE_ACCOUNT_STATION,
    fn () => $probeRepository->readNodePlatformId('account_station'),
    fn ($ref, $id) => $probeRepository->writeNode('account_station', $id, null)
);
$settingsBinding = $probeIdentifiers->ensure(
    PlatformIdentifierPolicy::ACCOUNT_SETTINGS,
    AccountIdentity::NATIVE_SETTINGS,
    fn () => $probeRepository->readNodePlatformId('settings'),
    fn ($ref, $id) => $probeRepository->writeNode('settings', $id, $accountBinding->platformId())
);

$resumed = $probeIdentity->bootstrap();
checkAccount($resumed['account_station'] === $accountBinding->platformId(), 'an interrupted bootstrap reuses the already-bound Account Station id on resume');
checkAccount($resumed['settings'] === $settingsBinding->platformId(), 'an interrupted bootstrap reuses the already-bound Settings id on resume');
checkAccount(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::ACCOUNT_TOOLS, $resumed['tools']), 'the resumed bootstrap completes the still-missing Tools node');
checkAccount(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::ACCOUNT_PROFILE, $resumed['profile']), 'the resumed bootstrap completes the still-missing Profile node');

$__wpOptions = [];

// ── a stored node whose parent no longer matches the real chain fails closed ─
$conflictIdentifiers = new PlatformIdentifierStation();
$conflictRepository  = new AccountRepository();
$conflictIdentity    = new AccountIdentity($conflictIdentifiers, $conflictRepository);
$conflictIdentity->bootstrap();

// Simulate a corrupted aggregate: Settings now claims a parent that isn't the
// real bound Account Station id.
$conflictRepository->writeNode('settings', $conflictRepository->readNodePlatformId('settings'), 'CZA00000');
accountExpectConflict(
    fn () => $conflictIdentity->bootstrap(),
    'a node naming a parent that disagrees with the real chain is rejected, never silently trusted'
);

$__wpOptions = [];

// ── two concurrent first-Saves: the loser fails closed, never double-binds ──
$raceIdentifiers = new PlatformIdentifierStation();
$repoA = new AccountRepository();
$repoB = new AccountRepository(); // same underlying option store — simulates a second concurrent request.

$reservationA = $raceIdentifiers->reserve(PlatformIdentifierPolicy::ACCOUNT_STATION);
$reservationB = $raceIdentifiers->reserve(PlatformIdentifierPolicy::ACCOUNT_STATION);
checkAccount($reservationA->platformId() !== $reservationB->platformId(), 'two concurrent reservations for the same node never collide on one candidate');

$raceIdentifiers->assign(
    $reservationA,
    AccountIdentity::NATIVE_ACCOUNT_STATION,
    fn () => $repoA->readNodePlatformId('account_station'),
    fn ($ref, $id) => $repoA->writeNode('account_station', $id, null)
);
accountExpectConflict(
    fn () => $raceIdentifiers->assign(
        $reservationB,
        AccountIdentity::NATIVE_ACCOUNT_STATION,
        fn () => $repoB->readNodePlatformId('account_station'),
        fn ($ref, $id) => $repoB->writeNode('account_station', $id, null)
    ),
    'the losing concurrent first-Save fails closed and never overwrites the winning bind'
);
checkAccount($repoA->readNodePlatformId('account_station') === $reservationA->platformId(), "the winner's bind is the one that survives, untouched by the loser's failed attempt");

$__wpOptions = [];

// ── isBootstrapped requires ALL four chain nodes, never the Profile leaf alone ─
$partialRepository = new AccountRepository();
$partialRepository->writeNode('profile', 'CZASTP22222', 'CZAST22222');
checkAccount($partialRepository->isBootstrapped() === false, 'a Profile id alone, with the other three nodes still empty, is NOT treated as bootstrapped');
$partialRepository->writeNode('account_station', 'CZA22222', null);
$partialRepository->writeNode('settings', 'CZAS22222', 'CZA22222');
$partialRepository->writeNode('tools', 'CZAST22222', 'CZAS22222');
checkAccount($partialRepository->isBootstrapped() === true, 'isBootstrapped is true only once all four chain nodes are bound, not just Profile');

$__wpOptions = [];

// ── settle on a half-bootstrapped install is rejected and preserves all state ─
$halfRepository = new AccountRepository();
$halfRepository->writeNode('profile', 'CZASTP33333', 'CZAST33333');
$halfRepository->writeBrandDraft(['name' => 'Stranded Draft', 'code' => '', 'logo_attachment_id' => null, 'favicon_attachment_id' => null]);
$halfSnapshot = $__wpOptions;
$halfSettle = (new AccountController(new PlatformIdentifierStation()))->settleProfile(new WP_REST_Request());
checkAccount($halfSettle->get_status() === 422, 'settle against a half-bootstrapped Account Station is rejected, not promoted to canonical');
checkAccount($__wpOptions === $halfSnapshot, 'the rejected half-bootstrapped settle leaves the draft, canonical Brand and lifecycle exactly as they were');

$__wpOptions = [];

// ── fetchDetail is strictly read-only on an unbootstrapped install ─────────
$platformIdentifiers = new PlatformIdentifierStation();
$controller = new AccountController($platformIdentifiers);

$before = $controller->fetchDetail(new WP_REST_Request())->get_data();
checkAccount($before['bootstrapped'] === false, 'an unbootstrapped install reads back bootstrapped=false');
checkAccount($before['nodes']['profile']['platform_id'] === '', 'GET never mints an identity');
checkAccount($__wpOptions === [], 'GET writes nothing to the options table at all');

// ── Publish is rejected outright against a never-bootstrapped install ──────
$neverBootstrappedPublish = $controller->updateStatus(new WP_REST_Request(['platform_status' => 'active']));
checkAccount($neverBootstrappedPublish->get_status() === 422, 'Publish against a never-bootstrapped Account Station is rejected, not silently activated');
checkAccount($__wpOptions === [], 'the rejected pre-bootstrap Publish attempt writes nothing');

// ── Disable/Enable are rejected outright against a never-bootstrapped install ─
// (the actual defect this round corrects: these two actions used to run the
// mask write before any existence check at all, unlike Publish.)
$neverBootstrappedDisable = $controller->updateStatus(new WP_REST_Request(['action' => 'disable']));
checkAccount($neverBootstrappedDisable->get_status() === 422, 'Disable against a never-bootstrapped Account Station is rejected, not silently masked');
checkAccount($__wpOptions === [], 'the rejected pre-bootstrap Disable attempt writes nothing');

$neverBootstrappedEnable = $controller->updateStatus(new WP_REST_Request(['action' => 'enable']));
checkAccount($neverBootstrappedEnable->get_status() === 422, 'Enable against a never-bootstrapped Account Station is rejected, not silently masked');
checkAccount($__wpOptions === [], 'the rejected pre-bootstrap Enable attempt writes nothing');

// ── settle is rejected outright against a never-bootstrapped install ───────
$neverBootstrappedSettle = $controller->settleProfile(new WP_REST_Request());
checkAccount($neverBootstrappedSettle->get_status() === 422, 'settle against a never-bootstrapped Account Station is rejected, not silently settled');
checkAccount($__wpOptions === [], 'the rejected pre-bootstrap settle attempt writes nothing');

// ── first Save bootstraps all four nodes, in parent order, in one request ─
$saved = $controller->saveProfile(new WP_REST_Request([
    'name' => 'CompuZign', 'code' => 'cz-1!', 'logo_attachment_id' => 2101, 'favicon_attachment_id' => null,
]))->get_data();
checkAccount($saved['success'] === true, 'first Save succeeds');
checkAccount($saved['draft']['code'] === 'CZ', 'Brand Code sanitizes to uppercase letters only');
checkAccount($saved['draft']['logo_attachment_id'] === 2101, 'a real image attachment id is accepted');
checkAccount($saved['draft']['logo_url'] === 'https://cz-test.local/attachment-2101.png', 'the Save response resolves logo_url alongside the authoritative id, for the picker to preview without a second GET');
checkAccount($saved['draft']['favicon_url'] === null, 'an unset Favicon resolves to a null favicon_url, never a broken URL');
checkAccount($saved['module_status']['brand'] === 'pending', 'Save marks Brand pending, never settled');

$repository = new AccountRepository();
$nodes = $repository->readNodes();
checkAccount($saved['nodes'] === $nodes, 'first Save returns the just-bound nodes authoritatively, in the exact same shape fetchDetail() uses — no second GET required for the frontend to display them');
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
checkAccount($settled['brand']['logo_url'] === 'https://cz-test.local/attachment-2101.png', 'settle also resolves logo_url on the now-canonical Brand it returns');
checkAccount($settled['module_status']['brand'] === 'settled', 'Brand settles unconditionally — no required field');
checkAccount($repository->readBrandDraft() === null, 'settle clears the draft');

// ── a pending draft never leaks into the canonical read a live projection uses ─
$liveBefore = $controller->fetchDetail(new WP_REST_Request())->get_data();
checkAccount($liveBefore['brand']['logo_url'] === 'https://cz-test.local/attachment-2101.png', 'fetchDetail resolves logo_url on canonical Brand, independently of the settle/saveProfile code paths above');
$controller->saveProfile(new WP_REST_Request(['name' => 'Unpublished Rename']));
$liveDuring = $controller->fetchDetail(new WP_REST_Request())->get_data();
checkAccount($liveDuring['brand']['name'] === $liveBefore['brand']['name'], 'a new pending draft never changes the canonical Brand a live projection would read');
checkAccount($liveDuring['drafts']['brand']['name'] === 'Unpublished Rename', 'the pending draft is visible only under drafts, never canonical');
// saveProfile() replaces the whole draft every call — omitting logo_attachment_id
// here is itself a Clear (AccountSchema::resolveAttachmentId(null) === null),
// exactly like Defect 2's own fix; it is not carried over from the prior Save.
checkAccount($liveDuring['drafts']['brand']['logo_url'] === null, 'fetchDetail resolves a null logo_url on a draft whose Save omitted logo_attachment_id — an explicit Clear, not a stale carry-over');
$controller->settleProfile(new WP_REST_Request());
checkAccount($repository->readBrand()['name'] === 'Unpublished Rename', 'settle remains the only path that promotes a draft to canonical');

// ── an invalid attachment id fails the whole Save closed, writing nothing ──
$before = $repository->readBrandDraft();
$rejected = $controller->saveProfile(new WP_REST_Request(['logo_attachment_id' => 999999]));
checkAccount($rejected->get_status() === 422, 'a non-existent attachment id is rejected, not silently cleared');
checkAccount($repository->readBrandDraft() === $before, 'a rejected Save leaves the draft completely untouched');

// ── a negative attachment id is rejected, never read as a Clear ────────────
$controller->saveProfile(new WP_REST_Request(['name' => 'Kept Draft', 'logo_attachment_id' => 2101]));
$before = $repository->readBrandDraft();
$negativeLogo = $controller->saveProfile(new WP_REST_Request(['name' => 'Kept Draft', 'logo_attachment_id' => -2101]));
checkAccount($negativeLogo->get_status() === 422, 'a negative Logo attachment id is rejected, not silently cleared');
checkAccount($repository->readBrandDraft() === $before, 'a rejected negative-Logo Save leaves the existing draft unchanged');
$negativeFavicon = $controller->saveProfile(new WP_REST_Request(['name' => 'Kept Draft', 'favicon_attachment_id' => '-1']));
checkAccount($negativeFavicon->get_status() === 422, 'a negative Favicon attachment id is rejected, not silently cleared');
checkAccount($repository->readBrandDraft() === $before, 'a rejected negative-Favicon Save leaves the existing draft unchanged');

// ── 0 and null remain deliberate Clears ────────────────────────────────────
$clearedZero = $controller->saveProfile(new WP_REST_Request(['logo_attachment_id' => 0]))->get_data();
checkAccount($clearedZero['success'] === true && $clearedZero['draft']['logo_attachment_id'] === null, 'an attachment id of 0 is still a deliberate Clear');
$clearedNull = $controller->saveProfile(new WP_REST_Request(['logo_attachment_id' => null]))->get_data();
checkAccount($clearedNull['success'] === true && $clearedNull['draft']['logo_attachment_id'] === null, 'a null attachment id is still a deliberate Clear');
$controller->settleProfile(new WP_REST_Request());

// ── Publish: disabled -> active only ────────────────────────────────────────
$publishRejected = $controller->updateStatus(new WP_REST_Request(['platform_status' => 'active']));
// The install is now bootstrapped and still disabled, so this should succeed once.
checkAccount($publishRejected->get_status() === 200, 'Publish succeeds from the default disabled state once bootstrapped');
checkAccount($repository->readLifecycle()['platform_status'] === 'active', 'Publish activates the Account Profile');

$republish = $controller->updateStatus(new WP_REST_Request(['platform_status' => 'active']));
checkAccount($republish->get_status() === 422, 'Publish is rejected once already active — never re-applied silently');

// ── Disable masks active, preserving module settlement; Enable never re-activates ─
$controller->updateStatus(new WP_REST_Request(['action' => 'disable']));
$disabled = $repository->readLifecycle();
checkAccount($disabled['platform_status'] === 'disabled', 'Disable writes the raw disabled state');
checkAccount($disabled['previous_platform_status'] === 'active', 'Disable captures what the Profile was');
checkAccount($disabled['module_status']['brand'] === 'settled', 'Disable never touches module settlement');

$canonicalBeforeMaskedDraft = $repository->readBrand();
$controller->saveProfile(new WP_REST_Request(['name' => 'Drafted While Disabled']));
checkAccount($repository->readBrand() === $canonicalBeforeMaskedDraft, 'a draft saved while Disabled still never changes canonical Brand');
checkAccount($repository->readLifecycle()['platform_status'] === 'disabled', 'saving a draft while Disabled never lifts the mask');
$controller->settleProfile(new WP_REST_Request());

$controller->updateStatus(new WP_REST_Request(['action' => 'enable']));
$enabled = $repository->readLifecycle();
checkAccount($enabled['platform_status'] === 'disabled', 'Enable lands in unmasked disabled (Pending), never straight to active');
checkAccount($enabled['previous_platform_status'] === '', 'Enable clears the mask');

// ── registerRoutes(): canonical path/method/callback/permission contract ──
// Proves the real registration call, not a reimplementation of it — same
// register_rest_route() capture technique as tests/service-route-baseline.php.
function accountFindRoute(array $captured, string $route): array
{
    foreach ($captured as $entry) {
        if ($entry['route'] === $route) {
            return $entry;
        }
    }
    fwrite(STDERR, "FAIL: no captured route for {$route}\n");
    exit(1);
}

function accountCallbackName(mixed $callback): string
{
    return is_array($callback) && count($callback) === 2 ? (string) $callback[1] : '<unknown>';
}

$__capturedRoutes = [];
(new AccountController(new PlatformIdentifierStation()))->registerRoutes();
checkAccount(count($__capturedRoutes) === 6, 'registerRoutes() registers exactly the six Account Station routes');

foreach ($__capturedRoutes as $entry) {
    checkAccount($entry['namespace'] === 'compuzign/v1', "{$entry['route']} registers under the compuzign/v1 namespace");
    checkAccount(accountCallbackName($entry['args']['permission_callback'] ?? null) === 'requireAdmin', "{$entry['route']} gates on requireAdmin(), never an open or ad-hoc permission callback");
}

$detailRoute = accountFindRoute($__capturedRoutes, '/admin/account-station');
checkAccount($detailRoute['args']['methods'] === 'GET', 'the detail route is GET-only');
checkAccount(accountCallbackName($detailRoute['args']['callback']) === 'fetchDetail', 'the detail route calls fetchDetail');
checkAccount(empty($detailRoute['args']['args']), 'the detail route defines no request args — it is strictly read-only');

$profileRoute = accountFindRoute($__capturedRoutes, '/admin/account-station/profile');
checkAccount($profileRoute['args']['methods'] === 'POST', 'the profile route is POST-only');
checkAccount(accountCallbackName($profileRoute['args']['callback']) === 'saveProfile', 'the profile route calls saveProfile');
checkAccount(array_keys($profileRoute['args']['args']) === array_keys(AccountSchema::brandArgs()), 'the profile route wires exactly AccountSchema::brandArgs()');

$settleRoute = accountFindRoute($__capturedRoutes, '/admin/account-station/profile/settle');
checkAccount($settleRoute['args']['methods'] === 'POST', 'the settle route is POST-only');
checkAccount(accountCallbackName($settleRoute['args']['callback']) === 'settleProfile', 'the settle route calls settleProfile');
checkAccount(empty($settleRoute['args']['args']), 'the settle route takes no body args — bootstrap state alone decides the outcome');

$mediaRoute = accountFindRoute($__capturedRoutes, '/admin/account-station/profile/media');
checkAccount($mediaRoute['args']['methods'] === 'POST', 'the media upload route is POST-only');
checkAccount(accountCallbackName($mediaRoute['args']['callback']) === 'uploadBrandMedia', 'the media upload route calls uploadBrandMedia');

$libraryRoute = accountFindRoute($__capturedRoutes, '/admin/account-station/profile/media/library');
checkAccount($libraryRoute['args']['methods'] === 'GET', 'the media library route is GET-only');
checkAccount(accountCallbackName($libraryRoute['args']['callback']) === 'listBrandMedia', 'the media library route calls listBrandMedia');

$statusRoute = accountFindRoute($__capturedRoutes, '/admin/account-station/status');
checkAccount($statusRoute['args']['methods'] === 'POST', 'the status route is POST-only');
checkAccount(accountCallbackName($statusRoute['args']['callback']) === 'updateStatus', 'the status route calls updateStatus');
checkAccount(array_keys($statusRoute['args']['args']) === array_keys(AccountSchema::statusArgs()), 'the status route wires exactly AccountSchema::statusArgs()');

// ── requireAdmin(): defers to current_user_can(PlatformAccess::CAP), both ways ─
// Every other current_user_can() stub in tests/ always returns true, so it can
// only prove the allowed case. $__currentUserCanResult is controllable, so this
// proves the denied case too, and that the exact CAP constant is what gets
// checked (not a hardcoded capability string that would silently drift from it).
$permissionController = new AccountController(new PlatformIdentifierStation());

$__currentUserCanResult = true;
checkAccount($permissionController->requireAdmin() === true, 'requireAdmin() allows a user who holds the platform capability');
checkAccount($__lastCapabilityChecked === PlatformAccess::CAP, 'requireAdmin() checks the real PlatformAccess::CAP constant, not a hardcoded string');

$__currentUserCanResult = false;
checkAccount($permissionController->requireAdmin() === false, 'requireAdmin() denies a user who lacks the platform capability');

// ── uploadBrandMedia()/listBrandMedia(): Account's own Logo/Favicon image storage ─
// Files land in <uploads>/compuzign-account/ and are registered in the one
// Account option — never a WordPress attachment. Neither route touches Brand's
// draft/canonical state: the returned id is only persisted by an ordinary Save.
$mediaController = new AccountController(new PlatformIdentifierStation());
$mediaDir        = $__uploadsBase . '/' . AccountMedia::DIRECTORY;

const ACCOUNT_PNG  = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const ACCOUNT_GIF  = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const ACCOUNT_WEBP = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

/** A real file on disk in $_FILES' shape. $bytes defaults to a valid PNG; name/claimed type are independent of the bytes. */
function accountFakeFile(?string $bytes = null, string $name = 'logo.png', int $error = UPLOAD_ERR_OK, ?int $size = null, string $type = 'image/png'): array
{
    $bytes ??= base64_decode(ACCOUNT_PNG);
    $tmp     = tempnam(sys_get_temp_dir(), 'czacct');
    file_put_contents($tmp, $bytes);

    return ['name' => $name, 'type' => $type, 'tmp_name' => $tmp, 'error' => $error, 'size' => $size ?? strlen($bytes)];
}

function accountUpload(AccountController $controller, array $file): WP_REST_Response
{
    return $controller->uploadBrandMedia(new WP_REST_Request([], ['file' => $file]));
}

$noFile = $mediaController->uploadBrandMedia(new WP_REST_Request());
checkAccount($noFile->get_status() === 422, 'a request with no file is rejected');

$uploadError = accountUpload($mediaController, accountFakeFile(error: UPLOAD_ERR_PARTIAL));
checkAccount($uploadError->get_status() === 422, 'a PHP-level upload error (e.g. a partial transfer) is rejected, not treated as an empty file');

// The size gate reads the real file, not the client-supplied $_FILES size.
$oversizedBytes = base64_decode(ACCOUNT_PNG) . str_repeat("\0", AccountSchema::MAX_BRAND_MEDIA_BYTES);
$oversized      = accountUpload($mediaController, accountFakeFile($oversizedBytes));
checkAccount($oversized->get_status() === 422, 'a file over the 5 MB limit is rejected');
$lyingSize = accountUpload($mediaController, accountFakeFile($oversizedBytes, size: 10));
checkAccount($lyingSize->get_status() === 422, 'the size limit is checked against the real file, not a client-supplied size');

$pdf = accountUpload($mediaController, accountFakeFile("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n", 'logo.pdf', type: 'application/pdf'));
checkAccount($pdf->get_status() === 422, 'a non-image file is rejected');
$disguised = accountUpload($mediaController, accountFakeFile("<?php echo 'x';", 'logo.png', type: 'image/png'));
checkAccount($disguised->get_status() === 422, 'a script claiming a .png name and image MIME is rejected — the type comes from the bytes, not the name');
$svg = accountUpload($mediaController, accountFakeFile('<svg xmlns="http://www.w3.org/2000/svg"/>', 'logo.svg', type: 'image/svg+xml'));
checkAccount($svg->get_status() === 422, 'SVG is not an allowed Logo/Favicon type');
checkAccount(!is_dir($mediaDir) || array_diff(scandir($mediaDir), ['.', '..', 'index.php']) === [], 'no rejected upload left a file in the Account media directory');
checkAccount(count($mediaController->listBrandMedia(new WP_REST_Request())->get_data()['items']) === 0, 'no rejected upload was registered');

$uploaded = accountUpload($mediaController, accountFakeFile(name: '../../evil.php.png'))->get_data();
checkAccount($uploaded['success'] === true, 'a valid image upload succeeds');
$item = $uploaded['item'];
checkAccount(preg_match('/^[a-f0-9]{64}$/', $item['id']) === 1 && $item['id'] === hash('sha256', base64_decode(ACCOUNT_PNG)), 'the id is the content hash — a storage key, not a client-supplied name');
checkAccount($item['url'] === "https://cz-test.local/wp-content/uploads/compuzign-account/{$item['id']}.png", 'the URL is in the Account-owned directory, with an extension derived from the sniffed type');
checkAccount(is_file("{$mediaDir}/{$item['id']}.png"), 'the raw file is on disk in the Account-owned directory');
checkAccount($item['name'] === 'evil.php.png', 'the stored display name is the sanitized basename — path parts from the client are dropped');
checkAccount(array_diff(scandir($mediaDir), ['.', '..', 'index.php', "{$item['id']}.png"]) === [], 'nothing but the hash-named file (and the listing guard) exists — a client path can never escape or add files');
checkAccount(!function_exists('media_handle_upload') && !function_exists('wp_insert_attachment'), 'no WordPress attachment pipeline is even defined in this harness, so the upload cannot have gone through it');
checkAccount(strlen(serialize($__wpOptions[AccountRepository::OPTION_KEY])) < 2000, 'the option holds references and metadata only — no image binary');

$again = accountUpload($mediaController, accountFakeFile(name: 'renamed.png'))->get_data()['item'];
checkAccount($again['id'] === $item['id'] && $again['uploaded_at'] === $item['uploaded_at'], 'identical bytes resolve to the same record — no duplicate on re-upload');
checkAccount(count($mediaController->listBrandMedia(new WP_REST_Request())->get_data()['items']) === 1, 'a re-upload does not add a second library entry');

$gif  = accountUpload($mediaController, accountFakeFile(base64_decode(ACCOUNT_GIF), 'favicon.gif', type: 'application/octet-stream'))->get_data();
$webp = accountUpload($mediaController, accountFakeFile(base64_decode(ACCOUNT_WEBP), 'x.webp'))->get_data();
checkAccount($gif['success'] === true && str_ends_with($gif['item']['url'], '.gif'), 'a GIF is accepted even when the client claims a generic MIME — the bytes decide');
checkAccount($webp['success'] === true && str_ends_with($webp['item']['url'], '.webp'), 'a WebP is accepted');

$library = $mediaController->listBrandMedia(new WP_REST_Request())->get_data();
checkAccount($library['success'] === true && count($library['items']) === 3, 'the library lists every stored image, for prior-image selection');

$__uploadsError = 'Unable to create directory';
$unwritable = accountUpload($mediaController, accountFakeFile("\x89PNG\r\n\x1a\n" . base64_decode(ACCOUNT_PNG) . 'x'));
checkAccount($unwritable->get_status() === 500, 'an unusable uploads location is a clean 500, not a fatal');
$__uploadsError = false;

// ── Save composes with the upload: a media reference persists only via Save ─
$mediaSave = $mediaController->saveProfile(new WP_REST_Request(['logo_media_id' => $item['id'], 'logo_attachment_id' => 2101]))->get_data();
checkAccount($mediaSave['success'] === true && $mediaSave['draft']['logo_media_id'] === $item['id'], 'an Account image id is accepted by the ordinary Save route');
checkAccount($mediaSave['draft']['logo_attachment_id'] === null, 'choosing an Account image drops the legacy WordPress attachment reference from the draft — it is the explicit replacement');
checkAccount($mediaSave['draft']['logo_url'] === $item['url'], 'the Save response resolves the Account image URL for preview');

$legacyKept = $mediaController->saveProfile(new WP_REST_Request(['logo_attachment_id' => 2101]))->get_data();
checkAccount($legacyKept['draft']['logo_attachment_id'] === 2101 && $legacyKept['draft']['logo_media_id'] === null, 'a legacy WordPress attachment reference is still re-saveable with no Account image chosen — no silent migration or deletion');
checkAccount($legacyKept['draft']['logo_url'] === 'https://cz-test.local/attachment-2101.png', 'a legacy reference still resolves for preview');

foreach (['', 'abc', str_repeat('g', 64), '../' . str_repeat('a', 61), str_repeat('a', 64)] as $badId) {
    $bad = $mediaController->saveProfile(new WP_REST_Request(['favicon_media_id' => $badId]));
    $expected = $badId === '' ? 200 : 422;
    checkAccount($bad->get_status() === $expected, "favicon_media_id " . json_encode($badId) . ($expected === 200 ? ' is a Clear' : ' fails the whole Save closed'));
}
$clearedMedia = $mediaController->saveProfile(new WP_REST_Request(['logo_media_id' => null, 'logo_attachment_id' => null]))->get_data();
checkAccount($clearedMedia['draft']['logo_media_id'] === null && $clearedMedia['draft']['logo_url'] === null, 'null media + null attachment is a full Clear; the stored file is kept for reuse');
checkAccount(is_file("{$mediaDir}/{$item['id']}.png"), 'Clear never deletes the stored file');

// Publish the Account image: settle promotes the media reference to canonical.
$mediaController->saveProfile(new WP_REST_Request(['logo_media_id' => $item['id']]));
$settledMedia = $mediaController->settleProfile(new WP_REST_Request())->get_data();
checkAccount($settledMedia['brand']['logo_media_id'] === $item['id'] && $settledMedia['brand']['logo_url'] === $item['url'], 'settle promotes the Account image reference to canonical Brand');
$detailAfter = $mediaController->fetchDetail(new WP_REST_Request())->get_data();
checkAccount($detailAfter['brand']['logo_url'] === $item['url'], 'fetchDetail resolves the canonical Account image URL');

// A canonical Brand stored before the media fields existed still reads back whole.
$__wpOptions[AccountRepository::OPTION_KEY]['brand'] = ['name' => 'Old', 'code' => '', 'logo_attachment_id' => 2101, 'favicon_attachment_id' => null];
unset($__wpOptions[AccountRepository::OPTION_KEY]['media']);
$oldShape = $mediaController->fetchDetail(new WP_REST_Request())->get_data();
checkAccount($oldShape['brand']['logo_media_id'] === null && $oldShape['brand']['logo_url'] === 'https://cz-test.local/attachment-2101.png', 'a Brand saved before Account owned media reads back with null media ids and its legacy URL');
checkAccount($mediaController->listBrandMedia(new WP_REST_Request())->get_data()['items'] === [], 'an option with no media key lists an empty library');

// Cleanup of this run's on-disk uploads.
foreach (glob("{$mediaDir}/*") ?: [] as $leftover) { @unlink($leftover); }
@rmdir($mediaDir);
@rmdir($__uploadsBase);

echo "Account Station contract: PASS\n";
