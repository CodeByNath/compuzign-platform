<?php

declare(strict_types=1);

// Focused contract for RequestSchema::sanitizeItems' isAddon classification
// (Tier System add-on capability, Phase 6): a submitted cart line is sanitised
// to an explicit boolean, defaulting false, and is never inferred from
// serviceId's sign — the legacy recommended bundle's negative serviceId keeps
// meaning nothing to this sanitiser.

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Support\RequestSchema;

function check_request_schema_is_addon(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Request schema is_addon: ' . $message);
    }
}

$rawItems = [
    // A normal Tier line — no isAddon key at all (older client / normal selection).
    ['serviceId' => 101, 'serviceTitle' => 'KAIROS', 'tierId' => 'standard', 'tierTitle' => 'Standard', 'price' => 49],
    // A real Tier add-on.
    ['serviceId' => 101, 'serviceTitle' => 'KAIROS', 'tierId' => 'enterprise', 'tierTitle' => 'Backup & DR Shield', 'price' => 25, 'isAddon' => true],
    // The legacy recommended bundle — negative serviceId, isAddon explicitly false.
    ['serviceId' => -101, 'serviceTitle' => 'Bundle', 'tierId' => 'bundle', 'tierTitle' => 'Bundle', 'price' => 30, 'isAddon' => false],
    // A tampered/malicious payload asserting isAddon on a made-up field shape.
    ['serviceId' => 202, 'serviceTitle' => 'APTOS', 'tierId' => 'basic', 'tierTitle' => 'Basic', 'price' => 10, 'isAddon' => 'yes'],
];

$items = RequestSchema::sanitizeItems($rawItems);

check_request_schema_is_addon(count($items) === 4, 'all four submitted lines survive sanitisation');
check_request_schema_is_addon($items[0]['isAddon'] === false, 'a line with no isAddon key defaults to false');
check_request_schema_is_addon($items[1]['isAddon'] === true, 'an explicit true survives sanitisation');
check_request_schema_is_addon($items[2]['isAddon'] === false, 'the legacy bundle line is not classified as an add-on merely for having a negative serviceId');
check_request_schema_is_addon($items[2]['serviceId'] === -101, 'the legacy bundle keeps its real negative serviceId untouched — no ownership transfer to this sanitiser');
check_request_schema_is_addon($items[3]['isAddon'] === true, 'any truthy value sanitises to a strict boolean true');
check_request_schema_is_addon(is_bool($items[0]['isAddon']) && is_bool($items[1]['isAddon']) && is_bool($items[2]['isAddon']) && is_bool($items[3]['isAddon']), 'isAddon is always a strict boolean, never a passthrough scalar');

echo "Request schema is_addon checks passed.\n";
