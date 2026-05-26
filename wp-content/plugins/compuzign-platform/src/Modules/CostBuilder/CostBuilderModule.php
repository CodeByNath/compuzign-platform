<?php

namespace CompuZign\Platform\Modules\CostBuilder;

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Modules\CostBuilder\Http\CostBuilderController;
use CompuZign\Platform\Modules\CostBuilder\Repositories\ServiceRepository;
use CompuZign\Platform\Modules\CostBuilder\Services\CatalogImporter;
use CompuZign\Platform\Modules\CostBuilder\Services\PricingBuilder;
use CompuZign\Platform\Modules\CostBuilder\Support\MetaSchema;

class CostBuilderModule
{
    public function register(): void
    {
        if (!defined('COMPUZIGN_COST_BUILDER_PATH')) {
            define('COMPUZIGN_COST_BUILDER_PATH', COMPUZIGN_APP_PATH . 'modules/cost-builder/');
            define('COMPUZIGN_COST_BUILDER_URL',  COMPUZIGN_PLUGIN_URL . 'app/modules/cost-builder/');
        }

        // importer.php loads meta-fields.php (helper functions for import/normalise).
        // MetaSchema::register() owns post meta registration; meta-fields.php no longer hooks.
        $importerFile = COMPUZIGN_COST_BUILDER_PATH . 'includes/importer.php';
        if (file_exists($importerFile)) {
            require_once $importerFile;
        }

        (new MetaSchema())->register();

        // Load all logic files (seed scripts, one-time data ops)
        $logicDir = COMPUZIGN_COST_BUILDER_PATH . 'logic';
        if (is_dir($logicDir)) {
            foreach (glob(trailingslashit($logicDir) . '*.php') as $logicFile) {
                require_once $logicFile;
            }
        }

        $repository = new ServiceRepository();
        $builder    = new PricingBuilder($repository);
        $importer   = new CatalogImporter();

        (new CostBuilderController($builder, $importer))->register();

        add_shortcode('compuzign_cost_builder', [$this, 'renderShortcode']);

        Health::register('cost_builder', static fn() => post_type_exists('cz_service'));
    }

    public function renderShortcode(): string
    {
        if (wp_style_is('compuzign-cost-builder', 'registered')) {
            wp_enqueue_style('compuzign-cost-builder');
        }
        if (wp_script_is('compuzign-cost-builder', 'registered')) {
            wp_enqueue_script('compuzign-cost-builder');
        }

        $template = COMPUZIGN_COST_BUILDER_PATH . 'templates/cost-builder.php';

        ob_start();
        if (file_exists($template)) {
            include $template;
        } else {
            echo '<div class="compuzign-cost-builder-placeholder">Cost Builder is coming soon.</div>';
        }
        return ob_get_clean();
    }
}
