<?php

declare(strict_types=1);

/**
 * Regression lock for the legacy "Contact Us" override reconciliation.
 *
 * The defect: the pre-Rate-Sheet Service-hosted station published unpriced
 * Tiers with `contact => true`; the raw Service → Family/Tier migration copied
 * that value verbatim into ti_primary and every later write preserved it via
 * `??`. PackageStationSchema::evaluateTierPricing tests `$contact` before
 * completeness, so the stale flag nulled the public total even though the
 * occupant's Rate Sheet binding resolved perfectly.
 *
 * This locks the reconciliation's boundaries only. It does not assert
 * anything about projectTierRateSheetWith, the contact feature itself,
 * Package Builder, or Edition handling — none of which this repair changes.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

define('CZ_LEGACY_CONTACT_DEFINE_ONLY', true);
require_once __DIR__ . '/../tools/repair-legacy-contact-override.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema as PMS;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

function check_contact_repair(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: legacy contact repair: {$message}\n");
        exit(1);
    }
}

// ── Fixture: one healthy priced row, one source the Rate Sheet never carries ──

$inclusionPool = [
    ['id' => 'inc-priced', 'label' => 'Priced Feature', '_source_available' => true],
];
$pricedItemId = PMS::deriveItemId('inclusion', 'inc-priced');
$pricedRowId  = PMS::deriveRateItemId($pricedItemId);

$manager = PMS::sanitize([
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_a',
        'title'         => 'Sheet A',
        'items'         => [[
            'item_id'        => $pricedRowId,
            'source_item_id' => $pricedItemId,
            'unit_price'     => 120.0,
        ]],
    ]],
]);
$readModel = PMS::buildReadModel(0, $manager, $inclusionPool, [], 'active');

/** One occupant slot in the shape the migration left behind. */
function legacy_slot(array $occupantOverrides, array $slotOverrides = []): array
{
    return array_merge([
        'current_occupant' => array_merge([
            'id'               => 'occ_' . bin2hex(random_bytes(4)),
            'platform_status'  => 'active',
            'label'            => 'Migrated Tier',
            'contact'          => true,
            'rate_sheet_id'    => 'rs_a',
            'rate_sheet_items' => [['item_id' => $GLOBALS['pricedRowId'], 'quantity' => 1]],
        ], $occupantOverrides),
        'history'       => [],
        'drafts'        => ['overview' => null, 'features' => null, 'faqs' => null],
        'module_status' => ['overview' => 'settled', 'features' => 'settled', 'faqs' => 'settled'],
    ], $slotOverrides);
}

// Nath: an Edition created after the legacy state, owning its own `contact`.
$nath = [
    'id'              => 'edt_nath',
    'label'           => 'Nath',
    'platform_status' => 'active',
    'contact'         => true,
    'rate_sheet_id'   => 'rs_a',
    'rate_sheet_items' => [['item_id' => $pricedRowId, 'quantity' => 1]],
];
$binnedEdition = ['id' => 'edt_binned', 'label' => 'Retired Edition', 'contact' => true, 'platform_status' => 'archived'];

// ── 1. Migrated occupant, complete price, carries Editions ──────────────────

$withEditions = legacy_slot([
    'label'            => 'Starter Cloud',
    'tier_editions'    => [$nath],
    'tier_edition_bin' => [$binnedEdition],
]);
$verdict = cz_legacy_contact_decision($withEditions, $readModel, true);
check_contact_repair($verdict['decision'] === 'clear', 'a migrated occupant with a complete price is cleared');
check_contact_repair($verdict['price'] === 120.0, 'the reported price is the occupant\'s own resolved total');

[$repaired, $clearedDraft] = cz_legacy_contact_clear($withEditions);
check_contact_repair($repaired['current_occupant']['contact'] === false, 'current_occupant.contact becomes false');
check_contact_repair($clearedDraft === false, 'no pending draft is reported when none exists');
check_contact_repair(
    $repaired['current_occupant']['tier_editions'] === [$nath],
    'Edition records (incl. Nath and its own contact) are byte-identical'
);
check_contact_repair(
    $repaired['current_occupant']['tier_editions'][0]['contact'] === true,
    'an Edition keeps its own separate contact override'
);
check_contact_repair(
    $repaired['current_occupant']['tier_edition_bin'] === [$binnedEdition],
    'the Edition bin is byte-identical'
);
check_contact_repair(
    $repaired['drafts'] === $withEditions['drafts'],
    'a null Overview draft is never fabricated'
);
check_contact_repair(
    array_diff_key($repaired['current_occupant'], ['contact' => true])
        === array_diff_key($withEditions['current_occupant'], ['contact' => true]),
    'contact is the only occupant field the repair assigns'
);

