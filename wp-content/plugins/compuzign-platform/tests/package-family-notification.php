<?php

declare(strict_types=1);

// Phase 8J-B: Family line identity/rendering moved from the shared
// emailServiceRows() into a dedicated per-audience renderer so the admin
// email can keep raw CZ Platform IDs while the customer email hides them
// (see NotificationTemplates::buildQuoteSections()'s docblock — the
// reported "admin/customer share an inseparable renderer" conflict from the
// Phase 8J-B audit). This exercises the two public builders directly rather
// than the now Family-free emailServiceRows(), so it proves the actual
// customer-visible/admin-visible behavior, not an internal implementation
// detail.

if (!function_exists('esc_html')) {
    function esc_html(mixed $value): string { return htmlspecialchars((string) $value, ENT_QUOTES); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Notifications\NotificationTemplates;

function check_package_family_notification(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Package Family notification: ' . $message);
    }
}

$data = [
    'type'      => 'quote_cart',
    'quote_ref' => 'CZ-ABC123',
    'contact'   => 'Jane Doe',
    'company'   => 'Acme Co',
    'email'     => 'jane@example.com',
    'phone'     => '555-0100',
    'notes'     => '',
    'category'  => '',
    'submitted' => '2026-08-30 00:00:00',
    'items'     => [[
        'offer_type' => 'family_tier',
        'familyTitle' => 'KAIROS',
        'familyPlatformId' => 'CZPG-KAIROS01',
        'tierInstancePlatformId' => 'CZTG-KAIROS01',
        'tierTitle' => 'KAIROS Basic',
        'tierPlatformId' => 'CZT-KAIROS001',
        'tierEditionPlatformId' => 'CZTE-KAIROS01',
        'tierEditionTitle' => null,
        'price' => 100,
        'billingCycle' => 'monthly',
        'isAddon' => false,
        'inclusionItems' => null,
        'legPaymentSummaries' => null,
        'features' => [],
    ]],
];

$adminHtml    = NotificationTemplates::buildAdminHtmlEmail($data);
$customerHtml = NotificationTemplates::buildCustomerHtmlEmail($data, 'CompuZign');

foreach (['KAIROS', 'KAIROS Basic'] as $expected) {
    check_package_family_notification(str_contains($adminHtml, $expected), "admin email omits {$expected}");
    check_package_family_notification(str_contains($customerHtml, $expected), "customer email omits {$expected}");
}

foreach (['CZPG-KAIROS01', 'CZTG-KAIROS01', 'CZT-KAIROS001', 'CZTE-KAIROS01'] as $platformId) {
    check_package_family_notification(str_contains($adminHtml, $platformId), "admin email omitted operational identity {$platformId}");
    check_package_family_notification(!str_contains($customerHtml, $platformId), "customer email leaked raw CZ Platform ID {$platformId}");
}

check_package_family_notification(!str_contains($adminHtml, 'serviceId'), 'admin email depends on a Service identity for a Family line');
check_package_family_notification(!str_contains($customerHtml, 'serviceId'), 'customer email depends on a Service identity for a Family line');

echo "Package Family notification checks passed.\n";
