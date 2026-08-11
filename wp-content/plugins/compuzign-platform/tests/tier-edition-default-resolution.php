<?php

declare(strict_types=1);

/*
 * Default-declaration contract: the occupant's own commercial fields are
 * the permanent Default for PackageSchema::extractTierForCostBuilder() —
 * the exact function PricingBuilder::overlayPackage() already consumes for
 * every existing public/cart-facing price, billing_cycle, contact,
 * inclusions, and faq_refs field.
 *
 * The rules under test:
 *   - the occupant's own commercial terms (price, billing_cycle, contact,
 *     Rate Sheet binding, label, ideal_for, inclusions_override, faq_refs)
 *     are ALWAYS what extractTierForCostBuilder() resolves as the primary
 *     projection — regardless of whether the occupant has Editions, and
 *     regardless of any Edition's own lifecycle status. An Edition never
 *     displaces, blends with, or otherwise touches these fields;
 *   - an Edition's own commercial terms surface ONLY through
 *     edition_options[] — Active Editions only, each carrying its own
 *     price/billing_cycle/contact/minimum-term/declaration fields, with the
 *     same inherit-the-occupant's-own-value-when-empty rule already used
 *     against Service-level canonical data, scoped to that one option entry;
 *   - the occupant's own customer-facing `label`/`ideal_for` are never
 *     overwritten by an Edition's title/admin_description, in either
 *     direction — those stay entirely off the Edition's own storage-shape
 *     boundary from the top-level projection's fields;
 *   - an occupant with no Editions projects byte-identically to an occupant
 *     that has never used this capability — the parity guarantee.
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
check_default_resolution($plainProjection['edition_options'] === [], 'no Editions: edition_options is empty');

// ── An occupant's own terms are the permanent Default, regardless of any
//    Edition's existence or lifecycle status — never blended, never displaced.

$editionsA = Schema::addTierEdition([], ['title' => 'Annual', 'billing_cycle' => 'annually'])['tier_editions'];
$editionAId = $editionsA[0]['id'];

$withDisabledEdition = $plainOccupant;
$withDisabledEdition['current_occupant']['tier_editions'] = $editionsA; // still 'disabled' — never published
$disabledProjection = Schema::extractTierForCostBuilder($withDisabledEdition);
check_default_resolution($disabledProjection['price'] === 49.0, 'a Disabled/Pending Edition never displaces the occupant\'s own price');
check_default_resolution($disabledProjection['billing_cycle'] === 'monthly', 'a Disabled/Pending Edition never displaces the occupant\'s own billing_cycle');
check_default_resolution($disabledProjection['edition_options'] === [], 'a non-Active Edition is never offered as a public switch option');

$editionsActive = Schema::applyTierEditionStatus($editionsA, $editionAId, StationLifecycle::STATUS_ACTIVE);
$editionsActive = Schema::replaceTierEdition($editionsActive, [
    ...Schema::findTierEdition($editionsActive, $editionAId),
    'price' => 490.0, 'billing_cycle' => 'annually', 'contact' => false,
    'rate_sheet_id' => 'rs_annual', 'rate_sheet_items' => [['item_id' => 'rate-vm', 'quantity' => 3]],
]);
$occupantWithActiveEdition = $plainOccupant;
$occupantWithActiveEdition['current_occupant']['tier_editions'] = $editionsActive;

$activeProjection = Schema::extractTierForCostBuilder($occupantWithActiveEdition);
check_default_resolution($activeProjection['price'] === 49.0, 'even an Active Edition never displaces the occupant\'s own price at the top level — the occupant is the permanent Default');
check_default_resolution($activeProjection['billing_cycle'] === 'monthly', 'even an Active Edition never displaces the occupant\'s own billing_cycle at the top level');
check_default_resolution($activeProjection['rate_sheet_id'] === 'rs_a', 'even an Active Edition never displaces the occupant\'s own Rate Sheet binding at the top level');
check_default_resolution($activeProjection['label'] === 'Standard', 'the occupant\'s own customer-facing label is never overwritten by an Edition\'s title ("Annual")');

// The Active Edition's own terms surface only as one edition_options[] entry.
check_default_resolution(count($activeProjection['edition_options']) === 1, 'exactly one Active Edition is offered as a switch option');
$activeOption = $activeProjection['edition_options'][0];
check_default_resolution($activeOption['id'] === $editionAId, 'the option carries the Edition\'s own id');
check_default_resolution($activeOption['label'] === 'Annual', 'the option carries the Edition\'s own title as its label');
check_default_resolution($activeOption['price'] === 490.0, 'the option carries the Edition\'s own price');
check_default_resolution($activeOption['billing_cycle'] === 'annually', 'the option carries the Edition\'s own billing_cycle');
check_default_resolution(!array_key_exists('edition_platform_id', $activeOption), 'CZTE never leaks into the public option');
check_default_resolution(!array_key_exists('is_default', $activeOption), 'there is no "default" concept among Edition options — every Edition is an alternate to the occupant\'s own permanent Default');

// ── Declaration fields (inclusions/faq_refs): the top-level projection is
//    always the occupant's own; the inherit-when-empty rule applies only
//    inside one edition_options[] entry, never to the top level. ──────────

$occupantWithDeclarations = $plainOccupant;
$occupantWithDeclarations['current_occupant']['inclusions_override'] = [['id' => 'inc-occ', 'label' => 'Occupant inclusion']];
$occupantWithDeclarations['current_occupant']['faq_refs'] = ['faq-occ'];
$occupantWithDeclarations['current_occupant']['tier_editions'] = $editionsActive; // Edition's own inclusions_override/faq_refs are empty

$inheritedProjection = Schema::extractTierForCostBuilder($occupantWithDeclarations);
check_default_resolution(
    $inheritedProjection['inclusions_override'] === [['id' => 'inc-occ', 'label' => 'Occupant inclusion']],
    'the top-level projection always carries the occupant\'s own inclusions_override, Editions notwithstanding'
);
check_default_resolution($inheritedProjection['faq_refs'] === ['faq-occ'], 'the top-level projection always carries the occupant\'s own faq_refs, Editions notwithstanding');
check_default_resolution(
    $inheritedProjection['edition_options'][0]['inclusions_override'] === [['id' => 'inc-occ', 'label' => 'Occupant inclusion']],
    'an Edition option with no declaration override of its own inherits the occupant\'s inclusions_override — scoped to that option only'
);

// Now give the Edition its OWN declaration override — it wins WITHIN its own option, never at the top level.
$editionsWithOwnDeclarations = Schema::replaceTierEdition($editionsActive, [
    ...Schema::findTierEdition($editionsActive, $editionAId),
    'inclusions_override' => [['id' => 'inc-edt', 'label' => 'Edition-specific inclusion']],
    'faq_refs' => ['faq-edt'],
]);
$occupantWithOwnDeclarations = $occupantWithDeclarations;
$occupantWithOwnDeclarations['current_occupant']['tier_editions'] = $editionsWithOwnDeclarations;
$overrideProjection = Schema::extractTierForCostBuilder($occupantWithOwnDeclarations);
check_default_resolution(
    $overrideProjection['inclusions_override'] === [['id' => 'inc-occ', 'label' => 'Occupant inclusion']],
    'the top-level projection is still the occupant\'s own, even when the Edition declares its own override'
);
check_default_resolution(
    $overrideProjection['edition_options'][0]['inclusions_override'] === [['id' => 'inc-edt', 'label' => 'Edition-specific inclusion']],
    'a deliberate Edition-specific inclusions_override wins WITHIN that option, over inheriting the occupant\'s own'
);
check_default_resolution($overrideProjection['edition_options'][0]['id'] === $editionAId, 'the overriding option is still keyed to the same Edition id');

// ── enabled/is_addon remain occupant-level facts, untouched by Editions ─────

check_default_resolution($activeProjection['enabled'] === true, 'occupant-level enabled is unaffected by any Edition');
check_default_resolution($activeProjection['is_addon'] === false, 'occupant-level is_addon is unaffected by any Edition');

// ── Distinctness invariant: an Edition's title/admin_description can never
//    appear in the occupant's own top-level label/ideal_for, and
//    admin_description never appears anywhere in the public projection. ────

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

$distinctProjection = Schema::extractTierForCostBuilder($distinctOccupant);
check_default_resolution($distinctProjection['label'] === 'Standard', 'the occupant\'s own label ("Standard") is never overwritten by the Edition\'s title ("Annual Plan")');
check_default_resolution($distinctProjection['ideal_for'] === 'For growing teams', 'the occupant\'s own ideal_for is never touched by the Edition\'s admin_description');
check_default_resolution(!array_key_exists('admin_description', $distinctProjection), 'admin_description never appears anywhere in the legacy flat projection');
check_default_resolution($distinctProjection['price'] === 49.0, 'the occupant\'s own price remains the top-level Default even alongside an Active Edition with its own price');

// The Edition's own title legitimately DOES appear as the switch button's
// label inside edition_options[] — the exclusion above applies only to the
// top-level, occupant-owned `label` field, not to the Edition's own entry.
$distinctOption = $distinctProjection['edition_options'][0] ?? null;
check_default_resolution($distinctOption !== null && $distinctOption['label'] === 'Annual Plan', 'the Edition\'s own title correctly appears as ITS OWN switch-option label, distinct from the untouched top-level occupant label');
check_default_resolution($distinctOption['price'] === 490.0, 'the Edition\'s own price correctly appears within its own option, alongside the untouched top-level occupant price');

echo "Tier Edition default resolution contract: PASS\n";
