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
                // project-work/2026-09-06-tier-catalogue-admin-ux-
                // consolidation.md ("Reject primary-bound Upgrade cue...") —
                // optional composable Edition identity; null/absent means
                // the occupant's own Default declaration, exactly today's
                // existing behavior.
                'edition_id' => ['required' => false, 'type' => ['string', 'null']],
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
        $editionIdParam = $request->get_param('edition_id');
        $editionId = is_string($editionIdParam) && $editionIdParam !== '' ? sanitize_text_field($editionIdParam) : null;
        return rest_ensure_response($this->packages->resolveComposableOfferSelection($familyId, $choice, $editionId));
    }
}
