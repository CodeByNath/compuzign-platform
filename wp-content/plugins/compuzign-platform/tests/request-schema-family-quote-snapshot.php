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
        // Live-gate correction (2026-09-05, "preserve period/leg inclusion
        // attribution"): the additive breakdown behind legPaymentSummaries
        // above — the exact "Starter Cloud" reported shape (a Yearly $80
        // charge beginning Month 11, explained as Static IP Block qty 2 x
        // $40), plus a Bundle parent/child pair and an unknown nested field
        // to prove the same allow-list discipline as inclusionItems above.
        'commercialBreakdown' => [
            [
                'fromMonth' => 0, 'toMonth' => 10,
                'components' => [
                    [
                        'source' => 'leg_default', 'billingCycle' => 'monthly', 'price' => 490,
                        'inclusions' => [
                            ['id' => 'itm_seats', 'label' => 'User Seats', 'quantity' => 25, 'unitPrice' => 19.6, 'lineTotal' => 490, 'evil_field' => '<script>xss</script>'],
                        ],
                    ],
                ],
            ],
            [
                'fromMonth' => 11, 'toMonth' => null,
                'components' => [
                    [
                        'source' => 'leg_default', 'billingCycle' => 'monthly', 'price' => 490,
                        // Auditor correction (2026-09-05, "leg-level
                        // breakdown presentation customer view"): identical
                        // to Month 0-10's own leg_default component above —
                        // the browser captured continuesFromPrevious: true
                        // at Add-to-Quote time; this must persist verbatim.
                        'continuesFromPrevious' => true,
                        'inclusions' => [
                            ['id' => 'itm_seats', 'label' => 'User Seats', 'quantity' => 25, 'unitPrice' => 19.6, 'lineTotal' => 490],
                        ],
                    ],
                    [
                        'source' => 'leg_static_ip', 'billingCycle' => 'annually', 'price' => 80,
                        'inclusions' => [
                            ['id' => 'itm_static_ip', 'label' => 'Static IP Block (8 IPs, 5 usable)', 'quantity' => 2, 'unitPrice' => 40, 'lineTotal' => 80],
                        ],
                    ],
                    [
                        'source' => 'leg_bundle', 'billingCycle' => 'monthly', 'price' => 0,
                        'inclusions' => [
                            [
                                'id' => 'itm_bundle', 'label' => 'Security Bundle', 'quantity' => 0, 'unitPrice' => null, 'lineTotal' => null,
                                'includes' => [
                                    ['id' => 'itm_child_a', 'label' => 'Endpoint Protection', 'quantity' => 25, 'unitPrice' => null, 'lineTotal' => null],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ],
        // Auditor correction (2026-09-05, "leg-level breakdown presentation
        // customer view"): the cart quick-view's own compact shape,
        // captured alongside commercialBreakdown above — a real-looking
        // source still present in the raw payload (simulating an
        // unmodified/malicious client), to prove it never survives here
        // either, plus an unknown nested field to prove the same
        // allow-list discipline.
        'cartBreakdown' => [
            'baseInclusions' => [
                ['id' => 'itm_seats', 'label' => 'User Seats', 'quantity' => 25, 'unitPrice' => 19.6, 'lineTotal' => 490, 'evil_field' => '<script>xss</script>'],
            ],
            'extensionGroups' => [
                [
                    'billingCycle' => 'annually', 'price' => 80, 'heading' => 'Extensions billed Annually',
                    'inclusions' => [
                        ['id' => 'itm_static_ip', 'label' => 'Static IP Block (8 IPs, 5 usable)', 'quantity' => 2, 'unitPrice' => 40, 'lineTotal' => 80],
                    ],
                ],
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

// Commercial breakdown — the "Starter Cloud" reported shape: both Periods
// survive, the Month-11-onward Period carries THREE components (the
// continuing base Leg, the new Static IP Block Leg, and the Bundle Leg),
// each with its own inclusions, unknown nested fields stripped, and the
// Bundle parent/child pair preserved exactly like inclusionItems above.
check_request_schema_family_snapshot(count($item['commercialBreakdown']) === 2, 'both Periods survive');
$firstPeriod = $item['commercialBreakdown'][0];
check_request_schema_family_snapshot($firstPeriod['fromMonth'] === 0 && $firstPeriod['toMonth'] === 10, 'first Period from/to months survive');
check_request_schema_family_snapshot(count($firstPeriod['components']) === 1, 'first Period has exactly one component');
$secondPeriod = $item['commercialBreakdown'][1];
check_request_schema_family_snapshot($secondPeriod['fromMonth'] === 11 && $secondPeriod['toMonth'] === null, 'second Period from/to months survive, open-ended toMonth stays null');
check_request_schema_family_snapshot(count($secondPeriod['components']) === 3, 'the Month-11 Period keeps all three of its own components — never deduplicated by source the way legPaymentSummaries is');

$continuingComponent = $secondPeriod['components'][0];
check_request_schema_family_snapshot($continuingComponent['continuesFromPrevious'] === true, 'continuesFromPrevious survives verbatim, computed once by the browser at capture time');
check_request_schema_family_snapshot($firstPeriod['components'][0]['continuesFromPrevious'] === false, 'a component with no continuesFromPrevious sent defaults to false, never true by omission');

$staticIpComponent = $secondPeriod['components'][1];
// Auditor correction (2026-09-05, "leg-level breakdown presentation"): the
// raw payload above still sends 'source' => 'leg_static_ip' (simulating an
// unmodified/malicious client) — it must never survive into the durable
// snapshot RequestsController::getQuote() returns verbatim to the customer.
check_request_schema_family_snapshot(!array_key_exists('source', $staticIpComponent), 'the component\'s internal Leg Platform ID (source) does NOT survive into the customer-visible snapshot');
check_request_schema_family_snapshot($staticIpComponent['billingCycle'] === 'annually', 'the Static IP Block component\'s billing cadence survives');
$staticIpInclusion = $staticIpComponent['inclusions'][0];
check_request_schema_family_snapshot(!array_key_exists('id', $staticIpInclusion), 'the inclusion\'s internal Rate Sheet item key (id) does NOT survive into the customer-visible snapshot');
check_request_schema_family_snapshot($staticIpInclusion['label'] === 'Static IP Block (8 IPs, 5 usable)', 'the exact reported inclusion label survives');
check_request_schema_family_snapshot($staticIpInclusion['quantity'] === 2, 'the exact reported quantity (2) survives');
check_request_schema_family_snapshot($staticIpInclusion['unitPrice'] === 40.0, 'the exact reported unit price ($40) survives');
check_request_schema_family_snapshot($staticIpInclusion['lineTotal'] === 80.0, 'the exact reported line total ($80) survives — the number this whole feature exists to explain');
check_request_schema_family_snapshot(!array_key_exists('evil_field', $staticIpInclusion), 'unknown nested fields are not blindly retained inside commercialBreakdown either');

$bundleComponent = $secondPeriod['components'][2];
check_request_schema_family_snapshot(!array_key_exists('source', $bundleComponent), 'the Bundle Leg\'s own source does not survive either');
$bundleInclusion = $bundleComponent['inclusions'][0];
check_request_schema_family_snapshot(!array_key_exists('id', $bundleInclusion), 'the Bundle parent inclusion\'s id does not survive');
check_request_schema_family_snapshot($bundleInclusion['label'] === 'Security Bundle', 'the Bundle parent inclusion survives inside commercialBreakdown, identified by label instead of id');
check_request_schema_family_snapshot(count($bundleInclusion['includes']) === 1, 'the Bundle child survives inside commercialBreakdown');
check_request_schema_family_snapshot($bundleInclusion['includes'][0]['label'] === 'Endpoint Protection', 'the Bundle child\'s own label survives');
check_request_schema_family_snapshot(!array_key_exists('id', $bundleInclusion['includes'][0]), 'the Bundle child\'s own id does not survive either');

// ── cartBreakdown: the cart quick-view's own compact shape ───────────────────
$cartBreakdown = $item['cartBreakdown'];
check_request_schema_family_snapshot(count($cartBreakdown['baseInclusions']) === 1, 'cartBreakdown.baseInclusions survives');
$baseInclusion = $cartBreakdown['baseInclusions'][0];
check_request_schema_family_snapshot(!array_key_exists('id', $baseInclusion) && !array_key_exists('evil_field', $baseInclusion), 'cartBreakdown.baseInclusions strips both the internal id and unknown nested fields');
check_request_schema_family_snapshot($baseInclusion['label'] === 'User Seats' && $baseInclusion['quantity'] === 25, 'cartBreakdown.baseInclusions keeps its own label/quantity facts');
check_request_schema_family_snapshot(count($cartBreakdown['extensionGroups']) === 1, 'cartBreakdown.extensionGroups survives');
$extensionGroup = $cartBreakdown['extensionGroups'][0];
check_request_schema_family_snapshot(
    $extensionGroup['heading'] === 'Extensions billed Annually' && $extensionGroup['billingCycle'] === 'annually' && $extensionGroup['price'] === 80.0,
    'cartBreakdown.extensionGroups keeps its own heading/billingCycle/price facts'
);
check_request_schema_family_snapshot(!array_key_exists('id', $extensionGroup['inclusions'][0]), 'cartBreakdown.extensionGroups\' own inclusion strips its internal id too');

// Two independent components sharing the SAME Period + cadence: both must
// still sanitize through distinctly (never merged/deduplicated) even with
// no `source` to tell them apart — RequestSchema preserves array order and
// position, which is all disclosureRowsForFamilyTierItem() needs.
$collidingRaw = [[
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_dual', 'familyPlatformId' => 'CZPG-DUAL01', 'familyTitle' => 'Dual Yearly',
    'tierInstanceId' => 'ti_dual', 'tierInstancePlatformId' => 'CZTG-DUAL01',
    'tierOccupantId' => 'occ_dual', 'tierPlatformId' => 'CZT-DUAL001', 'tierEditionPlatformId' => null,
    'tierId' => 'basic', 'tierTitle' => 'Dual Yearly', 'price' => 0, 'isAddon' => false,
    'commercialBreakdown' => [[
        'fromMonth' => 11, 'toMonth' => null,
        'components' => [
            ['source' => 'leg_static_ip', 'billingCycle' => 'annually', 'price' => 80, 'inclusions' => [
                ['id' => 'itm_static_ip', 'label' => 'Static IP Block (8 IPs, 5 usable)', 'quantity' => 2, 'unitPrice' => 40, 'lineTotal' => 80],
            ]],
            ['source' => 'leg_backup_yearly', 'billingCycle' => 'annually', 'price' => 50, 'inclusions' => [
                ['id' => 'itm_backup', 'label' => 'Annual Backup Retention', 'quantity' => 1, 'unitPrice' => 50, 'lineTotal' => 50],
            ]],
        ],
    ]],
]];
$collidingItem = RequestSchema::sanitizeItems($collidingRaw)[0];
$collidingComponents = $collidingItem['commercialBreakdown'][0]['components'];
check_request_schema_family_snapshot(
    count($collidingComponents) === 2
        && $collidingComponents[0]['inclusions'][0]['label'] === 'Static IP Block (8 IPs, 5 usable)'
        && $collidingComponents[1]['inclusions'][0]['label'] === 'Annual Backup Retention'
        && !array_key_exists('source', $collidingComponents[0]) && !array_key_exists('source', $collidingComponents[1]),
    'two independent same-Period/same-cadence components both sanitize through distinctly, in order, with no source field to tell them apart'
);

// A legacy line predating these fields defaults every new key to null, never
// an empty array masquerading as "no data was ever configured".
$legacy = $items[1];
check_request_schema_family_snapshot($legacy['tierEditionTitle'] === null, 'a legacy line with no tierEditionTitle defaults to null');
check_request_schema_family_snapshot($legacy['inclusionItems'] === null, 'a legacy line with no inclusionItems defaults to null, not []');
check_request_schema_family_snapshot($legacy['legPaymentSummaries'] === null, 'a legacy line with no legPaymentSummaries defaults to null, not []');
check_request_schema_family_snapshot($legacy['commercialBreakdown'] === null, 'a legacy line with no commercialBreakdown defaults to null, not []');

// ── restArgs() schema carries the new fields ─────────────────────────────────

$args = RequestSchema::restArgs();
$properties = $args['items']['items']['properties'];
check_request_schema_family_snapshot(
    isset($properties['tierEditionTitle'], $properties['inclusionItems'], $properties['legPaymentSummaries'], $properties['commercialBreakdown'], $properties['cartBreakdown']),
    'restArgs() declares all five new cart-item fields'
);

echo "Request schema family quote snapshot checks passed.\n";
