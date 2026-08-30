<?php

declare(strict_types=1);

// Focused contract for RequestSchema::sanitizeItems' Family quote snapshot
// preservation (Phase 8J-A): the browser submits the final CartItem[], but
// the sanitiser was rebuilding Family items from an older whitelist and
// dropping tierEditionTitle/legPaymentSummaries/inclusionItems — fields the
// accepted customer cart/review/proposal/email surfaces already read (see
// FamilyTierAdapter.tsx's itemFor(), OrderSummary.tsx, QuoteProposalPreview.tsx,
// QuoteDetailsOverlay.tsx). This proves a representative Family quote line
// survives the PHP boundary with Edition label, multi-stream Leg summaries,
// ordinary inclusion quantity, Bundle parent/children, Bundle-child quantity,
// add-on marker, and existing identity fields intact — and that unknown
// nested fields are not blindly retained.

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Support\RequestSchema;

function check_request_schema_family_snapshot(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Request schema family quote snapshot: ' . $message);
    }
}

$rawItems = [
    // A representative Family Tier quote line with a selected Edition, a
    // multi-stream Leg payment summary, and a mixed inclusion list (an
    // ordinary quantified inclusion plus a Bundle parent/children).
    [
        'offer_type' => 'family_tier',
        'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS01', 'familyTitle' => 'KAIROS',
        'tierInstanceId' => 'ti_kairos', 'tierInstancePlatformId' => 'CZTG-KAIROS01',
        'tierOccupantId' => 'occ_enterprise', 'tierPlatformId' => 'CZT-KAIROS001',
        'tierEditionPlatformId' => 'CZTE-KAIROS001', 'tierEditionTitle' => 'Annual',
        'tierId' => 'enterprise', 'tierTitle' => 'KAIROS Enterprise',
        'price' => 490, 'billingCycle' => 'annually', 'isAddon' => false,
        'inclusionItems' => [
            ['id' => 'itm_seats', 'label' => 'User Seats', 'quantity' => 25, 'evil_field' => '<script>xss</script>'],
            [
                'id' => 'itm_bundle', 'label' => 'Security Bundle', 'bundle_id' => 'bnd_security',
                'includes' => [
                    ['id' => 'itm_child_a', 'label' => 'Endpoint Protection', 'quantity' => 25],
                    ['id' => 'itm_child_b', 'label' => 'SIEM Monitoring'],
                ],
            ],
        ],
        'legPaymentSummaries' => [
            [
                'source' => 'leg_upfront', 'billingCycle' => 'one-time', 'price' => 5000,
                'startMonth' => 0, 'endMonth' => 0, 'isOngoing' => false,
                'occurrenceMonths' => [0], 'subtotal' => 5000,
            ],
            [
                'source' => 'leg_recurring', 'billingCycle' => 'monthly', 'price' => 490,
                'startMonth' => 0, 'endMonth' => null, 'isOngoing' => true,
                'occurrenceMonths' => [], 'subtotal' => null,
            ],
        ],
    ],
    // A pre-Phase-5/8G Family line predating these capabilities entirely —
    // none of the new keys present at all.
    [
        'offer_type' => 'family_tier',
        'familyId' => 'pcg_omnia', 'familyPlatformId' => 'CZPG-OMNIA01', 'familyTitle' => 'OMNIA',
        'tierInstanceId' => 'ti_omnia', 'tierInstancePlatformId' => 'CZTG-OMNIA01',
        'tierOccupantId' => 'occ_basic', 'tierPlatformId' => 'CZT-OMNIA001', 'tierEditionPlatformId' => null,
        'tierId' => 'basic', 'tierTitle' => 'OMNIA Basic', 'price' => 15, 'isAddon' => false,
    ],
];

$items = RequestSchema::sanitizeItems($rawItems);

check_request_schema_family_snapshot(count($items) === 2, 'both submitted Family lines survive sanitisation');

$item = $items[0];

// Existing identity fields are untouched by this phase.
check_request_schema_family_snapshot($item['familyId'] === 'pcg_kairos', 'Family native identity survives');
check_request_schema_family_snapshot($item['familyPlatformId'] === 'CZPG-KAIROS01', 'Family Platform ID survives');
check_request_schema_family_snapshot($item['tierInstancePlatformId'] === 'CZTG-KAIROS01', 'Tier Instance Platform ID survives');
check_request_schema_family_snapshot($item['tierPlatformId'] === 'CZT-KAIROS001', 'Tier Platform ID survives');
check_request_schema_family_snapshot($item['tierEditionPlatformId'] === 'CZTE-KAIROS001', 'Tier Edition Platform ID survives');
check_request_schema_family_snapshot($item['isAddon'] === false, 'add-on marker survives');

