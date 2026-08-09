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

require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageCategoryGroups.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageManagerSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageStationSchema.php';

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
assertSameValue('connected_unavailable', itemBySource($provisional, 'inclusion', 'inc-a')['operational_state'], 'unsettled connection resolves but is unavailable');

$sourceIncA     = PMS::deriveItemId('inclusion', 'inc-a');
$sourceIncA22   = PMS::deriveItemId('inclusion', 'service:22:inc-a');
$multiSourcePool = [...$incPool, ['id' => 'service:22:inc-a', 'label' => 'Feature A from another Service']];
$multiSource = PMS::commitConfiguration(
    $empty,
    [],
    [],
    $multiSourcePool,
    $faqPool,
    [[
        // One curated Rate Sheet (blank id → backend-minted). Independent
        // curation: only the rows the admin added, never a blanket auto-onboard.
        'title'  => 'Commercial catalogue',
        'status' => 'active',
        'groups' => [],
        'items'  => [
            ['source_item_id' => $sourceIncA,   'unit_price' => 0, 'per' => 'Per item', 'quantity' => 1],
            ['source_item_id' => $sourceIncA22, 'unit_price' => 0, 'per' => 'Per item', 'quantity' => 1],
        ],
    ]],
    [
        ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 10],
        ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 22],
    ]
);
assertSameValue(2, count($multiSource['sources']), 'Package persists multiple source Services as supply relationships');
assertSameValue(1, count($multiSource['rate_sheets']), 'a curated Rate Sheet is created');
assertSameValue(true, str_starts_with($multiSource['rate_sheets'][0]['rate_sheet_id'], 'rs_'), 'a new sheet receives a backend-minted id');
assertSameValue(2, count($multiSource['rate_sheets'][0]['items']), 'only curated rows are stored — no blanket auto-onboard');
assertSameValue('Per item', $multiSource['rate_sheets'][0]['items'][0]['per'], 'curated rows keep their commercial unit');
assertSameValue(PMS::deriveRateItemId($sourceIncA), $multiSource['rate_sheets'][0]['items'][0]['item_id'], 'row identity derives from its source (backend mints, Tool sends blank)');
$secondServicePool = $multiSourcePool;
$commercialModel = PMS::buildReadModel(
    10,
    $multiSource,
    array_map(fn(array $item): array => [...$item, '_source_available' => true], $secondServicePool),
    array_map(fn(array $item): array => [...$item, '_source_available' => true], $faqPool),
    'active'
);
assertSameValue('settled', itemBySource($commercialModel, 'inclusion', 'inc-a')['module_transition'], 'Rate Sheet participation is the commercial relationship decision');
assertSameValue(true, itemBySource($commercialModel, 'inclusion', 'inc-a')['available'], 'Rate Sheet supplied content is immediately available to Tier pricing');

$multiSourceSavedAgain = PMS::commitConfiguration(
    $multiSource,
    [],
    [],
    $secondServicePool,
    $faqPool,
    $multiSource['rate_sheets'],
    $multiSource['sources']
);
assertSameValue($multiSource['sources'], $multiSourceSavedAgain['sources'], 'sequential save preserves both source relationships without emitting an implicit duplicate');
assertSameValue(
    array_column($multiSource['rate_sheets'][0]['items'], 'source_item_id'),
    array_column($multiSourceSavedAgain['rate_sheets'][0]['items'], 'source_item_id'),
    'sequential save preserves stable namespaced Rate Sheet source references'
);
assertSameValue(1, count($multiSourceSavedAgain['rate_sheets']), 'an unchanged sheet upserts in place rather than duplicating');

$unavailablePool = [['id' => 'inc-a', 'label' => 'Feature A', '_source_available' => false]];
$unavailableModel = PMS::buildReadModel(10, $empty, $unavailablePool, [], 'active');
assertSameValue('connected_unavailable', itemBySource($unavailableModel, 'inclusion', 'inc-a')['operational_state'], 'source-provider availability fails closed independently of the Package host');

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
assertSameValue('connected_available', $returnedA['operational_state'], 'returning settled source becomes available');

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
$inactiveA = itemBySource($inactiveModel, 'inclusion', 'inc-a');
assertSameValue(true, $inactiveA['connection_resolved'], 'inactive service does not break its connection');
assertSameValue(false, $inactiveA['available'], 'inactive service switches supply off');
assertSameValue('connected_unavailable', $inactiveA['operational_state'], 'inactive service is unavailable rather than missing');
assertSameValue($returnedA['item_id'], $inactiveA['item_id'], 'availability transition preserves relationship identity');

