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

echo "Platform Identifier existing assignment contract: PASS\n";
