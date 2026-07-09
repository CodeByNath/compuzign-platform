<?php

namespace CompuZign\Platform\Modules\Admin\Support;

/**
 * CategoryMeta — the Category station's term-meta model (S6 Phase A).
 *
 * Owns the consolidated `cz_category_meta` envelope on `cz_service_category`
 * terms — the Category mirror of the service's `cz_service_meta`, adapted to
 * one owned module (`overview`):
 *
 *   platform_status           active | disabled | archived | trashed
 *   previous_platform_status  '' | active | disabled  (engine-computed restore context)
 *   module_status             { overview: not-configured | pending | settled }
 *   overview_draft            { name, description } — or absent (slug excluded, D5)
 *
 * Rules this class enforces:
 *
 *   - It is the ONLY reader/writer of `cz_category_meta`. Controllers and
 *     projections go through it; raw get_term_meta reads elsewhere would fork
 *     the lazy defaults.
 *   - Lazy defaults (D2): a term with no station meta reads as
 *     platform_status 'active', overview 'settled'. Existing categories keep
 *     today's behaviour with zero migration; deleting this class restores
 *     current behaviour exactly.
 *   - Transitions are computed by StationLifecycle (canonical participation,
 *     same as Service). This class never decides a transition — it persists
 *     engine results only.
 *   - WordPress owns the term itself: name/slug/relationships are never
 *     written here. The settled description lives in the CompuZign-owned
 *     `cz_category_description` term meta (the inline category flows'
 *     existing key), read here for projection/derivation only.
 *   - Delete guard (D6): permanent delete is blocked while any cz_service
 *     post — in any status — is assigned to the term. The count predicate
 *     lives here; status legality (trashed-only) stays with
 *     StationLifecycle::canDelete.
 */
final class CategoryMeta
{
    public const META_KEY          = 'cz_category_meta';
    public const TAXONOMY          = 'cz_service_category';
    public const DESCRIPTION_META  = 'cz_category_description';
    public const SERVICE_POST_TYPE = 'cz_service';

    /**
     * station_role distinguishes the two stations sharing this taxonomy
     * (Category Group audit, Option B): a 'group' term is a grouping/bundling
     * parent, never assignable to a service; a 'category' term is the existing
     * flat, service-assignable station. Missing/unrecognised → 'category' (D2-style
     * lazy default — existing categories keep today's behaviour with zero migration).
     */
    public const STATION_ROLE_GROUP    = 'group';
    public const STATION_ROLE_CATEGORY = 'category';

    public const ALLOWED_STATION_ROLES = [
        self::STATION_ROLE_GROUP,
        self::STATION_ROLE_CATEGORY,
    ];

    /** Storable lifecycle statuses — canonical participation, no 'draft' (same as Service). */
    public const ALLOWED_PLATFORM_STATUSES = [
        StationLifecycle::STATUS_ACTIVE,
        StationLifecycle::STATUS_DISABLED,
        StationLifecycle::STATUS_ARCHIVED,
        StationLifecycle::STATUS_TRASHED,
    ];

    /** previous_platform_status may only hold a live state (or '' for none). */
    private const ALLOWED_PREVIOUS_STATUSES = StationLifecycle::LIVE_STATUSES;

    // ── Lazy defaults (D2) ────────────────────────────────────────────────────

    /**
     * The no-meta projection: active/settled, no draft. This MUST equal
     * today's implicit behaviour of a plain category (visible, complete) —
     * default drift here flips existing categories invisible.
     */
    public static function defaults(): array
    {
        return [
            'platform_status'          => StationLifecycle::STATUS_ACTIVE,
            'previous_platform_status' => '',
            'module_status'            => [
                'overview' => StationLifecycle::MODULE_SETTLED,
            ],
            'station_role'             => self::STATION_ROLE_CATEGORY,
        ];
    }

    // ── Envelope read/write ───────────────────────────────────────────────────

    /** Read the envelope with lazy defaults applied — always the full sanitized shape. */
    public static function read(int $termId): array
    {
        return self::sanitize(get_term_meta($termId, self::META_KEY, true));
    }

