<?php

declare(strict_types=1);

if (!function_exists('esc_html')) {
    function esc_html(mixed $value): string { return htmlspecialchars((string) $value, ENT_QUOTES); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Notifications\NotificationTemplates;

$items = [[
    'offer_type' => 'family_tier',
    'familyTitle' => 'KAIROS',
    'familyPlatformId' => 'CZPG-KAIROS01',
    'tierInstancePlatformId' => 'CZTG-KAIROS01',
    'tierTitle' => 'KAIROS Basic',
    'tierPlatformId' => 'CZT-KAIROS001',
    'tierEditionPlatformId' => 'CZTE-KAIROS01',
    'price' => 100,
    'billingCycle' => 'monthly',
    'isAddon' => false,
]];

$html = NotificationTemplates::emailServiceRows($items);
foreach (['KAIROS', 'CZPG-KAIROS01', 'CZTG-KAIROS01', 'CZT-KAIROS001', 'CZTE-KAIROS01'] as $expected) {
    if (!str_contains($html, $expected)) {
        throw new RuntimeException("Package Family notification omitted {$expected}");
    }
}
if (str_contains($html, 'serviceId')) {
    throw new RuntimeException('Package Family notification depends on a Service identity.');
}

echo "Package Family notification checks passed.\n";
