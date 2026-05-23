<?php

namespace CompuZign\Platform\Modules\CostBuilder;

use CompuZign\Platform\Modules\CostBuilder\Http\CostBuilderController;
use CompuZign\Platform\Modules\CostBuilder\Repositories\ServiceRepository;
use CompuZign\Platform\Modules\CostBuilder\Services\CatalogImporter;
use CompuZign\Platform\Modules\CostBuilder\Services\PricingBuilder;

class CostBuilderModule
{
    public function register(): void
    {
        if (!defined('COMPUZIGN_COST_BUILDER_PATH')) {
            define('COMPUZIGN_COST_BUILDER_PATH', COMPUZIGN_APP_PATH . 'modules/cost-builder/');
            define('COMPUZIGN_COST_BUILDER_URL',  COMPUZIGN_PLUGIN_URL . 'app/modules/cost-builder/');
        }

        // Phase 1: importer.php self-loads meta-fields.php, which handles post meta
        // registration. MetaSchema::register() replaces this in Phase 2.
        $importerFile = COMPUZIGN_COST_BUILDER_PATH . 'includes/importer.php';
        if (file_exists($importerFile)) {
            require_once $importerFile;
        }

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