    /** Sanitize and persist the envelope; returns the stored shape. */
    public static function write(int $termId, array $meta): array
    {
        $clean = self::sanitize($meta);
        update_term_meta($termId, self::META_KEY, $clean);

        return $clean;
    }

    /** Normalise any raw value into the full envelope shape over the D2 defaults. */
    public static function sanitize(mixed $meta): array
    {
        $defaults = self::defaults();

        if (!is_array($meta) || $meta === []) {
            return $defaults;
        }

        $rawStatus      = sanitize_text_field((string) ($meta['platform_status'] ?? ''));
        $platformStatus = in_array($rawStatus, self::ALLOWED_PLATFORM_STATUSES, true)
                          ? $rawStatus
                          : $defaults['platform_status'];

        $rawPrev                = sanitize_text_field((string) ($meta['previous_platform_status'] ?? ''));
        $previousPlatformStatus = in_array($rawPrev, self::ALLOWED_PREVIOUS_STATUSES, true) ? $rawPrev : '';

        $rawModuleStatus = is_array($meta['module_status'] ?? null) ? $meta['module_status'] : [];
        $rawOverview     = $rawModuleStatus['overview'] ?? '';
        $moduleStatus    = [
            'overview' => in_array($rawOverview, StationLifecycle::MODULE_STATUSES, true)
                          ? $rawOverview
                          : $defaults['module_status']['overview'],
        ];

        $rawRole  = sanitize_text_field((string) ($meta['station_role'] ?? ''));
        $role     = in_array($rawRole, self::ALLOWED_STATION_ROLES, true)
                    ? $rawRole
                    : $defaults['station_role'];

        $clean = [
            'platform_status'          => $platformStatus,
            'previous_platform_status' => $previousPlatformStatus,
            'module_status'            => $moduleStatus,
            'station_role'             => $role,
        ];

        if (is_array($meta['overview_draft'] ?? null) && $meta['overview_draft'] !== []) {
            $clean['overview_draft'] = [
                'name'        => sanitize_text_field((string) ($meta['overview_draft']['name'] ?? '')),
                'description' => sanitize_textarea_field((string) ($meta['overview_draft']['description'] ?? '')),
            ];
        }

        return $clean;
    }

    // ── Lifecycle read/write ──────────────────────────────────────────────────

    public static function status(int $termId): string
    {
        return self::read($termId)['platform_status'];
    }

    /** Station role — 'group' | 'category'. Missing/unrecognised → 'category' (lazy default). */
    public static function role(int $termId): string
    {
        return self::read($termId)['station_role'];
    }

    /** Restore context for the engine — null when none captured. */
    public static function previousStatus(int $termId): ?string
    {
        $previous = self::read($termId)['previous_platform_status'];

        return $previous === '' ? null : $previous;
    }

    /**
     * Persist an engine-computed transition result
     * (['status' => ..., 'previous_status' => ...] from StationLifecycle).
     * Callers compute the transition first — e.g.
     * StationLifecycle::applyStatus(CategoryMeta::status($id), $target, CategoryMeta::previousStatus($id)).
     */
    public static function applyStatusChange(int $termId, array $change): array
    {
        $meta = self::read($termId);

        $meta['platform_status']          = (string) $change['status'];
        $meta['previous_platform_status'] = (string) ($change['previous_status'] ?? '');

        return self::write($termId, $meta);
    }

    // ── Overview draft envelope ───────────────────────────────────────────────

    public static function overviewDraft(int $termId): ?array
    {
        return self::read($termId)['overview_draft'] ?? null;
    }

    public static function hasOverviewDraft(int $termId): bool
    {
        return self::overviewDraft($termId) !== null;
    }

    /** Store the draft and mark overview pending — canonical term data untouched. */
    public static function saveOverviewDraft(int $termId, string $name, string $description): array
    {
        $meta = self::read($termId);

        $meta['overview_draft'] = ['name' => $name, 'description' => $description];
        $meta['module_status']['overview'] = StationLifecycle::MODULE_PENDING;

        return self::write($termId, $meta);
    }

