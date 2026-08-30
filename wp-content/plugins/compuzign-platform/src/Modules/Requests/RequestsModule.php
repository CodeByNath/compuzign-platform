<?php

namespace CompuZign\Platform\Modules\Requests;

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Modules\Requests\Http\RequestsController;
use CompuZign\Platform\Modules\Requests\Support\RequestMetaSchema;

class RequestsModule
{
    public function register(): void
    {
        (new RequestsController())->register();
        (new RequestMetaSchema())->register();

        add_shortcode('compuzign_quote_view', [$this, 'renderQuoteViewShortcode']);

        Health::register('requests',      static fn() => function_exists('wp_verify_nonce'));
        Health::register('request_store', static fn() => post_type_exists('cz_request'));
    }

    /**
     * Phase 8J-C2: mounts the secure customer quote-view page. Shares the
     * existing 'compuzign-cost-builder' script/style handles (registered by
     * AssetLoader) rather than a second build entry — QuoteViewApp and its
     * print behaviour live inside that same bundle
     * (resources/ts/modules/cost-builder.ts), the same one-bundle-multiple-
     * shortcodes pattern CostBuilderModule's own two shortcodes already use.
     */
    public function renderQuoteViewShortcode(): string
    {
        if (wp_style_is('compuzign-cost-builder', 'registered')) {
            wp_enqueue_style('compuzign-cost-builder');
        }
        if (wp_script_is('compuzign-cost-builder', 'registered')) {
            wp_enqueue_script('compuzign-cost-builder');
        }

        return '<div id="compuzign-quote-view" class="cz-container"></div>';
    }
}