// Rate Sheets are Package Manager-owned catalogue data. They reference the
// same stable relationship item identity, own separate groups, and never
// write into Tier pricing.
$withRateSheet = PMS::commitConfiguration(
    $ungrouped,
    [],
    [],
    $expandedPool,
    $faqPool,
    [[
        'rate_sheet_id' => 'rs_infra',
        'title' => 'Infrastructure',
        'status' => 'active',
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
    ]]
);
$rateModel = PMS::buildReadModel(10, $withRateSheet, $expandedPool, $faqPool, 'active');
assertSameValue('Infrastructure', $rateModel['rate_sheets'][0]['title'], 'Rate Sheet is returned in the Manager read model');
assertSameValue('compute', $rateModel['rate_sheets'][0]['items'][0]['group_id'], 'Rate Sheet groups are persisted independently');
assertSameValue('Per VM', $rateModel['rate_sheets'][0]['items'][0]['per'], 'controlled Rate Sheet unit is preserved');
assertSameValue(true, $rateModel['has_configuration'], 'Rate Sheet alone contributes Manager configuration');

// CZPRCI is output-only owner storage. Repricing, quantity/unit/order changes,
// and regrouping preserve it by (rate_sheet_id,item_id); deleting the group
// merely makes the surviving row ungrouped.
$withRateSheet['rate_sheets'][0]['items'][0]['cz_platform_id'] = 'CZPRCI22222';
$rowChanged = PMS::commitConfiguration(
    $withRateSheet, [], [], $expandedPool, $faqPool, [[
        'rate_sheet_id' => 'rs_infra', 'title' => 'Infrastructure', 'status' => 'active',
        'groups' => [],
        'items' => [[
            'item_id' => 'rate-1', 'source_item_id' => PMS::deriveItemId('inclusion', 'inc-a'),
            'unit_price' => 72, 'per' => 'Per item', 'quantity' => 4,
            'group_id' => null, 'sort_order' => 9,
        ]],
    ]]
);
assertSameValue('CZPRCI22222', $rowChanged['rate_sheets'][0]['items'][0]['cz_platform_id'], 'row CZPRCI survives price, quantity, unit, order, and group changes');
assertSameValue(null, $rowChanged['rate_sheets'][0]['items'][0]['group_id'], 'deleting a Rate Sheet Group preserves and ungroups its row');
$rowChangedModel = PMS::buildReadModel(10, $rowChanged, $expandedPool, $faqPool, 'active');
assertSameValue('CZPRCI22222', $rowChangedModel['rate_sheets'][0]['items'][0]['platform_id'], 'row identity is projected output-only');
assertSameValue(false, array_key_exists('cz_platform_id', $rowChangedModel['rate_sheets'][0]['items'][0]), 'stored row scalar is not exposed as a writable field');

// ── Price Options: children of the row, never a second row, never migrated
//    from the row's own Default Price ─────────────────────────────────────────
$withPriceOption = PMS::commitConfiguration(
    $withRateSheet, [], [], $expandedPool, $faqPool, [[
        'rate_sheet_id' => 'rs_infra', 'title' => 'Infrastructure', 'status' => 'active',
        'groups' => [],
        'items' => [[
            'item_id' => 'rate-1', 'source_item_id' => PMS::deriveItemId('inclusion', 'inc-a'),
            'unit_price' => 36, 'per' => 'Per VM', 'quantity' => 2,
            'group_id' => null, 'sort_order' => 0,
            'price_options' => [[
                'option_id' => '', 'label' => 'Annual', 'unit_price' => -5,
            ]],
        ]],
    ]]
);
$firstOption = $withPriceOption['rate_sheets'][0]['items'][0]['price_options'][0];
assertSameValue(36.0, $withPriceOption['rate_sheets'][0]['items'][0]['unit_price'], "adding a price option never touches the row's own Default Price");
assertSameValue(true, $firstOption['option_id'] !== '', 'a blank option_id is minted on the write path, never left blank');
assertSameValue(false, str_starts_with($firstOption['option_id'], 'CZPRCI'), "a minted option_id is a native id, not a hand-derived/concatenated Platform ID");
assertSameValue('Annual', $firstOption['label'], 'a price option label is preserved');
assertSameValue(0, $firstOption['unit_price'], 'a price option unit_price is clamped to zero, same as the row\'s own unit_price');
assertSameValue('', $firstOption['cz_platform_id'], 'a freshly minted price option starts with no bound Platform ID — the REST layer reserves/binds it');

