<?php

declare(strict_types=1);

// Focused contract for NotificationTemplates' rendering of a finalised
// Upgrade Journey composed ("Build Your Own") item. Proves: the admin email
// shows both the base and upgrade occupants' own raw Platform IDs (never
// just the ambiguous top-level tierPlatformId, which only identifies the
// composable occupant) while the customer email shows neither; inclusion
// rows group into "Included in your plan" / "Your upgrades" sections rather
// than one flat list; payment-stream rows carry a Plan/Upgrade cue; and a
// normal (non-composed) item's rendering is completely unaffected.

if (!function_exists('esc_html')) {
    function esc_html(mixed $value): string { return htmlspecialchars((string) $value, ENT_QUOTES); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Notifications\NotificationTemplates;

function check_composed_upgrade_notification(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Notification templates composed upgrade: ' . $message);
    }
}

$composedItem = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS01', 'familyTitle' => 'KAIROS',
    'tierInstanceId' => 'ti_kairos', 'tierInstancePlatformId' => 'CZTG-KAIROS01',
    'tierOccupantId' => 'occ_composable', 'tierPlatformId' => 'CZT-COMPOSABLE01', 'tierEditionPlatformId' => null,
    'tierId' => 'composable', 'tierTitle' => 'Build Your Own',
    'price' => 150, 'billingCycle' => 'monthly', 'isAddon' => false, 'isComposable' => true, 'features' => [],
    'tierEditionTitle' => null,
    'isComposedUpgrade' => true,
    'composedBase' => [
        'tierOccupantId' => 'occ_basic', 'tierPlatformId' => 'CZT-BASIC01', 'tierEditionPlatformId' => null,
        'tierId' => 'basic', 'tierTitle' => 'Starter Cloud', 'tierEditionTitle' => null,
        'inclusionItems' => [['id' => 'shared-item', 'label' => 'Storage', 'quantity' => 10]],
        'legPaymentSummaries' => [['source' => 'base-leg', 'billingCycle' => 'monthly', 'price' => 150, 'startMonth' => 0, 'endMonth' => 12, 'isOngoing' => false, 'occurrenceMonths' => range(0, 11), 'subtotal' => 1800]],
        'price' => 150, 'billingCycle' => 'monthly', 'minimumTermValue' => 12, 'minimumTermUnit' => 'months', 'planDurationMonths' => 12,
    ],
    'composedUpgrade' => [
        'tierOccupantId' => 'occ_composable', 'tierPlatformId' => 'CZT-COMPOSABLE01',
        'inclusionItems' => [['id' => 'shared-item', 'label' => 'Storage', 'quantity' => 5]],
        'legPaymentSummaries' => [['source' => 'upgrade-leg', 'billingCycle' => 'monthly', 'price' => 50, 'startMonth' => 0, 'endMonth' => 12, 'isOngoing' => false, 'occurrenceMonths' => range(0, 11), 'subtotal' => 600]],
        'price' => 50, 'billingCycle' => 'monthly', 'minimumTermValue' => null, 'minimumTermUnit' => null,
    ],
    // Top-level projection, as RequestSchema::deriveComposedProjection()
    // would have produced it — the concatenation both children, tagged.
    'inclusionItems' => [
        ['id' => 'shared-item', 'label' => 'Storage', 'quantity' => 10, 'provenance' => 'base'],
        ['id' => 'shared-item', 'label' => 'Storage', 'quantity' => 5, 'provenance' => 'upgrade'],
    ],
    'legPaymentSummaries' => [
        ['source' => 'base-leg', 'billingCycle' => 'monthly', 'price' => 150, 'startMonth' => 0, 'endMonth' => 12, 'isOngoing' => false, 'occurrenceMonths' => range(0, 11), 'subtotal' => 1800, 'provenance' => 'base'],
        ['source' => 'upgrade-leg', 'billingCycle' => 'monthly', 'price' => 50, 'startMonth' => 0, 'endMonth' => 12, 'isOngoing' => false, 'occurrenceMonths' => range(0, 11), 'subtotal' => 600, 'provenance' => 'upgrade'],
    ],
];

$data = [
    'type' => 'quote_cart', 'quote_ref' => 'CZ-COMPOSED', 'contact' => 'Jane Doe', 'company' => 'Acme Co',
    'email' => 'jane@example.com', 'phone' => '', 'notes' => '', 'category' => '',
    'submitted' => '2026-09-04 00:00:00',
    'items' => [$composedItem],
];

