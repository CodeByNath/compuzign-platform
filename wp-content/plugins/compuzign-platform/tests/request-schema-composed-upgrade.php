<?php

declare(strict_types=1);

// Focused contract for RequestSchema::sanitizeItems' Upgrade Journey
// Finalisation handling. The reviewed design's core safety property: a
// finalised composed ("Build Your Own") item carries two authoritative peer
// children (composedBase/composedUpgrade), and the top-level
// inclusionItems/legPaymentSummaries/price/billingCycle/minimumTermValue/
// minimumTermUnit/planDurationMonths projection is ALWAYS server-derived
// from those already-sanitised children — never trusted from the client.
// Proves that a payload whose top-level projection deliberately disagrees
// with its own composedBase/composedUpgrade is persisted using the DERIVED
// values, never the submitted ones (the actual security-regression lock);
// that a composed item with a missing/invalid child is dropped entirely
// (fail closed); and that a normal (non-composed) family_tier item is
// completely unaffected.

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Support\RequestSchema;

function check_request_schema_composed_upgrade(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Request schema composed upgrade: ' . $message);
    }
}

$composedBase = [
    'tierOccupantId' => 'occ_basic', 'tierPlatformId' => 'CZT-BASIC01', 'tierEditionPlatformId' => null,
    'tierId' => 'basic', 'tierTitle' => 'Starter Cloud', 'tierEditionTitle' => null,
    'inclusionItems' => [['id' => 'shared-item', 'label' => 'Storage', 'quantity' => 10]],
    'legPaymentSummaries' => [[
        'source' => 'base-leg', 'billingCycle' => 'monthly', 'price' => 150.0,
        'startMonth' => 0, 'endMonth' => 12, 'isOngoing' => false,
        'occurrenceMonths' => [0, 1], 'subtotal' => 1800.0,
    ]],
    'price' => 150.0, 'billingCycle' => 'monthly',
    'minimumTermValue' => 12, 'minimumTermUnit' => 'months', 'planDurationMonths' => 12,
];
$composedUpgrade = [
    'tierOccupantId' => 'occ_composable', 'tierPlatformId' => 'CZT-COMPOSABLE01',
    'inclusionItems' => [['id' => 'shared-item', 'label' => 'Storage', 'quantity' => 5]],
    'legPaymentSummaries' => [[
        'source' => 'upgrade-leg', 'billingCycle' => 'monthly', 'price' => 50.0,
        'startMonth' => 0, 'endMonth' => 12, 'isOngoing' => false,
        'occurrenceMonths' => [0, 1], 'subtotal' => 600.0,
    ]],
    'price' => 50.0, 'billingCycle' => 'monthly',
    'minimumTermValue' => null, 'minimumTermUnit' => null,
];

$baseFamilyFields = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS01', 'familyTitle' => 'KAIROS',
    'tierInstanceId' => 'ti_kairos', 'tierInstancePlatformId' => 'CZTG-KAIROS01',
    'tierOccupantId' => 'occ_composable', 'tierPlatformId' => 'CZT-COMPOSABLE01', 'tierEditionPlatformId' => null,
    'tierId' => 'composable', 'tierTitle' => 'Build Your Own',
    'features' => [], 'isAddon' => false, 'isComposable' => true,
];

$rawItems = [
    // 0: a legitimate finalised composed item — top-level projection fields
    // match what the client's own honest deriveComposedProjection() would
    // have produced.
    $baseFamilyFields + [
        'isComposedUpgrade' => true,
        'composedBase' => $composedBase,
        'composedUpgrade' => $composedUpgrade,
        'price' => 150.0, 'billingCycle' => 'monthly',
        'minimumTermValue' => 12, 'minimumTermUnit' => 'months',
        'inclusionItems' => [
            ['id' => 'shared-item', 'label' => 'Storage', 'quantity' => 10],
            ['id' => 'shared-item', 'label' => 'Storage', 'quantity' => 5],
        ],
        'legPaymentSummaries' => [$composedBase['legPaymentSummaries'][0], $composedUpgrade['legPaymentSummaries'][0]],
    ],
    // 1: MALICIOUS/mismatched payload — composedBase/composedUpgrade are the
    // same honest children as item 0, but the top-level projection lies
    // (a wildly different price, and an empty inclusionItems list). The
    // stored record must reflect the DERIVED projection, never this one.
    array_merge($baseFamilyFields, [
        'familyId' => 'pcg_omnia', 'familyPlatformId' => 'CZPG-OMNIA01', 'familyTitle' => 'OMNIA',
        'tierInstanceId' => 'ti_omnia', 'tierInstancePlatformId' => 'CZTG-OMNIA01',
        'isComposedUpgrade' => true,
        'composedBase' => $composedBase,
        'composedUpgrade' => $composedUpgrade,
        'price' => 1.0,
        'billingCycle' => 'once',
        'minimumTermValue' => 1,
        'minimumTermUnit' => 'days',
        'inclusionItems' => [],
        'legPaymentSummaries' => [],
    ]),
    // 2: isComposedUpgrade true but composedBase is missing entirely — fail
    // closed, the whole item must be dropped.
    array_merge($baseFamilyFields, [
        'familyId' => 'pcg_aptos', 'familyPlatformId' => 'CZPG-APTOS01', 'familyTitle' => 'APTOS',
        'tierInstanceId' => 'ti_aptos', 'tierInstancePlatformId' => 'CZTG-APTOS01',
        'isComposedUpgrade' => true,
        'composedUpgrade' => $composedUpgrade,
    ]),
    // 3: isComposedUpgrade true but composedUpgrade is invalid (missing its
    // own required identity) — fail closed, dropped.
    array_merge($baseFamilyFields, [
        'familyId' => 'pcg_aptos2', 'familyPlatformId' => 'CZPG-APTOS02', 'familyTitle' => 'APTOS',
        'tierInstanceId' => 'ti_aptos2', 'tierInstancePlatformId' => 'CZTG-APTOS02',
        'isComposedUpgrade' => true,
        'composedBase' => $composedBase,
        'composedUpgrade' => ['tierOccupantId' => '', 'tierPlatformId' => ''],
    ]),
    // 4: a normal, non-composed family_tier primary line — completely
    // unaffected by any of the above.
    [
        'offer_type' => 'family_tier',
        'familyId' => 'pcg_ultra', 'familyPlatformId' => 'CZPG-ULTRA01', 'familyTitle' => 'ULTRA',
        'tierInstanceId' => 'ti_ultra', 'tierInstancePlatformId' => 'CZTG-ULTRA01',
        'tierOccupantId' => 'occ_ultra', 'tierPlatformId' => 'CZT-ULTRA01', 'tierEditionPlatformId' => null,
        'tierId' => 'ultimate', 'tierTitle' => 'Ultra Plan',
        'price' => 999.0, 'billingCycle' => 'monthly', 'features' => [], 'isAddon' => false,
    ],
];

