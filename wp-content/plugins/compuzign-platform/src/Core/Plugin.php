<?php

namespace CompuZign\Platform\Core;

use CompuZign\Platform\Modules\CostBuilder\CostBuilderModule;

final class Plugin
{
    private static bool $booted = false;

    public static function boot(): void
    {
        if (self::$booted) {
            return;
        }
        self::$booted = true;

        (new PostTypeRegistrar())->register();
        (new TaxonomyRegistrar())->register();
        (new AssetLoader())->register();
        (new CostBuilderModule())->register();

        add_action('rest_api_init', [self::class, 'registerCoreRoutes']);
    }

    public static function registerCoreRoutes(): void
    {
        register_rest_route('compuzign/v1', '/health', [
            'methods'             => 'GET',
            'callback'            => [self::class, 'healthCheck'],
            'permission_callback' => '__return_true',
        ]);
    }

    public static function healthCheck(\WP_REST_Request $request): \WP_REST_Response
    {
        return rest_ensure_response([
            'success' => true,
            'message' => 'CompuZign API is healthy.',
            'version' => COMPUZIGN_PLUGIN_VERSION,
        ]);
    }
}
