<?php

require_once dirname(__DIR__) . '/src/Modules/SurfacePackages/Support/PackageStationSchema.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageStationSchema as Schema;

/*
 * PackageStationSchema is not the Package Station aggregate authority — that is
 * owned by PackageManagerSchema, PackageSchema, and PackageRepository. This
 * contract covers only the two pure helpers those modules consume:
 *   - sanitizeSourceRelationships (Package-owned supply relationship identity)
 *   - evaluateTierPricing         (pure live-Tier pricing evaluator)
 */

function check_active_package(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Package Station helper contract: ' . $message);
    }
}

// ── Source relationships ──────────────────────────────────────────────────────

$sources = Schema::sanitizeSourceRelationships([
    ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 42],
    ['provider_key' => 'product', 'entity_type' => 'product', 'entity_id' => 'sku-7'],
    ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 42],
]);
check_active_package(count($sources) === 2, 'source relationships deduplicate by provider-qualified source identity');
check_active_package($sources[0]['relationship_id'] === Schema::sanitizeSourceRelationships([$sources[0]])[0]['relationship_id'], 'source relationship identity is deterministic');
check_active_package($sources[1]['provider_key'] === 'product', 'Package source relationships are not Service-specific');
check_active_package($sources[0]['category_group_id'] === null, 'an unassigned source has a null Package Family bucket');

$assigned = Schema::sanitizeSourceRelationships([
    ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 7, 'category_group_id' => 'pcg_kairos'],
]);
check_active_package($assigned[0]['category_group_id'] === 'pcg_kairos', 'a source carries its Package Family bucket assignment');
check_active_package(Schema::sanitizeSourceRelationships(['not-an-array']) === [], 'malformed source relationships are dropped');

echo "Source relationship contract checks passed.\n";

// ── Tier pricing evaluator ────────────────────────────────────────────────────

$rateItems = [
    ['item_id' => 'rate-vm', 'unit_price' => 36, 'available' => true, 'options' => []],
    ['item_id' => 'rate-gpu', 'unit_price' => 120, 'available' => false, 'options' => []],
];

$priced = Schema::evaluateTierPricing($rateItems, [
    ['item_id' => 'rate-vm', 'quantity' => 4, 'option_selections' => []],
]);
check_active_package($priced['mode'] === 'catalogue', 'a non-contact Tier prices in catalogue mode');
check_active_package($priced['total'] === 144.0 && $priced['complete'], 'catalogue total derives from unit price and chosen quantity');

$unresolved = Schema::evaluateTierPricing($rateItems, [
    ['item_id' => 'rate-vm', 'quantity' => 4],
    ['item_id' => 'missing-item', 'quantity' => 1],
]);
check_active_package($unresolved['total'] === null, 'any unresolved selection suppresses the authoritative total');
check_active_package($unresolved['resolved_subtotal'] === 144.0, 'the resolved subtotal remains diagnostic');
check_active_package(in_array('unresolved_item', array_column($unresolved['unresolved'], 'code'), true), 'a missing Rate Sheet reference is reported');

$unavailable = Schema::evaluateTierPricing($rateItems, [
    ['item_id' => 'rate-gpu', 'quantity' => 1, 'option_selections' => []],
]);
check_active_package($unavailable['total'] === null && in_array('unavailable_item', array_column($unavailable['unresolved'], 'code'), true), 'an unavailable item blocks the total');

$contact = Schema::evaluateTierPricing($rateItems, [], true);
check_active_package($contact['mode'] === 'contact' && $contact['total'] === null, 'a contact Tier makes null pricing explicit');

echo "Tier pricing evaluator contract checks passed.\n";