$adminHtml    = NotificationTemplates::buildAdminHtmlEmail($data);
$customerHtml = NotificationTemplates::buildCustomerHtmlEmail($data, 'CompuZign');

// ── Admin-only dual reference line ───────────────────────────────────────
check_composed_upgrade_notification(str_contains($adminHtml, 'Base CZT-BASIC01'), 'admin email shows the base occupant\'s own raw Platform ID, labeled Base');
check_composed_upgrade_notification(str_contains($adminHtml, 'Upgrade CZT-COMPOSABLE01'), 'admin email shows the upgrade occupant\'s own raw Platform ID, labeled Upgrade');
check_composed_upgrade_notification(!str_contains($customerHtml, 'CZT-BASIC01'), 'customer email never shows the base occupant\'s raw Platform ID');
check_composed_upgrade_notification(!str_contains($customerHtml, 'CZT-COMPOSABLE01'), 'customer email never shows the upgrade occupant\'s raw Platform ID');

// ── Inclusion grouping ────────────────────────────────────────────────────
check_composed_upgrade_notification(str_contains($adminHtml, 'Included in your plan'), 'admin email groups base inclusions under "Included in your plan"');
check_composed_upgrade_notification(str_contains($adminHtml, 'Your upgrades'), 'admin email groups upgrade inclusions under "Your upgrades"');
check_composed_upgrade_notification(str_contains($customerHtml, 'Included in your plan'), 'customer email also groups inclusions by provenance');
check_composed_upgrade_notification(str_contains($customerHtml, 'Your upgrades'), 'customer email also groups upgrade inclusions');
check_composed_upgrade_notification(substr_count($customerHtml, 'Storage') === 2, 'the shared item_id "Storage" appears once per provenance — never deduplicated');

// ── Payment-stream provenance cue ────────────────────────────────────────
check_composed_upgrade_notification(str_contains($customerHtml, '&middot; Plan') || str_contains($customerHtml, '&middot;&nbsp;Plan'), 'a base stream row carries a Plan cue');
check_composed_upgrade_notification(str_contains($customerHtml, '&middot; Upgrade') || str_contains($customerHtml, '&middot;&nbsp;Upgrade'), 'an upgrade stream row carries an Upgrade cue');

// ── Totals still exactly once ────────────────────────────────────────────
check_composed_upgrade_notification(str_contains($customerHtml, '$2,400.00'), 'combined Total Contract Value (1800 base + 600 upgrade) counts each stream exactly once');

// ── A normal (non-composed) item is completely unaffected ───────────────
$normalItem = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_ultra', 'familyPlatformId' => 'CZPG-ULTRA01', 'familyTitle' => 'ULTRA',
    'tierInstanceId' => 'ti_ultra', 'tierInstancePlatformId' => 'CZTG-ULTRA01',
    'tierOccupantId' => 'occ_ultra', 'tierPlatformId' => 'CZT-ULTRA01', 'tierEditionPlatformId' => null,
    'tierId' => 'ultimate', 'tierTitle' => 'Ultra Plan',
    'price' => 999, 'billingCycle' => 'monthly', 'isAddon' => false, 'isComposable' => false, 'features' => [],
    'tierEditionTitle' => null,
    'inclusionItems' => [['id' => 'ultra-item', 'label' => 'Priority Support', 'quantity' => 1]],
    'legPaymentSummaries' => [['source' => 'ultra-leg', 'billingCycle' => 'monthly', 'price' => 999, 'startMonth' => 0, 'endMonth' => 12, 'isOngoing' => false, 'occurrenceMonths' => range(0, 11), 'subtotal' => 11988]],
];
$normalData = $data;
$normalData['items'] = [$normalItem];
$normalAdminHtml = NotificationTemplates::buildAdminHtmlEmail($normalData);
check_composed_upgrade_notification(str_contains($normalAdminHtml, 'CZT-ULTRA01'), 'a normal item still shows its single tierPlatformId reference, unchanged');
check_composed_upgrade_notification(!str_contains($normalAdminHtml, 'Included in your plan'), 'a normal item\'s inclusions render as a flat list, never grouped');
check_composed_upgrade_notification(!str_contains($normalAdminHtml, '&middot; Plan'), 'a normal item\'s stream rows never carry a provenance cue');

echo "Notification templates composed upgrade checks passed.\n";
