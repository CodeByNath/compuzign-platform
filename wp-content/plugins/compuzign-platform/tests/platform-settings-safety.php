<?php

declare(strict_types=1);

// Platform Settings safety contract — the four Phase 1B Reviewer corrections:
//   1. every stored image is fully decoded and re-encoded (malformed, truncated
//      and polyglot payloads with valid headers are refused or stripped)
//   2. canonical GET verifies stored identity; never presents it unverified
//   3. the asset store never mutates or follows a redirected existing file
//   4. a sweep never removes a file an in-flight Save still depends on

$GLOBALS['cz_options'] = [];
$GLOBALS['cz_fail']    = null;

function add_option(string $key, mixed $value, string $deprecated = '', string|bool $autoload = 'yes'): bool
{
    if (is_callable($GLOBALS['cz_fail'])) { ($GLOBALS['cz_fail'])('add', $key, $value); }
    if (array_key_exists($key, $GLOBALS['cz_options'])) {
        return false;
    }
    $GLOBALS['cz_options'][$key] = $value;
    return true;
}
function get_option(string $key, mixed $default = false): mixed { return $GLOBALS['cz_options'][$key] ?? $default; }
function update_option(string $key, mixed $value, string|bool|null $autoload = null): bool
{
    if (is_callable($GLOBALS['cz_fail'])) { ($GLOBALS['cz_fail'])('update', $key, $value); }
    $GLOBALS['cz_options'][$key] = $value;
    return true;
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
        if (preg_match("/UPDATE .* SET option_value = '(.*)' WHERE option_name = '(.*)' AND option_value = '(.*)'/s", $sql, $m)
            && ($GLOBALS['cz_options'][stripslashes($m[2])] ?? null) === stripslashes($m[3])) {
            $GLOBALS['cz_options'][stripslashes($m[2])] = stripslashes($m[1]);
            return 1;
        }
        if (preg_match("/DELETE FROM .* WHERE option_name = '(.*)' AND option_value = '(.*)'/s", $sql, $m)
            && ($GLOBALS['cz_options'][stripslashes($m[1])] ?? null) === stripslashes($m[2])) {
            unset($GLOBALS['cz_options'][stripslashes($m[1])]);
            return 1;
        }
        return 0;
    }
}
$GLOBALS['wpdb'] = new FakeWpdb();

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;
use CompuZign\Platform\PlatformSettings\BrandAssetStore;
use CompuZign\Platform\PlatformSettings\BrandImageProcessor;
use CompuZign\Platform\PlatformSettings\PlatformSettingsFailure;
use CompuZign\Platform\PlatformSettings\PlatformSettingsRepository;
use CompuZign\Platform\PlatformSettings\PlatformSettingsStation;
use CompuZign\Platform\PlatformSettings\UploadsBrandAssetStore;

final class SimulatedCrash extends RuntimeException {}

function check(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "  ok — {$message}\n";
}

function expectFailure(callable $operation, string $code, string $message): void
{
    try {
        $operation();
    } catch (PlatformSettingsFailure $failure) {
        check($failure->errorCode() === $code, "{$message} ({$failure->errorCode()} {$failure->status()})");
        return;
    }
    fwrite(STDERR, "FAIL: {$message} — no failure raised\n");
    exit(1);
}

function expectRuntime(callable $operation, string $message): void
{
    try {
        $operation();
    } catch (RuntimeException) {
        check(true, $message);
        return;
    }
    fwrite(STDERR, "FAIL: {$message} — no exception\n");
    exit(1);
}

function encoded(string $format, int $width, int $height): string
{
    $image = imagecreatetruecolor($width, $height);
    imagefill($image, 0, 0, imagecolorallocate($image, 200, 40, 90));
    ob_start();
    match ($format) {
        'png'  => imagepng($image),
        'jpeg' => imagejpeg($image),
        'webp' => imagewebp($image),
        'gif'  => imagegif($image),
        'bmp'  => imagebmp($image),
    };
    return (string) ob_get_clean();
}

/** Two-frame 1×1 animated GIF, assembled from its spec-defined blocks. */
function animatedGif(): string
{
    $frame = "\x21\xF9\x04\x00\x0A\x00\x00\x00"        // graphic control extension
        . "\x2C\x00\x00\x00\x00\x01\x00\x01\x00\x80"  // image descriptor + local colour table flag
        . "\xFF\x00\x00\x00\x00\xFF"                  // two-colour table
        . "\x02\x02\x44\x01\x00";                     // LZW data
    return "GIF89a\x01\x00\x01\x00\x00\x00\x00"
        . "\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00"
        . $frame . $frame . "\x3B";
}

