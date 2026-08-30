<?php

declare(strict_types=1);

// CRM-1A: proves the durable-submission contract end to end against the real
// RequestsController/RequestRepository/PlatformIdentifierStation, over an
// in-memory WordPress boundary (mirrors category-inline-identity-race.php).
//
// Covers: first submission mints one durable Pending Request + CZR before any
// transient/email; same-ref/same-payload retry reuses the stored snapshot;
// same-ref/different-payload collision (409, no mutation); legacy `new` reads
// as `pending` without rewriting storage; identity-assignment failure rolls
// back the post, retires the reservation, and emits no transient/email;
// concurrent identical/conflicting first submissions converge on one winner;
// a losing rollback never deletes the winner; and the CAS stale-lock takeover
// race (a required regression: a losing takeover must never touch the
// winner's fresh claim).

// usleep() can't be redeclared in the global namespace (it's a real PHP
// builtin) — RequestRepository::awaitCreatedPost() is the only caller, so
// shadow it only in that namespace (PHP resolves an unqualified function
// call there first, falling back to the global one only if not found).
namespace CompuZign\Platform\Modules\Requests\Repositories {
    function usleep(int $microseconds): void {
        // No-op — the bounded poll loops would otherwise cost real wall time.
    }
}

namespace {

const HOUR_IN_SECONDS = 3600;
const DAY_IN_SECONDS  = 86400;

$__posts        = [];
$__postMeta     = [];
$__options      = [];
$__transients   = [];
$__mailLog      = [];
$__nextPostId   = 5000;
$__submittedSeq = 0;
$__deletedPostIds       = [];
$__beforeLockClaim      = null;
$__beforeTakeoverUpdate = null;
$__poisonPlatformIdClaim = false;

// ── WordPress function stubs ────────────────────────────────────────────────

function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
function sanitize_textarea_field(mixed $value): string { return trim((string) $value); }
function sanitize_email(mixed $value): string { return trim((string) $value); }
function is_email(string $value): bool { return str_contains($value, '@'); }
function esc_html(mixed $value): string { return (string) $value; }
function esc_url(mixed $value): string { return (string) $value; }
function esc_attr(mixed $value): string { return (string) $value; }

function current_time(string $type): string
{
    global $__submittedSeq;
    $__submittedSeq++;
    return "2026-08-30 12:00:{$__submittedSeq}";
}

function get_bloginfo(string $key = ''): string
{
    return $key === 'charset' ? 'UTF-8' : 'CompuZign Test Site';
}

function home_url(string $path = ''): string { return 'https://example.test' . $path; }

function add_query_arg(string $key, string $value, string $url): string
{
    $sep = str_contains($url, '?') ? '&' : '?';
    return $url . $sep . $key . '=' . rawurlencode($value);
}

function get_transient(string $key): mixed
{
    global $__transients;
    return $__transients[$key] ?? false;
}

function set_transient(string $key, mixed $value, int $expiration): bool
{
    global $__transients;
    $__transients[$key] = $value;
    return true;
}

function wp_mail(string $to, string $subject, string $message, array $headers = []): bool
{
    global $__mailLog;
    $__mailLog[] = ['to' => $to, 'subject' => $subject];
    return true;
}

function is_wp_error(mixed $value): bool { return $value instanceof WP_Error; }

function rest_ensure_response(mixed $value): WP_REST_Response
{
    return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
}

// ── Options (used by both the creation lock and PlatformIdentifierStation) ──

function add_option(string $key, mixed $value, string $deprecated = '', string|bool $autoload = 'yes'): bool
{
    global $__options, $__beforeLockClaim;

    if (str_starts_with($key, 'cz_request_creating_') && is_callable($__beforeLockClaim)) {
        $hook = $__beforeLockClaim;
        $__beforeLockClaim = null;
        $hook();
    }

    if (array_key_exists($key, $__options)) {
        return false;
    }
    $__options[$key] = $value;
    return true;
}

function get_option(string $key, mixed $default = false): mixed
{
    global $__options;
    return $__options[$key] ?? $default;
}

function update_option(string $key, mixed $value, string|bool|null $autoload = null): bool
{
    global $__options;
    $changed = !array_key_exists($key, $__options) || $__options[$key] !== $value;
    $__options[$key] = $value;
    return $changed;
}

function wp_cache_delete(string $key, string $group = ''): bool { return true; }

// ── Posts / post meta ────────────────────────────────────────────────────────

function wp_insert_post(array $args, bool $wpError = false): int|WP_Error
{
    global $__posts, $__nextPostId;
    $id = $__nextPostId++;
    $__posts[$id] = new WP_Post($id, (string) ($args['post_type'] ?? ''), (string) ($args['post_title'] ?? ''));
    return $id;
}

function wp_delete_post(int $id, bool $force = false): bool
{
    global $__posts, $__postMeta, $__deletedPostIds;
    if (!isset($__posts[$id])) {
        return false;
    }
    unset($__posts[$id], $__postMeta[$id]);
    $__deletedPostIds[] = $id;
    return true;
}

function get_post(int $id): ?WP_Post
{
    global $__posts;
    return $__posts[$id] ?? null;
}

function update_post_meta(int $id, string $key, mixed $value): bool
{
    global $__postMeta;
    $__postMeta[$id][$key] = $value;
    return true;
}

function get_post_meta(int $id, string $key, bool $single = false): mixed
{
    global $__postMeta;
    $value = $__postMeta[$id][$key] ?? '';
    return $single ? $value : ($value === '' ? [] : [$value]);
}

function add_post_meta(int $id, string $key, mixed $value, bool $unique = false): int|false
{
    global $__postMeta, $__poisonPlatformIdClaim;

    if ($key === 'cz_platform_id' && $__poisonPlatformIdClaim) {
        return false;
    }

    if ($unique && array_key_exists($key, $__postMeta[$id] ?? [])) {
        return false;
    }
    $__postMeta[$id][$key] = $value;
    return 1;
}

function get_posts(array $args): array
{
    global $__posts, $__postMeta;

    $matches = [];
    foreach ($__posts as $id => $post) {
        $ok = true;
        foreach ($args['meta_query'] ?? [] as $clause) {
            if (($__postMeta[$id][$clause['key']] ?? null) !== $clause['value']) {
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

    if (($args['orderby'] ?? null) === 'ID' && ($args['order'] ?? null) === 'DESC') {
        $matches = array_reverse($matches);
    }

    return $matches;
}

// ── $wpdb — conditional UPDATE/DELETE for the creation lock's CAS ──────────

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
        global $__options, $__beforeTakeoverUpdate;

        if (preg_match("/UPDATE .* SET option_value = '(.*)' WHERE option_name = '(.*)' AND option_value = '(.*)'/s", $sql, $m)) {
            $newValue = stripslashes($m[1]);
            $key      = stripslashes($m[2]);
            $oldValue = stripslashes($m[3]);

            if (str_starts_with($key, 'cz_request_creating_') && is_callable($__beforeTakeoverUpdate)) {
                $hook = $__beforeTakeoverUpdate;
                $__beforeTakeoverUpdate = null;
                $hook();
            }

            if (($__options[$key] ?? null) === $oldValue) {
                $__options[$key] = $newValue;
                return 1;
            }
            return 0;
        }

        if (preg_match("/DELETE FROM .* WHERE option_name = '(.*)' AND option_value = '(.*)'/s", $sql, $m)) {
            $key   = stripslashes($m[1]);
            $value = stripslashes($m[2]);
            if (($__options[$key] ?? null) === $value) {
                unset($__options[$key]);
                return 1;
            }
            return 0;
        }

        return false;
    }

    public function get_col(string $query): array { return []; }
}

$GLOBALS['wpdb'] = new FakeWpdb();

// ── Minimal WP value classes ─────────────────────────────────────────────────

class WP_Post
{
    public function __construct(public int $ID, public string $post_type, public string $post_title) {}
}
class WP_Error
{
    public function __construct(private string $code, private string $message, private mixed $data = null) {}
    public function get_error_code(): string { return $this->code; }
    public function get_error_message(): string { return $this->message; }
}
class WP_REST_Request
{
    public function __construct(private array $params = []) {}
    public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
    public function get_header(string $key): mixed { return $this->params['__headers'][$key] ?? null; }
}
class WP_REST_Response
{
    public function __construct(private mixed $data, private int $status) {}
    public function get_data(): mixed { return $this->data; }
    public function get_status(): int { return $this->status; }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Http\RequestsController;
use CompuZign\Platform\Modules\Requests\Repositories\RequestRepository;
use CompuZign\Platform\Modules\Requests\Support\RequestLifecycle;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "  ok — {$message}\n";
}

$__ipCounter = 0;
function freshIp(): void
{
    global $__ipCounter;
    $_SERVER['REMOTE_ADDR'] = 'test-ip-' . $__ipCounter++;
}

$requests = new RequestRepository();
$station  = new PlatformIdentifierStation();
$controller = new RequestsController($station, $requests);

function requestFor(string $quoteRef, string $email = 'buyer@example.com', array $overrides = []): WP_REST_Request
{
    return new WP_REST_Request(array_merge([
        'type'      => 'free_it_assessment',
        'contact'   => 'Jordan Buyer',
        'email'     => $email,
        'company'   => 'Acme Co',
        'phone'     => '555-0100',
        'notes'     => 'Please call',
        'quote_ref' => $quoteRef,
        'category'  => '',
        'items'     => [],
    ], $overrides));
}

function retiredCount(): int
{
    global $__options;
    return count(array_filter(
        $__options,
        static fn(mixed $r): bool => is_array($r) && ($r['status'] ?? null) === PlatformIdentifierStation::STATUS_RETIRED
    ));
}

/** Counts only forward registry records (excludes the twin reverse-lookup record each binding also writes). */
function boundForwardCount(): int
{
    global $__options;
    $count = 0;
    foreach ($__options as $key => $r) {
        if (str_starts_with($key, 'cz_platform_identifier_v1_')
            && is_array($r)
            && ($r['status'] ?? null) === PlatformIdentifierStation::STATUS_BOUND
            && ($r['entity_type'] ?? null) === PlatformIdentifierPolicy::REQUEST
        ) {
            $count++;
        }
    }
    return $count;
}

// ── 1. First durable submission ─────────────────────────────────────────────

echo "First durable submission\n";
freshIp();
$ref1 = 'CZ-AAA001';
$resp1 = $controller->submitRequest(requestFor($ref1, 'first@example.com'));
$data1 = $resp1->get_data();

check($resp1->get_status() === 200 && $data1['success'] === true, 'first submission succeeds');

$postId1 = $requests->findPostIdByRef($ref1);
check($postId1 !== null, 'exactly one durable Request post exists for the ref');

$record1 = $requests->findByRef($ref1);
check($record1['status'] === RequestLifecycle::STATUS_PENDING, 'the durable Request starts Pending');
check($station->validate(PlatformIdentifierPolicy::REQUEST, $record1['platform_id']), 'the durable Request has a valid CZR identity');
check(!array_key_exists('view_secret_hash', $record1['data']), 'the durable snapshot never carries view_secret_hash');
check(($__transients['cz_quote_' . $ref1]['view_secret_hash'] ?? null) !== null, 'the quote-view transient carries the view secret hash');
check(count($__mailLog) === 2, 'both admin and customer emails are sent on first submission');

// ── 2. Same-ref, same-payload retry ─────────────────────────────────────────

echo "\nSame-ref, same-payload retry\n";
$mailCountBefore  = count($__mailLog);
$boundCountBefore = boundForwardCount();
$resp1b = $controller->submitRequest(requestFor($ref1, 'first@example.com'));
check($resp1b->get_status() === 200, 'a same-ref same-payload retry still succeeds');
check($requests->findPostIdByRef($ref1) === $postId1, 'the retry mints no second durable Request');
check(boundForwardCount() === $boundCountBefore, 'the retry mints no second CZR — reserve() was never called again');
check(count($__mailLog) === $mailCountBefore + 2, 'the retry regenerates transient/email from the stored snapshot');

// ── 3. Same-ref, different-payload collision ────────────────────────────────

echo "\nSame-ref, different-payload collision\n";
$mailCountBefore = count($__mailLog);
$transientBefore = $__transients['cz_quote_' . $ref1];
$resp1c = $controller->submitRequest(requestFor($ref1, 'different@example.com'));
$data1c = $resp1c->get_data();

check($resp1c->get_status() === 409 && $data1c['success'] === false, 'a same-ref different-payload submission is rejected with 409');
check($requests->findByRef($ref1)['data']['email'] === 'first@example.com', 'the durable Request is unchanged by the rejected collision');
check($__transients['cz_quote_' . $ref1] === $transientBefore, 'the quote-view transient is untouched by the rejected collision');
check(count($__mailLog) === $mailCountBefore, 'no email is sent for the rejected collision');

// ── 4. Legacy `new` compatibility ───────────────────────────────────────────

echo "\nLegacy 'new' status compatibility\n";
$legacyRef = 'CZ-LEG001';
$legacyOutcome = $requests->createOwned([
    'type' => 'free_it_assessment', 'quote_ref' => $legacyRef, 'contact' => 'Legacy', 'email' => 'legacy@example.com',
    'company' => '', 'phone' => '', 'notes' => '', 'category' => '', 'items' => [], 'submitted' => '2020-01-01 00:00:00',
]);
update_post_meta($legacyOutcome['post_id'], 'cz_request_status', 'new'); // simulate the retired admin /accept bridge's own write

$legacyRead = $requests->findByRef($legacyRef);
check($legacyRead['status'] === RequestLifecycle::STATUS_PENDING, 'a legacy new record reads as pending');
check(get_post_meta($legacyOutcome['post_id'], 'cz_request_status', true) === 'new', 'the stored legacy value is untouched by a read');

check($requests->updateStatus($legacyOutcome['post_id'], RequestLifecycle::STATUS_APPROVED) === true, 'a legacy record can be written forward into the new vocabulary');
check(get_post_meta($legacyOutcome['post_id'], 'cz_request_status', true) === RequestLifecycle::STATUS_APPROVED, 'the stored value now holds the new vocabulary, not new');

check(RequestLifecycle::canTransition(RequestLifecycle::STATUS_PENDING, RequestLifecycle::STATUS_APPROVED), 'pending -> approved is allowed');
check(RequestLifecycle::canTransition(RequestLifecycle::STATUS_PENDING, RequestLifecycle::STATUS_PENDING), 'a same-state repeat is idempotent');
check(!RequestLifecycle::canTransition(RequestLifecycle::STATUS_APPROVED, RequestLifecycle::STATUS_CANCELLED), 'the opposite terminal transition is rejected');

// ── 5. Identity-assignment failure: rollback, no email/transient, no lockout ─

echo "\nIdentity-assignment failure rolls back cleanly\n";
freshIp();
$ref5 = 'CZ-FAIL01';
$mailCountBefore   = count($__mailLog);
$retiredCountBefore = retiredCount();
$boundCountBefore5  = boundForwardCount();
$GLOBALS['__poisonPlatformIdClaim'] = true;
$resp5 = $controller->submitRequest(requestFor($ref5, 'fail@example.com'));
$GLOBALS['__poisonPlatformIdClaim'] = false;
$data5 = $resp5->get_data();

check($resp5->get_status() >= 500 && $data5['success'] === false, 'a failed identity assignment fails the whole submission closed');
check($requests->findPostIdByRef($ref5) === null, 'the post this call inserted is rolled back');
check(count($__mailLog) === $mailCountBefore, 'no email is sent when identity assignment fails');
check(!isset($__transients['cz_quote_' . $ref5]), 'no quote-view transient is set when identity assignment fails');
check(retiredCount() === $retiredCountBefore + 1, 'the unused reservation is permanently retired, not left dangling');
check(boundForwardCount() === $boundCountBefore5, 'no CZR identity was bound for the failed submission');

// The lock must be released even after a failed winner — no permanent lockout.
$resp5b = $controller->submitRequest(requestFor($ref5, 'fail@example.com'));
check($resp5b->get_status() === 200, 'a subsequent call for the same ref succeeds — the failed winner did not leave the lock held');

// ── 6. Concurrent identical first submissions ───────────────────────────────

echo "\nConcurrent identical first submissions\n";
freshIp();
$ref6 = 'CZ-CONC01';
$boundCountBefore6 = boundForwardCount();
$__beforeLockClaim = function () use ($controller, $ref6): void {
    $respB = $controller->submitRequest(requestFor($ref6, 'shared@example.com'));
    check($respB->get_status() === 200, 'the concurrent winner (caller B) succeeds');
};
$respA = $controller->submitRequest(requestFor($ref6, 'shared@example.com'));
check($respA->get_status() === 200, 'the concurrent loser (caller A) converges to success, not a duplicate');

$matchingPosts = get_posts(['meta_query' => [['key' => 'cz_request_ref', 'value' => $ref6]]]);
check(count($matchingPosts) === 1, 'exactly one durable Request exists for two concurrent identical submissions');
check(boundForwardCount() === $boundCountBefore6 + 1, 'exactly one CZR identity was bound for two concurrent identical submissions');

// ── 7. Concurrent conflicting first submissions ─────────────────────────────

echo "\nConcurrent conflicting first submissions\n";
freshIp();
$ref7 = 'CZ-CONC02';
$__beforeLockClaim = function () use ($controller, $ref7): void {
    $respB = $controller->submitRequest(requestFor($ref7, 'winner@example.com'));
    check($respB->get_status() === 200, 'the concurrent winner (caller B) succeeds');
};
$respA7 = $controller->submitRequest(requestFor($ref7, 'loser@example.com'));
check($respA7->get_status() === 409, 'the concurrent loser (caller A) converges onto the winner\'s post and then 409s on the payload mismatch');
check($requests->findByRef($ref7)['data']['email'] === 'winner@example.com', 'the winner\'s durable Request is untouched by the losing conflict');

// ── 8. Stale lock with no live contender is reclaimed ───────────────────────

echo "\nStale lock recovery (no live contender)\n";
freshIp();
$ref8 = 'CZ-STALE1';
add_option('cz_request_creating_' . $ref8, bin2hex(random_bytes(16)) . '|' . (time() - 20), '', 'no');
$resp8 = $controller->submitRequest(requestFor($ref8, 'stale@example.com'));
check($resp8->get_status() === 200, 'a stale lock with no post is reclaimed and creation completes');
check($requests->findPostIdByRef($ref8) !== null, 'the reclaiming call created exactly one durable Request');

// ── 9. Required regression: A/B stale-takeover CAS race ────────────────────

echo "\nStale-takeover CAS race (A observes stale, B takes over first)\n";
freshIp();
$ref9 = 'CZ-STALE2';
$staleValue = bin2hex(random_bytes(16)) . '|' . (time() - 20);
add_option('cz_request_creating_' . $ref9, $staleValue, '', 'no');

$__beforeTakeoverUpdate = function () use ($requests, $ref9, $staleValue): void {
    // Caller B's own takeover, run synchronously first, changing the row
    // out from under caller A's in-flight UPDATE (still keyed on $staleValue).
    $bValue = $requests->takeoverStaleLock($ref9, $staleValue);
    check($bValue !== null, 'caller B\'s takeover succeeds against the still-stale value');
    $requests->releaseCreationLock($ref9, $bValue);
};

$aValue = $requests->takeoverStaleLock($ref9, $staleValue);
check($aValue === null, 'caller A\'s takeover fails the moment the row no longer holds the value A observed');
check($requests->observeLockValue($ref9) === null, 'the lock row is exactly as caller B left it (released) — A never touched it');

// ── 10. Full end-to-end request via a stale takeover still converges ───────

echo "\nFull submission after a losing stale-takeover attempt still converges\n";
$ref10 = 'CZ-STALE3';
$staleValue10 = bin2hex(random_bytes(16)) . '|' . (time() - 20);
add_option('cz_request_creating_' . $ref10, $staleValue10, '', 'no');

$__beforeTakeoverUpdate = function () use ($controller, $ref10): void {
    $respB = $controller->submitRequest(requestFor($ref10, 'takeoverwinner@example.com'));
    check($respB->get_status() === 200, 'the takeover winner completes the durable submission');
};
$respA10 = $controller->submitRequest(requestFor($ref10, 'takeoverwinner@example.com'));
check($respA10->get_status() === 200, 'the losing takeover attempt still converges onto the winner\'s durable Request');
check(count(get_posts(['meta_query' => [['key' => 'cz_request_ref', 'value' => $ref10]]])) === 1, 'exactly one durable Request exists after the takeover race');

echo "\nAll durable-submission checks passed.\n";

} // namespace
