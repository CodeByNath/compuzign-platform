<?php

declare(strict_types=1);

/*
 * Default-declaration commitment contract: the Tier occupant's own
 * permanent Default declaration carries minimum_term_value/minimum_term_unit
 * using the exact same field shape and sanitize rule as a Tier Edition's own
 * commitment (sanitizeTierEdition()) — see docs/code-map/tier-edition.md and
 * tier-edition-schema.php's equivalent Edition-scoped coverage.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;

function check_occupant_min_term(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier occupant minimum term: ' . $message);
    }
}

// ── A never-configured occupant carries no commitment ───────────────────────

$bare = Schema::upsertOccupant([], ['label' => 'Starter', 'billing_cycle' => 'monthly'], true);
check_occupant_min_term($bare['current_occupant']['minimum_term_value'] === null, 'a never-configured occupant defaults minimum_term_value to null');
check_occupant_min_term($bare['current_occupant']['minimum_term_unit'] === null, 'a never-configured occupant defaults minimum_term_unit to null');

// ── Storage sanitize: coercion and empty-input handling ─────────────────────

$configured = Schema::upsertOccupant([], [
    'label' => 'Professional', 'billing_cycle' => 'annually',
    'minimum_term_value' => '12', 'minimum_term_unit' => 'month',
], true);
check_occupant_min_term($configured['current_occupant']['minimum_term_value'] === 12.0, 'a numeric-string value coerces to a float');
check_occupant_min_term($configured['current_occupant']['minimum_term_unit'] === 'month', 'a unit string round-trips');

$emptyString = Schema::upsertOccupant([], [
    'label' => 'Professional', 'billing_cycle' => 'annually',
    'minimum_term_value' => '', 'minimum_term_unit' => '',
], true);
check_occupant_min_term($emptyString['current_occupant']['minimum_term_value'] === null, 'an empty-string value sanitises to null, not 0.0');
check_occupant_min_term($emptyString['current_occupant']['minimum_term_unit'] === null, 'an empty-string unit sanitises to null, not an empty string');

// ── Public-safe admin read model round-trips it ──────────────────────────────

check_occupant_min_term(
    Schema::normaliseTierSlot($configured)['minimum_term_value'] === 12.0,
    'normaliseTierSlot() exposes the occupant\'s stored minimum_term_value',
);
check_occupant_min_term(
    Schema::normaliseTierSlot($configured)['minimum_term_unit'] === 'month',
    'normaliseTierSlot() exposes the occupant\'s stored minimum_term_unit',
);

// ── Public Cost Builder projection ───────────────────────────────────────────

check_occupant_min_term(
    Schema::extractTierForCostBuilder($configured)['minimum_term_value'] === 12.0,
    'the public Tier projection exposes the occupant\'s own commitment value',
);
check_occupant_min_term(
    Schema::extractTierForCostBuilder($configured)['minimum_term_unit'] === 'month',
    'the public Tier projection exposes the occupant\'s own commitment unit',
);
check_occupant_min_term(
    Schema::extractTierForCostBuilder($bare)['minimum_term_value'] === null,
    'an occupant with no configured commitment projects null, exactly as before this capability existed',
);

// ── Overview settle: draft-preferred, same as every other Overview scalar ───

$drafted = Schema::ensureTierLifecycle($configured);
$drafted['drafts']['overview'] = [
    'label' => 'Professional', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'annually', 'minimum_term_value' => 24, 'minimum_term_unit' => 'month',
];
$settled = Schema::settleTierSlot($drafted);
check_occupant_min_term($settled['current_occupant']['minimum_term_value'] === 24.0, 'Overview settle commits the draft-preferred commitment value');
check_occupant_min_term($settled['current_occupant']['minimum_term_unit'] === 'month', 'Overview settle commits the draft-preferred commitment unit');

// Omitting the field from the draft preserves the settled occupant's existing
// value rather than resetting it — the same rule audience_groups/billing_cycle
// already follow, and the same array_key_exists treatment rate_sheet_id uses
// (null is a meaningful, distinct draft value from "key absent").
$draftedOmitted = Schema::ensureTierLifecycle($settled);
$draftedOmitted['drafts']['overview'] = [
    'label' => 'Professional', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'annually',
];
$settledOmitted = Schema::settleTierSlot($draftedOmitted);
check_occupant_min_term($settledOmitted['current_occupant']['minimum_term_value'] === 24.0, 'omitting the field from the draft preserves the settled occupant\'s existing value');
check_occupant_min_term($settledOmitted['current_occupant']['minimum_term_unit'] === 'month', 'omitting the unit from the draft preserves the settled occupant\'s existing value');

// An explicit null in the draft (administrator deliberately clearing the
// commitment) is honoured, not treated as omission.
$draftedCleared = Schema::ensureTierLifecycle($settledOmitted);
$draftedCleared['drafts']['overview'] = [
    'label' => 'Professional', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'annually', 'minimum_term_value' => null, 'minimum_term_unit' => null,
];
$settledCleared = Schema::settleTierSlot($draftedCleared);
check_occupant_min_term($settledCleared['current_occupant']['minimum_term_value'] === null, 'an explicit null in the draft clears a previously-configured commitment value');
check_occupant_min_term($settledCleared['current_occupant']['minimum_term_unit'] === null, 'an explicit null in the draft clears a previously-configured commitment unit');

// ── Backward compatibility: a legacy occupant predating this capability ─────

$legacyOccupant = [
    'current_occupant' => [
        'id' => 'occ_legacy01', 'cz_platform_id' => 'CZT-LEGACY', 'addon_platform_id' => '',
        'platform_status' => 'active', 'is_addon' => false,
        'label' => 'Legacy Tier', 'ideal_for' => '', 'price' => 49.0, 'contact' => false,
        'billing_cycle' => 'monthly', 'rate_sheet_id' => null, 'inclusions_override' => [],
        'rate_sheet_items' => [], 'features' => [], 'faq_refs' => [],
        // No minimum_term_value/minimum_term_unit keys at all — a record
        // stored before Phase A ever existed.
    ],
    'history' => [],
];
check_occupant_min_term(
    Schema::normaliseTierSlot($legacyOccupant)['minimum_term_value'] === null,
    'a legacy occupant with no commitment keys reads as null via the admin read model, not an error',
);
check_occupant_min_term(
    Schema::extractTierForCostBuilder($legacyOccupant)['minimum_term_value'] === null,
    'a legacy occupant with no commitment keys projects as null publicly, not an error',
);

// ── Phase 1 flat (pre-occupant) format never fabricates a commitment ────────

$flatTier = [
    'label' => 'Flat Legacy', 'billing_cycle' => 'monthly', 'inclusions_override' => [],
    'features' => [], 'faq_refs' => [], 'enabled' => true,
];
check_occupant_min_term(
    Schema::normaliseTierSlot($flatTier)['minimum_term_value'] === null,
    'a Phase 1 flat tier slot (predating occupants entirely) carries no commitment',
);

echo "Tier occupant minimum-term checks passed.\n";
