<?php

declare(strict_types=1);

// Focused contract for Phase 8J-C3: the customer "View / Print Quote" email
// link. Exercises the real RequestsController::submitRequest() end to end
// (stubbing only the WordPress surface it touches, in the style of
// package-family-platform-route.php and quote-view-http-boundary.php) to
// prove: the raw view secret is never persisted in the stored transient
// payload, never present in the REST JSON response, appears in the customer
// email only as a URL fragment (never a query parameter), is built from the
// single RequestsModule::quoteViewUrl() contract, appears in the customer
// quote_cart email only — never the admin email, and never the
// free_it_assessment customer email even when a link is supplied.

if (!defined('HOUR_IN_SECONDS')) define('HOUR_IN_SECONDS', 3600);
if (!defined('DAY_IN_SECONDS')) define('DAY_IN_SECONDS', 86400);

function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
function sanitize_email(mixed $value): string { return trim((string) $value); }
function is_email(string $value): bool { return (bool) preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $value); }
function current_time(string $type): string { return '2026-08-30 00:00:00'; }
function esc_html(mixed $value): string { return htmlspecialchars((string) $value, ENT_QUOTES); }
function esc_url(string $url): string { return filter_var($url, FILTER_VALIDATE_URL) !== false ? $url : '#'; }
function home_url(string $path = ''): string { return 'https://cz-test.local' . $path; }
function add_query_arg(string $key, string $value, string $url): string
{
    $separator = str_contains($url, '?') ? '&' : '?';
    return $url . $separator . $key . '=' . rawurlencode($value);
}
$GLOBALS['cz_options'] = [];
function get_option(string $key, mixed $default = false): mixed
{
    if ($key === 'admin_email') {
        return 'admin@cz-test.local';
    }
    return $GLOBALS['cz_options'][$key] ?? $default;
}
function add_option(string $key, mixed $value, string $deprecated = '', string|bool $autoload = 'yes'): bool
{
    if (array_key_exists($key, $GLOBALS['cz_options'])) {
        return false;
    }
    $GLOBALS['cz_options'][$key] = $value;
    return true;
}
function update_option(string $key, mixed $value, string|bool|null $autoload = null): bool
{
    $GLOBALS['cz_options'][$key] = $value;
    return true;
}
function wp_cache_delete(string $key, string $group = ''): bool { return true; }
function get_bloginfo(string $key = ''): string { return 'CompuZign Test'; }

$GLOBALS['cz_transients'] = [];
function get_transient(string $key): mixed { return $GLOBALS['cz_transients'][$key] ?? false; }
function set_transient(string $key, mixed $value, int $expiry): bool { $GLOBALS['cz_transients'][$key] = $value; return true; }

$GLOBALS['cz_sent_mail'] = [];
function wp_mail(string $to, string $subject, string $message, array $headers = []): bool
{
    $GLOBALS['cz_sent_mail'][] = ['to' => $to, 'subject' => $subject, 'message' => $message];
    return true;
}

// ── CRM-1A: durable-Request post/identity storage — submitRequest() now
//    creates the durable cz_request + CZR before any transient/email. ───────

$GLOBALS['cz_posts']    = [];
$GLOBALS['cz_postMeta'] = [];
$GLOBALS['cz_nextPostId'] = 9000;

function wp_insert_post(array $args, bool $wpError = false): int|WP_Error
{
    $id = $GLOBALS['cz_nextPostId']++;
    $GLOBALS['cz_posts'][$id] = new WP_Post($id, (string) ($args['post_type'] ?? ''), (string) ($args['post_title'] ?? ''));
    return $id;
}
function wp_delete_post(int $id, bool $force = false): bool
{
    if (!isset($GLOBALS['cz_posts'][$id])) {
        return false;
    }
    unset($GLOBALS['cz_posts'][$id], $GLOBALS['cz_postMeta'][$id]);
    return true;
}
function get_post(int $id): ?WP_Post { return $GLOBALS['cz_posts'][$id] ?? null; }
function update_post_meta(int $id, string $key, mixed $value): bool
{
    $GLOBALS['cz_postMeta'][$id][$key] = $value;
    return true;
}
function get_post_meta(int $id, string $key, bool $single = false): mixed
{
    $value = $GLOBALS['cz_postMeta'][$id][$key] ?? '';
    return $single ? $value : ($value === '' ? [] : [$value]);
}
function add_post_meta(int $id, string $key, mixed $value, bool $unique = false): int|false
{
    if ($unique && array_key_exists($key, $GLOBALS['cz_postMeta'][$id] ?? [])) {
        return false;
    }
    $GLOBALS['cz_postMeta'][$id][$key] = $value;
    return 1;
}
function get_posts(array $args): array
{
    $matches = [];
    foreach ($GLOBALS['cz_posts'] as $id => $post) {
        $ok = true;
        foreach ($args['meta_query'] ?? [] as $clause) {
            if (($GLOBALS['cz_postMeta'][$id][$clause['key']] ?? null) !== $clause['value']) {
                $ok = false;
                break;
            }
        }
        if (!$ok) {
            continue;
        }
        $matches[] = ($args['fields'] ?? null) === 'ids' ? $id : $post;
        if (count($matches) >= (int) ($args['numberposts'] ?? PHP_INT_MAX)) {
            break;
        }
    }
    return $matches;
}
function is_wp_error(mixed $value): bool { return $value instanceof WP_Error; }

