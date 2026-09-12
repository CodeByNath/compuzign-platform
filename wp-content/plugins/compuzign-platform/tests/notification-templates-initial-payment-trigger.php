<?php

declare(strict_types=1);

// Focused contract for the 2026-09-12 Cart Initial Payment parity correction
// (project-work/2026-09-12-cart-initial-payment-parity.md), email side.
//
// Live defect: a KAIROS quote of three SINGLE-stream Family lines — Business
// Pro $675 Monthly, the composable Upgrades line $55 Monthly, Backup & DR
// Shield $580 Monthly — reported $1,255 and "1 item at custom pricing" instead
// of $1,310 Initial Payment. The customer email carried its own copy of the
// same defective trigger the Cart, Review & Finalise and the proposal/PDF had:
// the stream-aware Family block activated only when some Family item had MORE
// THAN one payment stream. With every line carrying exactly one, the email fell
// back to flat price/cycle totals — and the composable Upgrade's flat price is
// null by construction while its legPaymentSummaries correctly carry $55, so it
// was classified as unpriced and its $55 never reached the total.
//
// $675 + $580 = $1,255, exactly the reported figure. The corrected trigger asks
// whether authoritative summaries EXIST (>= 1), because one resolved stream is
// every bit as authoritative as three.
//
// The existing notification-templates-family-quote-parity.php cannot catch this:
// its fixture deliberately contains a multi-stream primary, so the old trigger
// was already satisfied there. This file is the single-stream case.
//
// Usage: php tests/notification-templates-initial-payment-trigger.php

if (!function_exists('esc_html')) {
    function esc_html(mixed $value): string { return htmlspecialchars((string) $value, ENT_QUOTES); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Notifications\NotificationTemplates;

function check_initial_payment_trigger(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Notification templates Initial Payment trigger: ' . $message);
    }
}

/** One ongoing monthly stream — the shape every line in the live quote had. */
function ongoing_monthly_stream(string $source, float $price): array
{
    return [
        'source' => $source,
        'billingCycle' => 'monthly',
        'price' => $price,
        'startMonth' => 0,
        'endMonth' => null,
        'isOngoing' => true,
        'occurrenceMonths' => [0],
        'subtotal' => null,
    ];
}

$businessPro = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS01', 'familyTitle' => 'KAIROS',
    'tierInstanceId' => 'ti_kairos', 'tierInstancePlatformId' => 'CZTG-KAIROS01',
    'tierOccupantId' => 'occ_business_pro', 'tierPlatformId' => 'CZT-KAIROS001',
    'tierEditionPlatformId' => null, 'tierEditionTitle' => null,
    'tierId' => 'business_pro', 'tierTitle' => 'Business Pro',
    'price' => 675, 'billingCycle' => 'monthly', 'isAddon' => false,
    'features' => [], 'inclusionItems' => null,
    'legPaymentSummaries' => [ongoing_monthly_stream('leg_default', 675)],
];

// The composable Upgrade, as ComposableOfferBrowser.tsx builds it: non-add-on,
// isComposable, and a NULL flat price alongside real streams. That null price is
// precisely what the flat fallback mistook for "custom pricing".
$upgrades = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS01', 'familyTitle' => 'KAIROS',
    'tierInstanceId' => 'ti_kairos', 'tierInstancePlatformId' => 'CZTG-KAIROS01',
    'tierOccupantId' => 'occ_composable', 'tierPlatformId' => 'CZT-KAIROSC01',
    'tierEditionPlatformId' => null, 'tierEditionTitle' => null,
    'tierId' => 'composable', 'tierTitle' => 'Build Your Own',
    'price' => null, 'billingCycle' => '', 'isAddon' => false, 'isComposable' => true,
    'features' => [], 'inclusionItems' => null,
    'legPaymentSummaries' => [ongoing_monthly_stream('leg_composable', 55)],
];

