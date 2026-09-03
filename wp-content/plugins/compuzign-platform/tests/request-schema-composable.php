<?php

declare(strict_types=1);

// Focused contract for RequestSchema::sanitizeItems' composable ("Build Your
// Own") discriminator (Request/PDF/email propagation phase): the audit found
// isComposable/composableSelection were silently dropped by this sanitiser's
// fixed field allow-list, causing every downstream reader to misclassify a
// stored composable line as primary. Proves: isComposable persists as a
// strict boolean defaulting false; composableSelection is never persisted
// (browser edit/reseed state only, not a Request field); the write-boundary
// guard forces isAddon false whenever isComposable is true, so composable
// and Add-on can never both be true on a stored line; and a legacy line with
// no isComposable key at all still sanitises unchanged.

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Support\RequestSchema;

function check_request_schema_composable(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Request schema composable: ' . $message);
    }
}

$baseFamilyFields = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS01', 'familyTitle' => 'KAIROS',
    'tierInstanceId' => 'ti_kairos', 'tierInstancePlatformId' => 'CZTG-KAIROS01',
    'tierOccupantId' => 'occ_composable', 'tierPlatformId' => 'CZT-KAIROS009', 'tierEditionPlatformId' => null,
    'tierId' => 'composable', 'tierTitle' => 'Build Your Own',
    'price' => 199, 'billingCycle' => 'monthly', 'features' => [],
];

$rawItems = [
    // A genuine composable line — isAddon: false (as the browser's own
    // builder always sends), composableSelection present (must be dropped).
    $baseFamilyFields + [
        'isAddon' => false,
        'isComposable' => true,
        'composableSelection' => [['item_id' => 'itm_seats', 'selected' => true, 'quantity' => 10]],
    ],
    // A tampered/impossible payload asserting BOTH isAddon and isComposable
    // true at once — the write-boundary guard must force isAddon false.
    array_merge($baseFamilyFields, [
        'familyId' => 'pcg_omnia', 'familyPlatformId' => 'CZPG-OMNIA01', 'familyTitle' => 'OMNIA',
        'tierInstanceId' => 'ti_omnia', 'tierInstancePlatformId' => 'CZTG-OMNIA01',
        'tierOccupantId' => 'occ_composable2', 'tierPlatformId' => 'CZT-OMNIA009',
        'isAddon' => true,
        'isComposable' => true,
    ]),
    // A normal primary line with no isComposable key at all (pre-phase
    // client, or a real primary/add-on submission).
    array_merge($baseFamilyFields, [
        'familyId' => 'pcg_aptos', 'familyPlatformId' => 'CZPG-APTOS01', 'familyTitle' => 'APTOS',
        'tierInstanceId' => 'ti_aptos', 'tierInstancePlatformId' => 'CZTG-APTOS01',
        'tierOccupantId' => 'occ_basic', 'tierPlatformId' => 'CZT-APTOS001',
        'tierId' => 'basic', 'tierTitle' => 'APTOS Basic', 'isAddon' => false,
    ]),
    // A tampered payload asserting a truthy-but-non-boolean isComposable.
    array_merge($baseFamilyFields, [
        'familyId' => 'pcg_omnia2', 'familyPlatformId' => 'CZPG-OMNIA02', 'familyTitle' => 'OMNIA',
        'tierInstanceId' => 'ti_omnia2', 'tierInstancePlatformId' => 'CZTG-OMNIA02',
        'tierOccupantId' => 'occ_composable3', 'tierPlatformId' => 'CZT-OMNIA010',
        'isAddon' => false, 'isComposable' => 'yes',
    ]),
];

$items = RequestSchema::sanitizeItems($rawItems);

check_request_schema_composable(count($items) === 4, 'all four submitted lines survive sanitisation');

// ── A genuine composable line ────────────────────────────────────────────
check_request_schema_composable($items[0]['isComposable'] === true, 'an explicit composable line sanitises isComposable to true');
check_request_schema_composable($items[0]['isAddon'] === false, 'a genuine composable line keeps isAddon false');
check_request_schema_composable(!array_key_exists('composableSelection', $items[0]), 'composableSelection is never persisted — browser edit/reseed state only, not a Request field');
check_request_schema_composable(is_bool($items[0]['isComposable']), 'isComposable is always a strict boolean, never a passthrough scalar');

// ── Impossible Add-on+composable input: write-boundary guard ────────────
check_request_schema_composable($items[1]['isComposable'] === true, 'the composable flag on a tampered dual-true payload survives');
check_request_schema_composable($items[1]['isAddon'] === false, 'an impossible isAddon+isComposable both-true payload is forced to isAddon: false at the write boundary — composable always wins, never stored as both');

// ── No isComposable key at all (pre-phase client / real primary line) ───
check_request_schema_composable($items[2]['isComposable'] === false, 'a line with no isComposable key defaults to false, unchanged legacy behaviour');
check_request_schema_composable($items[2]['isAddon'] === false, 'a genuinely non-composable line is untouched by the write-boundary guard');

// ── Truthy-but-non-boolean isComposable sanitises to strict boolean ──────
check_request_schema_composable($items[3]['isComposable'] === true, 'any truthy isComposable value sanitises to a strict boolean true');

// ── restArgs() schema declares the new field ─────────────────────────────
$args = RequestSchema::restArgs();
$properties = $args['items']['items']['properties'];
check_request_schema_composable(isset($properties['isComposable']), 'restArgs() declares the isComposable field');
check_request_schema_composable(!isset($properties['composableSelection']), 'restArgs() never declares composableSelection — it is not a Request field');

echo "Request schema composable checks passed.\n";
