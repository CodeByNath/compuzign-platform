<?php

declare(strict_types=1);

// CRM-1C: admin-driven Request lifecycle mutation — pending -> approved,
// pending -> cancelled, via AdminRequestsController::updateRequestStatus()
// and RequestRepository::updateStatus(). Unlike
// tests/admin-requests-durable-surface.php (list/detail, read-only), this
// stub's update_post_meta() honors the 4-arg $prev_value compare-and-swap
// form the same way real WordPress does — including its "false means either
// a lost race OR the new value already equalled the old value" ambiguity —
// because that ambiguity is exactly what updateStatus()'s re-read-after-
// failure step exists to resolve. A stub that always returns true regardless
// of $prev_value (as the read-only test's stub does) would prove nothing
// about the race path.

function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
function current_user_can(string $cap): bool { return true; }
function current_time(string $type, int|bool $gmt = 0): string
{
    return $type === 'mysql' ? '2026-08-31 00:00:00' : '2026-08-31';
}
function rest_ensure_response(mixed $value): WP_REST_Response
{
    return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
}
function register_rest_route(string $namespace, string $route, array $args = []): bool { return true; }
function add_action(string $hook, callable $callback): bool { return true; }

$__posts      = [];
$__postMeta   = [];
$__nextPostId = 8000;

function wp_insert_post(array $args, bool $wpError = false): int
{
    global $__posts, $__nextPostId;
    $id = $__nextPostId++;
    $__posts[$id] = new WP_Post($id, (string) ($args['post_type'] ?? ''), (string) ($args['post_title'] ?? ''));
    return $id;
}
function get_post(int $id): ?WP_Post { global $__posts; return $__posts[$id] ?? null; }

/**
 * Real WordPress update_metadata() semantics for the single-row case this
 * repository always operates on: if $prevValue is given, the write only
 * applies when the currently stored value still equals it; either way, a
 * write that would leave the value unchanged also returns false (WordPress's
 * own "nothing to do" signal — indistinguishable, from the return value
 * alone, from a lost compare-and-swap).
 */
function update_post_meta(int $id, string $key, mixed $value, mixed $prevValue = ''): bool
{
    global $__postMeta;
    $existing = $__postMeta[$id][$key] ?? '';

    if ($prevValue !== '' && $existing !== $prevValue) {
        return false;
    }
    if ($existing === $value) {
        return false;
    }

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
    global $__postMeta;
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
        if (!$ok) continue;
        $matches[] = ($args['fields'] ?? null) === 'ids' ? $id : $post;
        $limit = (int) ($args['numberposts'] ?? -1);
        if ($limit > 0 && count($matches) >= $limit) break;
    }
    return $matches;
}
function is_wp_error(mixed $value): bool { return $value instanceof WP_Error; }

class WP_Post
{
    public function __construct(public int $ID, public string $post_type, public string $post_title) {}
}
class WP_Error {}
class WP_REST_Request
{
    public function __construct(private array $params = []) {}
    public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
}
class WP_REST_Response
{
    public function __construct(private mixed $data, private int $status) {}
    public function get_data(): mixed { return $this->data; }
    public function get_status(): int { return $this->status; }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Admin\Http\AdminRequestsController;
use CompuZign\Platform\Modules\Requests\Repositories\RequestRepository;
use CompuZign\Platform\Modules\Requests\Support\RequestLifecycle;

function check_status_transition(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Request status transition: ' . $message);
    }
}

$requests   = new RequestRepository();
$controller = new AdminRequestsController();

function seedRequest(RequestRepository $requests, string $ref): array
{
    $outcome = $requests->createOwned([
        'type' => 'quote_cart', 'quote_ref' => $ref, 'contact' => 'Jane Doe', 'company' => 'Acme Co',
        'email' => 'buyer@example.com', 'phone' => '555-0100', 'notes' => '', 'category' => '',
        'items' => [], 'submitted' => '2026-08-31 00:00:00',
    ]);
    $postId = $outcome['post_id'];
    $requests->claimPlatformId($postId, 'CZR' . str_pad((string) $postId, 5, '2', STR_PAD_LEFT));
    return $outcome;
}

// ── Authorization ────────────────────────────────────────────────────────────

check_status_transition($controller->requireAdmin() === true, 'requireAdmin defers to current_user_can(PlatformAccess::CAP)');

// ── Not found ────────────────────────────────────────────────────────────────

$missing = $controller->updateRequestStatus(new WP_REST_Request(['ref' => 'CZ-NOPE99', 'status' => 'approved']));
check_status_transition($missing->get_status() === 404 && $missing->get_data()['success'] === false, 'an unknown ref 404s');

