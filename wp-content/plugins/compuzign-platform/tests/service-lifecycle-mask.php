<?php

declare(strict_types=1);

// Reproduces and verifies the Service Disable/Enable lifecycle contract fixed
// in this milestone: calls the REAL ServiceController handlers (create,
// module draft saves, status) against an in-memory WordPress post/meta/term
// stub — not a reimplementation of the controller's logic. No PHPUnit/bootstrap
// suite exists in this plugin (see tests/tier-instance-mutations.php for the
// same pattern), so WordPress functions are stubbed minimally and in-memory.

$__wpPosts    = [];
$__wpPostMeta = [];
$__wpPostTerms = [];
$__wpTerms     = []; // term_id => ['name' => ..., 'slug' => ...]
$__wpNextPostId = 900;
$__wpNextTermId = 1;

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim((string) $value); }
}
if (!function_exists('wp_kses_post')) {
    function wp_kses_post(mixed $value): string { return (string) $value; }
}
if (!function_exists('sanitize_title')) {
    function sanitize_title(mixed $value): string { return strtolower(trim((string) preg_replace('/[^a-zA-Z0-9]+/', '-', (string) $value), '-')); }
}
if (!function_exists('html_entity_decode')) {
    // Real PHP builtin — never redefine. Present only so the grep-based
    // function inventory above reads completely; no stub is registered.
}

if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post
    {
        global $__wpPosts;
        return $__wpPosts[$id] ?? null;
    }
}
if (!function_exists('get_post_meta')) {
    function get_post_meta(int $id, string $key, bool $single = false): mixed
    {
        global $__wpPostMeta;
        $value = $__wpPostMeta[$id][$key] ?? '';
        return $single ? $value : ($value === '' ? [] : [$value]);
    }
}
if (!function_exists('update_post_meta')) {
    function update_post_meta(int $id, string $key, mixed $value): bool
    {
        global $__wpPostMeta;
        $__wpPostMeta[$id][$key] = $value;
        return true;
    }
}
if (!function_exists('delete_post_meta')) {
    function delete_post_meta(int $id, string $key): bool
    {
        global $__wpPostMeta;
        unset($__wpPostMeta[$id][$key]);
        return true;
    }
}
if (!function_exists('wp_insert_post')) {
    function wp_insert_post(array $args, bool $wpError = false): int
    {
        global $__wpPosts, $__wpNextPostId;
        $id = $__wpNextPostId++;
        $__wpPosts[$id] = new WP_Post($id, (string) ($args['post_title'] ?? ''));
        $__wpPosts[$id]->post_excerpt = (string) ($args['post_excerpt'] ?? '');
        $__wpPosts[$id]->post_content = (string) ($args['post_content'] ?? '');
        $__wpPosts[$id]->post_status  = (string) ($args['post_status'] ?? 'publish');
        $__wpPosts[$id]->post_name    = 'svc-' . $id;
        return $id;
    }
}
if (!function_exists('wp_update_post')) {
    function wp_update_post(array $args): int
    {
        global $__wpPosts;
        $id = (int) $args['ID'];
        if (isset($args['post_title']))   { $__wpPosts[$id]->post_title   = (string) $args['post_title']; }
        if (isset($args['post_excerpt'])) { $__wpPosts[$id]->post_excerpt = (string) $args['post_excerpt']; }
        if (isset($args['post_content'])) { $__wpPosts[$id]->post_content = (string) $args['post_content']; }
        return $id;
    }
}
if (!function_exists('is_wp_error')) {
    function is_wp_error(mixed $thing): bool { return false; }
}
if (!function_exists('wp_set_object_terms')) {
    function wp_set_object_terms(int $id, array $termIds, string $taxonomy): array
    {
        global $__wpPostTerms;
        $__wpPostTerms[$id] = $termIds;
        return $termIds;
    }
}
if (!function_exists('wp_get_post_terms')) {
    function wp_get_post_terms(int $id, string $taxonomy, array $args = []): array
    {
        global $__wpPostTerms, $__wpTerms;
        $ids = $__wpPostTerms[$id] ?? [];
        if (($args['fields'] ?? null) === 'ids') { return $ids; }
        $out = [];
        foreach ($ids as $termId) {
            $t = $__wpTerms[$termId] ?? ['name' => "Term {$termId}", 'slug' => "term-{$termId}"];
            $out[] = (object) ['term_id' => $termId, 'name' => $t['name'], 'slug' => $t['slug']];
        }
        return $out;
    }
}
if (!function_exists('get_term_meta')) {
    function get_term_meta(int $termId, string $key, bool $single = false): mixed { return ''; }
}
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response(mixed $value): WP_REST_Response
    {
        return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
    }
}