$backupShield = [
    'offer_type' => 'family_tier',
    'familyId' => 'pcg_kairos', 'familyPlatformId' => 'CZPG-KAIROS01', 'familyTitle' => 'KAIROS',
    'tierInstanceId' => 'ti_kairos', 'tierInstancePlatformId' => 'CZTG-KAIROS01',
    'tierOccupantId' => 'occ_backup', 'tierPlatformId' => 'CZTA-KAIROS01',
    'tierEditionPlatformId' => null, 'tierEditionTitle' => null,
    'tierId' => 'backup_dr', 'tierTitle' => 'Backup & DR Shield',
    'price' => 580, 'billingCycle' => 'monthly', 'isAddon' => true,
    'features' => [], 'inclusionItems' => null,
    'legPaymentSummaries' => [ongoing_monthly_stream('leg_backup', 580)],
];

$liveData = [
    'type' => 'quote_cart', 'quote_ref' => 'CZ-KAIROS1', 'contact' => 'Jane Doe', 'company' => 'Acme Co',
    'email' => 'jane@example.com', 'phone' => '555-0100', 'notes' => '', 'category' => '',
    'submitted' => '2026-09-12 00:00:00',
    'items' => [$businessPro, $upgrades, $backupShield],
];

$adminHtml    = NotificationTemplates::buildAdminHtmlEmail($liveData);
$customerHtml = NotificationTemplates::buildCustomerHtmlEmail($liveData, 'CompuZign');

// ── 1. The reported figure, on both audiences ────────────────────────────
foreach (['admin' => $adminHtml, 'customer' => $customerHtml] as $audience => $html) {
    check_initial_payment_trigger(
        str_contains($html, 'Initial Payment'),
        "{$audience} email must render an Initial Payment row for a single-stream quote",
    );
    check_initial_payment_trigger(
        str_contains($html, '$1,310.00'),
        "{$audience} email Initial Payment must be \$675 + \$55 + \$580 = \$1,310.00",
    );
    // Directional proof: $1,255 is precisely what the old trigger produced.
    check_initial_payment_trigger(
        !str_contains($html, '$1,255.00'),
        "{$audience} email must not fall back to the flat \$1,255.00 that omitted the composable Upgrade",
    );
    check_initial_payment_trigger(
        !str_contains($html, 'custom pricing'),
        "{$audience} email must not report the stream-priced Upgrade as custom pricing",
    );
    // Every line still appears by its own quoted identity. The composable
    // line reads "Upgrades" here because a primary for the same Family +
    // Tier Instance is quoted alongside it (composableCoexistsWithPrimary()) —
    // the same wording the cart uses, and the wording in Nath's screenshots.
    foreach (['Business Pro', 'Upgrades', 'Backup &amp; DR Shield'] as $label) {
        check_initial_payment_trigger(
            str_contains($html, $label),
            "{$audience} email omits quoted line {$label}",
        );
    }
}

// ── 2. Ongoing contract behavior is unchanged ────────────────────────────
// Every stream here is open-ended, so no finite Total Contract Value exists and
// none may be fabricated — the corrected trigger must not invent one.
check_initial_payment_trigger(
    !str_contains($customerHtml, 'Total Contract Value'),
    'an all-ongoing quote must not report a finite Total Contract Value',
);

// ── 3. Legacy compatibility — no summaries, flat path retained ───────────
// A quote whose items carry no legPaymentSummaries at all must still render the
// ordinary flat cycle totals and no Initial Payment row.
$legacyServiceItem = [
    'serviceId' => 101, 'serviceTitle' => 'Legacy Backup', 'categoryName' => 'Backup',
    'tierId' => 'standard', 'tierTitle' => 'Standard', 'price' => 49, 'billingCycle' => 'monthly',
    'features' => [], 'offer_type' => '', 'promotion_id' => '', 'billing_label' => '', 'isAddon' => false,
    'minimumTermValue' => null, 'minimumTermUnit' => null,
];
$legacyData = array_merge($liveData, ['quote_ref' => 'CZ-LEGACY1', 'items' => [$legacyServiceItem]]);
$legacyHtml = NotificationTemplates::buildCustomerHtmlEmail($legacyData, 'CompuZign');
check_initial_payment_trigger(
    !str_contains($legacyHtml, 'Initial Payment'),
    'a quote with no payment summaries at all renders no Initial Payment row',
);
check_initial_payment_trigger(
    str_contains($legacyHtml, '$49.00'),
    'and keeps its ordinary flat cycle total',
);

echo "Notification templates Initial Payment trigger checks passed.\n";
