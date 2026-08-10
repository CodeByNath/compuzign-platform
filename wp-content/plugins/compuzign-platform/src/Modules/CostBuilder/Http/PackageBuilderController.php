<?php

namespace CompuZign\Platform\Modules\CostBuilder\Http;

use CompuZign\Platform\Modules\CostBuilder\Services\PackageFamilyPricingBuilder;

/** Narrow, read-only public endpoint for Family-assigned Tier systems. */
final class PackageBuilderController
{
    public function __construct(private PackageFamilyPricingBuilder $builder) {}

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
    }

    public function getPackageBuilder(\WP_REST_Request $request): \WP_REST_Response
    {
        return rest_ensure_response($this->builder->buildResponse());
    }
}
