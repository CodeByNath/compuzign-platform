<?php

declare(strict_types=1);

// Focused contract for Phase 8J-C2's correction round: RequestSchema must
// preserve the legacy Service short description / recommended-Bundle
// description the browser captures at submission time (see
// QuoteCartFlow.tsx's withSubmissionDescriptions()) — the secure quote-view
// reload page has no live catalog access, so this is the only way that
// optional text can survive to be rendered again.

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Support\RequestSchema;

function check_legacy_snapshot_description(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Request schema legacy snapshot description: ' . $message);
    }
}

$rawItems = [
    // A normal Service line carrying a captured short description.
    ['serviceId' => 101, 'serviceTitle' => 'KAIROS', 'tierId' => 'standard', 'tierTitle' => 'Standard', 'price' => 49, 'serviceDescription' => 'Round-the-clock monitoring for your core infrastructure.'],
    // The legacy recommended bundle (negative serviceId) carrying a captured bundle description.
    ['serviceId' => -101, 'serviceTitle' => 'Bundle', 'tierId' => 'bundle', 'tierTitle' => 'Bundle', 'price' => 30, 'bundleDescription' => 'Save 15% when bundled with KAIROS Standard.'],
    // A legacy line predating this capability — neither key present.
    ['serviceId' => 102, 'serviceTitle' => 'APTOS', 'tierId' => 'basic', 'tierTitle' => 'Basic', 'price' => 10],
    // A tampered/malformed payload — non-string, empty-string, and a raw HTML tag to prove sanitisation runs.
    ['serviceId' => 103, 'serviceTitle' => 'OMNIA', 'tierId' => 'basic', 'tierTitle' => 'Basic', 'price' => 5, 'serviceDescription' => '<script>alert(1)</script>Trusted advisor', 'bundleDescription' => ''],
    // A Family line — must never acquire either field.
    [
        'offer_type' => 'family_tier', 'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS01', 'familyTitle' => 'KAIROS',
        'tierInstanceId' => 'ti_kairos', 'tierInstancePlatformId' => 'CZTG-KAIROS01',
        'tierOccupantId' => 'occ_basic', 'tierPlatformId' => 'CZT-KAIROS001', 'tierEditionPlatformId' => null,
        'tierId' => 'basic', 'tierTitle' => 'KAIROS Basic', 'price' => 11, 'isAddon' => false,
        'serviceDescription' => 'should never appear on a Family item',
    ],
];

$items = RequestSchema::sanitizeItems($rawItems);

check_legacy_snapshot_description(count($items) === 5, 'all five submitted lines survive sanitisation');

check_legacy_snapshot_description($items[0]['serviceDescription'] === 'Round-the-clock monitoring for your core infrastructure.', 'a captured Service description survives sanitisation');
check_legacy_snapshot_description($items[0]['bundleDescription'] === null, 'a Service line with no captured bundle description defaults to null');

check_legacy_snapshot_description($items[1]['bundleDescription'] === 'Save 15% when bundled with KAIROS Standard.', 'a captured Bundle description survives sanitisation on the legacy bundle line');
check_legacy_snapshot_description($items[1]['serviceDescription'] === null, 'the legacy bundle line with no captured service description defaults to null');

check_legacy_snapshot_description($items[2]['serviceDescription'] === null, 'a pre-Phase-8J-C2 line with neither key present defaults serviceDescription to null');
check_legacy_snapshot_description($items[2]['bundleDescription'] === null, 'a pre-Phase-8J-C2 line with neither key present defaults bundleDescription to null');

check_legacy_snapshot_description(!str_contains((string) $items[3]['serviceDescription'], '<script>'), 'a malicious serviceDescription is stripped of tags');
check_legacy_snapshot_description(str_contains((string) $items[3]['serviceDescription'], 'Trusted advisor'), 'the sanitised text content still survives');
check_legacy_snapshot_description($items[3]['bundleDescription'] === null, 'an empty-string bundleDescription sanitises to null, not an empty string');

check_legacy_snapshot_description(!array_key_exists('serviceDescription', $items[4]), 'a Family line never acquires serviceDescription');
check_legacy_snapshot_description(!array_key_exists('bundleDescription', $items[4]), 'a Family line never acquires bundleDescription');

// ── restArgs() schema carries the new fields ─────────────────────────────
$args = RequestSchema::restArgs();
check_legacy_snapshot_description(
    isset($args['items']['items']['properties']['serviceDescription'], $args['items']['items']['properties']['bundleDescription']),
    'restArgs() declares both new legacy snapshot description fields'
);

echo "Request schema legacy snapshot description checks passed.\n";
