<?php

namespace CompuZign\Platform\Core;

use CompuZign\Platform\Modules\Admin\AdminModule;
use CompuZign\Platform\Modules\CostBuilder\CostBuilderModule;
use CompuZign\Platform\Modules\Homepage\HomepageModule;
use CompuZign\Platform\Modules\Requests\RequestsModule;
use CompuZign\Platform\Core\Health;

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
        (new MailService())->register();
        (new AssetLoader())->register();
        (new CostBuilderModule())->register();
        (new HomepageModule())->register();
        (new RequestsModule())->register();
        (new AdminModule())->register();

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
        $checks     = Health::run();
        $allHealthy = empty($checks) || !in_array(false, $checks, true);

        return rest_ensure_response([
            'success' => $allHealthy,
            'status'  => $allHealthy ? 'healthy' : 'degraded',
            'version' => defined('COMPUZIGN_PLUGIN_VERSION') ? COMPUZIGN_PLUGIN_VERSION : null,
            'checks'  => $checks,
        ]);
    }
}