/** @param list<array{0: int, 1: string}> $entries [size, data] */
function icon(array $entries): string
{
    $header = pack('vvv', 0, 1, count($entries));
    $directory = '';
    $data = '';
    $offset = 6 + 16 * count($entries);
    foreach ($entries as [$size, $bytes]) {
        $directory .= pack('CCCCvvVV', $size % 256, $size % 256, 0, 0, 1, 32, strlen($bytes), $offset);
        $data .= $bytes;
        $offset += strlen($bytes);
    }
    return $header . $directory . $data;
}

$images = new BrandImageProcessor();

echo "1. Full decode and re-encode\n";
$payload = '<?php system($_GET["c"]); ?>';
$polyglot = $images->process(encoded('png', 20, 20) . $payload, 'logo', false);
check($polyglot['mime'] === 'image/png' && !str_contains($polyglot['bytes'], '<?php'), 'a PNG with an appended script is re-encoded without the payload');
$png = encoded('png', 30, 30);
expectFailure(fn() => $images->process(substr($png, 0, (int) (strlen($png) * 0.6)), 'logo', false), 'image_unsupported', 'a truncated PNG with a valid header is refused');
$crc = $png;
$idat = strpos($crc, 'IDAT');
$crc[$idat + 6] = chr(ord($crc[$idat + 6]) ^ 0xFF);
expectFailure(fn() => $images->process($crc, 'logo', false), 'image_unsupported', 'a PNG with a corrupt data chunk is refused');
$jpeg = encoded('jpeg', 40, 40);
expectFailure(fn() => $images->process(substr($jpeg, 0, (int) (strlen($jpeg) * 0.5)), 'logo', false), 'image_unsupported', 'a truncated JPEG (decoder warning) is refused');
$reJpeg = $images->process($jpeg . $payload, 'logo', false);
check($reJpeg['mime'] === 'image/jpeg' && !str_contains($reJpeg['bytes'], '<?php'), 'a JPEG stays JPEG and loses its appended payload');
check($images->process(encoded('webp', 16, 16), 'logo', false)['mime'] === 'image/webp', 'WebP is decoded and re-encoded as WebP');
check($images->process(encoded('gif', 16, 16), 'logo', false)['mime'] === 'image/gif', 'a still GIF is decoded and re-encoded as GIF');
check(is_array(@getimagesizefromstring(animatedGif())), 'fixture: the animated GIF has a valid header');
if (class_exists(Imagick::class)) {
    check($images->process(animatedGif(), 'logo', false)['mime'] === 'image/gif', 'an animated GIF keeps its frames through Imagick');
} else {
    expectFailure(fn() => $images->process(animatedGif(), 'logo', false), 'image_animation_unsupported', 'without Imagick an animated GIF is refused clearly, never flattened');
}
$ico = $images->process(icon([[16, encoded('png', 16, 16)], [48, encoded('png', 48, 48)]]), 'favicon', true);
check($ico['mime'] === 'image/png' && $ico['width'] === 48 && $ico['source_mime'] !== '', 'an ICO yields its largest embedded PNG, fully decoded');
expectFailure(fn() => $images->process(icon([[32, str_repeat("\x28", 40)]]), 'favicon', true), 'image_unsupported', 'a BMP-entry ICO with no secure decoder is refused');
expectFailure(fn() => $images->process(icon([[32, substr(encoded('png', 32, 32), 0, 60)]]), 'favicon', true), 'image_unsupported', 'an ICO wrapping a truncated PNG is refused');
check($images->process(encoded('bmp', 12, 12), 'logo', false)['mime'] === 'image/png', 'BMP is converted to PNG');

echo "3. Asset store never mutates or follows an existing name\n";
$dir = sys_get_temp_dir() . '/cz-brand-safety-' . bin2hex(random_bytes(4));
$store = new UploadsBrandAssetStore($dir, 'https://example.test/brand');
$bytes = encoded('png', 8, 8);
$key = $store->put($bytes, 'png');
file_put_contents("{$dir}/{$key}", 'tampered');
expectRuntime(fn() => $store->put($bytes, 'png'), 'a stored file whose content no longer matches its key is refused');
check(file_get_contents("{$dir}/{$key}") === 'tampered', 'the mismatched existing file is left untouched');
unlink("{$dir}/{$key}");
$target = sys_get_temp_dir() . '/cz-outside-' . bin2hex(random_bytes(4));
file_put_contents($target, $bytes);
symlink($target, "{$dir}/{$key}");
expectRuntime(fn() => $store->put($bytes, 'png'), 'a symlink at the key path is refused');
check(!$store->exists($key) && $store->url($key) === null && !isset($store->keys()[$key]), 'a symlinked key is never treated as a stored asset');
unlink("{$dir}/{$key}");
unlink($target);
$key = $store->put($bytes, 'png');
touch("{$dir}/{$key}", time() - 7200);
$store->put($bytes, 'png');
clearstatcache();
check(time() - filemtime("{$dir}/{$key}") < 60, 'reusing an existing asset refreshes its time into the grace window');
$redirected = sys_get_temp_dir() . '/cz-brand-link-' . bin2hex(random_bytes(4));
symlink($dir, $redirected);
expectRuntime(fn() => (new UploadsBrandAssetStore($redirected, 'x'))->put(encoded('png', 9, 9), 'png'), 'a redirected asset directory is refused');
unlink($redirected);

