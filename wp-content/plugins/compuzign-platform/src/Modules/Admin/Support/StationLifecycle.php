<?php

namespace CompuZign\Platform\Modules\Admin\Support;

/**
 * StationLifecycle — the shared station lifecycle engine.
 *
 * Owns lifecycle TRANSITIONS only. It never touches meta keys, payloads, or
 * business rules — each station (Service, Promotion instance, Tier occupant)
 * owns its own schema and persistence; it calls this engine to validate and
 * compute a transition, then persists the result itself.
 *
 * Status vocabulary (a station may use a subset — Service never uses 'draft'):
 *   draft     never published (pre-live)
 *   active    live
 *   disabled  published-capable but off (also the universal restore landing state)
 *   archived  in the bin, restorable
 *   trashed   in the bin, restorable, permanently deletable
 *
 * Transition table (the only legal status writes anywhere):
 *   publish : draft|disabled → active
 *   toggle  : active ⇄ disabled
 *   archive : active|disabled → archived          (captures previous_status)
 *   trash   : active|disabled|archived → trashed  (previous_status preserved on archived→trashed)
 *   restore : archived|trashed → disabled         (never to active; clears previous_status)
 *   delete  : legal only from trashed             (engine validates; station removes)
 *
 * The module layer (drafts / module_status: not-configured → pending → settled)
 * is orthogonal to the travel state and remains station-owned; the engine only
 * defines the shared status vocabulary for it.
 */
final class StationLifecycle
{
    public const STATUS_DRAFT    = 'draft';
    public const STATUS_ACTIVE   = 'active';
    public const STATUS_DISABLED = 'disabled';
    public const STATUS_ARCHIVED = 'archived';
    public const STATUS_TRASHED  = 'trashed';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_ACTIVE,
        self::STATUS_DISABLED,
        self::STATUS_ARCHIVED,
        self::STATUS_TRASHED,
    ];

    /** Live states — visible to lifecycle actions, not in the bin. */
    public const LIVE_STATUSES = [self::STATUS_ACTIVE, self::STATUS_DISABLED];

    /** Bin states — out of circulation, restorable. */
    public const BIN_STATUSES = [self::STATUS_ARCHIVED, self::STATUS_TRASHED];

    /** Shared module-transition vocabulary (drafts layer, orthogonal to travel). */
    public const MODULE_NOT_CONFIGURED = 'not-configured';
    public const MODULE_PENDING        = 'pending';
    public const MODULE_SETTLED        = 'settled';
    public const MODULE_STATUSES       = [
        self::MODULE_NOT_CONFIGURED,
        self::MODULE_PENDING,
        self::MODULE_SETTLED,
    ];

    // ── Guards ────────────────────────────────────────────────────────────────

    public static function isValidStatus(string $status): bool
    {
        return in_array($status, self::STATUSES, true);
    }

    public static function isLive(string $status): bool
    {
        return in_array($status, self::LIVE_STATUSES, true);
    }

    public static function isBinned(string $status): bool
    {
        return in_array($status, self::BIN_STATUSES, true);
    }

    public static function canPublish(string $current): bool
    {
        return $current === self::STATUS_DRAFT || $current === self::STATUS_DISABLED;
    }

    public static function canToggle(string $current): bool
    {
        return self::isLive($current);
    }

    public static function canArchive(string $current): bool
    {
        return self::isLive($current);
    }

    public static function canTrash(string $current): bool
    {
        return self::isLive($current) || $current === self::STATUS_ARCHIVED;
    }

    public static function canRestore(string $current): bool
    {
        return self::isBinned($current);
    }

    public static function canDelete(string $current): bool
    {
        return $current === self::STATUS_TRASHED;
    }

    // ── Transition computations ───────────────────────────────────────────────
    // Each returns ['status' => ..., 'previous_status' => ...] for the station
    // to persist, or null when the transition is illegal from $current.

    /** publish: draft|disabled → active. previous_status untouched. */
    public static function publish(string $current, ?string $previous = null): ?array
    {
        if (!self::canPublish($current)) {
            return null;
        }
        return ['status' => self::STATUS_ACTIVE, 'previous_status' => $previous];
    }

    /** toggle: active ⇄ disabled. previous_status untouched. */
    public static function toggle(string $current, ?string $previous = null): ?array
    {
        if (!self::canToggle($current)) {
            return null;
        }
        $next = $current === self::STATUS_ACTIVE ? self::STATUS_DISABLED : self::STATUS_ACTIVE;
        return ['status' => $next, 'previous_status' => $previous];
    }

    /** archive: active|disabled → archived. Captures previous_status. */
    public static function archive(string $current, ?string $previous = null): ?array
    {
        if (!self::canArchive($current)) {
            return null;
        }
        return [
            'status'          => self::STATUS_ARCHIVED,
            'previous_status' => self::capturePrevious($current, $previous),
        ];
    }

    /** trash: active|disabled|archived → trashed. archived→trashed preserves the original previous_status. */
    public static function trash(string $current, ?string $previous = null): ?array
    {
        if (!self::canTrash($current)) {
            return null;
        }
        return [
            'status'          => self::STATUS_TRASHED,
            'previous_status' => self::capturePrevious($current, $previous),
        ];
    }

    /** restore: archived|trashed → disabled — never straight to active. Clears previous_status. */
    public static function restore(string $current): ?array
    {
        if (!self::canRestore($current)) {
            return null;
        }
        return ['status' => self::STATUS_DISABLED, 'previous_status' => null];
    }

    /**
     * The previous_status capture rule shared by every bin entry: capture only
     * when leaving a live state; a bin→bin move keeps the original so restore
     * context is never overwritten.
     */
    public static function capturePrevious(string $current, ?string $previous): ?string
    {
        return self::isLive($current) ? $current : $previous;
    }

    /**
     * Permissive status application — the canonical Service `/status` endpoint's
     * historical semantics: any valid target may be requested directly; the engine
     * computes the previous_status capture for bin entries and leaves it untouched
     * otherwise. The strict per-action transitions above are the target model for
     * new stations; this exists so the canonical station's endpoint behaviour
     * stays byte-identical through the engine extraction.
     */
    public static function applyStatus(string $current, string $target, ?string $previous = null): array
    {
        $nextPrevious = in_array($target, self::BIN_STATUSES, true)
            ? self::capturePrevious($current, $previous)
            : $previous;

        return ['status' => $target, 'previous_status' => $nextPrevious];
    }
}
