<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\Account\Support;

use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;

/**
 * AccountSchema — Account Station's Brand field shape, sanitization, and REST
 * argument definitions. Brand is the first and only Profile section; every
 * field is optional (blanks are a valid, settleable Save).
 */
final class AccountSchema
{
    public const MODULE_BRAND = 'brand';

    /** The only image types the platform-owned Logo/Favicon picker accepts. */
    public const ALLOWED_BRAND_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    public const MAX_BRAND_MEDIA_BYTES = 5 * 1024 * 1024;

    public static function brandArgs(): array
    {
        return [
            'name'                   => ['required' => false, 'type' => 'string'],
            'code'                   => ['required' => false, 'type' => 'string'],
            'logo_attachment_id'     => ['required' => false, 'type' => ['integer', 'null']],
            'favicon_attachment_id'  => ['required' => false, 'type' => ['integer', 'null']],
            'logo_media_id'          => ['required' => false, 'type' => ['string', 'null']],
            'favicon_media_id'       => ['required' => false, 'type' => ['string', 'null']],
        ];
    }

    public static function statusArgs(): array
    {
        return [
            // Publish sends platform_status=active through this same shape Service
            // uses; Disable/Enable are the separate 'action' shape. See
            // AccountController::updateStatus / Service's own precedent.
            'platform_status' => ['required' => false, 'type' => 'string', 'enum' => StationLifecycle::LIVE_STATUSES],
            'action'           => ['required' => false, 'type' => 'string', 'enum' => ['disable', 'enable']],
        ];
    }

    public static function sanitizeName(string $name): string
    {
        return mb_substr(trim(sanitize_text_field($name)), 0, 60);
    }

    /** Uppercase A-Z only, max 6 characters; anything else is stripped, never rejected (blanks are valid). */
    public static function sanitizeCode(string $code): string
    {
        $upper   = strtoupper(trim(sanitize_text_field($code)));
        $letters = preg_replace('/[^A-Z]/', '', $upper) ?? '';

        return mb_substr($letters, 0, 6);
    }

    /**
     * null/empty/0 is a valid Clear. A negative id, or one that is not a real
     * image attachment, is `false` — the caller must fail the whole Save closed
     * rather than silently store null, or a rejected file would look like a
     * successful Clear instead of the error it is.
     */
    public static function resolveAttachmentId(mixed $id): int|false|null
    {
        if ($id === null || $id === '') {
            return null;
        }

        $id = (int) $id;

        if ($id === 0) {
            return null;
        }

        if ($id < 0) {
            return false;
        }

        return wp_attachment_is_image($id) ? $id : false;
    }

    /**
     * null/empty is a valid Clear. Anything else must be a well-formed key of
     * an image Account Station itself stored, or the whole Save fails closed
     * (`false`) — a mistyped or foreign key never silently becomes a Clear.
     */
    public static function resolveMediaId(mixed $id, AccountMedia $media): string|false|null
    {
        if ($id === null || $id === '') {
            return null;
        }

        return $media->exists($id) ? (string) $id : false;
    }

    /** Brand has no required field — blanks are explicitly valid, so it is always settleable. */
    public static function isBrandComplete(): bool
    {
        return true;
    }

    /** Pure, derived-only: never stored, resolved fresh from WordPress on every read. */
    public static function resolveAttachmentUrl(?int $id): ?string
    {
        if ($id === null) {
            return null;
        }

        $url = wp_get_attachment_url($id);

        return $url === false ? null : (string) $url;
    }

    /**
     * Adds read-only `logo_url`/`favicon_url` presentation fields alongside the
     * authoritative references, for every Brand shape the controller emits
     * (canonical, draft). An Account-owned image resolves first; a legacy
     * WordPress attachment id still resolves for a Brand saved before Account
     * owned its media. The picker UI needs a URL to preview an image it did
     * not just upload itself in this session; the ids remain the only fields
     * a Save payload ever writes back.
     *
     * @param array{name: string, code: string, logo_attachment_id: ?int, favicon_attachment_id: ?int, logo_media_id: ?string, favicon_media_id: ?string} $brand
     */
    public static function presentBrand(array $brand, AccountMedia $media): array
    {
        // A draft stored before the media-reference fields existed lacks those keys.
        $brand += ['logo_media_id' => null, 'favicon_media_id' => null];

        return $brand + [
            'logo_url'    => $media->urlFor($brand['logo_media_id']) ?? self::resolveAttachmentUrl($brand['logo_attachment_id']),
            'favicon_url' => $media->urlFor($brand['favicon_media_id']) ?? self::resolveAttachmentUrl($brand['favicon_attachment_id']),
        ];
    }
}