echo "2. Canonical GET verifies identity\n";
$GLOBALS['cz_clock'] = time();
$station = static fn(?BrandAssetStore $assets = null): PlatformSettingsStation => new PlatformSettingsStation(
    new PlatformIdentifierStation(),
    new PlatformSettingsRepository(),
    $assets ?? $store,
    $images,
    static fn(): int => $GLOBALS['cz_clock']
);
$fields = static fn(int $revision): array => ['expected_revision' => (string) $revision, 'name' => 'Acme', 'code' => 'AC'];
check($station()->profile()['identity_state'] === PlatformSettingsStation::UNASSIGNED && $station()->settings()['platform_id'] === null, 'before any Save: unassigned, null IDs, no error');
$GLOBALS['cz_fail'] = static function (string $op, string $key): void {
    if ($op === 'add' && str_starts_with($key, 'cz_platform_identifier_native_v1_platform_settings_profile_')) {
        $GLOBALS['cz_fail'] = null;
        throw new SimulatedCrash('crash');
    }
};
try { $station()->saveProfile($fields(0), [], 1); } catch (SimulatedCrash) {}
$partial = $station()->profile();
check($partial['identity_state'] === PlatformSettingsStation::INCOMPLETE && $partial['platform_id'] === null && $partial['parent_platform_id'] === null, 'an interrupted first Save reads as incomplete with its unverified IDs withheld');
check($station()->settings()['platform_id'] === null, 'the Settings root is withheld while incomplete');
$GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION] = 'crashed|' . (time() - 600);
$saved = $station()->saveProfile($fields(0), [], 1);
$verified = $station()->profile();
check($verified['identity_state'] === PlatformSettingsStation::VERIFIED && $verified['platform_id'] === $saved['platform_id'], 'after the resuming Save the canonical GET is verified');
$good = $GLOBALS['cz_options'];
$reverseKeys = array_values(array_filter(array_keys($good), static fn(string $k): bool => str_starts_with($k, 'cz_platform_identifier_native_v1_platform_settings_profile_')));
unset($GLOBALS['cz_options'][$reverseKeys[0]]);
$GLOBALS['cz_options']['cz_platform_identifier_v1_' . $saved['platform_id']]['status'] = 'deleted';
expectFailure(fn() => $station()->profile(), 'settings_identity_conflict', 'a tombstoned Profile identity makes canonical GET a 409');
expectFailure(fn() => $station()->settings(), 'settings_identity_conflict', 'and the Settings GET a 409 too');
$GLOBALS['cz_options'] = $good;
$GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION]['parent_platform_id'] = 'CZPS33333';
expectFailure(fn() => $station()->profile(), 'settings_identity_conflict', 'a broken parent link makes canonical GET a 409');
$GLOBALS['cz_options'] = $good;
$GLOBALS['cz_options'][PlatformSettingsRepository::SETTINGS_OPTION]['platform_id'] = 'not-an-id';
expectFailure(fn() => $station()->settings(), 'settings_identity_conflict', 'a malformed stored ID makes canonical GET a 409');
$GLOBALS['cz_options'] = $good;

echo "3/4. Saves fail closed around assets\n";
$before = $GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION];
$logo = encoded('png', 64, 32);
$logoKey = hash('sha256', $images->process($logo, 'logo', false)['bytes']) . '.png';
file_put_contents("{$dir}/{$logoKey}", 'tampered');
expectFailure(fn() => $station()->saveProfile($fields(1), ['logo' => $logo], 1), 'storage_failed', 'a Save meeting a mismatched existing asset fails');
check(file_get_contents("{$dir}/{$logoKey}") === 'tampered' && $GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION] === $before, 'the existing file and the Profile are both unchanged');
unlink("{$dir}/{$logoKey}");
$GLOBALS['cz_fail'] = static function (string $op, string $key) use ($dir, $logoKey): void {
    if ($op === 'add' && $key === PlatformSettingsRepository::LOCK_OPTION) {
        $GLOBALS['cz_fail'] = null;
        @unlink("{$dir}/{$logoKey}"); // another Save's sweep ran before this one took the lock
    }
};
expectFailure(fn() => $station()->saveProfile($fields(1), ['logo' => $logo], 1), 'storage_failed', 'an asset removed before commit fails the Save');
check($GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION] === $before, 'no dangling reference was committed');
check(!isset($GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION]), 'the lock was released');