// Simulate the REST layer having bound CZPRCIO, then a second save that
// renames/reprices the option: identity must survive, exactly like the row's
// own CZPRCI survives repricing.
$mintedOptionId = $firstOption['option_id'];
$withPriceOption['rate_sheets'][0]['items'][0]['price_options'][0]['cz_platform_id'] = 'CZPRCIO22222';
$optionRepriced = PMS::commitConfiguration(
    $withPriceOption, [], [], $expandedPool, $faqPool, [[
        'rate_sheet_id' => 'rs_infra', 'title' => 'Infrastructure', 'status' => 'active',
        'groups' => [],
        'items' => [[
            'item_id' => 'rate-1', 'source_item_id' => PMS::deriveItemId('inclusion', 'inc-a'),
            'unit_price' => 36, 'per' => 'Per VM', 'quantity' => 2,
            'group_id' => null, 'sort_order' => 0,
            'price_options' => [[
                'option_id' => $mintedOptionId, 'label' => 'Annual (renamed)', 'unit_price' => 300,
            ]],
        ]],
    ]]
);
$repricedOption = $optionRepriced['rate_sheets'][0]['items'][0]['price_options'][0];
assertSameValue($mintedOptionId, $repricedOption['option_id'], 'renaming/repricing a price option never remints its option_id');
assertSameValue('CZPRCIO22222', $repricedOption['cz_platform_id'], "a price option's bound CZPRCIO survives label/price changes, exactly like the row's own CZPRCI");
assertSameValue('Annual (renamed)', $repricedOption['label'], 'a price option label change is applied');
assertSameValue(300.0, $repricedOption['unit_price'], 'a price option price change is applied');

// Omitting price_options entirely — the ordinary shape of a row with none —
// leaves the row itself completely unchanged (existing behavior preserved).
$noOptions = PMS::commitConfiguration(
    $withRateSheet, [], [], $expandedPool, $faqPool, [[
        'rate_sheet_id' => 'rs_infra', 'title' => 'Infrastructure', 'status' => 'active',
        'groups' => [],
        'items' => [[
            'item_id' => 'rate-1', 'source_item_id' => PMS::deriveItemId('inclusion', 'inc-a'),
            'unit_price' => 36, 'per' => 'Per VM', 'quantity' => 2,
            'group_id' => null, 'sort_order' => 0,
        ]],
    ]]
);
assertSameValue([], $noOptions['rate_sheets'][0]['items'][0]['price_options'], 'a row with no price_options key sanitizes to an empty array, not an error');
assertSameValue(36.0, $noOptions['rate_sheets'][0]['items'][0]['unit_price'], 'a row with zero price options keeps its own unit_price exactly as before this feature');

// Removing a price option (omitted from the submitted array) drops it —
// mirrors row/group/sheet removal-by-omission-plus-explicit-set already
// proven above; this is the same partial-upsert mechanism one level deeper.
$optionRemoved = PMS::commitConfiguration(
    $optionRepriced, [], [], $expandedPool, $faqPool, [[
        'rate_sheet_id' => 'rs_infra', 'title' => 'Infrastructure', 'status' => 'active',
        'groups' => [],
        'items' => [[
            'item_id' => 'rate-1', 'source_item_id' => PMS::deriveItemId('inclusion', 'inc-a'),
            'unit_price' => 36, 'per' => 'Per VM', 'quantity' => 2,
            'group_id' => null, 'sort_order' => 0,
            'price_options' => [],
        ]],
    ]]
);
assertSameValue([], $optionRemoved['rate_sheets'][0]['items'][0]['price_options'], 'a price option omitted from the submitted set is removed');
assertSameValue(36.0, $optionRemoved['rate_sheets'][0]['items'][0]['unit_price'], "removing every price option never touches the row's own Default Price");

$priceOptionModel = PMS::buildReadModel(10, $optionRepriced, $expandedPool, $faqPool, 'active');
$projectedOption = $priceOptionModel['rate_sheets'][0]['items'][0]['price_options'][0];
assertSameValue('CZPRCIO22222', $projectedOption['platform_id'], 'a price option Platform ID is projected output-only, mirroring the row itself');
assertSameValue(false, array_key_exists('cz_platform_id', $projectedOption), 'a price option\'s stored scalar is not exposed as a writable field');

// ── Curated unit vocabulary ──────────────────────────────────────────────────
// The unit list is data. A row may only carry a unit the vocabulary knows, so a
// row can never introduce one by using it.
$units = PMS::sanitizeRateSheetUnits(['Per rack', '  Per node  ', '', 'Per rack', 'per RACK', 'Per item', str_repeat('x', 40), 42]);
assertSameValue(['Per rack', 'Per node'], $units, 'curated units are trimmed, deduped case-insensitively, and bounded');
assertSameValue(
    ['Per VM', 'Per GB', 'Per TB', 'Per vCPU', 'Per user', 'Per month', 'Per item', 'Per rack'],
    PMS::allowedRateSheetUnits(['Per rack']),
    'the vocabulary is the built-in seven followed by what the Manager curated'
);