$items = RequestSchema::sanitizeItems($rawItems);

check_request_schema_composed_upgrade(count($items) === 3, 'the two invalid composed payloads (missing/invalid child) are dropped; the legitimate composed item and the untouched normal item survive');

// ── Item 0: legitimate composed item ─────────────────────────────────────
$legit = $items[0];
check_request_schema_composed_upgrade($legit['isComposedUpgrade'] === true, 'a legitimate composed item sanitises isComposedUpgrade to true');
check_request_schema_composed_upgrade($legit['composedBase']['tierPlatformId'] === 'CZT-BASIC01', 'composedBase persists with its own exact identity');
check_request_schema_composed_upgrade($legit['composedUpgrade']['tierPlatformId'] === 'CZT-COMPOSABLE01', 'composedUpgrade persists with its own exact identity');
check_request_schema_composed_upgrade(count($legit['inclusionItems']) === 2, 'top-level inclusionItems is the derived concatenation of both children — no dedup on the shared item_id');
check_request_schema_composed_upgrade($legit['inclusionItems'][0]['provenance'] === 'base', 'the first derived inclusion entry is tagged base');
check_request_schema_composed_upgrade($legit['inclusionItems'][1]['provenance'] === 'upgrade', 'the second derived inclusion entry is tagged upgrade');
check_request_schema_composed_upgrade(count($legit['legPaymentSummaries']) === 2, 'top-level legPaymentSummaries is the derived concatenation of both children');
check_request_schema_composed_upgrade($legit['price'] === 150.0, 'top-level price is derived from composedBase');
check_request_schema_composed_upgrade($legit['minimumTermValue'] === 12.0, 'top-level commitment is derived from composedBase, never composedUpgrade');

// ── Item 1: THE security-regression lock ─────────────────────────────────
$tampered = $items[1];
check_request_schema_composed_upgrade($tampered['price'] === 150.0, 'a mismatched client-submitted top-level price is discarded — the STORED price is the derived one, never the submitted 1.0');
check_request_schema_composed_upgrade($tampered['billingCycle'] === 'monthly', 'a mismatched client-submitted billingCycle is discarded in favour of the derived value');
check_request_schema_composed_upgrade(count($tampered['inclusionItems']) === 2, 'a client-submitted empty inclusionItems array is discarded — the stored value is still the full derived projection');
check_request_schema_composed_upgrade($tampered['minimumTermValue'] === 12.0, 'a mismatched client-submitted commitment is discarded in favour of the derived (base-governed) value');

// ── Fail-closed cases ─────────────────────────────────────────────────────
check_request_schema_composed_upgrade(
    !in_array('pcg_aptos', array_column($items, 'familyId'), true),
    'a composed item with no composedBase at all is dropped entirely, not persisted with an empty/guessed base'
);
check_request_schema_composed_upgrade(
    !in_array('pcg_aptos2', array_column($items, 'familyId'), true),
    'a composed item with an invalid composedUpgrade (missing required identity) is dropped entirely'
);

// ── Item 4 (now items[2] after drops): a normal item is untouched ────────
$normal = $items[2];
check_request_schema_composed_upgrade($normal['isComposedUpgrade'] === false, 'a normal family_tier item defaults isComposedUpgrade to false');
check_request_schema_composed_upgrade(!array_key_exists('composedBase', $normal), 'a normal item never carries composedBase');
check_request_schema_composed_upgrade(!array_key_exists('composedUpgrade', $normal), 'a normal item never carries composedUpgrade');
check_request_schema_composed_upgrade($normal['price'] === 999.0, 'a normal item\'s own submitted price is sanitised and kept exactly as before this feature existed');

// ── restArgs() schema declares the new fields ────────────────────────────
$args = RequestSchema::restArgs();
$properties = $args['items']['items']['properties'];
check_request_schema_composed_upgrade(isset($properties['isComposedUpgrade']), 'restArgs() declares isComposedUpgrade');
check_request_schema_composed_upgrade(isset($properties['composedBase']), 'restArgs() declares composedBase');
check_request_schema_composed_upgrade(isset($properties['composedUpgrade']), 'restArgs() declares composedUpgrade');

echo "Request schema composed upgrade checks passed.\n";
