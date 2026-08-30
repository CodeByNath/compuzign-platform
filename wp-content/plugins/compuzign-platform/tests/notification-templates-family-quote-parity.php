<?php

declare(strict_types=1);

// Focused contract for Phase 8J-B: NotificationTemplates' admin/customer
// email renderers consume the Phase 8J-A-preserved Family snapshot
// (tierEditionTitle, legPaymentSummaries, inclusionItems) using the same
// accepted commercial semantics OrderSummary.tsx/QuoteProposalPreview.tsx
// already use — human labels, per-Leg streams, per-item finite Total,
// combined quote Contract Value/Ongoing + Initial Payment (primary Family
// items only, add-ons excluded), Bundle parent/children with quantities,
// customer-ID suppression, and legacy-snapshot fallback safety.

if (!function_exists('esc_html')) {
    function esc_html(mixed $value): string { return htmlspecialchars((string) $value, ENT_QUOTES); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Notifications\NotificationTemplates;

function check_family_quote_parity(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Notification templates family quote parity: ' . $message);
    }
}

// ── Rich fixture: KAIROS primary (multi-stream, open-ended) + Bundle/qty
//    inclusions, an OMNIA add-on (single finite stream), and one legacy
//    non-Family item (to prove it still counts in general totals while
//    Family items are excluded once any Family item is multi-stream). ──

$kairosePrimary = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS01', 'familyTitle' => 'KAIROS',
    'tierInstanceId' => 'ti_kairos', 'tierInstancePlatformId' => 'CZTG-KAIROS01',
    'tierOccupantId' => 'occ_enterprise', 'tierPlatformId' => 'CZT-KAIROS001',
    'tierEditionPlatformId' => 'CZTE-KAIROS001', 'tierEditionTitle' => 'Annual',
    'tierId' => 'enterprise', 'tierTitle' => 'KAIROS Enterprise',
    'price' => 490, 'billingCycle' => 'annually', 'isAddon' => false, 'features' => [],
    'inclusionItems' => [
        ['id' => 'itm_seats', 'label' => 'User Seats', 'quantity' => 25],
        [
            'id' => 'itm_bundle', 'label' => 'Security Bundle', 'bundle_id' => 'bnd_security',
            'includes' => [
                ['id' => 'itm_child_a', 'label' => 'Endpoint Protection', 'quantity' => 25],
                ['id' => 'itm_child_b', 'label' => 'SIEM Monitoring'],
            ],
        ],
    ],
    'legPaymentSummaries' => [
        ['source' => 'leg_upfront', 'billingCycle' => 'upfront', 'price' => 5000, 'startMonth' => 0, 'endMonth' => 0, 'isOngoing' => false, 'occurrenceMonths' => [0], 'subtotal' => 5000],
        ['source' => 'leg_recurring', 'billingCycle' => 'monthly', 'price' => 490, 'startMonth' => 0, 'endMonth' => null, 'isOngoing' => true, 'occurrenceMonths' => [], 'subtotal' => null],
    ],
];

$omniaAddon = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_omnia', 'familyPlatformId' => 'CZPG-OMNIA01', 'familyTitle' => 'OMNIA',
    'tierInstanceId' => 'ti_omnia', 'tierInstancePlatformId' => 'CZTG-OMNIA01',
    'tierOccupantId' => 'occ_guard', 'tierPlatformId' => 'CZT-OMNIA002', 'tierEditionPlatformId' => null,
    'tierId' => 'basic', 'tierTitle' => 'OMNIA Guard',
    'price' => 99, 'billingCycle' => 'monthly', 'isAddon' => true, 'features' => [],
    'tierEditionTitle' => null, 'inclusionItems' => null,
    'legPaymentSummaries' => [
        ['source' => 'leg_guard', 'billingCycle' => 'monthly', 'price' => 99, 'startMonth' => 0, 'endMonth' => 12, 'isOngoing' => false, 'occurrenceMonths' => range(0, 11), 'subtotal' => 1188],
    ],
];

$legacyServiceItem = [
    'serviceId' => 101, 'serviceTitle' => 'Legacy Backup', 'categoryName' => 'Backup',
    'tierId' => 'standard', 'tierTitle' => 'Standard', 'price' => 49, 'billingCycle' => 'monthly',
    'features' => [], 'offer_type' => '', 'promotion_id' => '', 'billing_label' => '', 'isAddon' => false,
    'minimumTermValue' => null, 'minimumTermUnit' => null,
];

$richData = [
    'type' => 'quote_cart', 'quote_ref' => 'CZ-RICH01', 'contact' => 'Jane Doe', 'company' => 'Acme Co',
    'email' => 'jane@example.com', 'phone' => '555-0100', 'notes' => '', 'category' => '',
    'submitted' => '2026-08-30 00:00:00',
    'items' => [$legacyServiceItem, $kairosePrimary, $omniaAddon],
];

$adminHtml    = NotificationTemplates::buildAdminHtmlEmail($richData);
$customerHtml = NotificationTemplates::buildCustomerHtmlEmail($richData, 'CompuZign');

// ── Human labels, both audiences ─────────────────────────────────────────
foreach (['KAIROS', 'KAIROS Enterprise', 'Annual', 'OMNIA Guard', 'OMNIA'] as $label) {
    check_family_quote_parity(str_contains($adminHtml, $label), "admin email omits human label {$label}");
    check_family_quote_parity(str_contains($customerHtml, $label), "customer email omits human label {$label}");
}

// ── Per-Leg streams, not collapsed to headline price/billingCycle ───────
foreach (['Upfront', 'Monthly', '$5,000.00', '$490.00', '$99.00'] as $expected) {
    check_family_quote_parity(str_contains($adminHtml, $expected), "admin email missing Leg stream detail {$expected}");
    check_family_quote_parity(str_contains($customerHtml, $expected), "customer email missing Leg stream detail {$expected}");
}