$customRow = static fn(string $per): array => ['rate_sheets' => [[
    'rate_sheet_id' => 'rs_units', 'title' => 'Units', 'status' => 'active', 'groups' => [],
    'items' => [[
        'item_id' => 'rate-u', 'source_item_id' => PMS::deriveItemId('inclusion', 'inc-a'),
        'unit_price' => 5, 'per' => $per, 'quantity' => 1, 'group_id' => null, 'sort_order' => 0,
    ]],
]]];

$knownUnit = PMS::sanitize([...$customRow('Per rack'), 'rate_sheet_units' => ['Per rack']]);
assertSameValue('Per rack', $knownUnit['rate_sheets'][0]['items'][0]['per'], 'a row keeps a curated unit the vocabulary knows');
assertSameValue(['Per rack'], $knownUnit['rate_sheet_units'], 'the curated vocabulary is stored beside the sheets');

$unknownUnit = PMS::sanitize($customRow('Per rack'));
assertSameValue('', $unknownUnit['rate_sheets'][0]['items'][0]['per'], 'a unit no vocabulary knows still fails closed');
assertSameValue([], $unknownUnit['rate_sheet_units'], 'a row cannot introduce a unit by using it');

assertSameValue(true, PMS::hasConfiguration(PMS::sanitize(['rate_sheet_units' => ['Per rack']])), 'a curated unit alone is Manager configuration');

// Phase 2 migration — a legacy SINGULAR rate_sheet lifts into the identified collection.
$legacyMigrated = PMS::sanitize(['rate_sheet' => [
    'title' => 'Legacy', 'groups' => [],
    'items' => [[
        'item_id' => 'rate-legacy', 'source_item_id' => PMS::deriveItemId('inclusion', 'inc-a'),
        'unit_price' => 10, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'sort_order' => 0,
    ]],
]]);
assertSameValue(1, count($legacyMigrated['rate_sheets']), 'singleton Rate Sheet lifts into the rate_sheets[] collection');
assertSameValue('rs_primary', $legacyMigrated['rate_sheets'][0]['rate_sheet_id'], 'the migrated sheet takes the deterministic primary id');
assertSameValue('active', $legacyMigrated['rate_sheets'][0]['status'], 'the migrated sheet defaults to active status');
assertSameValue('Legacy', $legacyMigrated['rate_sheets'][0]['title'], 'the migrated sheet preserves its title');
// Refinement 1 — read-time sanitisation preserves ids and mints nothing.
$reSanitised = PMS::sanitize($legacyMigrated);
assertSameValue('rs_primary', $reSanitised['rate_sheets'][0]['rate_sheet_id'], 'sanitising an already-migrated manager preserves the sheet id');
assertSameValue(1, count($reSanitised['rate_sheets']), 'sanitisation neither duplicates nor drops identified sheets');
$idlessRead = PMS::sanitize(['rate_sheets' => [['title' => 'No id', 'groups' => [], 'items' => []]]]);
assertSameValue(0, count($idlessRead['rate_sheets']), 'an id-less sheet is dropped on the read path (write-path minting only)');

$cleanedUnknownOption = PMS::commitConfiguration($ungrouped, [], [], $expandedPool, $faqPool, [[
        'rate_sheet_id' => 'rs_clean', 'title' => 'Invalid', 'status' => 'active', 'groups' => [], 'items' => [[
            'item_id' => 'rate-invalid', 'source_item_id' => 'unknown',
            'unit_price' => 1, 'per' => 'Per item', 'quantity' => 1,
            'group_id' => null, 'sort_order' => 0,
        ]],
    ]]);
$cleanedSheet = PMS::findRateSheet($cleanedUnknownOption['rate_sheets'], 'rs_clean');
assertSameValue(
    false,
    is_array($cleanedSheet) && in_array('unknown', array_column($cleanedSheet['items'], 'source_item_id'), true),
    'Rate Sheet removes unresolved supplied-content rows at the write boundary'
);

