<?php

declare(strict_types=1);

// Platform Settings / Profile backend contract (Global Profile Phase 1B).
//
// Standalone: only the WordPress option API, the $wpdb compare-and-swap used
// by the save lock, and a temporary asset directory are stubbed. The real
// PlatformIdentifierStation mints and binds CZPS/CZPSP. Failure injection
// simulates a process dying at each identity/commit step, then proves the
// next Save recovers without a duplicate identity or a partial commit.

$GLOBALS['cz_options'] = [];
$GLOBALS['cz_fail']    = null; // callable(string $op, string $key, mixed $value): void

final class SimulatedCrash extends RuntimeException {}

function add_option(string $key, mixed $value, string $deprecated = '', string|bool $autoload = 'yes'): bool
{
    if (is_callable($GLOBALS['cz_fail'])) { ($GLOBALS['cz_fail'])('add', $key, $value); }
    if (array_key_exists($key, $GLOBALS['cz_options'])) {
        return false;
    }
    $GLOBALS['cz_options'][$key] = $value;
    return true;
}

function get_option(string $key, mixed $default = false): mixed
{
    return $GLOBALS['cz_options'][$key] ?? $default;
}

function update_option(string $key, mixed $value, string|bool|null $autoload = null): bool
{
    if (is_callable($GLOBALS['cz_fail'])) { ($GLOBALS['cz_fail'])('update', $key, $value); }
    if (!empty($GLOBALS['cz_corrupt'][$key])) {
        $value = ['storage' => 'persisted something else'];
    }
    $changed = ($GLOBALS['cz_options'][$key] ?? null) !== $value;
    $GLOBALS['cz_options'][$key] = $value;
    return $changed;
}

function maybe_serialize(mixed $value): mixed { return is_array($value) || is_object($value) ? serialize($value) : $value; }
function maybe_unserialize(mixed $value): mixed { return is_string($value) && preg_match('/^[aOs]:/', $value) ? unserialize($value) : $value; }

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

    public function get_var(string $sql): ?string
    {
        if (preg_match("/SELECT option_value FROM .* WHERE option_name = '(.*)'/s", $sql, $m)) {
            $value = $GLOBALS['cz_options'][stripslashes($m[1])] ?? null;
            return $value === null ? null : maybe_serialize($value);
        }
        return null;
    }

    public function query(string $sql): int|false
    {
        // Profile commit: lock-row join + exact-bytes compare-and-swap.
        if (preg_match("/INNER JOIN .* ON save_lock.option_name = '(.*)' AND BINARY save_lock.option_value = '(.*)' SET profile.option_value = '(.*)' WHERE profile.option_name = '(.*)' AND BINARY profile.option_value = '(.*)'/s", $sql, $m)) {
            [$lockKey, $lock, $new, $key, $old] = array_map('stripslashes', array_slice($m, 1));
            if (is_callable($GLOBALS['cz_before_commit'] ?? null)) { ($GLOBALS['cz_before_commit'])(); }
            if (($GLOBALS['cz_options'][$lockKey] ?? null) !== $lock
                || !array_key_exists($key, $GLOBALS['cz_options'])
                || maybe_serialize($GLOBALS['cz_options'][$key]) !== $old
            ) {
                return 0;
            }
            if (!empty($GLOBALS['cz_db_error'])) { return false; }
            if (is_callable($GLOBALS['cz_fail'] ?? null)) { ($GLOBALS['cz_fail'])('update', $key, maybe_unserialize($new)); }
            $GLOBALS['cz_options'][$key] = maybe_unserialize($new);
            return 1;
        }
        if (preg_match("/UPDATE .* SET option_value = '(.*)' WHERE option_name = '(.*)' AND option_value = '(.*)'/s", $sql, $m)) {
            [$new, $key, $old] = [stripslashes($m[1]), stripslashes($m[2]), stripslashes($m[3])];
            if (($GLOBALS['cz_options'][$key] ?? null) === $old) {
                $GLOBALS['cz_options'][$key] = $new;
                return 1;
            }
            return 0;
        }
        if (preg_match("/DELETE FROM .* WHERE option_name = '(.*)' AND option_value = '(.*)'/s", $sql, $m)) {
            [$key, $value] = [stripslashes($m[1]), stripslashes($m[2])];
            if (($GLOBALS['cz_options'][$key] ?? null) === $value) {
                unset($GLOBALS['cz_options'][$key]);
                return 1;
            }
            return 0;
        }
        return false;
    }
}
$GLOBALS['wpdb'] = new FakeWpdb();

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;
use CompuZign\Platform\PlatformSettings\BrandImageProcessor;
use CompuZign\Platform\PlatformSettings\PlatformSettingsFailure;
use CompuZign\Platform\PlatformSettings\PlatformSettingsNativeReference;
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

