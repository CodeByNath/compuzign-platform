<?php

namespace CompuZign\Platform\Modules\Service\Support;

use CompuZign\Platform\Modules\CostBuilder\Support\MetaSchema;

/**
 * ServiceSchema — the Service entity's shape: storage keys, module vocabulary,
 * and REST request definitions.
 *
 * Extracted from AdminServicesController when the Service module was
 * established. Every value here is a verbatim lift; this class deliberately
 * defines no new rule. Required flags, defaults, sanitizers, enum values, and
 * optionality are the ones the routes already shipped with, and the route
 * baseline (tests/service-route-baseline.php) compares the resulting argument
 * arrays deeply, so any drift fails loudly.
 *
 * WHAT LIVES HERE
 *   - the post meta and draft keys the Service owns;
 *   - the module vocabulary (overview/inclusions/faqs) and its default status;
 *   - the REST argument definitions for the 14 Service routes.
 *
 * WHAT DOES NOT
 *   - Route *paths*. Those stay as literals in ServiceController so a URL
 *     remains greppable from the route registration itself.
 *   - cz_service_pricing. Cost Builder is its sole authority; the Service module
 *     neither reads nor writes it. The MetaSchema import below is only for the
 *     shared platform_status vocabulary, which predates this module.
 *
 * Argument arrays are assembled from small shared pieces (identity(),
 * overviewFields()) because the routes already repeat those shapes verbatim.
 * Key order is irrelevant to WordPress and to the baseline, which sorts maps.
 */
final class ServiceSchema
{
    // ── Storage ──────────────────────────────────────────────────────────────
    public const POST_TYPE         = 'cz_service';
    public const CATEGORY_TAXONOMY = 'cz_service_category';
    public const META_KEY          = 'cz_service_meta';
    public const META_INCLUSIONS   = 'cz_service_inclusions';
    public const META_FAQS         = 'cz_service_faqs';
    public const DRAFT_OVERVIEW    = 'cz_service_overview_draft';
    public const DRAFT_INCLUSIONS  = 'cz_service_inclusions_draft';
    public const DRAFT_FAQS        = 'cz_service_faqs_draft';

    // ── Module vocabulary ────────────────────────────────────────────────────
    /** Settle order is significant: overview settles before the pools. */
    public const MODULES = ['overview', 'inclusions', 'faqs'];

    /** The modules backed by a Service-owned pool, and so subject to the settle guard. */
    public const POOL_MODULES = ['inclusions', 'faqs'];

    /** Bin states the catalog list can filter to. */
    public const BIN_STATUSES = ['archived', 'trashed'];

    /** Accepted on the deprecated post_status parameter of the status route. */
    public const ALLOWED_POST_STATUSES = ['publish', 'draft'];

    /** overview starts pending (a draft is created with the service); pools start empty. */
    public static function defaultModuleStatus(): array
    {
        return ['overview' => 'pending', 'inclusions' => 'not-configured', 'faqs' => 'not-configured'];
    }

    /** The draft meta key backing a module, or null for an unknown module. */
    public static function draftKey(string $module): ?string
    {
        return match ($module) {
            'overview'   => self::DRAFT_OVERVIEW,
            'inclusions' => self::DRAFT_INCLUSIONS,
            'faqs'       => self::DRAFT_FAQS,
            default      => null,
        };
    }

    // ── REST request definitions ─────────────────────────────────────────────

    /** The service id, as carried by every per-service route. */
    public static function identity(): array
    {
        return ['id' => ['required' => true, 'type' => 'integer']];
    }

    /** A per-service route that also addresses one module. */
    public static function moduleIdentity(): array
    {
        return self::identity() + [
            'module' => ['required' => true, 'type' => 'string'],
        ];
    }

    /** The overview payload, shared verbatim by create and the overview draft save. */
    public static function overviewFields(): array
    {
        return [
            'title'        => ['required' => true,  'type' => 'string',
                               'sanitize_callback' => 'sanitize_text_field'],
            'excerpt'      => ['required' => false, 'type' => 'string',
                               'sanitize_callback' => 'sanitize_textarea_field'],
            'content'      => ['required' => false, 'type' => 'string',
                               'sanitize_callback' => 'wp_kses_post'],
            'category_ids' => ['required' => false, 'type' => 'array',
                               'items' => ['type' => 'integer']],
        ];
    }

    public static function listArgs(): array
    {
        return [
            'platform_status' => [
                'required' => false,
                'type'     => 'string',
                'enum'     => self::BIN_STATUSES,
            ],
        ];
    }

    public static function createArgs(): array
    {
        return self::overviewFields();
    }

    public static function updateOverviewArgs(): array
    {
        return self::identity() + self::overviewFields();
    }

    public static function updateInclusionsArgs(): array
    {
        return self::identity() + [
            'inclusions' => ['required' => true, 'type' => 'array',
                             'items' => ['type' => 'object']],
        ];
    }

    public static function updateFaqsArgs(): array
    {
        return self::identity() + [
            'faqs' => ['required' => true, 'type' => 'array',
                       'items' => ['type' => 'object']],
        ];
    }

    public static function statusArgs(): array
    {
        return self::identity() + [
            'platform_status' => [
                'required' => false,
                'type'     => 'string',
                'enum'     => MetaSchema::ALLOWED_PLATFORM_STATUSES,
            ],
            // Deprecated: kept for backward compat; ignored if platform_status is present.
            'is_active'   => ['required' => false, 'type' => 'boolean'],
            'post_status' => ['required' => false, 'type' => 'string', 'enum' => self::ALLOWED_POST_STATUSES],
        ];
    }
}