// Edition label.
check_request_schema_family_snapshot($item['tierEditionTitle'] === 'Annual', 'tierEditionTitle survives sanitisation');

// Leg payment summaries — every field on the TS LegPaymentSummary type.
check_request_schema_family_snapshot(count($item['legPaymentSummaries']) === 2, 'both Leg streams survive');
$upfront = $item['legPaymentSummaries'][0];
check_request_schema_family_snapshot($upfront['source'] === 'leg_upfront', 'stream source survives');
check_request_schema_family_snapshot($upfront['billingCycle'] === 'one-time', 'stream billingCycle survives');
check_request_schema_family_snapshot($upfront['price'] === 5000.0, 'stream price sanitises to a float');
check_request_schema_family_snapshot($upfront['startMonth'] === 0, 'stream startMonth survives');
check_request_schema_family_snapshot($upfront['endMonth'] === 0, 'a finite stream endMonth survives (not conflated with null/open-ended)');
check_request_schema_family_snapshot($upfront['isOngoing'] === false, 'stream isOngoing survives');
check_request_schema_family_snapshot($upfront['occurrenceMonths'] === [0], 'stream occurrenceMonths survives');
check_request_schema_family_snapshot($upfront['subtotal'] === 5000.0, 'stream subtotal survives');
$recurring = $item['legPaymentSummaries'][1];
check_request_schema_family_snapshot($recurring['endMonth'] === null, 'an open-ended stream keeps endMonth null');
check_request_schema_family_snapshot($recurring['isOngoing'] === true, 'an ongoing stream keeps isOngoing true');
check_request_schema_family_snapshot($recurring['subtotal'] === null, 'an ongoing stream keeps subtotal null, never approximated');

// Inclusion items — ordinary quantity, Bundle parent/children, Bundle-child quantity.
check_request_schema_family_snapshot(count($item['inclusionItems']) === 2, 'both top-level inclusion rows survive');
$seats = $item['inclusionItems'][0];
check_request_schema_family_snapshot($seats['id'] === 'itm_seats', 'ordinary inclusion id survives');
check_request_schema_family_snapshot($seats['quantity'] === 25, 'ordinary inclusion quantity survives');
check_request_schema_family_snapshot(!array_key_exists('evil_field', $seats), 'unknown nested fields are not blindly retained');
$bundle = $item['inclusionItems'][1];
check_request_schema_family_snapshot($bundle['bundle_id'] === 'bnd_security', 'Bundle parent bundle_id survives');
check_request_schema_family_snapshot(!array_key_exists('quantity', $bundle), 'a Bundle parent stays quantity-less, matching the accepted display contract');
check_request_schema_family_snapshot(count($bundle['includes']) === 2, 'both Bundle children survive');
check_request_schema_family_snapshot($bundle['includes'][0]['quantity'] === 25, 'a Bundle child keeps its own quantity');
check_request_schema_family_snapshot(!array_key_exists('quantity', $bundle['includes'][1]), 'a Bundle child with no quantity stays absent, not coerced to zero');

// A legacy line predating these fields defaults every new key to null, never
// an empty array masquerading as "no data was ever configured".
$legacy = $items[1];
check_request_schema_family_snapshot($legacy['tierEditionTitle'] === null, 'a legacy line with no tierEditionTitle defaults to null');
check_request_schema_family_snapshot($legacy['inclusionItems'] === null, 'a legacy line with no inclusionItems defaults to null, not []');
check_request_schema_family_snapshot($legacy['legPaymentSummaries'] === null, 'a legacy line with no legPaymentSummaries defaults to null, not []');

// ── restArgs() schema carries the new fields ─────────────────────────────────

$args = RequestSchema::restArgs();
$properties = $args['items']['items']['properties'];
check_request_schema_family_snapshot(
    isset($properties['tierEditionTitle'], $properties['inclusionItems'], $properties['legPaymentSummaries']),
    'restArgs() declares all three new cart-item fields'
);

echo "Request schema family quote snapshot checks passed.\n";
