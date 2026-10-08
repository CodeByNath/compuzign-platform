<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformSettings;

/**
 * Host adapter: brand images as static files under the uploads directory.
 *
 * `wp-content/uploads/compuzign/brand/` lies outside the deploy checkout
 * (deploy.yml only replaces the plugin and theme trees), so stored assets
 * survive source deploys and plugin upgrades. Only server-generated keys of
 * the form `<sha256>.<image ext>` are ever read, written, or deleted, so a
 * key can never escape the directory or name an executable file. The host's
 * uploads API supplies the location only; it owns no identity here.
 */
final class UploadsBrandAssetStore implements BrandAssetStore
{
    private const SUBDIRECTORY = 'compuzign/brand';
    private const KEY_PATTERN  = '/^[a-f0-9]{64}\.(png|jpg|gif|webp|ico)$/D';
    private const TEMP_PATTERN = '/^\.[a-f0-9]{64}\.(png|jpg|gif|webp|ico)\.[a-f0-9]{16}\.tmp$/D';

    private ?string $directory;
    private ?string $baseUrl;

    /** Location resolves on first use, so constructing at boot costs nothing. */
    public function __construct(?string $directory = null, ?string $baseUrl = null)
    {
        $this->directory = $directory === null ? null : rtrim($directory, '/');
        $this->baseUrl   = $baseUrl === null ? null : rtrim($baseUrl, '/');
    }

    private function directory(): string
    {
        $this->resolveLocation();

        return (string) $this->directory;
    }

    private function baseUrl(): string
    {
        $this->resolveLocation();

        return (string) $this->baseUrl;
    }

    private function resolveLocation(): void
    {
        if ($this->directory !== null && $this->baseUrl !== null) {
            return;
        }
        $uploads = wp_upload_dir(null, false);
        $this->directory ??= rtrim((string) $uploads['basedir'], '/') . '/' . self::SUBDIRECTORY;
        $this->baseUrl   ??= rtrim((string) $uploads['baseurl'], '/') . '/' . self::SUBDIRECTORY;
    }

    public static function isValidKey(string $key): bool
    {
        return preg_match(self::KEY_PATTERN, $key) === 1;
    }

    public function put(string $bytes, string $extension): string
    {
        $key = hash('sha256', $bytes) . '.' . $extension;
        if (!self::isValidKey($key)) {
            throw new \InvalidArgumentException("unsupported brand asset extension '{$extension}'.");
        }

        $this->ensureDirectory();
        $path = $this->path($key);
        if (file_exists($path) || is_link($path)) {
            return $this->adoptExisting($key, $path);
        }

        // Write beside the target, then publish without ever replacing an
        // existing name: link() fails if the key appeared meanwhile, so a
        // stored asset is never mutated in place.
        $temporary = $this->directory() . '/.' . $key . '.' . bin2hex(random_bytes(8)) . '.tmp';
        if (file_put_contents($temporary, $bytes, LOCK_EX) !== strlen($bytes)) {
            @unlink($temporary);
            throw new \RuntimeException('brand asset could not be written.');
        }
        $published = @link($temporary, $path);
        if (!$published && (file_exists($path) || is_link($path))) {
            @unlink($temporary);
            return $this->adoptExisting($key, $path);
        }
        if (!$published && !rename($temporary, $path)) {
            @unlink($temporary);
            throw new \RuntimeException('brand asset could not be finalised.');
        }
        @unlink($temporary);

        if (is_link($path) || hash_file('sha256', $path) !== substr($key, 0, 64)) {
            throw new \RuntimeException('brand asset did not read back exactly.');
        }

        return $key;
    }

    /**
     * An existing name is reused only when it is a real file holding exactly
     * the bytes its key names. Anything else — a symlink, or content that no
     * longer matches — fails closed and is left untouched. Reuse refreshes the
     * file's time so an in-flight Save is inside the sweep's grace window.
     */
    private function adoptExisting(string $key, string $path): string
    {
        if (is_link($path) || !is_file($path)) {
            throw new \RuntimeException('brand asset path is redirected; refusing to use it.');
        }
        if (hash_file('sha256', $path) !== substr($key, 0, 64)) {
            throw new \RuntimeException('stored brand asset does not match its key; left untouched.');
        }
        if (!touch($path)) {
            throw new \RuntimeException('brand asset could not be refreshed.');
        }

        return $key;
    }

    public function exists(string $key): bool
    {
        if (!self::isValidKey($key)) {
            return false;
        }
        $path = $this->path($key);

        return is_file($path) && !is_link($path);
    }

    public function url(string $key): ?string
    {
        return $this->exists($key) ? $this->baseUrl() . '/' . $key : null;
    }

    public function delete(string $key): void
    {
        if ($this->exists($key)) {
            @unlink($this->path($key));
        }
    }

    public function keys(): array
    {
        clearstatcache();
        $keys = [];
        foreach ($this->listDirectory() as $name) {
            if ($this->exists($name)) {
                $keys[$name] = (int) filemtime($this->path($name));
            }
        }

        return $keys;
    }

    public function sweepTemporary(int $olderThanSeconds): void
    {
        clearstatcache();
        foreach ($this->listDirectory() as $name) {
            $path = $this->directory() . '/' . $name;
            if (preg_match(self::TEMP_PATTERN, $name) === 1 && time() - (int) filemtime($path) > $olderThanSeconds) {
                @unlink($path);
            }
        }
    }

    /** @return list<string> */
    private function listDirectory(): array
    {
        if (!is_dir($this->directory())) {
            return [];
        }
        $names = scandir($this->directory());

        return $names === false ? [] : array_values(array_diff($names, ['.', '..']));
    }

    private function path(string $key): string
    {
        return $this->directory() . '/' . $key;
    }

    private function ensureDirectory(): void
    {
        if (is_link($this->directory())) {
            throw new \RuntimeException('brand asset directory is redirected; refusing to use it.');
        }
        if (!is_dir($this->directory()) && !mkdir($this->directory(), 0755, true) && !is_dir($this->directory())) {
            throw new \RuntimeException('brand asset directory could not be created.');
        }

        // Defence in depth: keys already exclude executable names, but the
        // directory still refuses listings and script execution.
        $guards = [
            'index.php' => "<?php\n// Silence is golden.\n",
            '.htaccess' => "Options -Indexes\n<FilesMatch \"\\.(php[0-9]?|phtml|phar|pl|py|cgi|sh)$\">\n  Require all denied\n</FilesMatch>\n",
        ];
        foreach ($guards as $name => $content) {
            $path = $this->directory() . '/' . $name;
            if (!is_file($path) && file_put_contents($path, $content) === false) {
                throw new \RuntimeException("brand asset directory guard '{$name}' could not be written.");
            }
        }
    }
}
