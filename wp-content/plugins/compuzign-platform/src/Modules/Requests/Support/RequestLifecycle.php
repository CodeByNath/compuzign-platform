<?php

namespace CompuZign\Platform\Modules\Requests\Support;

class RequestLifecycle
{
    public const STATUS_NEW       = 'new';
    public const STATUS_REVIEWING = 'reviewing';
    public const STATUS_QUOTED    = 'quoted';
    public const STATUS_CLOSED    = 'closed';

    public const ACTIVE_STATUSES = [
        self::STATUS_NEW,
        self::STATUS_REVIEWING,
        self::STATUS_QUOTED,
        self::STATUS_CLOSED,
    ];

    public static function isValid(string $status): bool
    {
        return in_array($status, self::ACTIVE_STATUSES, true);
    }

    public static function defaultStatus(): string
    {
        return self::STATUS_NEW;
    }

    /** Human-readable label for display. */
    public static function label(string $status): string
    {
        return match ($status) {
            self::STATUS_NEW       => 'New',
            self::STATUS_REVIEWING => 'Reviewing',
            self::STATUS_QUOTED    => 'Quoted',
            self::STATUS_CLOSED    => 'Closed',
            default                => ucfirst($status),
        };
    }
}
