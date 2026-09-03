<?php

declare(strict_types=1);

// Focused contract for the Request/PDF/email propagation phase:
// NotificationTemplates' admin/customer email renderers must distinguish a
// composable ("Build Your Own") Family line from a primary/Add-on one using
// the persisted isComposable discriminator (resolveItemRole()), never a raw
// !isAddon assumption. Covers: primary + composable coexisting for the same
// Family (the exact scenario the isComposable gap silently collapsed into
// one bucket), a composable-only Request, primary + composable + Add-on
// together, composable counted exactly once in combined totals, and a
// legacy fixture with no isComposable key rendering unchanged.

if (!function_exists('esc_html')) {
    function esc_html(mixed $value): string { return htmlspecialchars((string) $value, ENT_QUOTES); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Notifications\NotificationTemplates;

function check_composable_quote_parity(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Notification templates composable quote parity: ' . $message);
    }
}

// ── Primary + composable for the SAME Family+Tier-Instance, coexisting ──
// (the "coexist independently" scenario validated live in cart) — before
// this phase both collapsed into familyMainItems with no distinguishing
// badge; this proves they now render as two distinct rows.

$kairosPrimary = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS01', 'familyTitle' => 'KAIROS',
    'tierInstanceId' => 'ti_kairos', 'tierInstancePlatformId' => 'CZTG-KAIROS01',
    'tierOccupantId' => 'occ_enterprise', 'tierPlatformId' => 'CZT-KAIROS001', 'tierEditionPlatformId' => null,
    'tierId' => 'enterprise', 'tierTitle' => 'KAIROS Enterprise',
    'price' => 490, 'billingCycle' => 'monthly', 'isAddon' => false, 'isComposable' => false, 'features' => [],
    'tierEditionTitle' => null, 'inclusionItems' => null,
    // Multi-stream (2 streams) so the combined Family Contract Value block
    // activates — a single-stream item alone leaves totals on the general
    // (non-Family) path per Phase 8F's hasMultiStreamItem gate.
    'legPaymentSummaries' => [
        ['source' => 'leg_upfront', 'billingCycle' => 'upfront', 'price' => 5000, 'startMonth' => 0, 'endMonth' => 0, 'isOngoing' => false, 'occurrenceMonths' => [0], 'subtotal' => 5000],
        ['source' => 'leg_recurring', 'billingCycle' => 'monthly', 'price' => 490, 'startMonth' => 0, 'endMonth' => 12, 'isOngoing' => false, 'occurrenceMonths' => range(0, 11), 'subtotal' => 5880],
    ],
];

$kairosComposable = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS01', 'familyTitle' => 'KAIROS',
    'tierInstanceId' => 'ti_kairos', 'tierInstancePlatformId' => 'CZTG-KAIROS01',
    'tierOccupantId' => 'occ_composable', 'tierPlatformId' => 'CZT-KAIROS009', 'tierEditionPlatformId' => null,
    'tierId' => 'composable', 'tierTitle' => 'Build Your Own',
    'price' => 150, 'billingCycle' => 'monthly', 'isAddon' => false, 'isComposable' => true, 'features' => [],
    'tierEditionTitle' => null,
    'inclusionItems' => [
        ['id' => 'itm_seats', 'label' => 'Extra Seats', 'quantity' => 5],
    ],
    'legPaymentSummaries' => [
        ['source' => 'leg_composable', 'billingCycle' => 'monthly', 'price' => 150, 'startMonth' => 0, 'endMonth' => 12, 'isOngoing' => false, 'occurrenceMonths' => range(0, 11), 'subtotal' => 1800],
    ],
];

$coexistData = [
    'type' => 'quote_cart', 'quote_ref' => 'CZ-COEXIST', 'contact' => 'Jane Doe', 'company' => 'Acme Co',
    'email' => 'jane@example.com', 'phone' => '555-0100', 'notes' => '', 'category' => '',
    'submitted' => '2026-09-03 00:00:00',
    'items' => [$kairosPrimary, $kairosComposable],
];

$adminHtml    = NotificationTemplates::buildAdminHtmlEmail($coexistData);
$customerHtml = NotificationTemplates::buildCustomerHtmlEmail($coexistData, 'CompuZign');

check_composable_quote_parity(str_contains($adminHtml, 'Build Your Own'), 'admin email shows the Build Your Own badge/label for the composable row');
check_composable_quote_parity(str_contains($customerHtml, 'Build Your Own'), 'customer email shows the Build Your Own badge/label for the composable row');
check_composable_quote_parity(!str_contains($adminHtml, 'add-on'), 'the composable row must never carry the add-on badge — it is a distinct role');
check_composable_quote_parity(!str_contains($customerHtml, 'add-on'), 'customer email composable row never carries the add-on badge');
check_composable_quote_parity(substr_count($adminHtml, 'KAIROS') >= 2, 'admin email renders both the primary and the composable KAIROS rows (two distinct lines for the same Family)');

