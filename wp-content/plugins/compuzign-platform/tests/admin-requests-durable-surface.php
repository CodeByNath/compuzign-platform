<?php

declare(strict_types=1);

// CRM-1B: AdminRequestsController's list/detail routes must read the durable
// RequestRepository exclusively — the 7-day cz_quote_* transient is no
// longer the CRM queue authority (CRM-1A already made every submission
// durable and identified immediately). This deliberately defines NO
// get_transient()/set_transient() stub: if either route ever called one, the
// undefined-function fatal below would be the proof it regressed back to
// transient scanning.
//
// Also proves: both routes are an explicit allow-list (view_secret_hash can
// never reach either response, even if a stored snapshot were ever poisoned
// with one), and a legacy raw `new` status surfaces as normalized `pending`
// through this same admin-facing boundary.

function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
function current_user_can(string $cap): bool { return true; }
function rest_ensure_response(mixed $value): WP_REST_Response
{
    return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
}
function register_rest_route(string $namespace, string $route, array $args = []): bool { return true; }
function add_action(string $hook, callable $callback): bool { return true; }

$__posts    = [];
$__postMeta = [];
$__nextPostId = 7000;

function wp_insert_post(array $args, bool $wpError = false): int
{
    global $__posts, $__nextPostId;
    $id = $__nextPostId++;
    $__posts[$id] = new WP_Post($id, (string) ($args['post_type'] ?? ''), (string) ($args['post_title'] ?? ''));
    return $id;
}
function get_post(int $id): ?WP_Post { global $__posts; return $__posts[$id] ?? null; }
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
    if (($args['orderby'] ?? null) === 'ID' && ($args['order'] ?? null) === 'DESC') {
        $matches = array_reverse($matches);
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

function check_admin_requests(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Admin requests durable surface: ' . $message);
    }
}

$requests = new RequestRepository();

function seedDurable(RequestRepository $requests, string $ref, string $contact, array $items = []): array
{
    $outcome = $requests->createOwned([
        'type' => 'quote_cart', 'quote_ref' => $ref, 'contact' => $contact, 'company' => 'Acme Co',
        'email' => 'buyer@example.com', 'phone' => '555-0100', 'notes' => '', 'category' => '',
        'items' => $items, 'submitted' => '2026-08-30 00:00:00',
    ]);
    $postId = $outcome['post_id'];
    $requests->claimPlatformId($postId, 'CZR' . str_pad((string) $postId, 5, '2', STR_PAD_LEFT));
    return ['post_id' => $postId, 'platform_id' => $requests->platformId($postId)];
}

$controller = new AdminRequestsController();

// ── First durable record ────────────────────────────────────────────────────

$ref1 = seedDurable($requests, 'CZ-ADM001', 'Jane Doe', [
    ['price' => 100, 'serviceTitle' => 'KAIROS'],
    ['price' => 50, 'serviceTitle' => 'Backup'],
]);

$listResponse = $controller->listRequests(new WP_REST_Request());
$listData     = $listResponse->get_data();

check_admin_requests($listResponse->get_status() === 200 && $listData['success'] === true, 'list succeeds');
check_admin_requests(count($listData['requests']) === 1, 'the list contains exactly the one durable record');

$row = $listData['requests'][0];
check_admin_requests($row['quote_ref'] === 'CZ-ADM001', 'the row carries the customer-facing reference');
check_admin_requests($row['platform_id'] === $ref1['platform_id'], 'the row carries the admin-facing CZR');
check_admin_requests($row['status'] === RequestLifecycle::STATUS_PENDING, 'a fresh durable Request lists as pending');
check_admin_requests($row['contact'] === 'Jane Doe' && $row['company'] === 'Acme Co', 'contact/company summarize correctly');
check_admin_requests($row['item_count'] === 2 && $row['total'] === 150.0, 'item count/value summary is correct');
check_admin_requests(
    array_keys($row) === ['quote_ref', 'platform_id', 'status', 'type', 'contact', 'company', 'email', 'submitted', 'item_count', 'total'],
    'the list row is an explicit allow-list — no other field, no view_secret_hash, no raw snapshot dump'
);

