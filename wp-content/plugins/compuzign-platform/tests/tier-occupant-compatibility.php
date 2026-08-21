<?php

declare(strict_types=1);

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

// PackageSchema resolves an occupant's Rate Sheet identity via
// PackageManagerSchema::PRIMARY_RATE_SHEET_ID (the migrated singleton default).
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageManagerSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageStationSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageSchema.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;

function check_tier_occupant(bool $condition, string $message): void
{
    if (!$condition) { throw new RuntimeException('Tier occupant compatibility: ' . $message); }
}

$legacyBasic = [
    'label' => 'Starter Cloud', 'ideal_for' => 'Small workloads',
    'price' => 36.0, 'contact' => false, 'billing_cycle' => 'monthly',
    'rate_sheet_items' => [['item_id' => 'rate-vm', 'quantity' => 2]],
    'inclusions_override' => [], 'features' => [], 'faq_refs' => [], 'enabled' => true,
];

$ensured = Schema::ensureTierLifecycle($legacyBasic);
check_tier_occupant(
    array_unique(array_values($ensured['module_status'])) === ['settled'],
    'configured flat Basic tier is presented as settled, not not-configured'
);

$ensured['drafts']['overview'] = [
    'label' => 'Starter Cloud Updated', 'ideal_for' => 'Small workloads',
    'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
];
$ensured['module_status']['overview'] = 'pending';
$settled = Schema::settleTierSlot($ensured);
$detail = Schema::normaliseTierSlot($settled);
check_tier_occupant(Schema::isOccupantFormat($settled), 'publishing migrates a flat tier into an occupant envelope');
check_tier_occupant(
    is_string($detail['occupant_id'] ?? null) && str_starts_with($detail['occupant_id'], 'occ_'),
    'normalised Admin detail exposes the stored occupant id'
);
check_tier_occupant(
    $detail['occupant_id'] === $settled['current_occupant']['id'],
    'exposed occupant id is the stable stored identity'
);
check_tier_occupant($detail['label'] === 'Starter Cloud Updated', 'overview draft wins during flat migration');
check_tier_occupant($detail['rate_sheet_items'] === [['item_id' => 'rate-vm', 'quantity' => 2, 'price_option_id' => null, 'leg_index' => null]], 'untouched Rate Sheet selections survive flat migration');
check_tier_occupant(array_unique(array_values($settled['module_status'])) === ['settled'], 'publish settles every module exactly once');

// Refinement 4 — the occupant stores its bound Rate Sheet, and switching sheets
// clears its selections so A's rows never carry into B.
$bound = Schema::upsertOccupant([], [
    'label' => 'Bound', 'rate_sheet_id' => 'rs_a',
    'rate_sheet_items' => [['item_id' => 'rate-vm', 'quantity' => 2]],
], true);
check_tier_occupant($bound['current_occupant']['rate_sheet_id'] === 'rs_a', 'a first-configured occupant keeps its incoming rate_sheet_id and selections');
check_tier_occupant($bound['current_occupant']['rate_sheet_items'] === [['item_id' => 'rate-vm', 'quantity' => 2, 'price_option_id' => null, 'leg_index' => null]], 'first configuration keeps the incoming selections');

$switched = Schema::upsertOccupant($bound, [
    'label' => 'Bound', 'rate_sheet_id' => 'rs_b',
    'rate_sheet_items' => [['item_id' => 'rate-vm', 'quantity' => 2]],
], true);
check_tier_occupant($switched['current_occupant']['rate_sheet_id'] === 'rs_b', 'switching re-binds the occupant to the new sheet');
check_tier_occupant($switched['current_occupant']['rate_sheet_items'] === [], 'switching an already-bound occupant clears its selections');
check_tier_occupant($switched['current_occupant']['id'] === $bound['current_occupant']['id'], 'switching preserves the stable occupant id');

$kept = Schema::upsertOccupant($bound, [
    'label' => 'Bound', 'rate_sheet_id' => 'rs_a',
    'rate_sheet_items' => [['item_id' => 'rate-vm', 'quantity' => 5]],
], true);
check_tier_occupant($kept['current_occupant']['rate_sheet_items'] === [['item_id' => 'rate-vm', 'quantity' => 5, 'price_option_id' => null, 'leg_index' => null]], 'editing selections without switching keeps them');

echo "Tier occupant compatibility checks passed.\n";