    /**
     * Drop the draft and re-derive overview status from the term's settled
     * state. Serves both revert (settled data unchanged) and the meta side of
     * settle (caller commits the draft to the term first, then clears here).
     */
    public static function clearOverviewDraft(int $termId): array
    {
        $meta = self::read($termId);

        unset($meta['overview_draft']);
        $meta['module_status']['overview'] = self::deriveOverviewStatus($termId);

        return self::write($termId, $meta);
    }

    // ── Overview completeness ─────────────────────────────────────────────────

    /** Overview completeness = name only; description is OPTIONAL. */
    public static function isOverviewComplete(string $name, string $description): bool
    {
        return trim($name) !== '';
    }

    /** Settled-state derivation: settled when complete, not-configured otherwise. */
    public static function deriveOverviewStatus(int $termId): string
    {
        $term        = get_term($termId, self::TAXONOMY);
        $name        = $term instanceof \WP_Term ? $term->name : '';
        $description = (string) get_term_meta($termId, self::DESCRIPTION_META, true);

        return self::isOverviewComplete($name, $description)
            ? StationLifecycle::MODULE_SETTLED
            : StationLifecycle::MODULE_NOT_CONFIGURED;
    }

    // ── Draft-preferred projection ────────────────────────────────────────────

    /** The response projection: draft-preferred overview fields + lifecycle envelope. */
    public static function projection(\WP_Term $term): array
    {
        $termId = (int) $term->term_id;
        $meta   = self::read($termId);
        $draft  = $meta['overview_draft'] ?? null;

        $settledName        = html_entity_decode($term->name, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $settledDescription = (string) get_term_meta($termId, self::DESCRIPTION_META, true);

        return [
            'id'                       => $termId,
            'name'                     => $draft !== null ? $draft['name'] : $settledName,
            'slug'                     => (string) $term->slug,
            'description'              => $draft !== null ? $draft['description'] : $settledDescription,
            'platform_status'          => $meta['platform_status'],
            'previous_platform_status' => $meta['previous_platform_status'],
            'module_status'            => $meta['module_status'],
            'has_draft'                => $draft !== null,
            'station_role'             => $meta['station_role'],
            // Category-role projection only: the parent group term id, or null when
            // ungrouped (WP's own parent=0 convention). Meaningless on a group term
            // (groups are always parent 0 — no nested groups) so it is not derived there.
            'group_id'                 => $meta['station_role'] === self::STATION_ROLE_CATEGORY
                ? ((int) $term->parent > 0 ? (int) $term->parent : null)
                : null,
        ];
    }

    // ── Delete guard (D6) ─────────────────────────────────────────────────────

    /**
     * Count of cz_service posts assigned to the term — any status (platform
     * lifecycle lives in cz_service_meta, so no status filter applies; a
     * binned service still blocks the delete). Non-zero blocks permanent
     * delete: wp_delete_term would silently sever the relationships, so
     * detachment must be an explicit prior step.
     */
    public static function assignedServiceCount(int $termId): int
    {
        $ids = get_posts([
            'post_type'              => self::SERVICE_POST_TYPE,
            'post_status'            => 'any',
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
            'update_post_meta_cache' => false,
            'tax_query'              => [
                [
                    'taxonomy' => self::TAXONOMY,
                    'field'    => 'term_id',
                    'terms'    => $termId,
                ],
            ],
        ]);

        return count($ids);
    }

    /**
     * Count of child category terms under a group term (any status) — the
     * group-side delete guard, term-hierarchy equivalent of
     * assignedServiceCount(). A non-zero count blocks permanent delete of a
     * group: detachment (moving each child back to parent 0 or another group)
     * must be an explicit prior step, same rationale as D6.
     */
    public static function assignedCategoryCount(int $groupTermId): int
    {
        $children = get_terms([
            'taxonomy'   => self::TAXONOMY,
            'parent'     => $groupTermId,
            'hide_empty' => false,
            'fields'     => 'ids',
        ]);

        return is_array($children) ? count($children) : 0;
    }
}
