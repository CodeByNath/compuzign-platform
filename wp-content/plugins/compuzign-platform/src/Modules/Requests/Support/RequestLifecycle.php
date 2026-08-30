<?php

namespace CompuZign\Platform\Modules\Requests\Support;

/**
 * CRM-1 lifecycle for a durable Request: one field, three states.
 * pending -> approved, pending -> cancelled. A same-state write is
 * idempotent; the opposite terminal transition is rejected.
 */
class RequestLifecycle
{
    public const STATUS_PENDING   = 'pending';
    public const STATUS_APPROVED  = 'approved';
    public const STATUS_CANCELLED = 'cancelled';

    public const ACTIVE_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_APPROVED,
        self::STATUS_CANCELLED,
    ];

    /**
     * Read-boundary compatibility only, for pre-CRM-1A `cz_request_status = new`
     * records written by the retired admin /accept bridge. `reviewing`/`quoted`/
     * `closed` had no active writer anywhere in production source and are
     * deliberately not mapped — there is no evidence to justify a migration
     * target for a state nothing ever wrote.
     *
     * This is a read-time normalization only: the stored postmeta value is left
     * untouched at `new` until an actual CRM mutation (updateStatus()) writes the
     * new vocabulary forward. There is exactly one active lifecycle field.
     */
    private const LEGACY_STATUS_MAP = [
        'new' => self::STATUS_PENDING,
    ];

    public static function normalizeLegacy(string $status): string
    {
        return self::LEGACY_STATUS_MAP[$status] ?? $status;
    }

    public static function isValid(string $status): bool
    {
        return in_array($status, self::ACTIVE_STATUSES, true);
    }

    public static function defaultStatus(): string
    {
        return self::STATUS_PENDING;
    }

    /**
     * Whether a transition from $from to $to is allowed under the CRM-1
     * transition table: pending->approved, pending->cancelled, a repeat of
     * the current state (idempotent success), but never the opposite
     * terminal transition (approved<->cancelled).
     */
    public static function canTransition(string $from, string $to): bool
    {
        if (!self::isValid($from) || !self::isValid($to)) {
            return false;
        }

        if ($from === $to) {
            return true;
        }

        return $from === self::STATUS_PENDING
            && ($to === self::STATUS_APPROVED || $to === self::STATUS_CANCELLED);
    }

    /** Human-readable label for display. */
    public static function label(string $status): string
    {
        return match ($status) {
            self::STATUS_PENDING   => 'Pending',
            self::STATUS_APPROVED  => 'Approved',
            self::STATUS_CANCELLED => 'Cancelled',
            default                => ucfirst($status),
        };
    }
}