function expectFailure(callable $operation, string $code, int $status, string $message): PlatformSettingsFailure
{
    try {
        $operation();
    } catch (PlatformSettingsFailure $failure) {
        check($failure->errorCode() === $code && $failure->status() === $status,
            "{$message} ({$failure->errorCode()} {$failure->status()})");
        return $failure;
    }
    fwrite(STDERR, "FAIL: {$message} — no failure raised\n");
    exit(1);
}

function png(int $width, int $height): string
{
    $image = imagecreatetruecolor($width, $height);
    imagefill($image, 0, 0, imagecolorallocate($image, 92, 110, 245));
    ob_start();
    imagepng($image);
    return (string) ob_get_clean();
}

function bmp(int $width, int $height): string
{
    $image = imagecreatetruecolor($width, $height);
    ob_start();
    imagebmp($image);
    return (string) ob_get_clean();
}

function registryKeys(string $prefix): array
{
    return array_values(array_filter(array_keys($GLOBALS['cz_options']), static fn(string $k): bool => str_starts_with($k, $prefix)));
}

$assetDir = sys_get_temp_dir() . '/cz-brand-' . bin2hex(random_bytes(4));
$now = time();
$GLOBALS['cz_clock'] = $now;

function station(?BrandImageProcessor $images = null): PlatformSettingsStation
{
    global $assetDir;
    return new PlatformSettingsStation(
        new PlatformIdentifierStation(),
        new PlatformSettingsRepository(),
        new UploadsBrandAssetStore($assetDir, 'https://example.test/wp-content/uploads/compuzign/brand'),
        $images ?? new BrandImageProcessor(),
        static fn(): int => $GLOBALS['cz_clock']
    );
}

function profileOption(): ?array
{
    return $GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION] ?? null;
}

$fields = static fn(int $revision, array $extra = []): array => $extra + ['expected_revision' => (string) $revision, 'name' => 'Acme Cloud', 'code' => 'acme'];

echo "Reads before any Save\n";
$station = station();
$settings = $station->settings();
$profile = $station->profile();
check($settings['platform_id'] === null && $settings['sections']['profile']['platform_id'] === null, 'Settings reads null identity before the first Save');
check($profile['platform_id'] === null && $profile['revision'] === 0 && $profile['brand']['logo'] === null, 'Profile reads empty defaults');
check(registryKeys('cz_platform_identifier_') === [] && profileOption() === null, 'reads mint nothing and write nothing');

echo "Field validation (nothing written)\n";
expectFailure(fn() => $station->saveProfile(['name' => '', 'code' => ''], [], 1), 'invalid_profile', 400, 'missing expected_revision is rejected');
expectFailure(fn() => $station->saveProfile($fields(0, ['name' => str_repeat('n', 61)]), [], 1), 'invalid_profile', 400, 'a 61-character name is rejected');
expectFailure(fn() => $station->saveProfile($fields(0, ['code' => 'AB1']), [], 1), 'invalid_profile', 400, 'a code with a digit is rejected');
expectFailure(fn() => $station->saveProfile($fields(0, ['code' => 'ABCDEFG']), [], 1), 'invalid_profile', 400, 'a 7-letter code is rejected');
expectFailure(fn() => $station->saveProfile($fields(0, ['platform_id' => 'CZPSP2A7KZ']), [], 1), 'identity_immutable', 422, 'a client Platform ID is rejected');
expectFailure(fn() => $station->saveProfile($fields(0), ['favicon' => png(32, 16)], 1), 'favicon_not_square', 422, 'a non-square favicon is rejected on Save');
expectFailure(fn() => $station->saveProfile($fields(0), ['logo' => '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'], 1), 'image_svg_unsupported', 415, 'raw SVG is refused');
expectFailure(fn() => $station->saveProfile($fields(0), ['logo' => 'not an image at all'], 1), 'image_unsupported', 415, 'undecodable bytes are refused');
expectFailure(fn() => $station->saveProfile($fields(0), ['logo' => ''], 1), 'image_empty', 422, 'an empty image is refused');
expectFailure(fn() => $station->saveProfile($fields(0, ['clear_logo' => '1']), ['logo' => png(10, 10)], 1), 'invalid_profile', 400, 'Pick and Clear together are refused');
check(registryKeys('cz_platform_identifier_') === [] && profileOption() === null, 'every rejected Save left no identity and no Profile');

