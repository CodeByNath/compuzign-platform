<?php

declare(strict_types=1);

/*
 * Tier Edition — customer_policy stale-entry pruning parity.
 *
 * settleTierSlot() (the Tier occupant's own settle path) has called
 * pruneStaleCustomerPolicy() after pruneOrphanedLegAssignments() and before
 * final sanitize since the 2026-09-03 auditor-required safeguard — see
 * composable-customer-policy-admin-surface.php §6-7. settleTierEditionOverview()
 * carried the equivalent Edition-level customer_policy draft/settle support
 * (Phase 2A) but never made the matching prune call, an independent gap
 * found while auditing project-work/2026-09-06-tier-catalogue-admin-ux-
 * consolidation.md: an Edition's own customer_policy entry for a
 * since-removed item_id could silently resurrect its old Required/Optional/
 * quantity/Featured rule if that same item_id were later re-selected,
 * without Admin ever revisiting that Edition's policy. Fixed by mirroring
 * the occupant's own call, in the same position (after leg-assignment
 * pruning, against the now-final rate_sheet_items, before sanitizeTierEdition()).
 *
 * This exercises PackageSchema::settleTierEditionOverview() directly against
 * a real Tier Edition built via addTierEdition(), matching
 * composable-customer-policy-admin-surface.php's own unit-level convention
 * rather than the full controller/REST stack.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as PS;

function assertSameValue(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

// ── Build a real Tier Edition with two selected inclusions, no policy yet ──

$added = PS::addTierEdition([], [
    'title' => 'Annual',
    'rate_sheet_id' => 'rs_kairos',
    'rate_sheet_items' => [['item_id' => 'A'], ['item_id' => 'B']],
]);
$editionId = $added['edition']['id'];
$editions = $added['tier_editions'];

// ── 1. Authoring a policy for A survives a real settle ──────────────────────

$editions = array_map(
    static function (array $edition) use ($editionId): array {
        if ($edition['id'] !== $editionId) return $edition;
        $edition['drafts']['overview'] = [
            'rate_sheet_items' => [['item_id' => 'A'], ['item_id' => 'B']],
            'customer_policy' => ['items' => [['item_id' => 'A', 'mode' => 'required']]],
        ];
        return $edition;
    },
    $editions
);
$editions = PS::settleTierEditionOverview($editions, $editionId);
$edition1 = PS::findTierEdition($editions, $editionId);
assertSameValue(1, count($edition1['customer_policy']['items']), '1a. the authored Edition policy for item A survives a real settle');
assertSameValue('A', $edition1['customer_policy']['items'][0]['item_id'], '1b. item A is authorized (required)');

// ── 2. Removing item A from rate_sheet_items (no new customer_policy draft)
//    prunes its stale policy entry at settle time, immediately ────────────

$editions = array_map(
    static function (array $edition) use ($editionId): array {
        if ($edition['id'] !== $editionId) return $edition;
        $edition['drafts']['overview'] = [
            'rate_sheet_items' => [['item_id' => 'B']],
        ];
        return $edition;
    },
    $editions
);
$editions = PS::settleTierEditionOverview($editions, $editionId);
$edition2 = PS::findTierEdition($editions, $editionId);
assertSameValue(1, count($edition2['rate_sheet_items']), '2a. item A is genuinely removed');
assertSameValue(0, count($edition2['customer_policy']['items']), '2b. removing item A prunes its stale Edition policy entry at settle time, not left dormant until re-add');

// ── 3. Re-adding the identical item_id A (still no new customer_policy
//    draft) does not resurrect its old Required rule ───────────────────────

$editions = array_map(
    static function (array $edition) use ($editionId): array {
        if ($edition['id'] !== $editionId) return $edition;
        $edition['drafts']['overview'] = [
            'rate_sheet_items' => [['item_id' => 'A'], ['item_id' => 'B']],
        ];
        return $edition;
    },
    $editions
);
$editions = PS::settleTierEditionOverview($editions, $editionId);
$edition3 = PS::findTierEdition($editions, $editionId);
assertSameValue(2, count($edition3['rate_sheet_items']), '3a. item A is genuinely selected again');
assertSameValue(0, count($edition3['customer_policy']['items']), '3b. re-adding the same item_id A does not resurrect its old Required rule — it stays Not offered until Admin explicitly re-authors this Edition\'s policy');

// ── 4. Pruning never touches an item_id that is still selected, and a null
//    policy (never configured) passes through untouched ────────────────────

$editions = array_map(
    static function (array $edition) use ($editionId): array {
        if ($edition['id'] !== $editionId) return $edition;
        $edition['drafts']['overview'] = [
            'customer_policy' => ['items' => [
                ['item_id' => 'A', 'mode' => 'required'],
                ['item_id' => 'B', 'mode' => 'optional', 'default_selected' => true],
            ]],
        ];
        return $edition;
    },
    $editions
);
$editions = PS::settleTierEditionOverview($editions, $editionId);
$edition4 = PS::findTierEdition($editions, $editionId);
assertSameValue(2, count($edition4['customer_policy']['items']), '4a. settling with both items still selected leaves both policy entries untouched');

$addedNoPolicy = PS::addTierEdition([], ['title' => 'Monthly', 'rate_sheet_id' => 'rs_kairos', 'rate_sheet_items' => [['item_id' => 'C']]]);
$noPolicyId = $addedNoPolicy['edition']['id'];
$noPolicyEditions = array_map(
    static function (array $edition) use ($noPolicyId): array {
        if ($edition['id'] !== $noPolicyId) return $edition;
        $edition['drafts']['overview'] = ['rate_sheet_items' => [['item_id' => 'C']]];
        return $edition;
    },
    $addedNoPolicy['tier_editions']
);
$noPolicyEditions = PS::settleTierEditionOverview($noPolicyEditions, $noPolicyId);
assertSameValue(null, PS::findTierEdition($noPolicyEditions, $noPolicyId)['customer_policy'], '4b. an Edition with no customer_policy ever configured still settles with null, matching inherit-from-occupant semantics');

fwrite(STDOUT, "OK: tier-edition-customer-policy-prune.php\n");