// ── Bundle parent/children with quantities ───────────────────────────────
foreach (['User Seats', 'Security Bundle', 'Endpoint Protection', 'SIEM Monitoring'] as $label) {
    check_family_quote_parity(str_contains($adminHtml, $label), "admin email missing inclusion {$label}");
    check_family_quote_parity(str_contains($customerHtml, $label), "customer email missing inclusion {$label}");
}

// ── The OMNIA add-on's own finite stream Total ($1,188.00), never rolled
//    into the combined primary Contract Value (add-ons excluded). ──────────
check_family_quote_parity(str_contains($adminHtml, '$1,188.00'), 'admin email missing add-on own finite Total');
check_family_quote_parity(str_contains($customerHtml, '$1,188.00'), 'customer email missing add-on own finite Total');

// ── Combined summary: KAIROS primary has one open-ended stream, so the
//    combined figure is "Contract Value: Ongoing", never a fabricated
//    finite Total Contract Value. ─────────────────────────────────────────
check_family_quote_parity(str_contains($adminHtml, 'Contract Value'), 'admin email missing Contract Value block');
check_family_quote_parity(str_contains($adminHtml, 'Ongoing'), 'admin email should show Ongoing, not a fabricated finite total (open-ended stream present)');
check_family_quote_parity(!str_contains($adminHtml, 'Total Contract Value'), 'admin email must not show a finite Total Contract Value when a primary stream is open-ended');
check_family_quote_parity(str_contains($customerHtml, 'Ongoing'), 'customer email should show Ongoing for the same reason');

// ── Initial Payment: earliest same-cycle streams across PRIMARY Family
//    items only (5000 upfront + 490 monthly = 5490), add-on excluded. ────
check_family_quote_parity(str_contains($adminHtml, 'Initial Payment'), 'admin email missing Initial Payment row');
check_family_quote_parity(str_contains($adminHtml, '$5,490.00'), 'admin email Initial Payment is not the combined primary-only figure');
check_family_quote_parity(str_contains($customerHtml, '$5,490.00'), 'customer email Initial Payment is not the combined primary-only figure');

// ── General totals still count the legacy non-Family item once any Family
//    item is multi-stream (Family items excluded from this figure). ──────
check_family_quote_parity(str_contains($adminHtml, 'Legacy Backup'), 'admin email dropped the legacy Service item');
check_family_quote_parity(str_contains($adminHtml, '$49.00'), 'general totals should still price the legacy item at $49.00, unaffected by Family exclusion');

// ── Customer-ID suppression: every raw CZ Platform ID present in the admin
//    email must be absent from the customer email. ───────────────────────
foreach (['CZPG-KAIROS01', 'CZTG-KAIROS01', 'CZT-KAIROS001', 'CZTE-KAIROS001', 'CZPG-OMNIA01', 'CZTG-OMNIA01', 'CZT-OMNIA002'] as $platformId) {
    check_family_quote_parity(str_contains($adminHtml, $platformId), "admin email missing operational identity {$platformId}");
    check_family_quote_parity(!str_contains($customerHtml, $platformId), "customer email leaked raw CZ Platform ID {$platformId}");
}

// ── Legacy Family snapshot fallback: a pre-Phase-5/8G Family line missing
//    tierEditionTitle/inclusionItems/legPaymentSummaries keys ENTIRELY
//    (predating this schema, not merely null) must still render safely
//    using the existing headline price/features fallback. ────────────────
$legacyFamilyItem = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS02', 'familyTitle' => 'KAIROS',
    'tierInstanceId' => 'ti_kairos2', 'tierInstancePlatformId' => 'CZTG-KAIROS02',
    'tierOccupantId' => 'occ_basic', 'tierPlatformId' => 'CZT-KAIROS002', 'tierEditionPlatformId' => '',
    'tierId' => 'basic', 'tierTitle' => 'KAIROS Basic',
    'price' => 15, 'billingCycle' => 'monthly', 'isAddon' => false, 'features' => ['24/7 monitoring'],
];

$legacyData = [
    'type' => 'quote_cart', 'quote_ref' => 'CZ-LEGACY1', 'contact' => 'Jane Doe', 'company' => '',
    'email' => 'jane@example.com', 'phone' => '', 'notes' => '', 'category' => '',
    'submitted' => '2026-08-30 00:00:00',
    'items' => [$legacyFamilyItem],
];

$legacyAdminHtml    = NotificationTemplates::buildAdminHtmlEmail($legacyData);
$legacyCustomerHtml = NotificationTemplates::buildCustomerHtmlEmail($legacyData, 'CompuZign');

check_family_quote_parity(str_contains($legacyAdminHtml, 'KAIROS Basic'), 'legacy Family fallback: admin email missing tier title');
check_family_quote_parity(str_contains($legacyAdminHtml, '$15.00'), 'legacy Family fallback: admin email missing headline price');
check_family_quote_parity(str_contains($legacyAdminHtml, '24/7 monitoring'), 'legacy Family fallback: admin email did not fall back to features list');
check_family_quote_parity(str_contains($legacyCustomerHtml, '$15.00'), 'legacy Family fallback: customer email missing headline price');
check_family_quote_parity(!str_contains($legacyCustomerHtml, 'CZPG-KAIROS02'), 'legacy Family fallback: customer email still must not leak raw IDs');
check_family_quote_parity(!str_contains($legacyAdminHtml, 'Contract Value'), 'legacy Family fallback: no combined Family block when nothing is multi-stream');

echo "Notification templates family quote parity checks passed.\n";
