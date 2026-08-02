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
function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }

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

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier\PackagePlatformIdentifierAdapters;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;
use CompuZign\Platform\PlatformIdentifier\TemporaryMigrationController;

function migration_check(bool $condition, string $message): void {
    if (!$condition) { fwrite(STDERR, "FAIL: {$message}\n"); exit(1); }
    echo "  ok — {$message}\n";
}

$manager = PackageManagerSchema::defaultManager();
$created = PackageCategoryGroups::create($manager['category_groups'], 'Alpha', '', 'pcg_alpha');
$created = PackageCategoryGroups::create($created['groups'], 'Beta', '', 'pcg_beta', 'CZPGRAJ5F');
$manager['category_groups'] = $created['groups'];
$manager['rate_sheets'] = [[
    'rate_sheet_id' => 'rs_legacy', 'cz_platform_id' => '', 'title' => 'Legacy', 'status' => 'active',
    'groups' => [['group_id' => 'rate_group_a', 'cz_platform_id' => '', 'label' => 'A', 'sort_order' => 0]],
    'items' => [
        ['item_id' => 'rate_a', 'cz_platform_id' => '', 'source_item_id' => 'mgr_a', 'unit_price' => 10, 'per' => 'Per item', 'quantity' => 1, 'group_id' => 'rate_group_a', 'sort_order' => 0],
        ['item_id' => 'rate_b', 'cz_platform_id' => 'CZPRCI22222', 'source_item_id' => 'mgr_b', 'unit_price' => 20, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'sort_order' => 1],
    ],
]];
$GLOBALS['mig_options'][PackageRepository::OPTION_KEY] = ['package_manager' => $manager, 'promotions' => []];

$station = new PlatformIdentifierStation();
$packages = new PackageRepository();
$station->ensure(PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP, 'pcg_beta',
    fn(): string => $packages->familyPlatformId('pcg_beta'),
    fn(int|string $id, string $platformId): bool => $packages->claimFamilyPlatformId((string) $id, $platformId));
$controller = new TemporaryMigrationController($station, $packages);
$GLOBALS['mig_writes'] = 0;

$GLOBALS['mig_options']['cz_package_family_identifier_migration_v1'] = [
    'complete' => true,
    'package_family_group' => ['complete' => true],
];
$GLOBALS['mig_options']['cz_package_entity_identifier_migration_v2'] = ['complete' => true];
$status = $controller->status(new WP_REST_Request())->get_data();
migration_check($status['complete'] === false, 'expanded rollout does not inherit Package-Family-only completion');

$temporaryScopes = [
    PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP,
    PlatformIdentifierPolicy::TIER_GROUP,
    PlatformIdentifierPolicy::TIER,
    PlatformIdentifierPolicy::TIER_ADDON,
    PlatformIdentifierPolicy::PACKAGE_RATE_CARD_GROUP,
    PlatformIdentifierPolicy::PACKAGE_RATE_CARD,
    PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM,
];
$GLOBALS['mig_writes'] = 0;
foreach ($temporaryScopes as $entityType) {
    $response = $controller->run(new WP_REST_Request(['action' => 'dry-run', 'entity_type' => $entityType]));
    $payload = $response->get_data();
    migration_check($response->get_status() === 200 && is_array($payload['report'] ?? null), "{$entityType} dry check returns normal JSON");
}
migration_check($GLOBALS['mig_writes'] === 0, 'every temporary migration dry check performs zero writes');

$rateAdapters = new PackagePlatformIdentifierAdapters($packages);
$sheetPage = $rateAdapters->rateSheet()->enumerate(null, 100);
$groupPage = $rateAdapters->rateSheetGroup()->enumerate(null, 100);
$itemPage = $rateAdapters->rateSheetItem()->enumerate(null, 100);
migration_check(count($sheetPage['items']) === 1 && str_starts_with($sheetPage['items'][0], 'rate-sheet:'), 'Rate Sheet adapter passes explicit sheet scope only');
migration_check(count($groupPage['items']) === 1 && str_starts_with($groupPage['items'][0], 'rate-sheet-group:'), 'Rate Sheet Group adapter passes explicit group scope only');
migration_check(count($itemPage['items']) === 2 && count(array_filter($itemPage['items'], fn(string $id): bool => str_starts_with($id, 'rate-sheet-item:'))) === 2, 'Rate Sheet Item adapter passes explicit item scope only');