class WP_Post
{
    public function __construct(public int $ID, public string $post_type, public string $post_title) {}
}
class WP_Error
{
    public function __construct(private string $code = '', private string $message = '') {}
    public function get_error_code(): string { return $this->code; }
    public function get_error_message(): string { return $this->message; }
}

class FakeWpdb
{
    public string $options = 'wp_options';

    public function prepare(string $query, mixed ...$args): string
    {
        $i = 0;
        return preg_replace_callback('/%s/', function () use (&$i, $args): string {
            return "'" . addslashes((string) $args[$i++]) . "'";
        }, $query);
    }

    public function query(string $sql): int|false
    {
        if (preg_match("/UPDATE .* SET option_value = '(.*)' WHERE option_name = '(.*)' AND option_value = '(.*)'/s", $sql, $m)) {
            $newValue = stripslashes($m[1]);
            $key      = stripslashes($m[2]);
            $oldValue = stripslashes($m[3]);
            if (($GLOBALS['cz_options'][$key] ?? null) === $oldValue) {
                $GLOBALS['cz_options'][$key] = $newValue;
                return 1;
            }
            return 0;
        }
        if (preg_match("/DELETE FROM .* WHERE option_name = '(.*)' AND option_value = '(.*)'/s", $sql, $m)) {
            $key   = stripslashes($m[1]);
            $value = stripslashes($m[2]);
            if (($GLOBALS['cz_options'][$key] ?? null) === $value) {
                unset($GLOBALS['cz_options'][$key]);
                return 1;
            }
            return 0;
        }
        return false;
    }
}
$GLOBALS['wpdb'] = new FakeWpdb();

class WP_REST_Request
{
    /** @param array<string, mixed> $params */
    public function __construct(private array $params = []) {}
    public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
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
use CompuZign\Platform\Modules\Requests\RequestsModule;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_quote_view_email_link(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Quote view email link: ' . $message);
    }
}

function findMail(array $sent, string $subjectFragment): ?array
{
    foreach ($sent as $mail) {
        if (str_contains($mail['subject'], $subjectFragment)) {
            return $mail;
        }
    }
    return null;
}

// ── quote_cart submission ───────────────────────────────────────────────

$controller = new RequestsController(new PlatformIdentifierStation(), new RequestRepository());
$request = new WP_REST_Request([
    'type' => 'quote_cart', 'contact' => 'Jane Doe', 'email' => 'jane@example.com',
    'company' => 'Acme Co', 'phone' => '555-0100', 'notes' => '', 'quote_ref' => '',
    'items' => [['serviceId' => 101, 'serviceTitle' => 'KAIROS', 'tierId' => 'standard', 'tierTitle' => 'Standard', 'price' => 49]],
]);
$response = $controller->submitRequest($request);

check_quote_view_email_link($response->get_status() === 200, 'a valid quote_cart submission succeeds');
$quoteRef = $response->get_data()['quote_id'];
check_quote_view_email_link(is_string($quoteRef) && $quoteRef !== '', 'a quote reference is minted');

// ── No raw-secret persistence ────────────────────────────────────────────

$storedPayload = $GLOBALS['cz_transients']['cz_quote_' . $quoteRef] ?? null;
check_quote_view_email_link($storedPayload !== null, 'the request is persisted to the expected transient key');
check_quote_view_email_link(isset($storedPayload['view_secret_hash']), 'the stored payload carries the one-way hash');
check_quote_view_email_link(!array_key_exists('view_secret', $storedPayload), 'the stored payload never carries a raw view_secret key');
check_quote_view_email_link(!array_key_exists('quoteViewLink', $storedPayload), 'the stored payload never carries the built link either');

// ── No raw-secret in the REST JSON response ─────────────────────────────