echo "First Save mints and links both identities\n";
$logo = png(240, 80);
$favicon = png(64, 64);
$saved = $station->saveProfile($fields(0), ['logo' => $logo, 'favicon' => $favicon], 7);
$settings = $station->settings();
check(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PLATFORM_SETTINGS, (string) $settings['platform_id']), 'Settings received a CZPS identity');
check(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PLATFORM_SETTINGS_PROFILE, (string) $saved['platform_id']), 'Profile received a CZPSP identity');
check($saved['parent_platform_id'] === $settings['platform_id'], 'Profile names its Settings parent');
check($settings['sections']['profile']['platform_id'] === $saved['platform_id'], 'Settings links its Profile section');
check($saved['revision'] === 1 && $saved['brand']['name'] === 'Acme Cloud' && $saved['brand']['code'] === 'ACME', 'fields committed, code stored uppercase');
check($saved['brand']['logo']['width'] === 240 && $saved['brand']['favicon']['width'] === 64 && !$saved['brand']['favicon']['missing'], 'images stored with real dimensions');
check(str_starts_with((string) $saved['brand']['logo']['url'], 'https://example.test/wp-content/uploads/compuzign/brand/'), 'asset URL resolves from the store, not from stored data');
$stored = profileOption();
check(!isset($stored['brand']['logo']['url']) && UploadsBrandAssetStore::isValidKey($stored['brand']['logo']['key']), 'Profile stores an opaque platform key, never a URL');
check(is_file($assetDir . '/.htaccess') && is_file($assetDir . '/index.php'), 'asset directory carries listing/execution guards');
$ids = new PlatformIdentifierStation();
check($ids->lookupNative(PlatformIdentifierPolicy::PLATFORM_SETTINGS, PlatformSettingsNativeReference::settings())?->platformId() === $settings['platform_id'], 'Settings reverse binding is bound');
check($ids->lookupNative(PlatformIdentifierPolicy::PLATFORM_SETTINGS_PROFILE, PlatformSettingsNativeReference::profile())?->platformId() === $saved['platform_id'], 'Profile reverse binding is bound');
$settingsId = $settings['platform_id'];
$profileId = $saved['platform_id'];

echo "Reload, repeat Save, read by Platform ID\n";
check(station()->profile() == $saved, 'a fresh reader reloads the identical Profile');
$registryBefore = registryKeys('cz_platform_identifier_');
$second = $station->saveProfile($fields(1, ['name' => 'Acme', 'code' => '']), [], 7);
check($second['platform_id'] === $profileId && $station->settings()['platform_id'] === $settingsId, 'repeat Save keeps both identities');
check(registryKeys('cz_platform_identifier_') === $registryBefore, 'repeat Save mints nothing');
check($second['revision'] === 2 && $second['brand']['code'] === '' && $second['brand']['logo']['width'] === 240, 'blank code accepted; untouched images kept');
check($station->settingsByPlatformId($settingsId)['platform_id'] === $settingsId, 'Settings resolves by CZPS id');
check($station->profileByPlatformId($profileId)['platform_id'] === $profileId, 'Profile resolves by CZPSP id');
expectFailure(fn() => $station->settingsByPlatformId($profileId), 'not_found', 404, 'a CZPSP id is not a Settings id');
expectFailure(fn() => $station->profileByPlatformId('CZPSP22222'), 'not_found', 404, 'an unknown Profile id is 404');