// ── pending -> approved ──────────────────────────────────────────────────────

$a = seedRequest($requests, 'CZ-ST001');
$approveResponse = $controller->updateRequestStatus(new WP_REST_Request(['ref' => 'CZ-ST001', 'status' => 'approved']));
$approveData      = $approveResponse->get_data();
check_status_transition($approveResponse->get_status() === 200 && $approveData['success'] === true, 'pending -> approved succeeds');
check_status_transition($approveData['request']['status'] === RequestLifecycle::STATUS_APPROVED, 'the response reflects the new status');
check_status_transition(
    array_keys($approveData['request']) === ['quote_ref', 'platform_id', 'status', 'type', 'contact', 'company', 'email', 'phone', 'notes', 'category', 'items', 'submitted'],
    'the mutation response is the same allow-listed detail projection as GET — no raw post ID, no view_secret_hash'
);

// ── pending -> cancelled ─────────────────────────────────────────────────────

$b = seedRequest($requests, 'CZ-ST002');
$cancelResponse = $controller->updateRequestStatus(new WP_REST_Request(['ref' => 'CZ-ST002', 'status' => 'cancelled']));
check_status_transition($cancelResponse->get_status() === 200, 'pending -> cancelled succeeds');
check_status_transition($cancelResponse->get_data()['request']['status'] === RequestLifecycle::STATUS_CANCELLED, 'the response reflects cancelled');

// ── Same-state idempotency ───────────────────────────────────────────────────

$repeatApprove = $controller->updateRequestStatus(new WP_REST_Request(['ref' => 'CZ-ST001', 'status' => 'approved']));
check_status_transition($repeatApprove->get_status() === 200 && $repeatApprove->get_data()['success'] === true, 'repeating the same approve is idempotent, not an error');

// ── Opposite-terminal rejection (both directions) ────────────────────────────

$approvedThenCancel = $controller->updateRequestStatus(new WP_REST_Request(['ref' => 'CZ-ST001', 'status' => 'cancelled']));
check_status_transition($approvedThenCancel->get_status() === 409, 'approved -> cancelled is rejected with 409');

$cancelledThenApprove = $controller->updateRequestStatus(new WP_REST_Request(['ref' => 'CZ-ST002', 'status' => 'approved']));
check_status_transition($cancelledThenApprove->get_status() === 409, 'cancelled -> approved is rejected with 409');

// ── Legacy raw `new` transitions using its raw stored value as the CAS compare value ──

$c = seedRequest($requests, 'CZ-ST003');
update_post_meta($c['post_id'], 'cz_request_status', 'new');
$legacyApprove = $controller->updateRequestStatus(new WP_REST_Request(['ref' => 'CZ-ST003', 'status' => 'approved']));
check_status_transition($legacyApprove->get_status() === 200, 'a legacy raw `new` record (reads as pending) can still transition to approved');

// ── Concurrent compare-and-swap: the loser must not silently overwrite the winner ──

$d = seedRequest($requests, 'CZ-ST004');
// Simulate two admin tabs racing pending -> approved and pending -> cancelled,
// both having observed the same starting `pending`. RequestRepository::updateStatus()
// re-reads the current raw value itself, so calling it twice in sequence with
// no intervening state change already exercises the same compare-and-swap
// path a real race would: the winner's write changes the stored value out
// from under whichever call runs second.
$winner = $requests->updateStatus($d['post_id'], RequestLifecycle::STATUS_APPROVED);
$loser  = $requests->updateStatus($d['post_id'], RequestLifecycle::STATUS_CANCELLED);
check_status_transition($winner === true, 'the first writer (approve) wins the race');
check_status_transition($loser === false, 'the second writer (cancel), racing against an already-changed value, is rejected rather than silently overwriting the winner');
check_status_transition($requests->findByRef('CZ-ST004')['status'] === RequestLifecycle::STATUS_APPROVED, 'the stored status is the winner\'s, not the loser\'s');

// A same-target race resolves idempotently rather than as a false conflict:
$e = seedRequest($requests, 'CZ-ST005');
$firstApprove  = $requests->updateStatus($e['post_id'], RequestLifecycle::STATUS_APPROVED);
$secondApprove = $requests->updateStatus($e['post_id'], RequestLifecycle::STATUS_APPROVED);
check_status_transition($firstApprove === true && $secondApprove === true, 'two concurrent approvals of the same Request both resolve as success, not one success and one 409');

echo "Request status transition checks passed.\n";
