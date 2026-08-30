<?php

declare(strict_types=1);

// Focused contract for Phase 8J-C2's correction: the secure quote-view page
// must have one guaranteed, code-owned public URL — no manual WordPress
// content/Page dependency (a shortcode alone required someone to embed it
// in an authored page, which is not a guaranteed entrypoint). Covers the
// pure routing predicate (RequestsModule::matchesQuoteViewPath()) and the
// URL-building contract (RequestsModule::quoteViewUrl()) that Phase 8J-C3
// must reuse rather than constructing a second copy of the path.
//
// maybeRenderQuoteView() itself calls exit() on a match, so it is not
// exercised directly here — matchesQuoteViewPath() is the extracted pure
// decision it defers to, mirroring RequestSchema::validate() vs.
// sanitizeItems() and QuoteViewAccess::resolve() vs.
// RequestsController::getQuote().

function wp_parse_url(string $url, int $component = -1): mixed
{
    return parse_url($url, $component);
}

function untrailingslashit(string $string): string
{
    return rtrim($string, '/');
}

function home_url(string $path = ''): string
{
    return 'https://cz-test.local' . $path;
}

function add_query_arg(string $key, string $value, string $url): string
{
    $separator = str_contains($url, '?') ? '&' : '?';

    return $url . $separator . $key . '=' . rawurlencode($value);
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\RequestsModule;

function check_quote_view_entrypoint(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Quote view entrypoint: ' . $message);
    }
}

// ── Routing predicate ────────────────────────────────────────────────────

check_quote_view_entrypoint(
    RequestsModule::matchesQuoteViewPath('/compuzign-quote-view/'),
    'the exact path (with trailing slash) matches'
);
check_quote_view_entrypoint(
    RequestsModule::matchesQuoteViewPath('/compuzign-quote-view'),
    'the exact path without a trailing slash still matches'
);
check_quote_view_entrypoint(
    RequestsModule::matchesQuoteViewPath('/compuzign-quote-view/?ref=CZ-ABC123'),
    'a query string appended to the path is ignored by the path match'
);
check_quote_view_entrypoint(
    !RequestsModule::matchesQuoteViewPath('/'),
    'the site root does not match'
);
check_quote_view_entrypoint(
    !RequestsModule::matchesQuoteViewPath('/compuzign-quote-view-extra/'),
    'a path merely sharing a prefix does not match'
);
check_quote_view_entrypoint(
    !RequestsModule::matchesQuoteViewPath('/some-other-page/'),
    'an unrelated path does not match'
);

// ── URL-building contract (for Phase 8J-C3) ─────────────────────────────

$url = RequestsModule::quoteViewUrl('CZ-ABC123');
check_quote_view_entrypoint(str_contains($url, RequestsModule::QUOTE_VIEW_PATH), 'the built URL uses the canonical QUOTE_VIEW_PATH');
check_quote_view_entrypoint(str_contains($url, 'ref=CZ-ABC123'), 'the built URL carries the quote reference');
check_quote_view_entrypoint(!str_contains($url, '#'), 'quoteViewUrl() never appends a fragment/secret — that is client-side-only, built by whatever sends the email');

echo "Quote view entrypoint checks passed.\n";
