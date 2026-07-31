<?php

declare(strict_types=1);

// Reproduces and verifies the Category Disable/Enable lifecycle contract —
// the Category mirror of tests/service-lifecycle-mask.php. Calls the REAL
// AdminCategoriesController handlers (create, overview save/settle, status)
// against an in-memory WordPress term/term-meta stub — not a reimplementation
// of the controller's logic. No PHPUnit/bootstrap suite exists in this plugin
// (see tests/service-lifecycle-mask.php for the same pattern).

$__wpTerms     = [];
$__wpTermMeta  = [];
$__wpNextTermId = 900;

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim((string) $value); }
}
if (!function_exists('html_entity_decode')) {
    // Real PHP builtin — never redefine. Present only so the grep-based
    // function inventory above reads completely; no stub is registered.
}

if (!function_exists('get_term_meta')) {
    function get_term_meta(int $termId, string $key, bool $single = false): mixed
    {
        global $__wpTermMeta;
        $value = $__wpTermMeta[$termId][$key] ?? '';
        return $single ? $value : ($value === '' ? [] : [$value]);
    }
}
if (!function_exists('update_term_meta')) {
    function update_term_meta(int $termId, string $key, mixed $value): bool
    {
        global $__wpTermMeta;
        $__wpTermMeta[$termId][$key] = $value;
        return true;
    }
}
if (!function_exists('get_term')) {
    function get_term(int $termId, string $taxonomy = ''): ?WP_Term
    {
        global $__wpTerms;
        return $__wpTerms[$termId] ?? null;
    }
}
if (!function_exists('wp_insert_term')) {
    function wp_insert_term(string $name, string $taxonomy): array
    {
        global $__wpTerms, $__wpNextTermId;
        $id = $__wpNextTermId++;
        $__wpTerms[$id] = new WP_Term($id, $name, 'diag-' . $id);
        return ['term_id' => $id, 'term_taxonomy_id' => $id];
    }
}
if (!function_exists('wp_update_term')) {
    function wp_update_term(int $termId, string $taxonomy, array $args): array
    {
        global $__wpTerms;
        if (isset($args['name'])) { $__wpTerms[$termId]->name = (string) $args['name']; }
        return ['term_id' => $termId];
    }
}
if (!function_exists('is_wp_error')) {
    function is_wp_error(mixed $thing): bool { return false; }
}
if (!function_exists('get_posts')) {
    // CategoryMeta::assignedServiceCount — no assigned Services in this test.
    function get_posts(array $args): array { return []; }
}
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response(mixed $value): WP_REST_Response
    {
        return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
    }
}

