<?php

require_once dirname(__DIR__) . '/src/Modules/Packages/Support/PackageStationSchema.php';

use CompuZign\Platform\Modules\Packages\Support\PackageStationSchema as Schema;

function check_active_package(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Active Package contract: ' . $message);
    }
}

$station = Schema::defaultStation();
check_active_package(array_keys($station['tiers']) === Schema::FIXED_TIERS, 'fixed Tier occupants remain the Phase 1 baseline');

$source = Schema::sanitizeSourceRef([
    'provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 42,
    'item_type' => 'inclusion', 'item_id' => 'managed-vm',
]);
check_active_package($source !== null && $source['entity_id'] === 42, 'legacy Service ownership becomes commercial source provenance');
check_active_package(Schema::sanitizeSourceRef(['provider_key' => 'service']) === null, 'malformed source provenance is rejected');
check_active_package(Schema::deriveRateSheetItemId(['provider_key' => 'service']) === '', 'malformed provenance cannot mint an item identity');

$selections = Schema::sanitizeTierSelections([
    ['item_id' => 'rate-vm', 'quantity' => 4, 'option_selections' => ['4-vcpu', 'ubuntu', 'ubuntu']],
    ['item_id' => 'missing-rate-item', 'quantity' => 1],
]);
check_active_package($selections[0] === [
    'item_id' => 'rate-vm', 'quantity' => 4, 'option_selections' => ['4-vcpu', 'ubuntu'],
], 'Tier persists only item identity, chosen quantity, and option selections');
check_active_package($selections[1]['item_id'] === 'missing-rate-item', 'unresolved Tier references remain visible');

$rateSheetItems = [[
    'item_id' => 'rate-vm',
    'source' => $source,
    'unit_price' => 36,
    'suggested_quantity' => 1,
]];
$pricing = Schema::deriveTierTotal($rateSheetItems, [$selections[0]]);
check_active_package($pricing['total'] === 144.0 && $pricing['complete'], 'catalogue total derives from Rate Sheet unit price and Tier chosen quantity');
check_active_package($rateSheetItems[0]['suggested_quantity'] === 1 && $selections[0]['quantity'] === 4, 'editing a suggestion cannot alter an existing Tier quantity');
$unresolvedPricing = Schema::deriveTierTotal($rateSheetItems, $selections);
check_active_package($unresolvedPricing['unresolved'] === ['missing-rate-item'], 'missing Rate Sheet references survive derivation');
check_active_package($unresolvedPricing['total'] === null && $unresolvedPricing['resolved_subtotal'] === 144.0, 'unresolved selections cannot emit an authoritative partial total');

$forbiddenTierFields = ['source', 'service_id', 'group_id', 'unit', 'unit_price', 'price', 'label', 'description', 'inclusions', 'faq_refs'];
foreach ($forbiddenTierFields as $field) {
    check_active_package(!array_key_exists($field, $selections[0]), "Tier does not persist {$field}");
}

echo "Active Package contract checks passed.\n";

$rawRateSheet = [
    'title' => 'Infrastructure',
    'groups' => [['group_id' => 'compute', 'label' => 'Compute']],
    'items' => [[
        'source' => $source, 'group_id' => 'compute', 'unit' => 'Per VM', 'unit_price' => 36,
        'suggested_quantity' => 1, 'available' => true, 'options' => ['4-vcpu', 'ubuntu'],
    ]],
];
$sanitizedRateSheet = Schema::sanitizeRateSheet($rawRateSheet);
check_active_package($sanitizedRateSheet !== null, 'Rate Sheet sanitises into a provider-owned model');
check_active_package($sanitizedRateSheet['items'][0]['item_id'] === Schema::deriveRateSheetItemId($source), 'source provenance derives stable Rate Sheet item identity');
check_active_package(Schema::validateRateSheet($sanitizedRateSheet) === [], 'valid groups and items pass Rate Sheet validation');
check_active_package(Schema::validateTierSelections($sanitizedRateSheet['items'], [[
    'item_id' => $sanitizedRateSheet['items'][0]['item_id'], 'quantity' => 4, 'option_selections' => ['ubuntu'],
]]) === [], 'minimal valid Tier selection passes validation');
check_active_package(Schema::validateTierSelections($sanitizedRateSheet['items'], [[
    'item_id' => $sanitizedRateSheet['items'][0]['item_id'], 'quantity' => 1, 'option_selections' => ['not-offered'],
]])[0]['path'] === 'selections.0.option_selections', 'unresolved option selection is reported');

$duplicateSheet = $sanitizedRateSheet;
$duplicateSheet['items'][] = $duplicateSheet['items'][0];
check_active_package(array_filter(Schema::validateRateSheet($duplicateSheet), static fn(array $issue): bool => (
    $issue['path'] === 'rate_sheet.items.1.item_id'
)) !== [], 'duplicate Rate Sheet item identity is rejected');

$unresolvedSheet = Schema::sanitizeRateSheet(['title' => 'Unresolved', 'items' => [[
    'item_id' => 'legacy-missing', 'source' => null, 'unit' => 'Per item', 'unit_price' => 10,
]]]);
check_active_package($unresolvedSheet['items'][0]['item_id'] === 'legacy-missing', 'unresolved source item is preserved');
check_active_package(Schema::validateRateSheet($unresolvedSheet)[0]['path'] === 'rate_sheet.items.0.source', 'unresolved source is visible to validation');

