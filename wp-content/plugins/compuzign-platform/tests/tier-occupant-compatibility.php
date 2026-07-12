<?php

declare(strict_types=1);

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

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
check_tier_occupant($detail['label'] === 'Starter Cloud Updated', 'overview draft wins during flat migration');
check_tier_occupant($detail['rate_sheet_items'] === [['item_id' => 'rate-vm', 'quantity' => 2]], 'untouched Rate Sheet selections survive flat migration');
check_tier_occupant(array_unique(array_values($settled['module_status'])) === ['settled'], 'publish settles every module exactly once');

echo "Tier occupant compatibility checks passed.\n";