if (!class_exists('WP_Post')) {
    class WP_Post
    {
        public string $post_type    = 'cz_service';
        public string $post_excerpt = '';
        public string $post_content = '';
        public string $post_status  = 'publish';
        public string $post_name    = '';
        public function __construct(public int $ID, public string $post_title) {}
    }
}
if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request
    {
        public function __construct(private array $params = []) {}
        public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
        public function has_param(string $key): bool { return array_key_exists($key, $this->params); }
    }
}
if (!class_exists('WP_REST_Response')) {
    class WP_REST_Response
    {
        public function __construct(private mixed $data = null, private int $status = 200) {}
        public function get_data(): mixed { return $this->data; }
        public function get_status(): int { return $this->status; }
    }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Service\Http\ServiceController;

function check_lifecycle(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "  ok — {$message}\n";
}

$controller = new ServiceController();

function createTestService(ServiceController $controller, int $categoryTermId): array
{
    global $__wpTerms;
    $__wpTerms[$categoryTermId] = ['name' => 'Cloud', 'slug' => 'cloud'];
    $req = new WP_REST_Request([
        'title'        => 'Managed Backup',
        'excerpt'      => '',
        'content'      => 'Full description of the service.',
        'category_ids' => [$categoryTermId],
    ]);
    return $controller->createService($req)->get_data();
}

// ── Scenario A: "Disabled published Service" ─────────────────────────────────
// Create → settle every module (so the record can legitimately become
// active) → publish (status=active) → Disable → every module pill's backing
// module_status must stay 'settled' (Disable never rewrites it to pending)
// and platform_status must read 'disabled' with the mask captured → Enable →
// platform_status must be restored to 'active' (not left disabled, not
// re-settled) with the mask cleared.
echo "Scenario A — disable/enable a published Service\n";

$created = createTestService($controller, 501);
$id = $created['service']['id'];

$controller->updateInclusions(new WP_REST_Request(['id' => $id, 'inclusions' => [['label' => 'Daily snapshots']]]));
$controller->updateFaqs(new WP_REST_Request(['id' => $id, 'faqs' => [['question' => 'How often?', 'answer' => 'Daily.']]]));
$controller->settleAll(new WP_REST_Request(['id' => $id]));
$publishResult = $controller->updateStatus(new WP_REST_Request(['id' => $id, 'platform_status' => 'active']))->get_data();

check_lifecycle($publishResult['service']['platform_status'] === 'active', 'publish activates the Service');
check_lifecycle($publishResult['service']['module_status']['overview'] === 'settled', 'overview settled before disable');
check_lifecycle($publishResult['service']['module_status']['inclusions'] === 'settled', 'inclusions settled before disable');
check_lifecycle($publishResult['service']['module_status']['faqs'] === 'settled', 'faqs settled before disable');

$disableResult = $controller->updateStatus(new WP_REST_Request(['id' => $id, 'action' => 'disable']))->get_data();
check_lifecycle($disableResult['service']['platform_status'] === 'disabled', 'Disable sets platform_status to disabled');
check_lifecycle($disableResult['service']['previous_platform_status'] === 'active', 'Disable captures the prior active status as the mask');
check_lifecycle($disableResult['service']['module_status']['overview'] === 'settled', 'Disable does not touch overview module_status (stays settled, never pending)');
check_lifecycle($disableResult['service']['module_status']['inclusions'] === 'settled', 'Disable does not touch inclusions module_status');
check_lifecycle($disableResult['service']['module_status']['faqs'] === 'settled', 'Disable does not touch faqs module_status');

$enableResult = $controller->updateStatus(new WP_REST_Request(['id' => $id, 'action' => 'enable']))->get_data();
check_lifecycle($enableResult['service']['platform_status'] === 'active', 'Enable restores platform_status to active (its prior state)');
check_lifecycle($enableResult['service']['previous_platform_status'] === '', 'Enable clears the mask');
check_lifecycle($enableResult['service']['module_status']['overview'] === 'settled', 'Enable does not re-derive/resettle overview (still settled)');
check_lifecycle($enableResult['service']['module_status']['inclusions'] === 'settled', 'Enable does not resettle inclusions');
check_lifecycle($enableResult['service']['module_status']['faqs'] === 'settled', 'Enable does not resettle faqs');

// ── Scenario B: "Disabled unpublished/pending Service" ───────────────────────
// A freshly created Service (overview pending, inclusions/faqs not-configured,
// platform_status already 'disabled' because it has never been published) is
// disabled and re-enabled. Enable must restore exactly the pre-disable
// module truth — pending stays pending, not-configured stays not-configured —
// and must NEVER activate/publish/settle anything.
echo "\nScenario B — disable/enable a never-published (pending) Service\n";

$created2 = createTestService($controller, 502);
$id2 = $created2['service']['id'];

check_lifecycle($created2['service']['platform_status'] === 'disabled', 'a freshly created Service starts disabled (never published)');
check_lifecycle($created2['service']['module_status']['overview'] === 'pending', 'freshly created overview is pending (draft exists)');
check_lifecycle($created2['service']['module_status']['inclusions'] === 'not-configured', 'freshly created inclusions is not-configured');
check_lifecycle($created2['service']['module_status']['faqs'] === 'not-configured', 'freshly created faqs is not-configured');

$disableResult2 = $controller->updateStatus(new WP_REST_Request(['id' => $id2, 'action' => 'disable']))->get_data();
check_lifecycle($disableResult2['service']['platform_status'] === 'disabled', 'Disable on an already-disabled Service stays disabled');
check_lifecycle($disableResult2['service']['previous_platform_status'] === 'disabled', 'Disable captures the mask even when the prior status was already disabled');
check_lifecycle($disableResult2['service']['module_status']['overview'] === 'pending', 'Disable never turns a pending module into anything else');
check_lifecycle($disableResult2['service']['module_status']['inclusions'] === 'not-configured', 'Disable never turns not-configured into pending');

$enableResult2 = $controller->updateStatus(new WP_REST_Request(['id' => $id2, 'action' => 'enable']))->get_data();
check_lifecycle($enableResult2['service']['platform_status'] === 'disabled', 'Enable restores a never-published Service to disabled, NOT active — Enable must never publish');
check_lifecycle($enableResult2['service']['previous_platform_status'] === '', 'Enable clears the mask on the never-published Service too');
check_lifecycle($enableResult2['service']['module_status']['overview'] === 'pending', 'Enable preserves the pending overview draft — it never settles it');
check_lifecycle($enableResult2['service']['module_status']['inclusions'] === 'not-configured', 'Enable preserves not-configured — it never activates unconfigured content');
check_lifecycle($enableResult2['service']['module_status']['faqs'] === 'not-configured', 'Enable preserves not-configured faqs');

// ── Guard: Enable is rejected from a non-disabled Service ────────────────────
echo "\nGuard — Enable/Disable reject illegal transitions\n";

$created3 = createTestService($controller, 503);
$id3 = $created3['service']['id'];
$controller->updateStatus(new WP_REST_Request(['id' => $id3, 'platform_status' => 'active']));
$illegalEnable = $controller->updateStatus(new WP_REST_Request(['id' => $id3, 'action' => 'enable']));
check_lifecycle($illegalEnable->get_status() === 422, 'Enable on an already-active Service is rejected (422)');
check_lifecycle($illegalEnable->get_data()['success'] === false, 'the rejected Enable response reports success=false');

echo "\nAll Service Disable/Enable lifecycle checks passed.\n";
