<?php

declare(strict_types=1);

$GLOBALS['assignment_options'] = [];
$GLOBALS['assignment_posts'] = [11 => '', 12 => ''];
$GLOBALS['assignment_terms'] = [21 => '', 22 => ''];

function add_option(string $key, mixed $value, string $deprecated = '', string|bool $autoload = 'yes'): bool {
    if (array_key_exists($key, $GLOBALS['assignment_options'])) return false;
    $GLOBALS['assignment_options'][$key] = $value; return true;
}
function get_option(string $key, mixed $default = false): mixed { return $GLOBALS['assignment_options'][$key] ?? $default; }
function update_option(string $key, mixed $value, string|bool|null $autoload = null): bool { $GLOBALS['assignment_options'][$key] = $value; return true; }
function get_post_meta(int $id, string $key, bool $single = false): mixed { return $GLOBALS['assignment_posts'][$id] ?? ''; }
function add_post_meta(int $id, string $key, mixed $value, bool $unique = false): int|false {
    if ($unique && ($GLOBALS['assignment_posts'][$id] ?? '') !== '') return false;
    $GLOBALS['assignment_posts'][$id] = $value; return 1;
}
function get_term_meta(int $id, string $key, bool $single = false): mixed { return $GLOBALS['assignment_terms'][$id] ?? ''; }
function add_term_meta(int $id, string $key, mixed $value, bool $unique = false): int|false {
    if ($unique && ($GLOBALS['assignment_terms'][$id] ?? '') !== '') return false;
    $GLOBALS['assignment_terms'][$id] = $value; return 1;
}
function get_posts(array $args = []): array {
    $ids = array_keys($GLOBALS['assignment_posts']);
    if (isset($args['meta_value'])) return array_values(array_filter($ids, fn(int $id): bool => $GLOBALS['assignment_posts'][$id] === $args['meta_value']));
    return array_slice($ids, (int) ($args['offset'] ?? 0), (int) ($args['numberposts'] ?? count($ids)));
}
function get_terms(array $args = []): array {
    $ids = array_keys($GLOBALS['assignment_terms']);
    if (isset($args['meta_value'])) return array_values(array_filter($ids, fn(int $id): bool => $GLOBALS['assignment_terms'][$id] === $args['meta_value']));
    return array_slice($ids, (int) ($args['offset'] ?? 0), (int) ($args['number'] ?? count($ids)));
}

final class WP_CLI {
    public static array $logs = [];
    public static function log(string $message): void { self::$logs[] = $message; }
    public static function error(string $message): never { throw new RuntimeException($message); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\PlatformIdentifier\ExistingRecordAssignmentCommand;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;

final class AssignmentPackageRepository extends PackageRepository
{
    /** @var array<string, string> */
    public array $rows = [
        'pcg_alpha' => '',
        'pcg_beta' => 'CZPG2A7KZ',
        'pcg_gamma' => 'invalid',
    ];

    public function familyAssignmentPage(?string $cursor, int $limit): array
    {
        $ids = array_keys($this->rows);
        sort($ids, SORT_STRING);
        $ids = array_values(array_filter($ids, static fn(string $id): bool => $cursor === null || strcmp($id, $cursor) > 0));
        $items = array_slice($ids, 0, $limit);
        return [
            'items' => $items,
            'next_cursor' => $items === [] ? $cursor : $items[array_key_last($items)],
            'complete' => count($ids) <= $limit,
        ];
    }

    public function familyPlatformId(string $groupId): string { return $this->rows[$groupId] ?? ''; }
    public function claimFamilyPlatformId(string $groupId, string $platformId): bool
    {
        if (!array_key_exists($groupId, $this->rows) || $this->rows[$groupId] !== '') return false;
        $this->rows[$groupId] = $platformId;
        return true;
    }
    public function familyPlatformIdExists(string $platformId): bool { return in_array($platformId, $this->rows, true); }
}

function assignment_check(bool $condition, string $message): void {
    if (!$condition) { fwrite(STDERR, "FAIL: {$message}\n"); exit(1); }
    echo "  ok — {$message}\n";
}

$command = new ExistingRecordAssignmentCommand(new PlatformIdentifierStation());
$command(['service'], ['limit' => 1]);
$first = json_decode(WP_CLI::$logs[array_key_last(WP_CLI::$logs)], true);
assignment_check($first['processed'] === 1 && $first['assigned'] === 1 && $first['next_cursor'] === 1, 'Service assignment is bounded and returns a cursor');
assignment_check(str_starts_with($GLOBALS['assignment_posts'][11], 'CZS'), 'Service assignment writes owner post meta');

$command(['service'], ['limit' => 1, 'cursor' => 1]);
assignment_check(str_starts_with($GLOBALS['assignment_posts'][12], 'CZS'), 'Service cursor resumes at the next native record');

$command(['category'], ['limit' => 2]);
$category = json_decode(WP_CLI::$logs[array_key_last(WP_CLI::$logs)], true);
assignment_check($category['processed'] === 2 && $category['assigned'] === 2, 'Category assignment processes only its requested page');
assignment_check(str_starts_with($GLOBALS['assignment_terms'][21], 'CZC') && str_starts_with($GLOBALS['assignment_terms'][22], 'CZC'), 'Category assignment uses atomic owner term-meta claims');

$command(['category'], ['limit' => 2]);
$preserved = json_decode(WP_CLI::$logs[array_key_last(WP_CLI::$logs)], true);
assignment_check($preserved['preserved'] === 2 && $preserved['assigned'] === 0, 'Rerunning a page preserves existing identities');

$packages = new AssignmentPackageRepository();
$packageCommand = new ExistingRecordAssignmentCommand(new PlatformIdentifierStation(), $packages);
$packageCommand(['package-family'], ['limit' => 1]);
$packageFirst = json_decode(WP_CLI::$logs[array_key_last(WP_CLI::$logs)], true);
assignment_check(
    $packageFirst['entity_type'] === 'package_family_group'
        && $packageFirst['processed'] === 1
        && $packageFirst['assigned'] === 1
        && $packageFirst['next_cursor'] === 'pcg_alpha',
    'Package Family assignment is bounded by a stable string native cursor'
);
assignment_check(str_starts_with($packages->rows['pcg_alpha'], 'CZPG'), 'Package Family assignment claims a Package-owned CZPG scalar');

$packageCommand(['package-family'], ['limit' => 2, 'cursor' => 'pcg_alpha']);
$packageSecond = json_decode(WP_CLI::$logs[array_key_last(WP_CLI::$logs)], true);
assignment_check(
    $packageSecond['processed'] === 2
        && $packageSecond['preserved'] === 1
        && count($packageSecond['conflicts']) === 1
        && $packageSecond['complete'] === true,
    'Package Family assignment preserves valid IDs and reports invalid IDs without replacement'
);
assignment_check($packages->rows['pcg_gamma'] === 'invalid', 'Package Family conflict leaves authoritative storage unchanged');

echo "Platform Identifier existing assignment contract: PASS\n";