// Combined totals: primary's own total (5000 + 5880 = 10880) + composable's
// own total (1800) = 12680, counted exactly once — never the primary alone,
// never doubled. Initial Payment: earliest same-cycle streams across BOTH
// (5000 upfront + 490 + 150 monthly = 5640).
check_composable_quote_parity(str_contains($adminHtml, '$12,680.00'), 'admin email combined Total Contract Value includes the composable line exactly once alongside the primary');
check_composable_quote_parity(str_contains($customerHtml, '$12,680.00'), 'customer email combined Total Contract Value includes the composable line exactly once alongside the primary');
check_composable_quote_parity(str_contains($adminHtml, 'Initial Payment'), 'admin email shows the combined Initial Payment row');
check_composable_quote_parity(str_contains($adminHtml, '$5,640.00'), 'admin email combined Initial Payment includes the composable line\'s own earliest stream alongside the primary\'s');
check_composable_quote_parity(str_contains($customerHtml, '$5,640.00'), 'customer email combined Initial Payment includes the composable line\'s own earliest stream alongside the primary\'s');

// ── Composable-only Request (no primary Tier at all — "Build Your Own"
//    standalone entry point) ───────────────────────────────────────────────
$composableOnlyData = [
    'type' => 'quote_cart', 'quote_ref' => 'CZ-SOLOBYO', 'contact' => 'John Roe', 'company' => '',
    'email' => 'john@example.com', 'phone' => '', 'notes' => '', 'category' => '',
    'submitted' => '2026-09-03 00:00:00',
    'items' => [$kairosComposable],
];
$soloAdminHtml    = NotificationTemplates::buildAdminHtmlEmail($composableOnlyData);
$soloCustomerHtml = NotificationTemplates::buildCustomerHtmlEmail($composableOnlyData, 'CompuZign');
check_composable_quote_parity(str_contains($soloAdminHtml, 'Build Your Own'), 'a composable-only Request still renders the Build Your Own row in the admin email');
check_composable_quote_parity(str_contains($soloCustomerHtml, 'Extra Seats'), 'a composable-only Request still renders its own inclusionItems in the customer email');
check_composable_quote_parity(str_contains($soloAdminHtml, '$1,800.00'), 'a composable-only Request shows its own finite Total Contract Value');

// ── Primary + composable + Add-on together (three-way representation) ────
$omniaAddon = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_omnia', 'familyPlatformId' => 'CZPG-OMNIA01', 'familyTitle' => 'OMNIA',
    'tierInstanceId' => 'ti_omnia', 'tierInstancePlatformId' => 'CZTG-OMNIA01',
    'tierOccupantId' => 'occ_guard', 'tierPlatformId' => 'CZT-OMNIA002', 'tierEditionPlatformId' => null,
    'tierId' => 'basic', 'tierTitle' => 'OMNIA Guard',
    'price' => 99, 'billingCycle' => 'monthly', 'isAddon' => true, 'isComposable' => false, 'features' => [],
    'tierEditionTitle' => null, 'inclusionItems' => null, 'legPaymentSummaries' => null,
];
$threeWayData = [
    'type' => 'quote_cart', 'quote_ref' => 'CZ-3WAY001', 'contact' => 'Jane Doe', 'company' => 'Acme Co',
    'email' => 'jane@example.com', 'phone' => '', 'notes' => '', 'category' => '',
    'submitted' => '2026-09-03 00:00:00',
    'items' => [$kairosPrimary, $kairosComposable, $omniaAddon],
];
$threeWayAdminHtml = NotificationTemplates::buildAdminHtmlEmail($threeWayData);
check_composable_quote_parity(str_contains($threeWayAdminHtml, 'Build Your Own'), 'three-way Request: composable badge present');
check_composable_quote_parity(str_contains($threeWayAdminHtml, 'add-on'), 'three-way Request: add-on badge present for the real Add-on line');
check_composable_quote_parity(str_contains($threeWayAdminHtml, 'OMNIA Guard'), 'three-way Request: the Add-on line itself renders');

// ── Legacy fixture: no isComposable key at all (pre-phase Request) ───────
$legacyFamilyItem = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS02', 'familyTitle' => 'KAIROS',
    'tierInstanceId' => 'ti_kairos2', 'tierInstancePlatformId' => 'CZTG-KAIROS02',
    'tierOccupantId' => 'occ_basic', 'tierPlatformId' => 'CZT-KAIROS002', 'tierEditionPlatformId' => '',
    'tierId' => 'basic', 'tierTitle' => 'KAIROS Basic',
    'price' => 15, 'billingCycle' => 'monthly', 'isAddon' => false, 'features' => ['24/7 monitoring'],
    // Deliberately no isComposable key — a Request submitted before this phase.
];
$legacyData = [
    'type' => 'quote_cart', 'quote_ref' => 'CZ-LEGACY2', 'contact' => 'Jane Doe', 'company' => '',
    'email' => 'jane@example.com', 'phone' => '', 'notes' => '', 'category' => '',
    'submitted' => '2026-08-30 00:00:00',
    'items' => [$legacyFamilyItem],
];
$legacyAdminHtml = NotificationTemplates::buildAdminHtmlEmail($legacyData);
check_composable_quote_parity(str_contains($legacyAdminHtml, 'KAIROS Basic'), 'a legacy Family line with no isComposable key still renders its tier title');
check_composable_quote_parity(!str_contains($legacyAdminHtml, 'Build Your Own'), 'a legacy Family line with no isComposable key never shows the Build Your Own badge');
check_composable_quote_parity(!str_contains($legacyAdminHtml, 'add-on'), 'a legacy non-add-on Family line still shows no add-on badge either — reads as primary, unchanged');

echo "Notification templates composable quote parity checks passed.\n";
