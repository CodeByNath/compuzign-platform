<?php

declare(strict_types=1);

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;

function check_audience_groups(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier occupant audience groups: ' . $message);
    }
}

// A never-configured occupant belongs to every group. An occupant (add-on
// or not) belongs to its Tier Group, not one customer audience, so absence
// must not silently exclude it from either tab.
$legacy = Schema::normaliseTierSlot([
    'label' => 'Legacy', 'billing_cycle' => 'monthly', 'inclusions_override' => [],
    'features' => [], 'faq_refs' => [], 'enabled' => true,
]);
check_audience_groups(
    $legacy['audience_groups'] === ['personal_business', 'enterprise'],
    'a never-configured occupant defaults to every group',
);

// An administrator can narrow the selection — including to an add-on
// occupant, which stores it exactly like any other Tier.
$enterpriseOnlyAddon = Schema::commitTierLifecycle(Schema::upsertOccupant([], [
    'label' => 'Priority Support', 'billing_cycle' => 'monthly',
    'is_addon' => true, 'audience_groups' => ['enterprise'],
], true));
check_audience_groups(
    $enterpriseOnlyAddon['current_occupant']['audience_groups'] === ['enterprise'],
    'an add-on occupant stores its own narrowed grouping, independent of is_addon',
);
check_audience_groups(
    Schema::normaliseTierSlot($enterpriseOnlyAddon)['audience_groups'] === ['enterprise'],
    'detail exposes the occupant grouping',
);
check_audience_groups(
    Schema::extractTierForCostBuilder($enterpriseOnlyAddon)['audience_groups'] === ['enterprise'],
    'the public Tier projection exposes the occupant grouping',
);

// is_addon and audience_groups are orthogonal: toggling one never touches
// the other. A normal Tier can be narrowed exactly the same way.
$normalNarrowed = Schema::commitTierLifecycle(Schema::upsertOccupant([], [
    'label' => 'Starter', 'billing_cycle' => 'monthly',
    'is_addon' => false, 'audience_groups' => ['personal_business'],
], true));
check_audience_groups(
    $normalNarrowed['current_occupant']['audience_groups'] === ['personal_business'],
    'a normal Tier narrows the same way an add-on does',
);
check_audience_groups(
    $normalNarrowed['current_occupant']['is_addon'] === false,
    'narrowing audience_groups never flips is_addon',
);

// Invalid/duplicate entries are filtered and deduped, never coerced back to
// the full default set — an explicit (even if malformed) choice is not the
// same as never having configured the field.
$sanitized = Schema::upsertOccupant([], [
    'label' => 'Mixed', 'billing_cycle' => 'monthly',
    'audience_groups' => ['enterprise', 'invented', 'enterprise', 'personal_business'],
], true);
check_audience_groups(
    $sanitized['current_occupant']['audience_groups'] === ['enterprise', 'personal_business'],
    'invalid entries are dropped and duplicates deduped, valid ones kept',
);

// An administrator may deliberately deselect every group. That explicit
// choice is preserved, not silently coerced back to "all".
$none = Schema::upsertOccupant([], [
    'label' => 'Hidden', 'billing_cycle' => 'monthly', 'audience_groups' => [],
], true);
check_audience_groups(
    $none['current_occupant']['audience_groups'] === [],
    'an explicit empty selection is preserved as the administrator\'s choice',
);

// Overview settle: draft-preferred, same as every other Overview scalar.
// Omitting the field from the draft preserves the settled occupant's value
// rather than resetting it.
$drafted = Schema::ensureTierLifecycle($enterpriseOnlyAddon);
$drafted['drafts']['overview'] = [
    'label' => 'Priority Support', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'monthly', 'audience_groups' => ['personal_business', 'enterprise'],
];
$settled = Schema::settleTierSlot($drafted);
check_audience_groups(
    $settled['current_occupant']['audience_groups'] === ['personal_business', 'enterprise'],
    'Overview settle commits the draft-preferred grouping',
);

$draftedOmitted = Schema::ensureTierLifecycle($settled);
$draftedOmitted['drafts']['overview'] = [
    'label' => 'Priority Support', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'monthly',
];
$settledOmitted = Schema::settleTierSlot($draftedOmitted);
check_audience_groups(
    $settledOmitted['current_occupant']['audience_groups'] === ['personal_business', 'enterprise'],
    'omitting the field from the draft preserves the settled occupant\'s existing value',
);

echo "Tier occupant audience-groups checks passed.\n";
