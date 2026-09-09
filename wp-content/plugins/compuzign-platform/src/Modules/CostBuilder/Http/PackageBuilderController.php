<?php

namespace CompuZign\Platform\Modules\CostBuilder\Http;

use CompuZign\Platform\Modules\CostBuilder\Services\PackageFamilyPricingBuilder;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;

/** Narrow, read-only public endpoint for Family-assigned Tier systems. */
final class PackageBuilderController
{
    public function __construct(
        private PackageFamilyPricingBuilder $builder,
        private PackageRepository $packages
    ) {}

    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        register_rest_route('compuzign/v1', '/package-builder', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getPackageBuilder'],
            'permission_callback' => '__return_true',
        ]);
        // Phase 2B1 — customer-safe preview/resolve for the composable Tier
        // occupant's Add/Remove/quantity candidate. No auth beyond what
        // /package-builder itself already exposes: PackageRepository::
        // resolveComposableOfferSelection() re-derives the exact same
        // active-Family/Tier-Instance authorization boundary before ever
        // touching the requested occupant.
        register_rest_route('compuzign/v1', '/package-builder/composable-preview', [
            'methods'             => 'POST',
            'callback'            => [$this, 'postComposablePreview'],
            'permission_callback' => '__return_true',
            'args'                => [
                'family_id'  => ['required' => true, 'type' => 'string'],
                'choice'     => ['required' => true, 'type' => 'array'],
                // Composable Edition cue (project-work/2026-09-06-tier-
                // catalogue-admin-ux-consolidation.md) — optional, null/absent
                // resolves the occupant's own Default exactly as before.
                'edition_id' => ['required' => false, 'type' => 'string'],
            ],
        ]);
    }

    public function getPackageBuilder(\WP_REST_Request $request): \WP_REST_Response
    {
        return rest_ensure_response($this->builder->buildResponse());
    }

    public function postComposablePreview(\WP_REST_Request $request): \WP_REST_Response
    {
        $familyId = sanitize_text_field((string) $request->get_param('family_id'));
        $choiceParam = $request->get_param('choice');
        $choice = is_array($choiceParam) ? $choiceParam : [];
        // is_scalar guard (same convention `choice`'s is_array() above
        // already uses): this route's own `edition_id` arg declares
        // 'type' => 'string' but — like every arg here — carries no
        // validate_callback, so WP never actually rejects a non-string
        // value before it reaches this cast. An unguarded
        // (string) $editionIdParam on a genuinely non-scalar value (an
        // array — the shape WP's own query-string bracket parsing or a
        // malformed client can still deliver) raises a PHP "Array to
        // string conversion" Warning here; on a host with display_errors
        // on, that Warning is echoed into the response body BEFORE the
        // JSON rest_ensure_response() emits below, corrupting it into
        // exactly the malformed non-JSON response
        // ComposableOfferBrowser.tsx's res.json() rejects on — the
        // Promise-rejection `.catch()` path, not this endpoint's own
        // structured ok:false. A non-scalar value can never legitimately
        // name a real Edition id anyway, so treating it as absent (same
        // as omitted/null) is a safe, behavior-preserving guard for every
        // well-formed request.
        $editionIdParam = $request->get_param('edition_id');
        $editionId = is_scalar($editionIdParam) ? sanitize_text_field((string) $editionIdParam) : null;
        return rest_ensure_response($this->packages->resolveComposableOfferSelection($familyId, $choice, $editionId));
    }
}
