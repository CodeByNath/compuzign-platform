<?php

declare(strict_types=1);

// Focused standalone contract test. The plugin has no PHPUnit/bootstrap test
// suite; PackageManagerSchema is pure apart from WordPress text sanitization.
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string
    {
        return trim(strip_tags((string) $value));
    }
}

require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageManagerSchema.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema as PMS;

function assertSameValue(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

function itemBySource(array $model, string $type, string $sourceId): array
{
    foreach ($model['items'] as $item) {
        if ($item['source_type'] === $type && $item['source_id'] === $sourceId) {
            return $item;
        }
    }
    fwrite(STDERR, "FAIL: missing {$type}:{$sourceId}\n");
    exit(1);
}

$incPool = [
    ['id' => 'inc-a', 'label' => 'Feature A'],
    ['id' => 'inc-b', 'label' => 'Feature B'],
];
$faqPool = [['id' => 'faq-a', 'question' => 'Question A?', 'answer' => 'Answer A']];

// Provisional-only source rows do not constitute Manager configuration.
$empty = PMS::defaultManager();
$provisional = PMS::buildReadModel(10, $empty, $incPool, $faqPool, 'active');
assertSameValue(false, $provisional['has_configuration'], 'provisional-only Manager is not configured');
assertSameValue('not-configured', itemBySource($provisional, 'inclusion', 'inc-a')['module_transition'], 'provisional item is not configured');

// A persisted group is Manager-owned configuration even without item rows.
$groupManager = ['groups' => [['group_id' => 'core', 'label' => 'Core', 'sort_order' => 0]], 'items' => []];
$groupModel = PMS::buildReadModel(10, $groupManager, $incPool, $faqPool, 'active');
assertSameValue(true, $groupModel['has_configuration'], 'persisted group marks Manager configured');

$itemOnly = PMS::commitConfiguration(
    $empty,
    [],
    [['source_type' => 'inclusion', 'source_id' => 'inc-a', 'disabled' => false]],
    $incPool,
    $faqPool
);
$itemOnlyModel = PMS::buildReadModel(10, $itemOnly, $incPool, $faqPool, 'active');
assertSameValue(true, $itemOnlyModel['has_configuration'], 'persisted item decision alone marks Manager configured');

// Save one explicit decision. The untouched provisional item remains absent
// from storage and not-configured in the returned operational model.
$saved = PMS::commitConfiguration(
    $empty,
    [['group_id' => 'core', 'label' => 'Core', 'sort_order' => 0]],
    [[
        'item_id'         => PMS::deriveItemId('inclusion', 'inc-a'),
        'source_type'     => 'inclusion',
        'source_id'       => 'inc-a',
        'group_id'        => 'core',
        'sort_order'      => 3,
        'disabled'        => false,
        'decorated_label' => 'Decorated A',
    ]],
    $incPool,
    $faqPool
);
$savedModel = PMS::buildReadModel(10, $saved, $incPool, $faqPool, 'active');
assertSameValue(true, $savedModel['has_configuration'], 'persisted item decision marks Manager configured');
assertSameValue(1, count($saved['items']), 'only an explicit decision is persisted');
assertSameValue('settled', itemBySource($savedModel, 'inclusion', 'inc-a')['module_transition'], 'submitted decision is settled');
assertSameValue('not-configured', itemBySource($savedModel, 'inclusion', 'inc-b')['module_transition'], 'untouched provisional item remains not configured');

// Omitted persisted decisions survive a later commit. A source that appeared
// between reads remains provisional because it was not submitted.
$expandedPool = [...$incPool, ['id' => 'inc-c', 'label' => 'Feature C']];
$savedAgain = PMS::commitConfiguration(
    $saved,
    [['group_id' => 'core', 'label' => 'Core', 'sort_order' => 0]],
    [[
        'source_type' => 'faq',
        'source_id'   => 'faq-a',
        'group_id'    => 'core',
        'sort_order'  => 4,
        'disabled'    => true,
    ]],
    $expandedPool,
    $faqPool
);
$againModel = PMS::buildReadModel(10, $savedAgain, $expandedPool, $faqPool, 'active');
assertSameValue(2, count($savedAgain['items']), 'omitted persisted decision is preserved');
assertSameValue('settled', itemBySource($againModel, 'inclusion', 'inc-a')['module_transition'], 'omitted persisted decision stays settled');
assertSameValue('not-configured', itemBySource($againModel, 'inclusion', 'inc-c')['module_transition'], 'new pool item stays provisional');

// Invalid/removed groups normalize preserved and submitted decisions to the
// ungrouped bucket without deleting either decision.
$ungrouped = PMS::commitConfiguration(
    $savedAgain,
    [],
    [[
        'source_type' => 'inclusion',
        'source_id'   => 'inc-b',
        'group_id'    => 'does-not-exist',
        'sort_order'  => 1,
    ]],
    $expandedPool,
    $faqPool
);
$ungroupedModel = PMS::buildReadModel(10, $ungrouped, $expandedPool, $faqPool, 'active');
assertSameValue(null, itemBySource($ungroupedModel, 'inclusion', 'inc-a')['group_id'], 'removed group normalizes preserved decision');
assertSameValue(null, itemBySource($ungroupedModel, 'inclusion', 'inc-b')['group_id'], 'invalid submitted group normalizes safely');

// A removed source persists as missing. When it returns, deterministic
// identity reconnects the same settled decision and decoration.
$withoutA = array_values(array_filter($expandedPool, fn(array $i): bool => $i['id'] !== 'inc-a'));
$missingModel = PMS::buildReadModel(10, $ungrouped, $withoutA, $faqPool, 'active');
$missingA = itemBySource($missingModel, 'inclusion', 'inc-a');
assertSameValue(true, $missingA['missing'], 'removed source decision is preserved as missing');
assertSameValue(PMS::deriveItemId('inclusion', 'inc-a'), $missingA['item_id'], 'missing decision keeps deterministic identity');
assertSameValue(
    [['id' => 'inc-b', 'label' => 'Feature B']],
    $missingModel['projections']['inclusions'],
    'missing settled decision is excluded from consumer projections'
);

$returnedModel = PMS::buildReadModel(10, $ungrouped, $expandedPool, $faqPool, 'active');
$returnedA = itemBySource($returnedModel, 'inclusion', 'inc-a');
assertSameValue(false, $returnedA['missing'], 'returning source resolves again');
assertSameValue('Decorated A', $returnedA['decorated_label'], 'returning source recovers persisted Manager decision');

// Consumer projection gate: only settled, resolving, enabled decisions under
// an active parent are exposed. Provisional, disabled, and missing are out.
assertSameValue(
    [['id' => 'inc-a', 'label' => 'Decorated A'], ['id' => 'inc-b', 'label' => 'Feature B']],
    $returnedModel['projections']['inclusions'],
    'active consumer projection includes only eligible settled decisions'
);
assertSameValue([], $returnedModel['projections']['faqs'], 'disabled FAQ decision is unavailable');
$inactiveModel = PMS::buildReadModel(10, $ungrouped, $expandedPool, $faqPool, 'disabled');
assertSameValue([], $inactiveModel['projections']['inclusions'], 'inactive parent gates consumer projections');

// Rate Sheets are Package Manager-owned catalogue data. They reference the
// same stable relationship item identity, own separate groups, and never
// write into Tier pricing.
$withRateSheet = PMS::commitConfiguration(
    $ungrouped,
    [],
    [],
    $expandedPool,
    $faqPool,
    [
        'title' => 'Infrastructure',
        'groups' => [['group_id' => 'compute', 'label' => 'Compute', 'sort_order' => 0]],
        'items' => [[
            'item_id' => 'rate-1',
            'source_item_id' => PMS::deriveItemId('inclusion', 'inc-a'),
            'unit_price' => 36,
            'per' => 'Per VM',
            'quantity' => 2,
            'group_id' => 'compute',
            'sort_order' => 0,
        ]],
    ]
);
$rateModel = PMS::buildReadModel(10, $withRateSheet, $expandedPool, $faqPool, 'active');
assertSameValue('Infrastructure', $rateModel['rate_sheet']['title'], 'Rate Sheet is returned in the Manager read model');
assertSameValue('compute', $rateModel['rate_sheet']['items'][0]['group_id'], 'Rate Sheet groups are persisted independently');
assertSameValue('Per VM', $rateModel['rate_sheet']['items'][0]['per'], 'controlled Rate Sheet unit is preserved');
assertSameValue(true, $rateModel['has_configuration'], 'Rate Sheet alone contributes Manager configuration');

$rejectedUnknownOption = false;
try {
    PMS::commitConfiguration($ungrouped, [], [], $expandedPool, $faqPool, [
        'title' => 'Invalid', 'groups' => [], 'items' => [[
            'item_id' => 'rate-invalid', 'source_item_id' => 'unknown',
            'unit_price' => 1, 'per' => 'Per item', 'quantity' => 1,
            'group_id' => null, 'sort_order' => 0,
        ]],
    ]);
} catch (InvalidArgumentException) {
    $rejectedUnknownOption = true;
}
assertSameValue(true, $rejectedUnknownOption, 'Rate Sheet rejects fabricated Package relationship identities');

$tierProjection = PMS::projectTierRateSheet(10, $withRateSheet, [
    ['item_id' => 'rate-1', 'quantity' => 2],
], $expandedPool, $faqPool, 'active');
assertSameValue(72.0, $tierProjection['price'], 'Tier price is Rate Sheet unit price multiplied by Tier quantity');
assertSameValue(2, $tierProjection['selections'][0]['quantity'], 'Tier projection retains only the consuming quantity');
assertSameValue('Decorated A', $tierProjection['selections'][0]['label'], 'Tier projection resolves the current Package relationship display label');
$emptyTierProjection = PMS::projectTierRateSheet(10, $withRateSheet, [], $expandedPool, $faqPool, 'active');
assertSameValue(null, $emptyTierProjection['price'], 'Tier with no Rate Sheet selections has no legacy price fallback');
$unresolvedTierProjection = PMS::projectTierRateSheet(10, $withRateSheet, [
    ['item_id' => 'removed-rate-item', 'quantity' => 3],
], $expandedPool, $faqPool, 'active');
assertSameValue(false, $unresolvedTierProjection['selections'][0]['resolved'], 'removed Rate Sheet references remain visible as unresolved');
assertSameValue(null, $unresolvedTierProjection['price'], 'unresolved references do not fabricate a Tier price');

fwrite(STDOUT, "PackageManagerSchema contract tests passed.\n");