$tierProjection = PMS::projectTierRateSheet(10, $withRateSheet, [
    ['item_id' => 'rate-1', 'quantity' => 2],
], $expandedPool, $faqPool, 'active', 'rs_infra');
assertSameValue(72.0, $tierProjection['price'], 'Tier price is Rate Sheet unit price multiplied by Tier quantity');
assertSameValue(true, $tierProjection['pricing']['complete'], 'authoritative pricing completes for available supply');
assertSameValue(2, $tierProjection['selections'][0]['quantity'], 'Tier projection retains only the consuming quantity');
assertSameValue('Decorated A', $tierProjection['selections'][0]['label'], 'Tier projection resolves the current Package relationship display label');
// Refinement 3 — a selection resolves only within the sheet the Tier names.
$wrongSheetProjection = PMS::projectTierRateSheet(10, $withRateSheet, [
    ['item_id' => 'rate-1', 'quantity' => 2],
], $expandedPool, $faqPool, 'active', 'rs_does_not_exist');
assertSameValue(null, $wrongSheetProjection['price'], 'a selection does not resolve against an unknown Rate Sheet');
assertSameValue(false, $wrongSheetProjection['selections'][0]['resolved'], 'row identity is scoped by rate_sheet_id, never a bare item_id scan');
$emptyTierProjection = PMS::projectTierRateSheet(10, $withRateSheet, [], $expandedPool, $faqPool, 'active', 'rs_infra');
assertSameValue(null, $emptyTierProjection['price'], 'Tier with no Rate Sheet selections has no legacy price fallback');
$unresolvedTierProjection = PMS::projectTierRateSheet(10, $withRateSheet, [
    ['item_id' => 'removed-rate-item', 'quantity' => 3],
], $expandedPool, $faqPool, 'active', 'rs_infra');
assertSameValue(false, $unresolvedTierProjection['selections'][0]['resolved'], 'removed Rate Sheet references remain visible as unresolved');
assertSameValue(null, $unresolvedTierProjection['price'], 'unresolved references do not fabricate a Tier price');

// Reversible lifecycle: commercial configuration and identities survive while
// only operational availability and authoritative pricing completeness change.
$disabledProjection = PMS::projectTierRateSheet(10, $withRateSheet, [
    ['item_id' => 'rate-1', 'quantity' => 2],
], $expandedPool, $faqPool, 'disabled', 'rs_infra');
assertSameValue(true, $disabledProjection['selections'][0]['resolved'], 'disabled supply remains resolved');
assertSameValue(false, $disabledProjection['selections'][0]['available'], 'disabled supply is unavailable');
assertSameValue('connected_unavailable', $disabledProjection['selections'][0]['operational_state'], 'disabled supply has explicit operational state');
assertSameValue(null, $disabledProjection['price'], 'disabled supply fails pricing closed');
assertSameValue('unavailable_item', $disabledProjection['pricing']['unresolved'][0]['code'], 'disabled supply reaches authoritative pricing as unavailable');
$reactivatedProjection = PMS::projectTierRateSheet(10, $withRateSheet, [
    ['item_id' => 'rate-1', 'quantity' => 2],
], $expandedPool, $faqPool, 'active', 'rs_infra');
assertSameValue($tierProjection['selections'][0]['item_id'], $reactivatedProjection['selections'][0]['item_id'], 'reactivation preserves Rate Sheet identity');
assertSameValue(72.0, $reactivatedProjection['price'], 'reactivation resumes pricing');

$removedProjection = PMS::projectTierRateSheet(10, $withRateSheet, [
    ['item_id' => 'rate-1', 'quantity' => 2],
], $withoutA, $faqPool, 'active', 'rs_infra');
assertSameValue(false, $removedProjection['selections'][0]['resolved'], 'removed source is genuinely unresolved');
assertSameValue('source_missing', $removedProjection['selections'][0]['operational_state'], 'removed source is distinguished from switched-off supply');
assertSameValue(null, $removedProjection['price'], 'removed source fails pricing closed');
assertSameValue(72.0, $reactivatedProjection['price'], 'restored source resumes the unchanged commercial configuration');

$ambiguousPool = [...$expandedPool, ['id' => 'inc-a', 'label' => 'Duplicate A']];
$ambiguousModel = PMS::buildReadModel(10, $withRateSheet, $ambiguousPool, $faqPool, 'active');
$ambiguousA = itemBySource($ambiguousModel, 'inclusion', 'inc-a');
assertSameValue('ambiguous', $ambiguousA['operational_state'], 'duplicate source identity fails closed as ambiguous');
assertSameValue(false, $ambiguousA['available'], 'ambiguous source is unavailable');
assertSameValue(null, $ambiguousA['resolved'], 'ambiguous source does not select first-match content');
assertSameValue($returnedA['item_id'], $ambiguousA['item_id'], 'ambiguity does not rewrite relationship identity');

fwrite(STDOUT, "PackageManagerSchema contract tests passed.\n");