echo "Conflicts leave the Profile unchanged\n";
$before = profileOption();
expectFailure(fn() => $station->saveProfile($fields(1), [], 7), 'revision_conflict', 409, 'a stale revision is a 409');
$GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION] = 'held|' . time();
expectFailure(fn() => $station->saveProfile($fields(2), ['logo' => png(50, 50)], 7), 'settings_busy', 409, 'a fresh lock held elsewhere is a 409');
check(profileOption() === $before, 'conflicting Saves committed nothing');
$GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION] = 'dead|' . (time() - 600);
$third = $station->saveProfile($fields(2), [], 7);
check($third['revision'] === 3 && !isset($GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION]), 'a stale lock is taken over by CAS and released after commit');

echo "Clear, sweep and missing assets\n";
$logoKey = profileOption()['brand']['logo']['key'];
$young = png(11, 11);
$youngKey = (new UploadsBrandAssetStore($assetDir, 'x'))->put($young, 'png');
$cleared = $station->saveProfile($fields(3, ['clear_logo' => '1']), [], 7);
check($cleared['brand']['logo'] === null && $cleared['brand']['favicon'] !== null, 'Clear removes only the cleared image');
check(is_file("{$assetDir}/{$logoKey}") && is_file("{$assetDir}/{$youngKey}"), 'unreferenced files inside the grace window are kept');
$GLOBALS['cz_clock'] = $now + 3600;
$station->saveProfile($fields(4), [], 7);
check(!is_file("{$assetDir}/{$logoKey}") && !is_file("{$assetDir}/{$youngKey}"), 'unreferenced files past the grace window are swept');
$faviconKey = profileOption()['brand']['favicon']['key'];
check(is_file("{$assetDir}/{$faviconKey}"), 'the referenced favicon is never swept');
unlink("{$assetDir}/{$faviconKey}");
$missing = $station->profile()['brand']['favicon'];
check($missing['missing'] === true && $missing['url'] === null && $missing['width'] === 64, 'a lost file projects as missing, not silently absent');
$GLOBALS['cz_clock'] = $now;

echo "Option A conversion\n";
$converted = $station->saveProfile($fields(5), ['favicon' => bmp(48, 48)], 7);
check($converted['brand']['favicon']['mime'] === 'image/png' && $converted['brand']['favicon']['width'] === 48, 'a BMP favicon is converted to PNG by the runtime decoder');
check(profileOption()['brand']['favicon']['source_mime'] === 'image/bmp', 'the original format is recorded');
$noDecoder = station(new BrandImageProcessor([]));
$before = profileOption();
expectFailure(fn() => $noDecoder->saveProfile($fields(6), ['logo' => bmp(20, 20)], 7), 'image_unsupported', 415, 'no runtime decoder → clear error');
check(profileOption() === $before, 'conversion failure committed nothing');

echo "Commit failures never report success\n";
$GLOBALS['cz_fail'] = static function (string $op, string $key, mixed $value): void {
    if ($op === 'update' && $key === PlatformSettingsRepository::PROFILE_OPTION && ($value['revision'] ?? 0) === 7) {
        throw new SimulatedCrash('process died at the commit point');
    }
};
try {
    $station->saveProfile($fields(6), [], 7);
    check(false, 'a crash at commit must not return');
} catch (SimulatedCrash) {
    check(profileOption() === $before, 'a crash at the commit point leaves the previous Profile intact');
}
$GLOBALS['cz_fail'] = null;
$GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION] = 'crashed|' . (time() - 600);
check($station->saveProfile($fields(6), [], 7)['revision'] === 7, 'the next Save after a crash commits normally');

$GLOBALS['cz_db_error'] = true;
$before = profileOption();
expectFailure(fn() => $station->saveProfile($fields(7), [], 7), 'storage_failed', 500, 'a commit the database rejects is reported as a failure');
unset($GLOBALS['cz_db_error']);
$GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION] = $before;
check(!isset($GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION]), 'the lock is released after a storage failure');

