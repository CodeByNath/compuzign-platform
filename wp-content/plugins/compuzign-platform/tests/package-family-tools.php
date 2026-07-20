<?php

declare(strict_types=1);

// Focused standalone contract for Package Family / Group tool assignments.
// Same harness style as package-category-groups.php: no PHPUnit, no WordPress.
//
// Proves the corrected ownership model:
//   - the Package Family / Group (group_id) owns the assignment, not a global
//     package-station singleton;
//   - activation is a boolean on the group row and writes no Tier data;
//   - deactivation preserves data;
//   - only registry-known, available tools may be enabled.
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string
    {
        return trim(strip_tags((string) $value));
    }
}

require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageToolRegistry.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageCategoryGroups.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups as PCG;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageToolRegistry as Registry;

function assertSameValue(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

function assertTrueValue(bool $cond, string $message): void
{
    if (!$cond) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

function assertThrows(callable $fn, string $class, string $message): void
{
    try {
        $fn();
    } catch (\Throwable $e) {
        if ($e instanceof $class) {
            return;
        }
        fwrite(STDERR, "FAIL: {$message} — wrong exception " . get_class($e) . "\n");
        exit(1);
    }
    fwrite(STDERR, "FAIL: {$message} — no exception thrown\n");
    exit(1);
}

// ── Registry: Tier is the only real tool; futures are unavailable ─────────────

assertTrueValue(Registry::isKnown('tier'), 'tier is a known tool');
assertTrueValue(Registry::isAvailable('tier'), 'tier is available');
assertTrueValue(Registry::isKnown('promotion'), 'promotion is a known (future) tool');
assertTrueValue(!Registry::isAvailable('promotion'), 'promotion is not available yet');
assertTrueValue(!Registry::isKnown('made_up_tool'), 'unknown keys are rejected');

// ── Fresh groups are born with an empty tools map (no migration) ──────────────

$created = PCG::create([], 'KAIROS', 'Branded commercial bucket.', 'pcg_kairos');
$groups  = $created['groups'];
assertSameValue([], $groups[0]['tools'], 'a new group has no tool assignments');

// A legacy row with no tools field sanitizes to an empty map.
$legacy = PCG::sanitizeAll([['group_id' => 'pcg_legacy', 'label' => 'Legacy']]);
assertSameValue([], $legacy[0]['tools'], 'a legacy row without tools normalises to []');

// ── Activation: owner-specific, writes only a boolean ─────────────────────────

$groups = PCG::setTool($groups, 'pcg_kairos', 'tier', true);
assertSameValue(['enabled' => true], PCG::find($groups, 'pcg_kairos')['tools']['tier'], 'tier is enabled for the owning Family');

// A second Family is unaffected — assignment is not global.
$twoFamilies = PCG::create($groups, 'APTOS', '', 'pcg_aptos')['groups'];
assertSameValue([], PCG::find($twoFamilies, 'pcg_aptos')['tools'], 'a sibling Family does not inherit the assignment');
assertSameValue(['enabled' => true], PCG::find($twoFamilies, 'pcg_kairos')['tools']['tier'], 'the owning Family keeps its assignment');

// ── Deactivation preserves the record; it only clears the flag ────────────────

$disabled = PCG::setTool($groups, 'pcg_kairos', 'tier', false);
assertSameValue(['enabled' => false], PCG::find($disabled, 'pcg_kairos')['tools']['tier'], 'deactivation clears the flag, not the record');

// ── Guards ────────────────────────────────────────────────────────────────────

assertThrows(fn() => PCG::setTool($groups, 'pcg_missing', 'tier', true), \InvalidArgumentException::class, 'unknown Family is rejected');
assertThrows(fn() => PCG::setTool($groups, 'pcg_kairos', 'made_up', true), \InvalidArgumentException::class, 'unknown tool is rejected');
assertThrows(fn() => PCG::setTool($groups, 'pcg_kairos', 'promotion', true), \InvalidArgumentException::class, 'enabling an unavailable tool is rejected');

// A future tool may still be recorded as disabled without error (idempotent off).
$futureOff = PCG::setTool($groups, 'pcg_kairos', 'promotion', false);
assertSameValue(['enabled' => false], PCG::find($futureOff, 'pcg_kairos')['tools']['promotion'], 'a future tool can be explicitly disabled');

// ── sanitizeTools drops unknown keys and coerces malformed values ─────────────

$dirty = PCG::sanitizeTools(['tier' => ['enabled' => 1], 'ghost' => ['enabled' => true], 'bundle' => 'yes']);
assertSameValue(['enabled' => true], $dirty['tier'], 'truthy enabled coerces to bool true');
assertSameValue(['enabled' => true], $dirty['bundle'], 'scalar truthy value coerces to enabled');
assertTrueValue(!isset($dirty['ghost']), 'unknown tool key is dropped');

fwrite(STDOUT, "package-family-tools: OK\n");
