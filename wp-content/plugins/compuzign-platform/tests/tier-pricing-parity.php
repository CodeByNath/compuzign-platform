<?php

require_once dirname(__DIR__) . '/src/Modules/SurfacePackages/Support/PackageStationSchema.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageStationSchema as Schema;

$fixture = json_decode((string) file_get_contents(__DIR__ . '/fixtures/tier-pricing-parity.json'), true, 512, JSON_THROW_ON_ERROR);

foreach ($fixture['cases'] as $case) {
    $result = Schema::evaluateTierPricing($fixture['rate_sheet_items'], $case['selections'], $case['contact']);
    $actual = [
        'total' => $result['total'],
        'resolved_subtotal' => $result['resolved_subtotal'],
        'complete' => $result['complete'],
        'issues' => $result['unresolved'],
    ];
    if (json_encode($actual) !== json_encode($case['expected'])) {
        throw new RuntimeException("PHP Tier pricing parity failed: {$case['name']}\n" . json_encode($actual));
    }
    if ($result['total'] !== null && !$result['complete']) {
        throw new RuntimeException("PHP Tier pricing invariant failed: {$case['name']}");
    }
    if ($result['mode'] === 'contact' && $result['total'] !== null) {
        throw new RuntimeException("PHP contact pricing invariant failed: {$case['name']}");
    }
}

fwrite(STDOUT, "PHP Tier pricing parity fixtures passed.\n");
