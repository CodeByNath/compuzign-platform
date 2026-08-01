<?php

declare(strict_types=1);

// Runs the real inline Category owner against an in-memory WordPress boundary.
// It locks the return-existing contract and the native-term identity race: a
// losing reservation is retired and must never overwrite or delete the term
// whose atomic term-meta claim won.

$__terms = [];
$__termMeta = [];
$__options = [];
$__nextTermId = 1200;
$__beforePlatformClaim = null;

function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
function sanitize_textarea_field(mixed $value): string { return trim((string) $value); }
function get_term_meta(int $id, string $key, bool $single = false): mixed {
    global $__termMeta;
    $value = $__termMeta[$id][$key] ?? '';
    return $single ? $value : ($value === '' ? [] : [$value]);
}
function update_term_meta(int $id, string $key, mixed $value): bool {
    global $__termMeta;
    $__termMeta[$id][$key] = $value;
    return true;
}
function add_term_meta(int $id, string $key, mixed $value, bool $unique = false): int|false {
    global $__termMeta, $__beforePlatformClaim;
    if ($key === 'cz_platform_id' && is_callable($__beforePlatformClaim)) {
        $hook = $__beforePlatformClaim;
        $__beforePlatformClaim = null;
        $hook($id);
    }
    if ($unique && array_key_exists($key, $__termMeta[$id] ?? [])) return false;
    $__termMeta[$id][$key] = $value;
    return 1;
}
function delete_term_meta(int $id, string $key): bool {
    global $__termMeta;
    unset($__termMeta[$id][$key]);
    return true;
}
function wp_insert_term(string $name, string $taxonomy): array|WP_Error {
    global $__terms, $__nextTermId;
    foreach ($__terms as $id => $term) {
        if ($term->name === $name) {
            return new WP_Error('term_exists', 'A term with the name provided already exists.', $id);
        }
    }
    $id = $__nextTermId++;
    $__terms[$id] = new WP_Term($id, $name, strtolower(str_replace(' ', '-', $name)));
    return ['term_id' => $id];
}
function get_term(int $id, string $taxonomy): ?WP_Term {
    global $__terms;
    return $__terms[$id] ?? null;
}
function get_terms(array $args = []): array {
    global $__terms, $__termMeta;
    $matches = [];
    foreach ($__terms as $id => $term) {
        if (isset($args['meta_key']) && ($__termMeta[$id][$args['meta_key']] ?? null) !== ($args['meta_value'] ?? null)) continue;
        $matches[] = ($args['fields'] ?? null) === 'ids' ? $id : $term;
        if (count($matches) >= (int) ($args['number'] ?? PHP_INT_MAX)) break;
    }
    return $matches;
}
function wp_update_term(int $id, string $taxonomy, array $change): array {
    global $__terms;
    if (isset($change['name'])) $__terms[$id]->name = (string) $change['name'];
    return ['term_id' => $id];
}
function wp_delete_term(int $id, string $taxonomy): bool {
    global $__terms, $__termMeta;
    if (!isset($__terms[$id])) return false;
    unset($__terms[$id], $__termMeta[$id]);
    return true;
}
function get_posts(array $args): array { return []; }
function add_option(string $key, mixed $value, string $deprecated = '', string|bool $autoload = 'yes'): bool {
    global $__options;
    if (array_key_exists($key, $__options)) return false;
    $__options[$key] = $value;
    return true;
}
function get_option(string $key, mixed $default = false): mixed {
    global $__options;
    return $__options[$key] ?? $default;
}
function update_option(string $key, mixed $value, string|bool|null $autoload = null): bool {
    global $__options;
    $changed = !array_key_exists($key, $__options) || $__options[$key] !== $value;
    $__options[$key] = $value;
    return $changed;
}
function is_wp_error(mixed $value): bool { return $value instanceof WP_Error; }
function rest_ensure_response(mixed $value): WP_REST_Response {
    return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
}

