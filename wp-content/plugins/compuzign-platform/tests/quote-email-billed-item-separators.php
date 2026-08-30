<?php

declare(strict_types=1);

// Quote receipt email: a subtle divider must sit between every pair of
// adjacent top-level billed item blocks (legacy Tier/promo, legacy Bundle,
// Tier add-on, Family main, Family add-on — any mix, in
// buildQuoteSections()'s own section order) — never before the first item,
// never after the last, and never between one item's own inclusion rows.
// See NotificationTemplates::emailItemDivider().

if (!function_exists('esc_html')) {
    function esc_html(mixed $value): string { return htmlspecialchars((string) $value, ENT_QUOTES); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Notifications\NotificationTemplates;

function check_separator(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Quote email billed-item separators: ' . $message);
    }
}

const DIVIDER_MARKER = 'border-top:1px solid #e3e3e3';

function baseData(array $items): array
{
    return [
        'type'      => 'quote_cart',
        'quote_ref' => 'CZ-SEP001',
        'contact'   => 'Jane Doe',
        'company'   => 'Acme Co',
        'email'     => 'jane@example.com',
        'phone'     => '555-0100',
        'notes'     => '',
        'category'  => '',
        'submitted' => '2026-08-30 00:00:00',
        'items'     => $items,
    ];
}

// A plain legacy Tier item — mainItems bucket.
$kairos = [
    'offer_type'   => 'tier',
    'serviceId'    => 1,
    'serviceTitle' => 'KAIROS',
    'tierTitle'    => 'IaaS Starter Cloud',
    'tierId'       => 'starter',
    'price'        => 100,
    'billingCycle' => 'monthly',
    'isAddon'      => false,
    'features'     => [],
];

// A Family item with a Bundle's multiple inclusion children — familyMainItems
// bucket. Exercises emailInclusionItemsList() with several rows, so the
// divider count staying correct proves inclusion rows never grow it.
$omnia = [
    'offer_type'            => 'family_tier',
    'familyTitle'           => 'OMNIA',
    'familyPlatformId'      => 'CZPG-OMNIA001',
    'tierInstancePlatformId' => 'CZTG-OMNIA001',
    'tierTitle'             => 'Omnia Basic',
    'tierPlatformId'        => 'CZT-OMNIA0001',
    'tierEditionPlatformId' => 'CZTE-OMNIA001',
    'tierEditionTitle'      => null,
    'price'                 => 200,
    'billingCycle'          => 'monthly',
    'isAddon'               => false,
    'inclusionItems'        => [
        [
            'id' => 'bundle_1', 'label' => 'Foundation Bundle', 'bundle_id' => 'rsb_1',
            'includes' => [
                ['id' => 'row_a', 'label' => 'Website Revamp', 'quantity' => 1],
                ['id' => 'row_b', 'label' => 'Online Banking', 'quantity' => 1],
            ],
        ],
    ],
    'legPaymentSummaries' => null,
    'features'            => [],
];

// A legacy Tier add-on item — tierAddonItems bucket.
$backupAddon = [
    'offer_type'   => 'tier',
    'serviceId'    => 2,
    'serviceTitle' => 'Backup & DR Shield',
    'tierTitle'    => 'Optional add-on',
    'tierId'       => 'addon',
    'price'        => 50,
    'billingCycle' => 'monthly',
    'isAddon'      => true,
    'features'     => [],
];

foreach ([
    ['label' => 'one item', 'items' => [$kairos], 'expectedDividers' => 0],
    ['label' => 'two items', 'items' => [$kairos, $omnia], 'expectedDividers' => 1],
    ['label' => 'three items', 'items' => [$kairos, $omnia, $backupAddon], 'expectedDividers' => 2],
] as $case) {
    $data         = baseData($case['items']);
    $adminHtml    = NotificationTemplates::buildAdminHtmlEmail($data);
    $customerHtml = NotificationTemplates::buildCustomerHtmlEmail($data, 'CompuZign');

    check_separator(
        substr_count($adminHtml, DIVIDER_MARKER) === $case['expectedDividers'],
        "admin email has {$case['expectedDividers']} dividers for {$case['label']}"
    );
    check_separator(
        substr_count($customerHtml, DIVIDER_MARKER) === $case['expectedDividers'],
        "customer email has {$case['expectedDividers']} dividers for {$case['label']}"
    );
}

// ── Position checks (three-item case): divider sits strictly between item
//    blocks, never before the first title or after the last. ──────────────

$threeItemHtml = NotificationTemplates::buildCustomerHtmlEmail(baseData([$kairos, $omnia, $backupAddon]), 'CompuZign');

$kairosPos   = strpos($threeItemHtml, 'IaaS Starter Cloud');
$omniaPos    = strpos($threeItemHtml, 'Omnia Basic');
$backupPos   = strpos($threeItemHtml, 'Backup &amp; DR Shield');
$firstDivider  = strpos($threeItemHtml, DIVIDER_MARKER);
$secondDivider = strpos($threeItemHtml, DIVIDER_MARKER, $firstDivider + 1);

check_separator($kairosPos !== false && $omniaPos !== false && $backupPos !== false, 'all three item titles render');
check_separator($firstDivider !== false && $secondDivider !== false, 'exactly two dividers are found by sequential search');
check_separator($kairosPos < $firstDivider, 'the first item\'s own title renders before the first divider — no divider precedes the first item');
check_separator($firstDivider < $omniaPos, 'the first divider sits before the second item\'s title');
check_separator($omniaPos < $secondDivider, 'the second item\'s title renders before the second divider');
check_separator($secondDivider < $backupPos, 'the second divider sits before the third item\'s title');

// The divider must never land between OMNIA's own header and its Bundle's
// inclusion rows — both inclusion labels must fall strictly between the
// first and second dividers, not have a divider interleaved among them.
$websiteRevampPos = strpos($threeItemHtml, 'Website Revamp');
$onlineBankingPos = strpos($threeItemHtml, 'Online Banking');
check_separator(
    $websiteRevampPos !== false && $onlineBankingPos !== false
        && $websiteRevampPos > $firstDivider && $websiteRevampPos < $secondDivider
        && $onlineBankingPos > $firstDivider && $onlineBankingPos < $secondDivider,
    'a Bundle\'s inclusion rows stay grouped under their own parent item, with no divider interleaved among them'
);

echo "Quote email billed-item separator checks passed.\n";
