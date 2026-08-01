<?php

declare(strict_types=1);

// Runs the real Category controller against a deliberately small in-memory
// WordPress term/meta boundary. It verifies the persisted lifecycle facts the
// mounted drawer regression cannot observe: saved Overview creation retains a
// pending draft, Disable/Enable only masks it, and an empty description deletes
// the owned term meta rather than retaining stale text.

$__categoryTerms = [];
$__categoryMeta = [];
$__nextCategoryTermId = 800;

function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
function sanitize_textarea_field(mixed $value): string { return trim((string) $value); }
function get_term_meta(int $id, string $key, bool $single = false): mixed {
    global $__categoryMeta;
    $value = $__categoryMeta[$id][$key] ?? '';
    return $single ? $value : ($value === '' ? [] : [$value]);
}
function update_term_meta(int $id, string $key, mixed $value): bool {
    global $__categoryMeta;
    $__categoryMeta[$id][$key] = $value;
    return true;
}
function delete_term_meta(int $id, string $key): bool {
    global $__categoryMeta;
    unset($__categoryMeta[$id][$key]);
    return true;
}
function wp_insert_term(string $name, string $taxonomy): array {
    global $__categoryTerms, $__nextCategoryTermId;
    $id = $__nextCategoryTermId++;
    $__categoryTerms[$id] = new WP_Term($id, $name, strtolower(str_replace(' ', '-', $name)));
    return ['term_id' => $id];
}
function get_term(int $id, string $taxonomy): ?WP_Term {
    global $__categoryTerms;
    return $__categoryTerms[$id] ?? null;
}
function wp_update_term(int $id, string $taxonomy, array $change): array {
    global $__categoryTerms;
    if (isset($change['name'])) $__categoryTerms[$id]->name = (string) $change['name'];
    return ['term_id' => $id];
}
function get_posts(array $args): array { return []; }
function is_wp_error(mixed $value): bool { return false; }
function rest_ensure_response(mixed $value): WP_REST_Response {
    return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
}

class WP_Term {
    public function __construct(public int $term_id, public string $name, public string $slug) {}
}
class WP_REST_Request {
    public function __construct(private array $params = []) {}
    public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
    public function has_param(string $key): bool { return array_key_exists($key, $this->params); }
    public function get_json_params(): array { return $this->params; }
}
class WP_REST_Response {
    public function __construct(private mixed $data, private int $status) {}
    public function get_data(): mixed { return $this->data; }
    public function get_status(): int { return $this->status; }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Admin\Http\AdminCategoriesController;
use CompuZign\Platform\Modules\Admin\Support\CategoryMeta;

function check_category(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "  ok — {$message}\n";
}

$controller = new AdminCategoriesController();

echo "Category Overview Save lifecycle\n";
$created = $controller->createCategory(new WP_REST_Request([
    'name' => 'Networking', 'description' => 'Network design and support.',
]))->get_data();
$id = $created['category']['id'];

check_category($created['category']['platform_status'] === 'disabled', 'Overview creation uses raw disabled/Pending storage');
check_category($created['category']['previous_platform_status'] === '', 'new Pending Category has no Disable mask');
check_category($created['category']['module_status']['overview'] === 'pending', 'Overview Save creates a pending draft');
check_category($created['category']['has_draft'] === true, 'the created Overview remains draft-preferred until Publish');

$settled = $controller->settleOverview(new WP_REST_Request(['id' => $id]))->get_data();
check_category($settled['category']['module_status']['overview'] === 'settled', 'Publish settlement clears the Overview draft');

$active = $controller->updateStatus(new WP_REST_Request(['id' => $id, 'platform_status' => 'active']))->get_data();
check_category($active['category']['platform_status'] === 'active', 'Publish activation is a separate later action');

$disabled = $controller->updateStatus(new WP_REST_Request(['id' => $id, 'action' => 'disable']))->get_data();
check_category($disabled['category']['platform_status'] === 'disabled', 'Disable applies the visible disabled state');
check_category($disabled['category']['previous_platform_status'] === 'active', 'Disable captures the explicit mask');
check_category($disabled['category']['module_status']['overview'] === 'settled', 'Disable does not alter module settlement');

$enabled = $controller->updateStatus(new WP_REST_Request(['id' => $id, 'action' => 'enable']))->get_data();
check_category($enabled['category']['platform_status'] === 'disabled', 'Enable returns to raw disabled/Pending storage, never active');
check_category($enabled['category']['previous_platform_status'] === '', 'Enable clears the explicit mask');
check_category($enabled['category']['module_status']['overview'] === 'settled', 'Enable does not settle or rewrite Overview');

echo "\nCategory description clear\n";
$controller->saveOverview(new WP_REST_Request(['id' => $id, 'name' => 'Networking', 'description' => '']))->get_data();
$cleared = $controller->settleOverview(new WP_REST_Request(['id' => $id]))->get_data();
check_category(get_term_meta($id, CategoryMeta::DESCRIPTION_META, true) === '', 'settling an empty Description deletes stale term meta');
check_category($cleared['category']['description'] === '', 'settled Category response exposes the authoritative empty Description');

echo "\nCategory archive restore\n";
$archived = $controller->updateStatus(new WP_REST_Request(['id' => $id, 'platform_status' => 'archived']))->get_data();
check_category($archived['category']['platform_status'] === 'archived', 'Archive enters the bin');
$restored = $controller->restoreCategory(new WP_REST_Request(['id' => $id]))->get_data();
check_category($restored['category']['platform_status'] === 'disabled', 'Restore returns to raw disabled/Pending storage');
check_category($restored['category']['previous_platform_status'] === '', 'Restore clears any prior mask context');

echo "\nAll Category pending lifecycle checks passed.\n";
