<?php

declare(strict_types=1);

/*
 * Phase 7 contract: the public Cost Builder projection's additive
 * edition_options — PackageSchema::extractTierForCostBuilder() ->
 * publicTierEditionOptions(), consumed by PricingBuilder::overlayPackage().
 *
 * The Tier remains one public card. edition_options exists only to let the
 * frontend render an in-card switch; it must never leak edition_platform_id
 * (CZTE stays admin/audit-only, never public or cart-facing — the agreed
 * boundary), never include a non-Active Edition (Pending/Disabled/Archived/
 * Trashed are never offered to a customer), and must be empty for every
 * occupant that has never used this capability.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;

function check_public_editions(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier Edition public projection: ' . $message);
    }
}

function build_occupant(array $overviewData): array
{
    return Schema::upsertOccupant([], $overviewData, true);
}

// ── No Editions: edition_options is present and empty (parity) ──────────────

$plain = build_occupant(['label' => 'Standard', 'price' => 49.0, 'billing_cycle' => 'monthly']);
$plainProjection = Schema::extractTierForCostBuilder($plain);
check_public_editions($plainProjection['edition_options'] === [], 'an occupant with no Editions projects an empty edition_options array');

// ── Editions exist but none are Active: none appear publicly ────────────────

$occupant = $plain;
$monthly = Schema::addTierEdition([], ['title' => 'Monthly', 'price' => 49.0, 'billing_cycle' => 'monthly'])['tier_editions'];
$occupant['current_occupant']['tier_editions'] = $monthly; // still 'disabled' — never published
$noneActiveProjection = Schema::extractTierForCostBuilder($occupant);
check_public_editions($noneActiveProjection['edition_options'] === [], 'a Pending (never-published) Edition never appears in the public projection');

// ── Two Active Editions, one Archived: only the two Active ones appear ──────

$editions = $monthly;
$monthlyId = $editions[0]['id'];
$editions = Schema::applyTierEditionStatus($editions, $monthlyId, StationLifecycle::STATUS_ACTIVE);
$editions = Schema::replaceTierEdition($editions, [
    ...Schema::findTierEdition($editions, $monthlyId),
    'price' => 49.0, 'billing_cycle' => 'monthly', 'contact' => false,
    'minimum_term_value' => 1.0, 'minimum_term_unit' => 'month',
    'edition_platform_id' => 'CZTE2A7KZ', // published — must still never leak publicly
]);

$annualResult = Schema::addTierEdition($editions, ['title' => 'Annual']);
$editions = $annualResult['tier_editions'];
$annualId = $annualResult['edition']['id'];
$editions = Schema::applyTierEditionStatus($editions, $annualId, StationLifecycle::STATUS_ACTIVE);
$editions = Schema::replaceTierEdition($editions, [
    ...Schema::findTierEdition($editions, $annualId),
    'price' => 490.0, 'billing_cycle' => 'annually',
]);

$archivedResult = Schema::addTierEdition($editions, ['title' => 'Retired Edition']);
$editions = $archivedResult['tier_editions'];
$archivedId = $archivedResult['edition']['id'];
$editions = Schema::applyTierEditionStatus($editions, $archivedId, StationLifecycle::STATUS_ACTIVE);
$editions = Schema::applyTierEditionStatus($editions, $archivedId, StationLifecycle::STATUS_ARCHIVED);

$occupant['current_occupant']['tier_editions'] = $editions;

$projection = Schema::extractTierForCostBuilder($occupant);
$options = $projection['edition_options'];
check_public_editions(count($options) === 2, 'only the two Active Editions appear — the Archived one is excluded');

$ids = array_column($options, 'id');
check_public_editions(in_array($monthlyId, $ids, true) && in_array($annualId, $ids, true), 'both Active Editions are present by their opaque selector id');
check_public_editions(!in_array($archivedId, $ids, true), 'the Archived Edition is absent');

foreach ($options as $option) {
    check_public_editions(!array_key_exists('edition_platform_id', $option), 'edition_platform_id (CZTE) never appears in the public projection, even for a published Edition');
    check_public_editions(!array_key_exists('admin_description', $option), 'admin_description (admin-only) never appears in the public projection');
    check_public_editions(!array_key_exists('rate_sheet_items', $option), 'raw rate_sheet_items (admin-only editing detail) never appears in the public projection');
    check_public_editions(!array_key_exists('is_default', $option), 'there is no "default" concept among Edition options — the occupant\'s own declaration is the permanent Default, never one of these rows');
}

$monthlyOption = current(array_filter($options, fn($o) => $o['id'] === $monthlyId));
check_public_editions($monthlyOption['label'] === 'Monthly', 'the Edition\'s own title becomes the public label');
check_public_editions($monthlyOption['price'] === 49.0, 'price is carried');
check_public_editions($monthlyOption['billing_cycle'] === 'monthly', 'billing_cycle is carried');
check_public_editions($monthlyOption['minimum_term_value'] === 1.0, 'minimum_term_value is carried');
check_public_editions($monthlyOption['minimum_term_unit'] === 'month', 'minimum_term_unit is carried');

$annualOption = current(array_filter($options, fn($o) => $o['id'] === $annualId));
check_public_editions($annualOption['price'] === 490.0, 'the second Edition carries its own distinct price');

// ── Declaration inheritance is reflected the same way as the resolved default ──

$occupantWithDeclarations = $occupant;
$occupantWithDeclarations['current_occupant']['inclusions_override'] = [['id' => 'inc-occ', 'label' => 'Occupant inclusion']];
$inheritProjection = Schema::extractTierForCostBuilder($occupantWithDeclarations);
$inheritedOption = current(array_filter($inheritProjection['edition_options'], fn($o) => $o['id'] === $monthlyId));
check_public_editions(
    $inheritedOption['inclusions_override'] === [['id' => 'inc-occ', 'label' => 'Occupant inclusion']],
    'an Edition with no declaration override inherits the occupant\'s own inclusions_override in the public projection too'
);

echo "Tier Edition public projection contract: PASS\n";