echo "Partial first-Save bootstrap recovers without duplicate identity\n";
foreach ([
    'Settings bound, crash before its reverse claim' => static fn(string $op, string $key): bool =>
        $op === 'add' && str_starts_with($key, 'cz_platform_identifier_native_v1_platform_settings_'),
    'Settings bound, crash before Profile reverse claim' => static fn(string $op, string $key): bool =>
        $op === 'add' && str_starts_with($key, 'cz_platform_identifier_native_v1_platform_settings_profile_'),
    'both bound, crash before the section link' => static fn(string $op, string $key, mixed $value = null): bool =>
        $op === 'update' && $key === PlatformSettingsRepository::SETTINGS_OPTION && (($value['sections']['profile']['platform_id'] ?? '') !== ''),
] as $label => $crashWhen) {
    $GLOBALS['cz_options'] = [];
    $GLOBALS['cz_fail'] = static function (string $op, string $key, mixed $value) use (&$crashWhen): void {
        if ($crashWhen !== null && $crashWhen($op, $key, $value)) {
            $crashWhen = null;
            throw new SimulatedCrash('crash');
        }
    };
    try {
        $station->saveProfile($fields(0), [], 1);
        check(false, "{$label}: crash must interrupt the first Save");
    } catch (SimulatedCrash) {
    }
    $GLOBALS['cz_fail'] = null;
    check((profileOption()['revision'] ?? 0) === 0, "{$label}: no field data committed");
    $partialSettingsId = $GLOBALS['cz_options'][PlatformSettingsRepository::SETTINGS_OPTION]['platform_id'] ?? '';
    $GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION] = 'crashed|' . (time() - 600);
    $recovered = $station->saveProfile($fields(0), [], 1);
    check($recovered['revision'] === 1 && $recovered['parent_platform_id'] === $partialSettingsId, "{$label}: next Save resumes with the already-stored Settings id");
    check($station->profileByPlatformId((string) $recovered['platform_id'])['platform_id'] === $recovered['platform_id'], "{$label}: recovered hierarchy verifies by id");
    $bound = array_filter($GLOBALS['cz_options'], static fn($v, string $k): bool =>
        str_starts_with($k, 'cz_platform_identifier_v1_') && ($v['status'] ?? '') === PlatformIdentifierStation::STATUS_BOUND, ARRAY_FILTER_USE_BOTH);
    check(count($bound) === 2, "{$label}: exactly one bound CZPS and one bound CZPSP");
}

echo "Inconsistent identity fails closed\n";
$good = $GLOBALS['cz_options'];
$GLOBALS['cz_options'][PlatformSettingsRepository::SETTINGS_OPTION]['sections']['profile']['platform_id'] = 'CZPSP33333';
$before = profileOption();
expectFailure(fn() => $station->saveProfile($fields(1), [], 1), 'settings_identity_conflict', 409, 'a Settings root linking another Profile blocks Save');
expectFailure(fn() => $station->profileByPlatformId((string) $before['platform_id']), 'settings_identity_conflict', 409, 'a broken parent link blocks read-by-id');
check(profileOption() === $before, 'broken link committed nothing');
$GLOBALS['cz_options'] = $good;
$GLOBALS['cz_options'][PlatformSettingsRepository::SETTINGS_OPTION]['platform_id'] = 'CZPS44444';
expectFailure(fn() => $station->saveProfile($fields(1), [], 1), 'settings_identity_conflict', 409, 'a stored id the registry never bound blocks Save');
$GLOBALS['cz_options'] = $good;
unset($GLOBALS['cz_options'][PlatformSettingsRepository::SETTINGS_OPTION]);
$bound = count(registryKeys('cz_platform_identifier_v1_CZPS'));
expectFailure(fn() => $station->saveProfile($fields(1), [], 1), 'settings_identity_conflict', 409, 'a lost Settings root is never replaced under an existing Profile');
check(count(registryKeys('cz_platform_identifier_v1_CZPS')) === $bound, 'no replacement Settings identity was minted');
$GLOBALS['cz_options'] = $good;
check($station->saveProfile($fields(1), [], 1)['revision'] === 2, 'restored consistent state saves again');

foreach (array_diff(scandir($assetDir) ?: [], ['.', '..']) as $name) { unlink("{$assetDir}/{$name}"); }
@rmdir($assetDir);
echo "Platform Settings Profile contract: PASS\n";
