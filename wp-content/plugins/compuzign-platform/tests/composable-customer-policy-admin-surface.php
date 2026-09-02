<?php

declare(strict_types=1);

/*
 * Composable Tier customer_policy — Admin surface plumbing gaps.
 *
 * Locks two real plumbing gaps found while building the Admin "Customer
 * Options" drawer (project-work/2026-09-03-composable-tier-admin-to-
 * customer-validation.md), both pre-existing since Phase 2A and invisible
 * until an actual admin form tried to read/revert customer_policy:
 *
 *   - PackageSchema::normaliseTierSlot() — the function the admin GET
 *     response is built from — never included `customer_policy` in its
 *     returned array at all, even though settleTierSlot() already
 *     correctly persists it into current_occupant.customer_policy. The
 *     settled value was stored correctly but silently invisible to any
 *     admin read.
 *   - The composable module revert REST route was registered with a
 *     literal `(?P<module>overview|pricing_rules|features|faqs)` regex —
 *     `customer_policy` (already a full TIER_MODULES member, and already
 *     handled correctly and generically by revertTierModuleDraft() at the
 *     PHP-function level) could never reach that handler at all, a 404
 *     invisible without booting a real WP REST server.
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

function assertTrue(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

// ── 1. normaliseTierSlot() surfaces a settled customer_policy ──────────────

$policy = ['items' => [
    ['item_id' => 'hosting', 'mode' => 'required'],
    ['item_id' => 'support', 'mode' => 'optional', 'default_selected' => true, 'featured' => true],
]];
$slotWithPolicy = [
    'current_occupant' => [
        'id' => 'occ_admin_surface', 'cz_platform_id' => 'CZT-ADMINSURFACE', 'addon_platform_id' => '',
        'default_leg_platform_id' => '', 'platform_status' => 'active', 'is_explicitly_disabled' => false,
        'is_addon' => false, 'label' => 'Build Your Own', 'ideal_for' => '',
        'audience_groups' => ['personal_business', 'enterprise'], 'price' => null, 'contact' => false,
        'billing_cycle' => 'monthly', 'minimum_term_value' => null, 'minimum_term_unit' => null,
        'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
        'rate_sheet_id' => null, 'inclusions_override' => [], 'rate_sheet_items' => [],
        'features' => [], 'faq_refs' => [], 'customer_policy' => $policy,
        'tier_editions' => [], 'tier_edition_bin' => [],
    ],
    'history' => [],
];
$normalised = PS::normaliseTierSlot($slotWithPolicy);
assertTrue(array_key_exists('customer_policy', $normalised), '1a. normaliseTierSlot() now includes a customer_policy key at all');
assertTrue($normalised['customer_policy'] !== null, '1b. a settled policy is surfaced, not silently dropped');
assertSameValue(2, count($normalised['customer_policy']['items']), '1c. the surfaced policy carries every stored item');
assertSameValue('hosting', $normalised['customer_policy']['items'][0]['item_id'], '1d. items preserve their order');
assertSameValue(true, $normalised['customer_policy']['items'][1]['featured'], '1e. the re-sanitized value still carries featured (proves this re-sanitizes, not a raw passthrough)');

// ── 2. No policy configured surfaces null, not a missing key ───────────────

$slotWithoutPolicy = $slotWithPolicy;
unset($slotWithoutPolicy['current_occupant']['customer_policy']);
$normalisedNoPolicy = PS::normaliseTierSlot($slotWithoutPolicy);
assertTrue(array_key_exists('customer_policy', $normalisedNoPolicy), '2a. the key is still present even when never configured');
assertSameValue(null, $normalisedNoPolicy['customer_policy'], '2b. an occupant that has never configured one surfaces null, matching every other additive field\'s absence convention');

// ── 3. An empty slot (no occupant at all) also carries the key ─────────────

$emptySlot = ['current_occupant' => null, 'history' => []];
$normalisedEmpty = PS::normaliseTierSlot($emptySlot);
assertTrue(array_key_exists('customer_policy', $normalisedEmpty), '3a. emptyTierDetail() carries the key too, for shape consistency with every occupied slot');
assertSameValue(null, $normalisedEmpty['customer_policy'], '3b. and it is null');

// ── 4. Revert route regex includes customer_policy ──────────────────────────
//    Route-registration regexes are WordPress plumbing invisible to a
//    function-level test; lock the literal source pattern instead so this
//    specific regression (silently dropping a TIER_MODULES member from the
//    revert route's alternation) can never reappear unnoticed.

$controllerSource = (string) file_get_contents(__DIR__ . '/../src/Modules/SurfacePackages/Http/PackageStationController.php');
assertTrue(
    str_contains($controllerSource, "/composable/modules/(?P<module>overview|pricing_rules|features|faqs|customer_policy)/revert"),
    '4a. the composable module revert route\'s module regex explicitly includes customer_policy — every TIER_MODULES member must be revertable, not just the four that existed before Phase 2A'
);
assertSameValue(
    5, count(PS::TIER_MODULES),
    '4b. TIER_MODULES has exactly 5 members — if this count ever changes, the revert route regex above (and this test) must be updated to match'
);

fwrite(STDOUT, "OK: composable-customer-policy-admin-surface.php\n");