if (!class_exists('WP_Term')) {
    class WP_Term
    {
        public string $taxonomy = 'cz_service_category';
        public function __construct(public int $term_id, public string $name, public string $slug) {}
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

use CompuZign\Platform\Modules\Admin\Http\AdminCategoriesController;

function check_lifecycle(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "  ok — {$message}\n";
}

$controller = new AdminCategoriesController();

function createTestCategory(AdminCategoriesController $controller, string $name): array
{
    $req = new WP_REST_Request(['name' => $name, 'description' => 'A settled description.']);
    return $controller->createCategory($req)->get_data();
}

// ── Scenario A: "Disabled published Category" ────────────────────────────────
// Create → settle (so the record can legitimately become active) → publish
// (status=active) → Disable → overview stays settled (Disable never rewrites
// it) and platform_status reads 'disabled' with the mask captured → Enable →
// platform_status must land back on 'disabled' with the mask cleared — Enable
// never republishes on its own; the record only reaches 'active' again
// through an explicit, separate Publish call.
echo "Scenario A — disable/enable a published Category\n";

$created = createTestCategory($controller, 'Managed Backup Category');
$id = $created['category']['id'];

$controller->settleOverview(new WP_REST_Request(['id' => $id]));
$publishResult = $controller->updateStatus(new WP_REST_Request(['id' => $id, 'platform_status' => 'active']))->get_data();

check_lifecycle($publishResult['category']['platform_status'] === 'active', 'publish activates the Category');
check_lifecycle($publishResult['category']['module_status']['overview'] === 'settled', 'overview settled before disable');

$disableResult = $controller->updateStatus(new WP_REST_Request(['id' => $id, 'action' => 'disable']))->get_data();
check_lifecycle($disableResult['category']['platform_status'] === 'disabled', 'Disable sets platform_status to disabled');
check_lifecycle($disableResult['category']['previous_platform_status'] === 'active', 'Disable captures the prior active status as the mask');
check_lifecycle($disableResult['category']['module_status']['overview'] === 'settled', 'Disable does not touch overview module_status (stays settled, never pending)');

$enableResult = $controller->updateStatus(new WP_REST_Request(['id' => $id, 'action' => 'enable']))->get_data();
check_lifecycle($enableResult['category']['platform_status'] === 'disabled', 'Enable never republishes — a previously-active Category lands back on disabled, pending review, not active');
check_lifecycle($enableResult['category']['previous_platform_status'] === '', 'Enable clears the mask');
check_lifecycle($enableResult['category']['module_status']['overview'] === 'settled', 'Enable does not re-derive/resettle overview (still settled)');

// The record is fully settled and now needs only an explicit Publish to go
// live again — Enable deliberately stopped short of that decision.
$rePublishResult = $controller->updateStatus(new WP_REST_Request(['id' => $id, 'platform_status' => 'active']))->get_data();
check_lifecycle($rePublishResult['category']['platform_status'] === 'active', 'an explicit Publish after Enable is what actually reactivates the Category');

// ── Scenario B: "Disabled unpublished/pending Category" ──────────────────────
// A freshly created Category (overview pending, platform_status already
// 'disabled' because it has never been published) is disabled and re-enabled.
// Enable must restore exactly the pre-disable module truth — pending stays
// pending — and must NEVER activate/publish/settle anything.
echo "\nScenario B — disable/enable a never-published (pending) Category\n";

$created2 = createTestCategory($controller, 'Never Published Category');
$id2 = $created2['category']['id'];

check_lifecycle($created2['category']['platform_status'] === 'disabled', 'a freshly created Category starts disabled (never published)');
check_lifecycle($created2['category']['module_status']['overview'] === 'pending', 'freshly created overview is pending (draft exists)');

$disableResult2 = $controller->updateStatus(new WP_REST_Request(['id' => $id2, 'action' => 'disable']))->get_data();
check_lifecycle($disableResult2['category']['platform_status'] === 'disabled', 'Disable on an already-disabled Category stays disabled');
check_lifecycle($disableResult2['category']['previous_platform_status'] === 'disabled', 'Disable captures the mask even when the prior status was already disabled');
check_lifecycle($disableResult2['category']['module_status']['overview'] === 'pending', 'Disable never turns a pending module into anything else');

$enableResult2 = $controller->updateStatus(new WP_REST_Request(['id' => $id2, 'action' => 'enable']))->get_data();
check_lifecycle($enableResult2['category']['platform_status'] === 'disabled', 'Enable leaves a never-published Category on disabled, NOT active — Enable must never publish');
check_lifecycle($enableResult2['category']['previous_platform_status'] === '', 'Enable clears the mask on the never-published Category too');
check_lifecycle($enableResult2['category']['module_status']['overview'] === 'pending', 'Enable preserves the pending overview draft — it never settles it');

// ── Guard: Enable is rejected from a non-disabled Category ───────────────────
echo "\nGuard — Enable/Disable reject illegal transitions\n";

$created3 = createTestCategory($controller, 'Guard Test Category');
$id3 = $created3['category']['id'];
$controller->updateStatus(new WP_REST_Request(['id' => $id3, 'platform_status' => 'active']));
$illegalEnable = $controller->updateStatus(new WP_REST_Request(['id' => $id3, 'action' => 'enable']));
check_lifecycle($illegalEnable->get_status() === 422, 'Enable on an already-active Category is rejected (422)');
check_lifecycle($illegalEnable->get_data()['success'] === false, 'the rejected Enable response reports success=false');

echo "\nAll Category Disable/Enable lifecycle checks passed.\n";
