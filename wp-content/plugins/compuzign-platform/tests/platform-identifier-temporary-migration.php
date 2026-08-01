<?php

declare(strict_types=1);

$GLOBALS['mig_options'] = [];
$GLOBALS['mig_autoload'] = [];
$GLOBALS['mig_posts'] = [631 => '', 660 => 'CZSRAJ5F'];
$GLOBALS['mig_terms'] = [31 => ''];
$GLOBALS['mig_writes'] = 0;

function add_option(string $key, mixed $value, string $deprecated = '', string|bool $autoload = 'yes'): bool {
    if (array_key_exists($key, $GLOBALS['mig_options'])) return false;
    $GLOBALS['mig_options'][$key] = $value; $GLOBALS['mig_autoload'][$key] = $autoload; $GLOBALS['mig_writes']++; return true;
}
function get_option(string $key, mixed $default = false): mixed { return $GLOBALS['mig_options'][$key] ?? $default; }
function update_option(string $key, mixed $value, string|bool|null $autoload = null): bool { $GLOBALS['mig_options'][$key] = $value; $GLOBALS['mig_writes']++; return true; }
function delete_option(string $key): bool { unset($GLOBALS['mig_options'][$key]); $GLOBALS['mig_writes']++; return true; }
function get_post_meta(int $id, string $key, bool $single = false): mixed { return $GLOBALS['mig_posts'][$id] ?? ''; }
function add_post_meta(int $id, string $key, mixed $value, bool $unique = false): int|false {
    if ($unique && ($GLOBALS['mig_posts'][$id] ?? '') !== '') return false;
    $GLOBALS['mig_posts'][$id] = $value; $GLOBALS['mig_writes']++; return 1;
}
function get_term_meta(int $id, string $key, bool $single = false): mixed { return $GLOBALS['mig_terms'][$id] ?? ''; }
function add_term_meta(int $id, string $key, mixed $value, bool $unique = false): int|false {
    if ($unique && ($GLOBALS['mig_terms'][$id] ?? '') !== '') return false;
    $GLOBALS['mig_terms'][$id] = $value; $GLOBALS['mig_writes']++; return 1;
}
function get_posts(array $args = []): array {
    $ids = array_keys($GLOBALS['mig_posts']);
    if (isset($args['meta_value'])) return array_values(array_filter($ids, fn(int $id): bool => $GLOBALS['mig_posts'][$id] === $args['meta_value']));
    $length = (int) ($args['numberposts'] ?? -1);
    return $length === -1 ? array_slice($ids, (int) ($args['offset'] ?? 0)) : array_slice($ids, (int) ($args['offset'] ?? 0), $length);
}
function get_terms(array $args = []): array {
    $ids = array_keys($GLOBALS['mig_terms']);
    if (isset($args['meta_value'])) return array_values(array_filter($ids, fn(int $id): bool => $GLOBALS['mig_terms'][$id] === $args['meta_value']));
    return isset($args['number']) ? array_slice($ids, (int) ($args['offset'] ?? 0), (int) $args['number']) : array_slice($ids, (int) ($args['offset'] ?? 0));
}
function rest_ensure_response(mixed $value): WP_REST_Response { return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200); }
function current_user_can(string $capability): bool { return true; }
function add_action(string $hook, callable $callback): void {}
function register_rest_route(string $namespace, string $route, array $args): void {}

class WP_REST_Request {
    public function __construct(private array $params = []) {}
    public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
}
class WP_REST_Response {
    public function __construct(private mixed $data, private int $status = 200) {}
    public function get_data(): mixed { return $this->data; }
    public function get_status(): int { return $this->status; }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Service\Support\ServiceSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;
use CompuZign\Platform\PlatformIdentifier\TemporaryMigrationController;

function migration_check(bool $condition, string $message): void {
    if (!$condition) { fwrite(STDERR, "FAIL: {$message}\n"); exit(1); }
    echo "  ok — {$message}\n";
}

$station = new PlatformIdentifierStation();
$station->ensure(PlatformIdentifierPolicy::SERVICE, 660,
    fn(): string => $GLOBALS['mig_posts'][660],
    fn(int|string $id, string $platformId): int|false => add_post_meta((int) $id, ServiceSchema::PLATFORM_ID_META, $platformId, true));
$controller = new TemporaryMigrationController($station);
$GLOBALS['mig_writes'] = 0;

$dry = $controller->run(new WP_REST_Request(['action' => 'dry-run']))->get_data();
migration_check($GLOBALS['mig_writes'] === 0, 'dry check performs zero writes');
migration_check($dry['reports']['service']['processed'] === 2, 'dry check reports all Services');
migration_check($dry['reports']['service']['would_assign'] === 1 && $dry['reports']['service']['would_preserve'] === 1, 'dry check separates missing and preserved Service IDs');
migration_check($dry['reports']['category']['would_assign'] === 1, 'dry check reports missing Category IDs');

$service = $controller->run(new WP_REST_Request(['action' => 'assign', 'entity_type' => 'service']))->get_data();
migration_check($service['conflicts'] === [] && str_starts_with($GLOBALS['mig_posts'][631], 'CZS'), 'Service batch assigns only the missing ID');
migration_check($GLOBALS['mig_posts'][660] === 'CZSRAJ5F', 'Service batch preserves CZSRAJ5F exactly');
migration_check($station->lookupNative(PlatformIdentifierPolicy::SERVICE, 631)?->platformId() === $GLOBALS['mig_posts'][631], 'Service batch creates the reverse binding');

$category = $controller->run(new WP_REST_Request(['action' => 'assign', 'entity_type' => 'category']))->get_data();
migration_check($category['complete'] === true && str_starts_with($GLOBALS['mig_terms'][31], 'CZC'), 'Category batch completes the supported migration');
migration_check($GLOBALS['mig_autoload']['cz_platform_identifier_migration_v1'] === 'no', 'completion progress option is non-autoloaded');
migration_check(!isset($GLOBALS['mig_options']['cz_platform_identifier_migration_lock_v1']), 'short-lived atomic lock is released');

$GLOBALS['mig_posts'][700] = 'invalid';
$GLOBALS['mig_writes'] = 0;
$blocked = $controller->run(new WP_REST_Request(['action' => 'assign', 'entity_type' => 'service']));
migration_check($blocked->get_status() === 409, 'invalid stored identity stops assignment');
migration_check($GLOBALS['mig_writes'] === 0, 'conflict stop performs no migration writes');

echo "Temporary Platform Identifier migration contract: PASS\n";
