<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\Account\Support;

/**
 * AccountMedia — Account Station's own Logo/Favicon image storage.
 *
 * Raw image files live under `<uploads>/compuzign-account/` (WordPress supplies
 * only the host directory — no attachment post, no Media Library row); the
 * references and metadata live in the one Account aggregate option through
 * AccountRepository. A file is named by the SHA-256 of its own bytes plus an
 * extension derived from its sniffed type, never from anything the client
 * sent: the name is path-safe and collision-free by construction, and the
 * same bytes uploaded twice resolve to the same record instead of a duplicate.
 *
 * The hash is a storage key, not an identity: no Platform ID family is minted
 * for an image, and nothing outside Account Station references one.
 */
final class AccountMedia
{
    public const DIRECTORY = 'compuzign-account';

    /** Sniffed content type -> the only extensions this directory ever holds. */
    private const EXTENSIONS = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
    ];

    private const LIST_LIMIT = 100;

    public function __construct(private AccountRepository $repository) {}

    /** True only for a well-formed storage key; anything else is never looked up or turned into a path. */
    public static function isValidId(mixed $id): bool
    {
        return is_string($id) && preg_match('/^[a-f0-9]{64}$/', $id) === 1;
    }

    /** The real content type of an image file (from its bytes, not its name), or null if it is not an allowed image. */
    public function sniffMime(string $path): ?string
    {
        $info = @getimagesize($path);
        if (!is_array($info) || !isset($info['mime'])) {
            return null;
        }

        return in_array($info['mime'], AccountSchema::ALLOWED_BRAND_MIME_TYPES, true) ? (string) $info['mime'] : null;
    }

    /**
     * Stores the file at $tmpPath (already size- and type-checked by the
     * caller) and registers it. Returns the presented record, or null if the
     * directory or file could not be written. Idempotent on identical bytes.
     *
     * @return ?array{id: string, url: string, name: string, mime: string, size: int, uploaded_at: int}
     */
    public function store(string $tmpPath, string $mime, string $originalName): ?array
    {
        $extension = self::EXTENSIONS[$mime] ?? null;
        $bytes     = $extension === null ? false : @file_get_contents($tmpPath);
        if ($bytes === false) {
            return null;
        }

        $id       = hash('sha256', $bytes);
        $existing = $this->repository->readMedia()[$id] ?? null;
        if ($existing !== null && is_file($this->pathFor($existing))) {
            return $this->present($id, $existing);
        }

        $directory = $this->directory();
        if ($directory === null) {
            return null;
        }

        $record = [
            'file'        => $id . '.' . $extension,
            'name'        => mb_substr(sanitize_text_field(basename(str_replace('\\', '/', $originalName))), 0, 100),
            'mime'        => $mime,
            'size'        => strlen($bytes),
            'uploaded_at' => $existing['uploaded_at'] ?? time(),
        ];

        // Write beside the destination then rename into place, so a failed or
        // interrupted write never leaves a truncated file under a valid key.
        $destination = $directory . '/' . $record['file'];
        $partial     = $destination . '.part';
        if (@file_put_contents($partial, $bytes) === false) {
            @unlink($partial);
            return null;
        }
        if (!@rename($partial, $destination)) {
            @unlink($partial);
            return null;
        }

        $this->repository->writeMediaRecord($id, $record);

        return $this->present($id, $record);
    }

    /** True when $id is a well-formed key with a registered record — the Save-time gate on a Brand media reference. */
    public function exists(mixed $id): bool
    {
        return self::isValidId($id) && isset($this->repository->readMedia()[$id]);
    }

    /** Resolved URL for a stored image, or null for a null/unknown/malformed key. */
    public function urlFor(?string $id): ?string
    {
        if (!self::isValidId($id)) {
            return null;
        }

        $record = $this->repository->readMedia()[$id] ?? null;

        return $record === null ? null : $this->baseUrl() . '/' . $record['file'];
    }

    /**
     * Newest-first library of every image Account Station has stored, for the
     * picker's "choose existing" list. Unreferenced (abandoned) uploads are
     * listed here too — they stay selectable rather than silently deleted.
     *
     * @return list<array{id: string, url: string, name: string, mime: string, size: int, uploaded_at: int}>
     */
    public function listItems(): array
    {
        $records = $this->repository->readMedia();
        uasort($records, static fn (array $a, array $b): int => $b['uploaded_at'] <=> $a['uploaded_at']);

        $items = [];
        foreach (array_slice($records, 0, self::LIST_LIMIT, true) as $id => $record) {
            $items[] = $this->present((string) $id, $record);
        }

        return $items;
    }

    // ---------------------------------------------------------------------

    private function present(string $id, array $record): array
    {
        return [
            'id'          => $id,
            'url'         => $this->baseUrl() . '/' . $record['file'],
            'name'        => (string) $record['name'],
            'mime'        => (string) $record['mime'],
            'size'        => (int) $record['size'],
            'uploaded_at' => (int) $record['uploaded_at'],
        ];
    }

    private function pathFor(array $record): string
    {
        $uploads = wp_upload_dir();

        return $uploads['basedir'] . '/' . self::DIRECTORY . '/' . $record['file'];
    }

    private function baseUrl(): string
    {
        $uploads = wp_upload_dir();

        return $uploads['baseurl'] . '/' . self::DIRECTORY;
    }

    /** Ensures the Account-owned directory exists; null when WordPress reports no usable uploads location. */
    private function directory(): ?string
    {
        $uploads = wp_upload_dir();
        if (!empty($uploads['error'])) {
            return null;
        }

        $directory = $uploads['basedir'] . '/' . self::DIRECTORY;
        if (!wp_mkdir_p($directory)) {
            return null;
        }

        // Same directory-listing guard WordPress places in its own uploads folders.
        $guard = $directory . '/index.php';
        if (!file_exists($guard)) {
            @file_put_contents($guard, "<?php\n// Silence is golden.\n");
        }

        return $directory;
    }
}
