<?php

declare(strict_types=1);

// Focused contract for Phase 8J-C1's correction round: the secure quote
// view secret must never travel as a REST query parameter (server/proxy
// access logs, browser history) and every rejection reason must converge
// on one identical HTTP response — no WordPress-arg-validation shortcut
// that would let "missing credential" look different from "wrong
// credential" or "quote doesn't exist". Exercises RequestsController's
// actual registerRoutes()/getQuote() (not just the pure QuoteViewAccess
// resolver already covered by quote-view-access-boundary.php), in the
// style of this repo's other route-contract tests (e.g.
// package-family-platform-route.php): stub only the WordPress surface this
// path touches, run the real controller code against it.

$GLOBALS['cz_captured_routes']   = [];
$GLOBALS['cz_quote_transients']  = [];

function register_rest_route(string $namespace, string $route, array $args = []): bool
{
    $GLOBALS['cz_captured_routes'][$namespace . $route] = $args;
    return true;
}

function get_transient(string $key): mixed
{
    return $GLOBALS['cz_quote_transients'][$key] ?? false;
}

class WP_REST_Request
{
    /** @param array<string, mixed> $params @param array<string, string> $headers */
    public function __construct(private array $params = [], private array $headers = []) {}
    public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
    public function get_header(string $key): ?string { return $this->headers[$key] ?? null; }
}

class WP_REST_Response
{
    public function __construct(private mixed $data = null, private int $status = 200) {}
    public function get_data(): mixed { return $this->data; }
    public function get_status(): int { return $this->status; }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Http\RequestsController;
use CompuZign\Platform\Modules\Requests\Repositories\RequestRepository;
use CompuZign\Platform\Modules\Requests\Support\QuoteViewSecret;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_quote_http_boundary(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Quote view HTTP boundary: ' . $message);
    }
}

// registerRoutes()/getQuote() (the only paths this file exercises) never
// touch identity or durable-Request storage — real, unstubbed instances are
// safe here since neither is ever called.
$controller = new RequestsController(new PlatformIdentifierStation(), new RequestRepository());
$controller->registerRoutes();

// ── Route registration: the secret must never be a REST 'args' entry ──────
$quoteRoute = $GLOBALS['cz_captured_routes']['compuzign/v1/requests/quote/(?P<ref>[A-Za-z0-9-]+)'] ?? null;
check_quote_http_boundary($quoteRoute !== null, 'the secure quote route must be registered');
check_quote_http_boundary($quoteRoute['methods'] === 'GET', 'the quote route must be read-only');
check_quote_http_boundary($quoteRoute['permission_callback'] === '__return_true', 'the route stays public/no-login — access is gated by the secret, not WP auth');
check_quote_http_boundary(
    !array_key_exists('secret', $quoteRoute['args'] ?? []),
    'the secret must never be declared as a REST arg — WordPress could reject a missing one with its own distinct response before getQuote() runs'
);

// ── Seed a valid stored quote ───────────────────────────────────────────────
$secret = QuoteViewSecret::generate();
$GLOBALS['cz_quote_transients']['cz_quote_CZ-ABC123'] = [
    'quote_ref' => 'CZ-ABC123', 'type' => 'quote_cart', 'contact' => 'Jane Doe', 'company' => 'Acme Co',
    'email' => 'jane@example.com', 'phone' => '555-0100', 'submitted' => '2026-08-30 00:00:00', 'items' => [],
    'view_secret_hash' => QuoteViewSecret::hash($secret),
];

// ── Valid access via the header (never a query param) ──────────────────────
$validResponse = $controller->getQuote(new WP_REST_Request(['ref' => 'CZ-ABC123'], ['X-Quote-View-Secret' => $secret]));
check_quote_http_boundary($validResponse->get_status() === 200, 'a correct ref + header secret must succeed');
check_quote_http_boundary($validResponse->get_data()['quote']['quote_ref'] === 'CZ-ABC123', 'a successful response must carry the resolved quote');

// ── Every rejection reason converges on one identical response ────────────
$missingHeader = $controller->getQuote(new WP_REST_Request(['ref' => 'CZ-ABC123'], []));
$wrongSecret   = $controller->getQuote(new WP_REST_Request(['ref' => 'CZ-ABC123'], ['X-Quote-View-Secret' => 'wrong-secret']));
$missingQuote  = $controller->getQuote(new WP_REST_Request(['ref' => 'CZ-ZZZZZZ'], ['X-Quote-View-Secret' => $secret]));
$malformedRef  = $controller->getQuote(new WP_REST_Request(['ref' => 'not-a-ref'], ['X-Quote-View-Secret' => $secret]));

$failures = [
    'missing header'  => $missingHeader,
    'wrong secret'    => $wrongSecret,
    'missing quote'   => $missingQuote,
    'malformed ref'   => $malformedRef,
];

foreach ($failures as $label => $response) {
    check_quote_http_boundary($response->get_status() === 404, "{$label} must return 404, not a distinct status");
}

$referenceBody = $missingHeader->get_data();
foreach ($failures as $label => $response) {
    check_quote_http_boundary($response->get_data() === $referenceBody, "{$label} must return a byte-identical body to every other rejection reason");
}

echo "Quote view HTTP boundary checks passed.\n";
