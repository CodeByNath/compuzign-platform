<?php

declare(strict_types=1);

// Focused contract for RequestSchema::sanitizeItems' structured minimum
// commitment (Phase 8): minimumTermValue/minimumTermUnit sanitise to a
// float-or-null and a string-or-null respectively, default to null, and a
// legacy client payload with neither key present (every submission before
// this capability existed) survives unchanged.

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Support\RequestSchema;

function check_request_schema_min_term(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Request schema minimum term: ' . $message);
    }
}

$rawItems = [
    // A legacy client payload predating this capability entirely — neither key present.
    ['serviceId' => 101, 'serviceTitle' => 'KAIROS', 'tierId' => 'standard', 'tierTitle' => 'Standard', 'price' => 49, 'billingCycle' => 'monthly'],
    // A line carrying a real Edition's commitment.
    ['serviceId' => 102, 'serviceTitle' => 'KAIROS', 'tierId' => 'enterprise', 'tierTitle' => 'Annual', 'price' => 490, 'billingCycle' => 'annually', 'minimumTermValue' => 12, 'minimumTermUnit' => 'month'],
    // A line with an explicit null (a client that resolved "no commitment" explicitly).
    ['serviceId' => 103, 'serviceTitle' => 'KAIROS', 'tierId' => 'basic', 'tierTitle' => 'Basic', 'price' => 10, 'minimumTermValue' => null, 'minimumTermUnit' => null],
    // A tampered/malformed payload — numeric-string value, empty-string unit.
    ['serviceId' => 104, 'serviceTitle' => 'KAIROS', 'tierId' => 'premium', 'tierTitle' => 'Premium', 'price' => 99, 'minimumTermValue' => '6', 'minimumTermUnit' => ''],
];

$items = RequestSchema::sanitizeItems($rawItems);

check_request_schema_min_term(count($items) === 4, 'all four submitted lines survive sanitisation');

check_request_schema_min_term($items[0]['minimumTermValue'] === null, 'a legacy payload with no minimumTermValue key defaults to null');
check_request_schema_min_term($items[0]['minimumTermUnit'] === null, 'a legacy payload with no minimumTermUnit key defaults to null');

check_request_schema_min_term($items[1]['minimumTermValue'] === 12.0, 'a real commitment value sanitises to a float');
check_request_schema_min_term($items[1]['minimumTermUnit'] === 'month', 'a real commitment unit sanitises to a string');

check_request_schema_min_term($items[2]['minimumTermValue'] === null, 'an explicit null value stays null');
check_request_schema_min_term($items[2]['minimumTermUnit'] === null, 'an explicit null unit stays null');

check_request_schema_min_term($items[3]['minimumTermValue'] === 6.0, 'a numeric-string value coerces to a float');
check_request_schema_min_term($items[3]['minimumTermUnit'] === null, 'an empty-string unit sanitises to null, not an empty string');

foreach ($items as $item) {
    check_request_schema_min_term(
        $item['minimumTermValue'] === null || is_float($item['minimumTermValue']),
        'minimumTermValue is always null or a strict float, never a passthrough scalar'
    );
    check_request_schema_min_term(
        $item['minimumTermUnit'] === null || is_string($item['minimumTermUnit']),
        'minimumTermUnit is always null or a sanitised string'
    );
}

// ── restArgs() schema carries the new fields ─────────────────────────────────

$args = RequestSchema::restArgs();
check_request_schema_min_term(
    isset($args['items']['items']['properties']['minimumTermValue'], $args['items']['items']['properties']['minimumTermUnit']),
    'restArgs() declares both new cart-item fields'
);

echo "Request schema minimum term checks passed.\n";