$responseData = $response->get_data();
check_quote_view_email_link(array_keys($responseData) === ['success', 'quote_id', 'message'], 'the REST response carries only the three documented fields');
foreach ($responseData as $value) {
    check_quote_view_email_link(
        !is_string($value) || !str_contains($value, '#'),
        'no response field accidentally embeds a fragment-shaped link'
    );
}

// ── Customer email carries the link; admin email does not ──────────────

$customerMail = findMail($GLOBALS['cz_sent_mail'], 'Your quote request has been received');
$adminMail    = findMail($GLOBALS['cz_sent_mail'], 'New Quote Request');
check_quote_view_email_link($customerMail !== null, 'a customer quote_cart email was sent');
check_quote_view_email_link($adminMail !== null, 'an admin quote_cart email was sent');

check_quote_view_email_link(str_contains($customerMail['message'], 'View / Print Quote'), 'the customer email carries the View / Print Quote action');
check_quote_view_email_link(!str_contains($adminMail['message'], 'View / Print Quote'), 'the admin email never carries this customer-only action');

// ── Fragment-only placement, built from the single quoteViewUrl() contract ─

if (preg_match('/href="([^"]+)"[^>]*>\s*View \/ Print Quote/s', $customerMail['message'], $matches) !== 1) {
    // esc_html-encoded slashes inside the anchor text can shift the match;
    // fall back to a looser href extraction near the action text.
    preg_match('/href="([^"]+)"/', $customerMail['message'], $matches);
}
$href = $matches[1] ?? '';
check_quote_view_email_link($href !== '', 'the View / Print Quote href was extracted from the email HTML');
check_quote_view_email_link(str_contains($href, '#'), 'the link carries a fragment');
check_quote_view_email_link(!str_contains($href, '?secret=') && !str_contains($href, '&secret='), 'the secret is never a query parameter');
[$hrefBase, $hrefFragment] = explode('#', $href, 2) + ['', ''];
check_quote_view_email_link($hrefBase === RequestsModule::quoteViewUrl($quoteRef), 'the link base is built from the single quoteViewUrl() contract, not a second URL construction');
check_quote_view_email_link($hrefFragment !== '' && strlen($hrefFragment) === 64, 'the fragment is a real (64-hex-char) secret, not empty or a placeholder');

// ── The link never leaks into the persisted snapshot's OWN admin/customer
//    email rendering path a second time via NotificationTemplates itself
//    (regression guard: buildCustomerHtmlEmail() must never embed the raw
//    secret anywhere else on the page, e.g. in a debug comment). ──────────
check_quote_view_email_link(substr_count($customerMail['message'], $hrefFragment) === 1, 'the raw secret appears exactly once in the customer email (the one link), never duplicated elsewhere');

// ── free_it_assessment: no link, regardless ─────────────────────────────

$GLOBALS['cz_sent_mail'] = [];
$assessmentRequest = new WP_REST_Request([
    'type' => 'free_it_assessment', 'contact' => 'Jane Doe', 'email' => 'jane@example.com',
    'company' => '', 'phone' => '', 'notes' => '', 'category' => 'Security', 'quote_ref' => '',
]);
$assessmentResponse = $controller->submitRequest($assessmentRequest);
check_quote_view_email_link($assessmentResponse->get_status() === 200, 'a valid assessment submission succeeds');

$assessmentCustomerMail = findMail($GLOBALS['cz_sent_mail'], 'assessment request has been received');
check_quote_view_email_link($assessmentCustomerMail !== null, 'an assessment customer email was sent');
check_quote_view_email_link(!str_contains($assessmentCustomerMail['message'], 'View / Print Quote'), 'the assessment customer email never carries the quote-view link');

// ── buildCustomerHtmlEmail() directly: assessment branch ignores a
//    non-empty link even if one were ever passed (defence in depth). ──────
$forcedLinkAssessmentEmail = \CompuZign\Platform\Modules\Requests\Notifications\NotificationTemplates::buildCustomerHtmlEmail(
    ['type' => 'free_it_assessment', 'contact' => 'Jane Doe', 'quote_ref' => 'CZ-ABC123', 'category' => ''],
    'CompuZign Test',
    'https://cz-test.local/compuzign-quote-view/?ref=CZ-ABC123#forced-secret'
);
check_quote_view_email_link(!str_contains($forcedLinkAssessmentEmail, 'View / Print Quote'), 'buildCustomerHtmlEmail() never renders the link for an assessment type, even if one is explicitly passed');
check_quote_view_email_link(!str_contains($forcedLinkAssessmentEmail, 'forced-secret'), 'a forced secret never leaks into the assessment email body');

echo "Quote view email link checks passed.\n";