$dry = $controller->run(new WP_REST_Request(['action' => 'dry-run', 'entity_type' => 'package_family_group']))->get_data();
migration_check($GLOBALS['mig_writes'] === 0, 'dry check performs zero writes');
migration_check($dry['entity_type'] === 'package_family_group' && $dry['report']['processed'] === 2, 'dry check reports only the requested Package Family scope');
migration_check($dry['report']['would_assign'] === 1 && $dry['report']['would_preserve'] === 1, 'dry check separates missing and preserved Family IDs');

$family = $controller->run(new WP_REST_Request(['action' => 'assign', 'entity_type' => 'package_family_group']))->get_data();
migration_check($family['entity_complete'] === true && $family['complete'] === false && str_starts_with($packages->familyPlatformId('pcg_alpha'), 'CZPG'), 'Family batch completes only its own scope and assigns the missing CZPG ID');
migration_check($packages->familyPlatformId('pcg_beta') === 'CZPGRAJ5F', 'Family batch preserves CZPGRAJ5F exactly');
migration_check($station->lookupNative(PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP, 'pcg_alpha')?->platformId() === $packages->familyPlatformId('pcg_alpha'), 'Family batch creates the reverse binding');
migration_check($GLOBALS['mig_autoload']['cz_package_entity_identifier_migration_v3'] === 'no', 'final row rollout progress option is non-autoloaded');
migration_check(!isset($GLOBALS['mig_options']['cz_package_entity_identifier_migration_lock_v3']), 'short-lived final-rollout lock is released');

$rowReference = \CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference::rateSheetItem('rs_legacy', 'rate_b');
$station->ensure(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM, $rowReference,
    fn(): string => $packages->rateSheetPlatformId($rowReference, 'item'),
    fn(int|string $id, string $platformId): bool => $packages->claimRateSheetPlatformId((string) $id, $platformId, 'item'));
$rowDry = $controller->run(new WP_REST_Request(['action' => 'dry-run', 'entity_type' => 'package_rate_card_item']))->get_data();
migration_check($rowDry['report']['processed'] === 2 && $rowDry['report']['would_assign'] === 1 && $rowDry['report']['would_preserve'] === 1, 'CZPRCI dry check enumerates bounded rate_sheet_id + item_id rows and preserves valid IDs');
$rowBatch = $controller->run(new WP_REST_Request(['action' => 'assign', 'entity_type' => 'package_rate_card_item']))->get_data();
$rowAReference = \CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference::rateSheetItem('rs_legacy', 'rate_a');
migration_check($rowBatch['entity_complete'] === true && str_starts_with($packages->rateSheetPlatformId($rowAReference, 'item'), 'CZPRCI'), 'final migration assigns missing legacy row CZPRCI');
migration_check($packages->rateSheetPlatformId($rowReference, 'item') === 'CZPRCI22222', 'final migration preserves an existing valid CZPRCI exactly');

$stored = $GLOBALS['mig_options'][PackageRepository::OPTION_KEY];
$stored['package_manager']['category_groups'][0]['cz_platform_id'] = 'invalid';
$GLOBALS['mig_options'][PackageRepository::OPTION_KEY] = $stored;
$GLOBALS['mig_writes'] = 0;
$blocked = (new TemporaryMigrationController($station, new PackageRepository()))->run(
    new WP_REST_Request(['action' => 'assign', 'entity_type' => 'package_family_group'])
);
migration_check($blocked->get_status() === 409, 'invalid stored identity stops assignment');
migration_check($GLOBALS['mig_writes'] === 0, 'conflict stop performs no migration writes');

echo "Temporary Platform Identifier migration contract: PASS\n";