$legacyRateSheet = [
    'title' => 'Legacy', 'groups' => [['group_id' => 'core', 'label' => 'Core']],
    'items' => [[
        'item_id' => 'rate-legacy', 'source_type' => 'inclusion', 'source_id' => 'managed-vm',
        'group_id' => 'core', 'per' => 'Per VM', 'unit_price' => 36, 'quantity' => 1,
    ]],
];
$legacyTiers = ['basic' => ['rate_sheet_items' => [['item_id' => 'rate-legacy', 'quantity' => 4]], 'price' => 144]];
$planA = Schema::planLegacyMigration(42, $legacyRateSheet, $legacyTiers);
$planB = Schema::planLegacyMigration(42, $legacyRateSheet, $legacyTiers);
check_active_package($planA === $planB, 'migration planning is idempotent');
check_active_package($planA['rate_sheet']['items'][0]['source']['entity_id'] === 42, 'legacy Service ownership becomes provenance only');
check_active_package($planA['tiers']['basic']['selections'] === [['item_id' => 'rate-legacy', 'quantity' => 4, 'option_selections' => []]], 'legacy Tier maps directly to Rate Sheet selections');
check_active_package($planA['parity']['basic']['matches'] === true, 'migration parity compares derived and legacy catalogue price');
check_active_package(!Schema::migrationHasDelta($planA['source_fingerprint'], 42, $legacyRateSheet, $legacyTiers), 'unchanged legacy source has no migration delta');
$changedLegacyTiers = $legacyTiers;
$changedLegacyTiers['basic']['rate_sheet_items'][0]['quantity'] = 5;
check_active_package(Schema::migrationHasDelta($planA['source_fingerprint'], 42, $legacyRateSheet, $changedLegacyTiers), 'legacy authoring after planning is detected as a migration delta');

echo "Active Package Rate Sheet and migration contract checks passed.\n";

$projectionStation = Schema::defaultStation();
$projectionStation['lifecycle']['status'] = 'active';
$projectionStation['rate_sheet'] = $sanitizedRateSheet;
foreach (Schema::FIXED_TIERS as $tierId) {
    $projectionStation['tiers'][$tierId]['enabled'] = false;
}
$projectedItemId = $sanitizedRateSheet['items'][0]['item_id'];
$projectionStation['tiers']['basic'] = [
    'enabled' => true, 'contact' => false,
    'selections' => [['item_id' => $projectedItemId, 'quantity' => 4, 'option_selections' => ['ubuntu']]],
];
$readyProjection = Schema::projectActiveCommercialPackage($projectionStation);
check_active_package($readyProjection['active'], 'active Package with a ready Tier emits a commercial projection');
check_active_package($readyProjection['projection']['tiers']['basic']['pricing'] === ['mode' => 'catalogue', 'total' => 144.0], 'priced Tier emits only its authoritative catalogue total');
check_active_package(!array_key_exists('source', $readyProjection['projection']['tiers']['basic']), 'commercial projection does not expose Package-internal provenance');

$fixtures = [];
$fixtures['unresolved'] = $projectionStation;
$fixtures['unresolved']['tiers']['basic']['selections'][0]['item_id'] = 'removed-item';
$fixtures['unavailable'] = $projectionStation;
$fixtures['unavailable']['rate_sheet']['items'][0]['available'] = false;
$fixtures['invalid_option'] = $projectionStation;
$fixtures['invalid_option']['tiers']['basic']['selections'][0]['option_selections'] = ['windows-not-offered'];
foreach (['unresolved' => 'unresolved_item', 'unavailable' => 'unavailable_item', 'invalid_option' => 'invalid_option'] as $fixture => $code) {
    $result = Schema::projectActiveCommercialPackage($fixtures[$fixture]);
    check_active_package(!$result['active'] && $result['projection'] === null, "{$fixture} fixture cannot emit an active Package projection");
    check_active_package(in_array($code, array_column($result['blockers']['basic'], 'code'), true), "{$fixture} fixture exposes its activation blocker");
}
check_active_package(in_array('incomplete_pricing', array_column(
    Schema::tierActivationReadiness($fixtures['unresolved']['rate_sheet']['items'], $fixtures['unresolved']['tiers']['basic'])['blockers'],
    'code'
), true), 'incomplete priced Tier is explicitly blocked from activation');

$contactStation = $projectionStation;
$contactStation['tiers']['basic'] = ['enabled' => true, 'contact' => true, 'selections' => []];
$contactProjection = Schema::projectActiveCommercialPackage($contactStation);
check_active_package($contactProjection['active'], 'contact-only Tier may emit without a catalogue total');
check_active_package($contactProjection['projection']['tiers']['basic']['pricing'] === ['mode' => 'contact', 'total' => null], 'contact-only projection makes null pricing explicit');
$contactStation['tiers']['basic']['selections'] = [['item_id' => 'removed-item', 'quantity' => 1]];
check_active_package(!Schema::projectActiveCommercialPackage($contactStation)['active'], 'contact-only Tier cannot conceal an unresolved catalogue selection');

$inactiveStation = $projectionStation;
$inactiveStation['lifecycle']['status'] = 'disabled';
$inactiveProjection = Schema::projectActiveCommercialPackage($inactiveStation);
check_active_package(!$inactiveProjection['active'] && $inactiveProjection['projection'] === null, 'inactive Package lifecycle cannot emit an active projection');

echo "Active Package activation-readiness and projection fixture checks passed.\n";
