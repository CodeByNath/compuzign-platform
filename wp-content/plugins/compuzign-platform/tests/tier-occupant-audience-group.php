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

function check_audience_group(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier occupant audience group: ' . $message);
    }
}

$legacy = Schema::normaliseTierSlot([
    'label' => 'Legacy', 'billing_cycle' => 'monthly', 'inclusions_override' => [],
    'features' => [], 'faq_refs' => [], 'enabled' => true,
]);
check_audience_group($legacy['audience_group'] === 'personal_business', 'legacy occupants default safely');

$enterprise = Schema::commitTierLifecycle(Schema::upsertOccupant([], [
    'label' => 'Enterprise', 'billing_cycle' => 'monthly', 'audience_group' => 'enterprise',
], true));
check_audience_group($enterprise['current_occupant']['audience_group'] === 'enterprise', 'the occupant stores its grouping');
check_audience_group(Schema::normaliseTierSlot($enterprise)['audience_group'] === 'enterprise', 'detail exposes the occupant grouping');
check_audience_group(Schema::extractTierForCostBuilder($enterprise)['audience_group'] === 'enterprise', 'the public Tier projection exposes the occupant grouping');

$enterprise['current_occupant']['tier_editions'] = [[
    'id' => 'edt_1', 'title' => 'Annual', 'platform_status' => 'active',
    'billing_cycle' => 'annually', 'inclusions_override' => [],
]];
$public = Schema::extractTierForCostBuilder($enterprise);
check_audience_group($public['audience_group'] === 'enterprise', 'adding an Edition never changes the parent grouping');
check_audience_group(!array_key_exists('audience_group', $public['edition_options'][0]), 'Editions carry no independent grouping field');

$drafted = Schema::ensureTierLifecycle($enterprise);
$drafted['drafts']['overview'] = [
    'label' => 'Enterprise', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'monthly', 'audience_group' => 'personal_business',
];
$settled = Schema::settleTierSlot($drafted);
check_audience_group($settled['current_occupant']['audience_group'] === 'personal_business', 'Overview settle commits the draft-preferred grouping');
check_audience_group(count($settled['current_occupant']['tier_editions']) === 1, 'changing grouping preserves nested Editions');

$invalid = Schema::upsertOccupant($settled, [
    'label' => 'Enterprise', 'billing_cycle' => 'monthly', 'audience_group' => 'invented',
], true);
check_audience_group($invalid['current_occupant']['audience_group'] === 'personal_business', 'unknown values use the compatibility default');

echo "Tier occupant audience-group checks passed.\n";
