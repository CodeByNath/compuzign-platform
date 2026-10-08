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

    public static function brandArgs(): array
    {
        return [
            'name'                   => ['required' => false, 'type' => 'string'],
            'code'                   => ['required' => false, 'type' => 'string'],
            'logo_attachment_id'     => ['required' => false, 'type' => ['integer', 'null']],
            'favicon_attachment_id'  => ['required' => false, 'type' => ['integer', 'null']],
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
     * null/empty is a valid Clear. A non-empty value that is not a real image
     * attachment is `false` — the caller must fail the whole Save closed rather
     * than silently store null, or a rejected file would look like a successful
     * Clear instead of the error it is.
     */
    public static function resolveAttachmentId(mixed $id): int|false|null
    {
        if ($id === null || $id === '' || (int) $id <= 0) {
            return null;
        }

        $id = (int) $id;

        return wp_attachment_is_image($id) ? $id : false;
    }

    /** Brand has no required field — blanks are explicitly valid, so it is always settleable. */
    public static function isBrandComplete(): bool
    {
        return true;
    }
}
