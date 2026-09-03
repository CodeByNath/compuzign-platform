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
 *     returned array at all. (Original docblock here claimed settleTierSlot()
 *     "already correctly persists it into current_occupant.customer_policy"
 *     — that claim was never actually exercised by a test and was WRONG:
 *     see §5 below, added 2026-09-03, for the real gap it was covering for.)
 *   - The composable module revert REST route was registered with a
 *     literal `(?P<module>overview|pricing_rules|features|faqs)` regex —
 *     `customer_policy` (already a full TIER_MODULES member, and already
 *     handled correctly and generically by revertTierModuleDraft() at the
 *     PHP-function level) could never reach that handler at all, a 404
 *     invisible without booting a real WP REST server.
 *   - (2026-09-03) PackageSchema::upsertOccupant() — the function every
 *     settle path funnels through — never carried `customer_policy` forward
 *     at all: its returned `current_occupant` literal simply had no such
 *     key, so settleTierSlot()'s own draft-preferred `customer_policy`
 *     computation was silently discarded on every settle, for every module,
 *     not just Features. A saved policy could never actually survive a
 *     Publish. Invisible until §1-3 above prompted the first real
 *     settle-level exercise of this field (they only ever hand-built
 *     current_occupant.customer_policy directly, never round-tripped it
 *     through settleTierSlot()). Fixed alongside the auditor-required
 *     safeguard against a removed inclusion's old policy silently
 *     resurrecting if the same item_id is later re-added — see §5-6.
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

// ── 5. settleTierSlot() actually persists customer_policy through a real
//    settle (upsertOccupant() previously dropped it silently — §1-3 above
//    never caught this because they hand-built current_occupant directly) ──

function occupantShapeForSettle(array $overrides = []): array
{
    return array_merge([
        'id' => 'occ_settle_policy', 'cz_platform_id' => 'CZT-SETTLEPOLICY', 'addon_platform_id' => '',
        'default_leg_platform_id' => '', 'platform_status' => 'active', 'is_explicitly_disabled' => false,
        'is_addon' => false, 'label' => 'Build Your Own', 'ideal_for' => '',
        'audience_groups' => ['personal_business', 'enterprise'], 'price' => null, 'contact' => false,
        'billing_cycle' => 'monthly', 'minimum_term_value' => null, 'minimum_term_unit' => null,
        'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
        'rate_sheet_id' => 'rs_kairos', 'inclusions_override' => [],
        'rate_sheet_items' => [['item_id' => 'A'], ['item_id' => 'B']],
        'features' => [], 'faq_refs' => [], 'customer_policy' => null,
        'tier_editions' => [], 'tier_edition_bin' => [],
    ], $overrides);
}

function emptyDrafts(array $overrides = []): array
{
    return array_merge(['overview' => null, 'pricing_rules' => null, 'features' => null, 'faqs' => null, 'customer_policy' => null], $overrides);
}

function settledStatuses(array $overrides = []): array
{
    return array_merge(['overview' => 'settled', 'pricing_rules' => 'settled', 'features' => 'settled', 'faqs' => 'settled', 'customer_policy' => 'settled'], $overrides);
}

$authorizeADraft = ['value' => ['items' => [['item_id' => 'A', 'mode' => 'required']]]];
$slotAuthorizeA = [
    'current_occupant' => occupantShapeForSettle(),
    'history' => [],
    'drafts' => emptyDrafts(['customer_policy' => $authorizeADraft]),
    'module_status' => settledStatuses(['customer_policy' => 'pending']),
];
$settledAuthorizeA = PS::settleTierSlot($slotAuthorizeA);
assertTrue(is_array($settledAuthorizeA['current_occupant']['customer_policy'] ?? null), '5a. customer_policy actually survives a real settleTierSlot() round trip, not silently dropped by upsertOccupant()');
assertSameValue(1, count($settledAuthorizeA['current_occupant']['customer_policy']['items']), '5b. the settled policy carries the just-authored item');
assertSameValue('A', $settledAuthorizeA['current_occupant']['customer_policy']['items'][0]['item_id'], '5c. item A is authorized (required)');

// ── 6. Removing an inclusion then re-adding the same item_id does not
//    resurrect its old policy rule (2026-09-03 auditor-required safeguard,
//    project-work/2026-09-03-composable-tier-admin-to-customer-validation.md)

// Settle #2: a Features-only draft drops item A from rate_sheet_items; no
// new customer_policy draft, so its already-settled value (carrying A)
// would otherwise carry forward untouched via settleTierSlot()'s own
// draft-preferred fallback.
$slotRemoveA = [
    'current_occupant' => $settledAuthorizeA['current_occupant'],
    'history' => $settledAuthorizeA['history'],
    'drafts' => emptyDrafts(['features' => [['item_id' => 'B']]]),
    'module_status' => settledStatuses(['features' => 'pending']),
];
$settledRemoveA = PS::settleTierSlot($slotRemoveA);
assertSameValue(0, count($settledRemoveA['current_occupant']['customer_policy']['items']), '6a. removing item A prunes its stale policy entry at settle time, immediately — not left dormant until re-add');

// Settle #3: re-add the identical item_id A, still no new customer_policy draft.
$slotReaddA = [
    'current_occupant' => $settledRemoveA['current_occupant'],
    'history' => $settledRemoveA['history'],
    'drafts' => emptyDrafts(['features' => [['item_id' => 'A'], ['item_id' => 'B']]]),
    'module_status' => settledStatuses(['features' => 'pending']),
];
$settledReaddA = PS::settleTierSlot($slotReaddA);
assertSameValue(2, count($settledReaddA['current_occupant']['rate_sheet_items']), '6b. item A is genuinely selected again');
assertSameValue(0, count($settledReaddA['current_occupant']['customer_policy']['items']), '6c. re-adding the same item_id A does not resurrect its old Required rule — it stays Not offered until Admin explicitly re-authors Customer Options');

// ── 7. Pruning never touches an item_id that is still selected ─────────────

$slotBothStillSelected = [
    'current_occupant' => occupantShapeForSettle(['customer_policy' => ['items' => [
        ['item_id' => 'A', 'mode' => 'required', 'default_selected' => false, 'quantity' => null, 'price_option' => ['mode' => 'fixed', 'allowed_price_option_ids' => null, 'default_price_option_id' => null], 'featured' => false],
        ['item_id' => 'B', 'mode' => 'optional', 'default_selected' => true, 'quantity' => null, 'price_option' => ['mode' => 'fixed', 'allowed_price_option_ids' => null, 'default_price_option_id' => null], 'featured' => false],
    ]]]),
    'history' => [],
    'drafts' => emptyDrafts(),
    'module_status' => settledStatuses(),
];
$settledBothStillSelected = PS::settleTierSlot($slotBothStillSelected);
assertSameValue(2, count($settledBothStillSelected['current_occupant']['customer_policy']['items']), '7a. settling with no Features/policy change at all leaves both still-selected items\' policy untouched');

fwrite(STDOUT, "OK: composable-customer-policy-admin-surface.php\n");
