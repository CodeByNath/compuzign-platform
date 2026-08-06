<?php

declare(strict_types=1);

/*
 * Phase 5 contract: default Edition resolution into the legacy flat
 * projection PackageSchema::extractTierForCostBuilder() produces — the
 * exact function PricingBuilder::overlayPackage() already consumes for
 * every existing public/cart-facing price, billing_cycle, contact,
 * inclusions, and faq_refs field.
 *
 * The three rules under test:
 *   - commercial terms (price, billing_cycle, contact, Rate Sheet binding)
 *     are always the resolved ACTIVE default Edition's own value, never
 *     blended with the occupant's;
 *   - declaration fields (inclusions_override, faq_refs) inherit the
 *     occupant's own value only when the Edition leaves them empty;
 *   - the occupant's own customer-facing `label` is NEVER overwritten by an
 *     Edition's title, in either direction — the resolved Tier card heading
 *     stays the occupant's own label whichever Edition is active or default.
 * An occupant with no Editions, or an unresolved/non-Active default, must
 * project byte-identically to today — the parity guarantee.
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

function check_default_resolution(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier Edition default resolution: ' . $message);
    }
}

// settleTierSlot() always derives price from Rate Sheet selections (hardcodes
// price => null in its own draft merge) — direct upsertOccupant is the
// occupant-level entry point that accepts an explicit price directly,
// matching the legacy savePackageStationTier atomic-write path.
function build_published_occupant(array $overviewData): array
{
    return Schema::upsertOccupant([], $overviewData, true);
}

// ── Parity: an occupant with no Editions projects exactly as before ─────────

$plainOccupant = build_published_occupant([
    'label' => 'Standard', 'price' => 49.0, 'billing_cycle' => 'monthly',
    'rate_sheet_id' => 'rs_a', 'contact' => false,
]);
$plainProjection = Schema::extractTierForCostBuilder($plainOccupant);
check_default_resolution($plainProjection['label'] === 'Standard', 'no Editions: label is the occupant\'s own');
check_default_resolution($plainProjection['price'] === 49.0, 'no Editions: price is the occupant\'s own');
check_default_resolution($plainProjection['billing_cycle'] === 'monthly', 'no Editions: billing_cycle is the occupant\'s own');

// ── Editions exist, but no valid default resolves: still falls back untouched ──

$withEditionsNoDefault = $plainOccupant;
$editionsA = Schema::addTierEdition([], ['title' => 'Annual', 'billing_cycle' => 'annually'])['tier_editions'];
$withEditionsNoDefault['current_occupant']['tier_editions'] = $editionsA;
// default_edition_id left null.
$noDefaultProjection = Schema::extractTierForCostBuilder($withEditionsNoDefault);
check_default_resolution($noDefaultProjection['price'] === 49.0, 'Editions exist but no default is set: price still falls back to the occupant\'s own');
check_default_resolution($noDefaultProjection['billing_cycle'] === 'monthly', 'Editions exist but no default is set: billing_cycle still falls back to the occupant\'s own');

$editionAId = $editionsA[0]['id'];
$withDisabledDefault = $plainOccupant;
$withDisabledDefault['current_occupant']['tier_editions'] = $editionsA; // still 'disabled' — never published
$withDisabledDefault['current_occupant']['default_edition_id'] = $editionAId;
$disabledDefaultProjection = Schema::extractTierForCostBuilder($withDisabledDefault);
check_default_resolution($disabledDefaultProjection['price'] === 49.0, 'a default pointing at a non-Active Edition falls back to the occupant\'s own price — a Pending Edition is never exposed publicly');
check_default_resolution($disabledDefaultProjection['billing_cycle'] === 'monthly', 'a default pointing at a non-Active Edition falls back to the occupant\'s own billing_cycle');

// ── A valid Active default: commercial terms come from the Edition, never blended ──

$editionsActive = Schema::applyTierEditionStatus($editionsA, $editionAId, StationLifecycle::STATUS_ACTIVE);
$editionsActive = Schema::replaceTierEdition($editionsActive, [
    ...Schema::findTierEdition($editionsActive, $editionAId),
    'price' => 490.0, 'billing_cycle' => 'annually', 'contact' => false,
    'rate_sheet_id' => 'rs_annual', 'rate_sheet_items' => [['item_id' => 'rate-vm', 'quantity' => 3]],
]);
$occupantWithActiveDefault = $plainOccupant;
$occupantWithActiveDefault['current_occupant']['tier_editions'] = $editionsActive;
$occupantWithActiveDefault['current_occupant']['default_edition_id'] = $editionAId;

$activeProjection = Schema::extractTierForCostBuilder($occupantWithActiveDefault);
check_default_resolution($activeProjection['price'] === 490.0, 'an Active default Edition\'s own price is used, never the occupant\'s stale 49.0');
check_default_resolution($activeProjection['billing_cycle'] === 'annually', 'an Active default Edition\'s own billing_cycle is used');
check_default_resolution($activeProjection['rate_sheet_id'] === 'rs_annual', 'an Active default Edition\'s own Rate Sheet binding is used, not the occupant\'s rs_a');
check_default_resolution(count($activeProjection['rate_sheet_items']) === 1 && $activeProjection['rate_sheet_items'][0]['item_id'] === 'rate-vm', 'an Active default Edition\'s own row selections are used');
check_default_resolution($activeProjection['label'] === 'Standard', 'the occupant\'s own customer-facing label is NEVER overwritten by the Edition\'s title ("Annual") — the card heading stays "Standard" regardless of which Edition is active or default');

// ── Declaration fields (inclusions/faq_refs) inherit when the Edition leaves them empty ──

$occupantWithDeclarations = $plainOccupant;
$occupantWithDeclarations['current_occupant']['inclusions_override'] = [['id' => 'inc-occ', 'label' => 'Occupant inclusion']];
$occupantWithDeclarations['current_occupant']['faq_refs'] = ['faq-occ'];
$occupantWithDeclarations['current_occupant']['tier_editions'] = $editionsActive; // Edition's own inclusions_override/faq_refs are empty
$occupantWithDeclarations['current_occupant']['default_edition_id'] = $editionAId;

$inheritedProjection = Schema::extractTierForCostBuilder($occupantWithDeclarations);
check_default_resolution(
    $inheritedProjection['inclusions_override'] === [['id' => 'inc-occ', 'label' => 'Occupant inclusion']],
    'an Edition with no declaration override inherits the occupant\'s own inclusions_override'
);
check_default_resolution($inheritedProjection['faq_refs'] === ['faq-occ'], 'an Edition with no declaration override inherits the occupant\'s own faq_refs');

// Now give the Edition its OWN declaration override — it must win.
$editionsWithOwnDeclarations = Schema::replaceTierEdition($editionsActive, [
    ...Schema::findTierEdition($editionsActive, $editionAId),
    'inclusions_override' => [['id' => 'inc-edt', 'label' => 'Edition-specific inclusion']],
    'faq_refs' => ['faq-edt'],
]);
$occupantWithOwnDeclarations = $occupantWithDeclarations;
$occupantWithOwnDeclarations['current_occupant']['tier_editions'] = $editionsWithOwnDeclarations;
$overrideProjection = Schema::extractTierForCostBuilder($occupantWithOwnDeclarations);
check_default_resolution(
    $overrideProjection['inclusions_override'] === [['id' => 'inc-edt', 'label' => 'Edition-specific inclusion']],
    'a deliberate Edition-specific inclusions_override wins over the occupant\'s own'
);
check_default_resolution($overrideProjection['faq_refs'] === ['faq-edt'], 'a deliberate Edition-specific faq_refs wins over the occupant\'s own');

// ── enabled/is_addon remain occupant-level facts, untouched by Edition resolution ──

check_default_resolution($activeProjection['enabled'] === true, 'occupant-level enabled is unaffected by Edition resolution');
check_default_resolution($activeProjection['is_addon'] === false, 'occupant-level is_addon is unaffected by Edition resolution');

// ── Distinctness invariant: Edition title/admin_description can never overwrite
//    the occupant's own customer-facing label/ideal_for, in either direction ──

$distinctOccupant = build_published_occupant([
    'label' => 'Standard', 'ideal_for' => 'For growing teams', 'price' => 49.0, 'billing_cycle' => 'monthly',
]);
$distinctEditions = Schema::addTierEdition([], [
    'title' => 'Annual Plan', 'admin_description' => 'Internal notes about annual billing — never customer-facing',
    'billing_cycle' => 'annually',
])['tier_editions'];
$distinctEditionId = $distinctEditions[0]['id'];
$distinctEditions = Schema::applyTierEditionStatus($distinctEditions, $distinctEditionId, StationLifecycle::STATUS_ACTIVE);
$distinctEditions = Schema::replaceTierEdition($distinctEditions, [
    ...Schema::findTierEdition($distinctEditions, $distinctEditionId),
    'price' => 490.0,
]);
$distinctOccupant['current_occupant']['tier_editions'] = $distinctEditions;
$distinctOccupant['current_occupant']['default_edition_id'] = $distinctEditionId;

$distinctProjection = Schema::extractTierForCostBuilder($distinctOccupant);
check_default_resolution($distinctProjection['label'] === 'Standard', 'the occupant\'s own label ("Standard") is never overwritten by the Edition\'s title ("Annual Plan")');
check_default_resolution($distinctProjection['ideal_for'] === 'For growing teams', 'the occupant\'s own ideal_for is never touched by the Edition\'s admin_description');
check_default_resolution(!array_key_exists('admin_description', $distinctProjection), 'admin_description never appears anywhere in the legacy flat projection');
check_default_resolution($distinctProjection['price'] === 490.0, 'the Edition\'s own commercial terms still resolve correctly alongside the untouched label/ideal_for');

// The Edition's own title legitimately DOES appear as the switch button's
// label inside edition_options[] — the exclusion above applies only to the
// top-level, occupant-owned `label` field, not to the Edition's own entry.
$distinctOption = $distinctProjection['edition_options'][0] ?? null;
check_default_resolution($distinctOption !== null && $distinctOption['label'] === 'Annual Plan', 'the Edition\'s own title correctly appears as ITS OWN switch-option label, distinct from the untouched top-level occupant label');

echo "Tier Edition default resolution contract: PASS\n";