echo "4. A sweep stops when its lock is taken over\n";
$orphans = [];
foreach ([5, 6, 7] as $size) {
    $orphans[] = $store->put(encoded('png', $size, $size), 'png');
}
$GLOBALS['cz_clock'] = time() + 7200;
$takeover = new class($store) implements BrandAssetStore {
    public int $deleted = 0;
    public function __construct(private BrandAssetStore $inner) {}
    public function put(string $bytes, string $extension): string { return $this->inner->put($bytes, $extension); }
    public function exists(string $key): bool { return $this->inner->exists($key); }
    public function url(string $key): ?string { return $this->inner->url($key); }
    public function keys(): array { return $this->inner->keys(); }
    public function sweepTemporary(int $olderThanSeconds): void { $this->inner->sweepTemporary($olderThanSeconds); }
    public function delete(string $key): void
    {
        $this->inner->delete($key);
        $this->deleted++;
        // A slow sweep loses its lock to another Save right after one delete.
        $GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION] = 'someone-else|' . time();
    }
};
$station($takeover)->saveProfile($fields(1), [], 1);
$remaining = count(array_filter($orphans, static fn(string $k): bool => $store->exists($k)));
check($takeover->deleted === 1 && $remaining === 2, 'the sweep deleted one file, then stopped once the lock was no longer its own');
check(str_starts_with((string) ($GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION] ?? ''), 'someone-else|'), "the new owner's lock was not released by the old Save");

echo "5. The commit is atomic with lock ownership and revision\n";
unset($GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION]);
$GLOBALS['cz_clock'] = time() + 7200; // every unreferenced file is past the grace window
$revision = (int) $GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION]['revision'];
$committedLogo = encoded('png', 40, 20);
$station()->saveProfile($fields($revision), ['logo' => $committedLogo], 1);
$revision++;
$referencedKey = $GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION]['brand']['logo']['key'];
touch("{$dir}/{$referencedKey}", time() - 7200);
$before = $GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION];

// a) The lock expires and is taken over after every check, before the write.
$GLOBALS['cz_before_commit'] = static function (): void {
    $GLOBALS['cz_before_commit'] = null;
    $GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION] = 'taker|' . time();
};
expectFailure(fn() => $station()->saveProfile($fields($revision), ['logo' => encoded('png', 41, 20)], 1), 'settings_busy', 'a lock taken over between check and write fails the commit');
check($GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION] === $before, 'the stale writer overwrote nothing');
check(str_starts_with((string) $GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION], 'taker|'), "the new owner's lock is untouched");
check($store->exists($referencedKey), 'no referenced file was deleted');
unset($GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION]);

// b) A concurrent writer commits a newer revision after the check, before the write.
$newer = $before;
$newer['revision'] = $revision + 1;
$newer['brand']['name'] = 'Newer';
$GLOBALS['cz_before_commit'] = static function () use ($newer): void {
    $GLOBALS['cz_before_commit'] = null;
    $GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION] = $newer;
};
expectFailure(fn() => $station()->saveProfile($fields($revision), ['logo' => encoded('png', 42, 20)], 1), 'revision_conflict', 'a newer revision committed between check and write fails the commit');
check($GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION] === $newer, 'the newer revision survives intact');
check($store->exists($referencedKey), "the newer revision's referenced file was not deleted");
check(!isset($GLOBALS['cz_options'][PlatformSettingsRepository::LOCK_OPTION]), 'the lock is released after a lost race');

// c) Two Saves from the same expected revision: exactly one commits.
$first = $station()->saveProfile($fields($revision + 1), [], 1);
expectFailure(fn() => $station()->saveProfile($fields($revision + 1), [], 1), 'revision_conflict', 'the second Save from the same revision is refused');
check($GLOBALS['cz_options'][PlatformSettingsRepository::PROFILE_OPTION]['revision'] === $first['revision'], 'only the first Save committed');
check($store->exists($referencedKey), 'the committed logo file still exists');

foreach (array_diff(scandir($dir) ?: [], ['.', '..']) as $name) { unlink("{$dir}/{$name}"); }
@rmdir($dir);
echo "Platform Settings safety contract: PASS\n";
