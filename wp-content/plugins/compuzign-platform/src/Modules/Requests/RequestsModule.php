<?php

namespace CompuZign\Platform\Modules\Requests;

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Modules\Requests\Http\RequestsController;
use CompuZign\Platform\Modules\Requests\Support\RequestMetaSchema;

class RequestsModule
{
    /**
     * Phase 8J-C2 correction: the one guaranteed, code-owned public URL for
     * the secure quote-view page. This is the URL contract Phase 8J-C3 must
     * reuse (via quoteViewUrl() below) when building the emailed link — do
     * not construct a second copy of this path anywhere else.
     */
    public const QUOTE_VIEW_PATH = '/compuzign-quote-view/';

    public function register(): void
    {
        (new RequestsController())->register();
        (new RequestMetaSchema())->register();

        add_action('template_redirect', [$this, 'maybeRenderQuoteView']);

        Health::register('requests',      static fn() => function_exists('wp_verify_nonce'));
        Health::register('request_store', static fn() => post_type_exists('cz_request'));
    }

    /**
     * The Phase 8J-C3 URL contract: the fixed quote-view URL for a given
     * quote reference. The bearer view secret is never part of this —
     * it is appended client-side only, as a URL fragment, by whatever
     * builds the actual emailed link.
     */
    public static function quoteViewUrl(string $quoteRef): string
    {
        return add_query_arg('ref', $quoteRef, home_url(self::QUOTE_VIEW_PATH));
    }

    /**
     * Pure path-matching predicate, kept separate from maybeRenderQuoteView()'s
     * side-effecting render+exit so a focused contract can test the routing
     * decision directly (mirrors RequestSchema::validate() vs. sanitizeItems(),
     * QuoteViewAccess::resolve() vs. RequestsController::getQuote()).
     */
    public static function matchesQuoteViewPath(string $requestUri): bool
    {
        $requestPath = (string) wp_parse_url($requestUri, PHP_URL_PATH);

        return untrailingslashit($requestPath) === untrailingslashit(self::QUOTE_VIEW_PATH);
    }

    /**
     * Phase 8J-C2 correction: a shortcode required a manually-authored
     * WordPress Page to embed it in — not a guaranteed entrypoint, and a
     * silent dependency on someone keeping that page/shortcode intact.
     * `template_redirect` is the smallest WordPress-core mechanism for a
     * fixed, code-owned URL that needs no rewrite-rule flush and no virtual
     * post object: it fires on every front-end request, before any
     * theme/page template loads, so intercepting one fixed path here and
     * exiting is sufficient — no WP page dependency, no new WP-owned
     * product model.
     *
     * Outputs a minimal standalone document (no theme header/footer) —
     * matching the proposal's own self-contained branded look
     * (QuoteProposalPreview.tsx already renders its own CompuZign header),
     * and avoiding any dependency on the active theme's template functions
     * behaving predictably outside their normal page context. Shares the
     * existing 'compuzign-cost-builder' script/style handles (registered by
     * AssetLoader) rather than a second build entry — QuoteViewApp and its
     * print behaviour live inside that same bundle
     * (resources/ts/modules/cost-builder.ts).
     */
    public function maybeRenderQuoteView(): void
    {
        if (!self::matchesQuoteViewPath((string) ($_SERVER['REQUEST_URI'] ?? ''))) {
            return;
        }

        nocache_headers();

        // wp_head() fires the wp_enqueue_scripts action (registers the
        // compuzign-cost-builder handles via AssetLoader) and prints the
        // already-unconditionally-enqueued cost-builder CSS; the JS handle
        // is register-only, so it still needs an explicit enqueue call
        // before wp_footer() prints it, exactly like the equivalent
        // shortcode-based modules' own render methods.
        echo '<!DOCTYPE html><html ' . get_language_attributes() . '>';
        echo '<head><meta charset="' . esc_attr(get_bloginfo('charset')) . '"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . esc_html(get_bloginfo('name')) . ' — Your Quote</title>';
        wp_head();
        echo '</head><body class="cz-quote-view-page">';

        // The CSS handle is enqueued unconditionally by AssetLoader (already
        // printed above by wp_head()); only the JS handle is register-only
        // and needs this explicit call before wp_footer() prints it.
        if (wp_script_is('compuzign-cost-builder', 'registered')) {
            wp_enqueue_script('compuzign-cost-builder');
        }

        echo '<div id="compuzign-quote-view" class="cz-container"></div>';
        wp_footer();
        echo '</body></html>';
        exit;
    }
}
