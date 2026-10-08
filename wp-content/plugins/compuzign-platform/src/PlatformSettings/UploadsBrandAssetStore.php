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
        if (is_file($path) && hash_file('sha256', $path) === substr($key, 0, 64)) {
            return $key;
        }

        // Write beside the target, then rename: the final name only ever
        // appears with complete content.
        $temporary = $this->directory() . '/.' . $key . '.' . bin2hex(random_bytes(8)) . '.tmp';
        if (file_put_contents($temporary, $bytes, LOCK_EX) !== strlen($bytes)) {
            @unlink($temporary);
            throw new \RuntimeException('brand asset could not be written.');
        }
        if (!rename($temporary, $path)) {
            @unlink($temporary);
            throw new \RuntimeException('brand asset could not be finalised.');
        }
        if (hash_file('sha256', $path) !== substr($key, 0, 64)) {
            throw new \RuntimeException('brand asset did not read back exactly.');
        }

        return $key;
    }

    public function exists(string $key): bool
    {
        return self::isValidKey($key) && is_file($this->path($key));
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
        $keys = [];
        foreach ($this->listDirectory() as $name) {
            if (self::isValidKey($name)) {
                $keys[$name] = (int) filemtime($this->path($name));
            }
        }

        return $keys;
    }

    public function sweepTemporary(int $olderThanSeconds): void
    {
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
