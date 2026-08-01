<?php

declare(strict_types=1);

// Runs the real Category controller against a deliberately small in-memory
// WordPress term/meta boundary. It verifies the persisted lifecycle facts the
// mounted drawer regression cannot observe: saved Overview creation retains a
// pending draft, Disable/Enable only masks it, and an empty description deletes
// the owned term meta rather than retaining stale text.

$__categoryTerms = [];
$__categoryMeta = [];
$__categoryOptions = [];
$__nextCategoryTermId = 800;
$__rejectPlatformMetaClaims = false;

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
function add_term_meta(int $id, string $key, mixed $value, bool $unique = false): int|false {
    global $__categoryMeta, $__rejectPlatformMetaClaims;
    if ($key === 'cz_platform_id' && $__rejectPlatformMetaClaims) return false;
    if ($unique && array_key_exists($key, $__categoryMeta[$id] ?? [])) return false;
    $__categoryMeta[$id][$key] = $value;
    return 1;
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
function get_terms(array $args = []): array {
    global $__categoryTerms, $__categoryMeta;
    $terms = [];
    foreach ($__categoryTerms as $id => $term) {
        if (isset($args['meta_key']) && ($__categoryMeta[$id][$args['meta_key']] ?? null) !== ($args['meta_value'] ?? null)) continue;
        $terms[] = ($args['fields'] ?? null) === 'ids' ? $id : $term;
        if (count($terms) >= (int) ($args['number'] ?? PHP_INT_MAX)) break;
    }
    return $terms;
}
function wp_update_term(int $id, string $taxonomy, array $change): array {
    global $__categoryTerms;
    if (isset($change['name'])) $__categoryTerms[$id]->name = (string) $change['name'];
    return ['term_id' => $id];
}
function wp_delete_term(int $id, string $taxonomy): bool {
    global $__categoryTerms, $__categoryMeta;
    if (!isset($__categoryTerms[$id])) return false;
    unset($__categoryTerms[$id], $__categoryMeta[$id]);
    return true;
}
function get_posts(array $args): array { return []; }
function add_option(string $key, mixed $value, string $deprecated = '', string|bool $autoload = 'yes'): bool {
    global $__categoryOptions;
    if (array_key_exists($key, $__categoryOptions)) return false;
    $__categoryOptions[$key] = $value;
    return true;
}
function get_option(string $key, mixed $default = false): mixed {
    global $__categoryOptions;
    return $__categoryOptions[$key] ?? $default;
}
function update_option(string $key, mixed $value, string|bool|null $autoload = null): bool {
    global $__categoryOptions;
    $changed = !array_key_exists($key, $__categoryOptions) || $__categoryOptions[$key] !== $value;
    $__categoryOptions[$key] = $value;
    return $changed;
}
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
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_category(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "  ok — {$message}\n";
}

$platformIdentifiers = new PlatformIdentifierStation();
$controller = new AdminCategoriesController($platformIdentifiers);

$rejectedCreate = $controller->createCategory(new WP_REST_Request([
    'name' => 'Client identity',
    'platform_id' => 'CZC2A7KZ',
]));
check_category($rejectedCreate->get_status() === 422, 'Category creation explicitly rejects a client-provided platform_id');
check_category($__categoryTerms === [], 'rejected client identity creates no native Category');

$__rejectPlatformMetaClaims = true;
$failedIdentityCreate = $controller->createCategory(new WP_REST_Request(['name' => 'Unconfirmed identity']));
$__rejectPlatformMetaClaims = false;
check_category($failedIdentityCreate->get_status() === 500, 'Category creation fails when permanent identity cannot be verified');
check_category($__categoryTerms === [], 'failed identity verification removes the unconfirmed native Category');
check_category(
    count(array_filter($__categoryOptions, static fn(mixed $record): bool => is_array($record) && ($record['status'] ?? null) === 'retired')) === 1,
    'failed identity verification permanently retires the unused reservation'
);

echo "Category Overview Save lifecycle\n";
$created = $controller->createCategory(new WP_REST_Request([
    'name' => 'Networking', 'description' => 'Network design and support.',
]))->get_data();
$id = $created['category']['id'];
$platformId = $created['category']['platform_id'];

check_category($platformIdentifiers->validate(PlatformIdentifierPolicy::CATEGORY, $platformId), 'Overview creation returns a valid permanent CZC identifier');
check_category(CategoryMeta::platformId($id) === $platformId, 'Category creation stores the same identifier in term meta');
check_category($platformIdentifiers->lookupNative(PlatformIdentifierPolicy::CATEGORY, $id)?->platformId() === $platformId, 'Category creation finalizes the reverse native binding');

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

echo "\nCategory identity immutability and deletion\n";
$amendment = $controller->saveOverview(new WP_REST_Request([
    'id' => $id,
    'platformId' => 'CZC2A7KZ',
    'name' => 'Attempted amendment',
]));
check_category($amendment->get_status() === 422, 'Category mutation explicitly rejects platformId');
check_category(CategoryMeta::platformId($id) === $platformId, 'rejected amendment leaves Category identity unchanged');

$trashed = $controller->updateStatus(new WP_REST_Request(['id' => $id, 'platform_status' => 'trashed']))->get_data();
check_category($trashed['category']['platform_id'] === $platformId, 'trash preserves permanent Category identity');
$deleted = $controller->permanentDeleteCategory(new WP_REST_Request(['id' => $id]))->get_data();
check_category($deleted['platform_id'] === $platformId, 'permanent deletion returns the deleted Category identifier');
check_category($platformIdentifiers->resolve($platformId)?->isDeleted() === true, 'permanent deletion retains the Category identifier tombstone');

echo "\nAll Category pending lifecycle checks passed.\n";