// ── 2. Pending Overview draft would otherwise resurrect the override ────────

$withDraft = legacy_slot(['label' => 'Business Pro'], [
    'drafts'        => ['overview' => ['label' => 'Business Pro', 'contact' => true], 'features' => null, 'faqs' => null],
    'module_status' => ['overview' => 'pending', 'features' => 'settled', 'faqs' => 'settled'],
]);
check_contact_repair(
    cz_legacy_contact_decision($withDraft, $readModel, true)['decision'] === 'clear',
    'a migrated occupant with a pending draft is still cleared'
);
[$draftRepaired, $draftFlag] = cz_legacy_contact_clear($withDraft);
check_contact_repair($draftFlag === true, 'clearing a pending draft override is reported');
check_contact_repair($draftRepaired['drafts']['overview']['contact'] === false, 'the pending Overview draft override is cleared');
check_contact_repair($draftRepaired['drafts']['overview']['label'] === 'Business Pro', 'other draft fields are untouched');

// ── 3. Publish after the repair must not resurrect the old value ────────────

$settled = PackageSchema::settleTierSlot($draftRepaired);
check_contact_repair(
    $settled['current_occupant']['contact'] === false,
    'settle after repair resolves contact to false rather than resurrecting it'
);

$noDraftSettled = PackageSchema::settleTierSlot($repaired);
check_contact_repair(
    $noDraftSettled['current_occupant']['contact'] === false,
    'settle with no Overview draft falls back to the repaired occupant value'
);

// ── 4. Occupants whose override is load-bearing are kept ────────────────────

$unpriceable = legacy_slot([
    'label'            => 'Bespoke Tier',
    'rate_sheet_items' => [['item_id' => 'rate_missing_row', 'quantity' => 1]],
]);
$unpriceableVerdict = cz_legacy_contact_decision($unpriceable, $readModel, true);
check_contact_repair($unpriceableVerdict['decision'] === 'keep', 'an occupant that cannot self-price keeps its override');
check_contact_repair($unpriceableVerdict['price'] === null, 'a kept occupant reports no price');

$unbound = legacy_slot(['label' => 'Unbound Tier', 'rate_sheet_id' => null, 'rate_sheet_items' => []]);
check_contact_repair(
    cz_legacy_contact_decision($unbound, $readModel, true)['reason'] === 'no Rate Sheet selections',
    'an occupant with no selections keeps its override and says why'
);

// ── 5. The historical constraint: natively created instances are excluded ───

$nativeVerdict = cz_legacy_contact_decision($withEditions, $readModel, false);
check_contact_repair(
    $nativeVerdict['decision'] === 'keep',
    'the same priced+contact combination is KEPT outside the migrated instance'
);
check_contact_repair(
    $nativeVerdict['reason'] === 'not the migrated instance',
    'the exclusion reason names the historical constraint'
);
check_contact_repair(
    TierInstanceSchema::PRIMARY_INSTANCE_ID === 'ti_primary',
    'the migrated instance id the repair keys on is unchanged'
);

// ── 6. Occupants without the override are never rewritten ───────────────────

$clean = legacy_slot(['label' => 'Native Tier', 'contact' => false]);
check_contact_repair(cz_legacy_contact_decision($clean, $readModel, true)['decision'] === 'skip', 'an occupant with no override is skipped');
check_contact_repair(cz_legacy_contact_decision(['current_occupant' => null], $readModel, true)['decision'] === 'skip', 'an empty slot is skipped');
check_contact_repair(cz_legacy_contact_decision([], $readModel, true)['decision'] === 'skip', 'a slot with no occupant is skipped');

echo "Legacy contact override repair checks passed.\n";