// ── Detail ───────────────────────────────────────────────────────────────────

$detailResponse = $controller->getRequest(new WP_REST_Request(['ref' => 'CZ-ADM001']));
$detail         = $detailResponse->get_data()['request'];

check_admin_requests($detailResponse->get_status() === 200, 'detail succeeds for an existing ref');
check_admin_requests($detail['platform_id'] === $ref1['platform_id'], 'detail carries the CZR');
check_admin_requests($detail['status'] === RequestLifecycle::STATUS_PENDING, 'detail carries the normalized status');
check_admin_requests(count($detail['items']) === 2, 'detail carries the full immutable submitted snapshot');
check_admin_requests(
    array_keys($detail) === ['quote_ref', 'platform_id', 'status', 'type', 'contact', 'company', 'email', 'phone', 'notes', 'category', 'items', 'submitted'],
    'the detail response is an explicit allow-list — no view_secret_hash, no bearer secret, no transient plumbing'
);
check_admin_requests(!array_key_exists('view_secret_hash', $detail), 'view_secret_hash never reaches the detail response');

// ── Defense in depth: a poisoned stored snapshot still cannot leak the hash ──

$poisonedOutcome = $requests->createOwned([
    'type' => 'quote_cart', 'quote_ref' => 'CZ-ADM002', 'contact' => 'Poisoned', 'company' => '',
    'email' => 'x@example.com', 'phone' => '', 'notes' => '', 'category' => '', 'items' => [],
    'submitted' => '2026-08-30 00:00:00', 'view_secret_hash' => 'should-never-leak',
]);
$requests->claimPlatformId($poisonedOutcome['post_id'], 'CZRPOISON1');

$poisonedDetail = $controller->getRequest(new WP_REST_Request(['ref' => 'CZ-ADM002']))->get_data()['request'];
check_admin_requests(!array_key_exists('view_secret_hash', $poisonedDetail), 'even a stored view_secret_hash never survives the allow-list projection');

// ── Not found ────────────────────────────────────────────────────────────────

$missing = $controller->getRequest(new WP_REST_Request(['ref' => 'CZ-NOPE99']));
check_admin_requests($missing->get_status() === 404 && $missing->get_data()['success'] === false, 'an unknown ref 404s');

// ── Legacy raw `new` normalizes to `pending` through this same boundary ─────

$legacyOutcome = $requests->createOwned([
    'type' => 'quote_cart', 'quote_ref' => 'CZ-ADM003', 'contact' => 'Legacy', 'company' => '',
    'email' => 'legacy@example.com', 'phone' => '', 'notes' => '', 'category' => '', 'items' => [],
    'submitted' => '2020-01-01 00:00:00',
]);
update_post_meta($legacyOutcome['post_id'], 'cz_request_status', 'new');
$requests->claimPlatformId($legacyOutcome['post_id'], 'CZRLEGACY1');

$legacyDetail = $controller->getRequest(new WP_REST_Request(['ref' => 'CZ-ADM003']))->get_data()['request'];
check_admin_requests($legacyDetail['status'] === RequestLifecycle::STATUS_PENDING, 'a legacy raw new record surfaces as pending through the admin detail route');

$listAfterLegacy = $controller->listRequests(new WP_REST_Request())->get_data();
check_admin_requests(count($listAfterLegacy['requests']) === 3, 'the list now contains all three durable records');
$legacyRow = array_values(array_filter($listAfterLegacy['requests'], fn (array $r) => $r['quote_ref'] === 'CZ-ADM003'))[0] ?? null;
check_admin_requests($legacyRow !== null && $legacyRow['status'] === RequestLifecycle::STATUS_PENDING, 'the legacy record also lists as pending, not new');

echo "Admin requests durable surface checks passed.\n";