class WP_Term {
    public function __construct(public int $term_id, public string $name, public string $slug) {}
}
class WP_Error {
    public function __construct(private string $code, private string $message, private mixed $data = null) {}
    public function get_error_code(): string { return $this->code; }
    public function get_error_message(): string { return $this->message; }
    public function get_error_data(): mixed { return $this->data; }
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

function check_inline(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
    echo "  ok — {$message}\n";
}

function retired_count(): int
{
    global $__options;
    return count(array_filter(
        $__options,
        static fn(mixed $record): bool => is_array($record) && ($record['status'] ?? null) === 'retired'
    ));
}

$station = new PlatformIdentifierStation();
$controller = new AdminCategoriesController($station);

echo "Inline Category creation identity\n";
$created = $controller->createServiceCategory(new WP_REST_Request([
    'name' => 'Cloud',
    'description' => 'Cloud services.',
]))->get_data();
$termId = $created['category']['id'];
$platformId = $created['category']['platform_id'];

check_inline($created['success'] === true && $created['existing'] === false, 'inline creation creates one new Category');
check_inline($station->validate(PlatformIdentifierPolicy::CATEGORY, $platformId), 'inline creation returns a valid CZC identifier');
check_inline(CategoryMeta::platformId($termId) === $platformId, 'inline creation stores its identifier in authoritative term meta');
check_inline($station->lookupNative(PlatformIdentifierPolicy::CATEGORY, $termId)?->platformId() === $platformId, 'inline creation finalizes the native binding');

echo "\nInline duplicate return-existing contract\n";
$duplicate = $controller->createServiceCategory(new WP_REST_Request(['name' => 'Cloud']))->get_data();
check_inline($duplicate['success'] === true && $duplicate['existing'] === true, 'a sequential duplicate returns the existing Category');
check_inline($duplicate['category']['id'] === $termId, 'the duplicate response keeps the existing numeric term ID');
check_inline($duplicate['category']['platform_id'] === $platformId, 'the duplicate response preserves the existing Platform ID');
check_inline(retired_count() === 1, 'the unused duplicate reservation is permanently retired');

$rejectedUpdate = $controller->updateServiceCategory(new WP_REST_Request([
    'id' => $termId,
    'cz_platform_id' => 'CZC2A7KZ',
]));
check_inline($rejectedUpdate->get_status() === 422, 'inline update explicitly rejects cz_platform_id');
check_inline(CategoryMeta::platformId($termId) === $platformId, 'inline amendment rejection leaves identity unchanged');

echo "\nInline native-term duplicate race\n";
$legacyRaceTerm = wp_insert_term('Race Winner', CategoryMeta::TAXONOMY);
$racedTermId = (int) $legacyRaceTerm['term_id'];
$winningPlatformId = null;
$__beforePlatformClaim = static function (int $claimTermId) use ($station, &$winningPlatformId): void {
    $binding = $station->ensure(
        PlatformIdentifierPolicy::CATEGORY,
        $claimTermId,
        static fn(int|string $nativeReference): string => CategoryMeta::platformId((int) $nativeReference),
        static fn(int|string $nativeReference, string $candidate): bool => CategoryMeta::claimPlatformId((int) $nativeReference, $candidate),
        static fn(string $candidate): bool => false
    );
    $winningPlatformId = $binding->platformId();
};

$raced = $controller->createServiceCategory(new WP_REST_Request(['name' => 'Race Winner']));
$racedData = $raced->get_data();
$racedTerm = get_term($racedTermId, CategoryMeta::TAXONOMY);

check_inline($raced->get_status() === 409 && $racedData['success'] === false, 'the duplicate request that loses the atomic identity claim fails closed');
check_inline($racedTerm instanceof WP_Term, 'the losing request does not delete the native term owned by the winning claim');
check_inline(CategoryMeta::platformId($racedTerm->term_id) === $winningPlatformId, 'the losing request cannot overwrite the winning Platform ID');
check_inline($station->lookupNative(PlatformIdentifierPolicy::CATEGORY, $racedTerm->term_id)?->platformId() === $winningPlatformId, 'the winning forward and reverse bindings remain intact');
check_inline(retired_count() === 2, 'the losing race reservation is retired and never reusable');

echo "\nAll inline Category identity and duplicate-race checks passed.\n";
