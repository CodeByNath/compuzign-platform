<?php

declare(strict_types=1);

// Phase 1 contract: Tier Edition storage defaults and compatibility.
//
// A Tier Edition is an independently addressed, independently lifecycled
// child record nested inside current_occupant.tier_editions[] — see
// docs/code-map/tiers.md and PackageSchema's SECTION: TIER_EDITION. This
// file proves only the storage/schema layer: safe defaults, safe drops of
// malformed data, and — most importantly — that ordinary occupant mutation
// (upsertOccupant, and therefore every Overview/Features/FAQs settle) never
// silently discards Edition data it doesn't itself own. No mutation route
// exists yet; that is Phase 2+.

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;

function check_edition(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier Edition schema: ' . $message);
    }
}

// ── Platform Identifier vocabulary ───────────────────────────────────────────

check_edition(PlatformIdentifierPolicy::supports(PlatformIdentifierPolicy::TIER_EDITION), 'tier_edition is a supported entity type');
check_edition(PlatformIdentifierPolicy::prefix(PlatformIdentifierPolicy::TIER_EDITION) === 'CZTE', 'tier_edition mints the CZTE prefix');
check_edition(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION, 'CZTE2A7KZ'), 'a well-formed CZTE id validates');
check_edition(!PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION, 'CZT2A7KZ'), 'the shared CZT/CZTE prefix family does not cross-validate');

// ── Occupant-qualified native reference ──────────────────────────────────────

$reference = PackagePlatformNativeReference::tierEdition('ti_abc123', 'occ_def456', 'edt_ghi789');
check_edition($reference !== '', 'tierEdition() produces a non-empty reference');
$parsed = PackagePlatformNativeReference::parse($reference, 'tier-edition', 3);
check_edition($parsed === ['ti_abc123', 'occ_def456', 'edt_ghi789'], 'the reference round-trips instanceId, occupantId, editionId in order');
check_edition(PackagePlatformNativeReference::parse($reference, 'tier-edition', 2) === null, 'a wrong segment count fails to parse rather than silently truncating');
$otherOccupant = PackagePlatformNativeReference::tierEdition('ti_abc123', 'occ_ZZZZZZ', 'edt_ghi789');
check_edition($reference !== $otherOccupant, 'the reference is occupant-qualified: a different occupant id produces a different reference for the same edition id');

// ── mintTierEditionId ─────────────────────────────────────────────────────────

$mintedA = Schema::mintTierEditionId();
$mintedB = Schema::mintTierEditionId();
check_edition(str_starts_with($mintedA, 'edt_'), 'minted ids use the edt_ prefix, mirroring occ_/ti_ conventions');
check_edition($mintedA !== $mintedB, 'minted ids are unique per call');

// ── sanitizeTierEdition: defaults and safe drops ─────────────────────────────

check_edition(Schema::sanitizeTierEdition('not-an-array') === null, 'a non-array candidate is dropped');
check_edition(Schema::sanitizeTierEdition(['title' => 'Monthly']) === null, 'a candidate with no id is dropped rather than minted one');

$bare = Schema::sanitizeTierEdition(['id' => 'edt_1']);
check_edition($bare['id'] === 'edt_1', 'a minimal candidate keeps its id');
check_edition($bare['edition_platform_id'] === '', 'edition_platform_id defaults to empty string, mirroring cz_platform_id');
check_edition($bare['platform_status'] === 'disabled', 'platform_status defaults to disabled, mirroring Package Family row creation');
check_edition($bare['previous_platform_status'] === null, 'previous_platform_status defaults to null');
check_edition($bare['is_explicitly_disabled'] === false, 'is_explicitly_disabled defaults to false');
check_edition($bare['module_status'] === [], 'module_status defaults to an empty map');
check_edition($bare['drafts'] === [], 'drafts defaults to an empty map');
check_edition($bare['rate_sheet_id'] === null, 'rate_sheet_id defaults to null');
check_edition($bare['rate_sheet_items'] === [], 'rate_sheet_items defaults to an empty list');
check_edition($bare['price'] === null, 'price defaults to null');
check_edition($bare['contact'] === false, 'contact defaults to false');
check_edition($bare['billing_cycle'] === null, 'billing_cycle defaults to null');
check_edition($bare['minimum_term_value'] === null, 'minimum_term_value defaults to null');
check_edition($bare['minimum_term_unit'] === null, 'minimum_term_unit defaults to null');
check_edition($bare['inclusions_override'] === [], 'inclusions_override defaults to empty (inherit the parent occupant)');
check_edition($bare['faq_refs'] === [], 'faq_refs defaults to empty (inherit the parent occupant)');

$invalidStatus = Schema::sanitizeTierEdition(['id' => 'edt_2', 'platform_status' => 'not-a-real-status']);
check_edition($invalidStatus['platform_status'] === 'disabled', 'an unrecognised platform_status falls back to disabled rather than being stored verbatim');

$full = Schema::sanitizeTierEdition([
    'id' => 'edt_3',
    'edition_platform_id' => 'CZTE2A7KZ',
    'title' => 'Annual',
    'admin_description' => 'Billed once a year.',
    'platform_status' => 'active',
    'previous_platform_status' => 'disabled',
    'is_explicitly_disabled' => true,
    'module_status' => ['overview' => 'settled'],
    'drafts' => ['overview' => null],
    'rate_sheet_id' => 'rs_annual',
    'rate_sheet_items' => [['item_id' => 'rate-vm', 'quantity' => 2]],
    'price' => '199.00',
    'contact' => false,
    'billing_cycle' => 'annually',
    'minimum_term_value' => '12',
    'minimum_term_unit' => 'months',
    'inclusions_override' => [['id' => 'inc-1', 'label' => 'Priority support']],
    'faq_refs' => ['faq-1', 'faq-2'],
]);
check_edition($full['title'] === 'Annual', 'title round-trips');
check_edition($full['edition_platform_id'] === 'CZTE2A7KZ', 'an existing edition_platform_id round-trips verbatim');
check_edition($full['price'] === 199.0, 'a numeric-string price coerces to float');
check_edition($full['minimum_term_value'] === 12.0, 'minimum_term_value coerces to float');
check_edition($full['minimum_term_unit'] === 'months', 'minimum_term_unit round-trips');
// billing_cycle 'annually' + no legs + no commitment_enabled fires Tier
// Pricing Rules' legacy synthesis (PackageSchema::synthesizeFirstCommercialLeg())
// with an Indefinite (null) end_month — commitment_enabled defaults false
// here regardless of the stored minimum_term_value, so no bound applies.
check_edition(
    count($full['commercial_legs']) === 1
        && $full['commercial_legs'][0]['payment_category'] === 'recurring'
        && $full['commercial_legs'][0]['billing_cycle'] === 'yearly'
        && $full['commercial_legs'][0]['end_month'] === null,
    'an Edition with a real billing_cycle and no legs synthesizes exactly one Indefinite Commercial Leg',
);
check_edition(
    $full['rate_sheet_items'] === [[
        'item_id' => 'rate-vm', 'quantity' => 2, 'price_option_id' => null,
        'leg_id' => $full['commercial_legs'][0]['id'], 'leg_assignments' => [],
    ]],
    'rate_sheet_items is sanitised through the existing sanitizeTierRateSheetSelections contract, tagged as assignment 0 for the synthesized leg',
);
check_edition(count($full['inclusions_override']) === 1, 'a non-empty inclusions_override is preserved as this Edition\'s explicit override');

// ── sanitizeTierEditions: collection-level safety ────────────────────────────

$editions = Schema::sanitizeTierEditions([
    ['id' => 'edt_a', 'title' => 'Monthly'],
    ['id' => 'edt_b', 'title' => 'Annual'],
    ['id' => 'edt_a', 'title' => 'Duplicate id is dropped'],
    'not-an-array',
    ['title' => 'No id, dropped'],
]);
check_edition(count($editions) === 2, 'malformed and duplicate-id entries are dropped, leaving only the two valid unique editions');
check_edition($editions[0]['id'] === 'edt_a' && $editions[1]['id'] === 'edt_b', 'surviving editions keep their original order');
check_edition(Schema::sanitizeTierEditions('not-an-array') === [], 'a non-array collection sanitises to an empty list');
check_edition(Schema::sanitizeTierEditions(null) === [], 'a null collection sanitises to an empty list');

// ── normaliseTierSlot: existing occupants remain unchanged ───────────────────

$emptyDetail = Schema::normaliseTierSlot([]);
check_edition($emptyDetail['tier_editions'] === [], 'an empty shell normalises tier_editions to an empty list');
check_edition(!array_key_exists('default_edition_id', $emptyDetail), 'the retired default_edition_id pointer is no longer part of the detail shape');

$legacyFlat = Schema::normaliseTierSlot([
    'label' => 'Legacy Flat', 'price' => 10.0, 'contact' => false, 'billing_cycle' => 'monthly',
    'inclusions_override' => [], 'features' => [], 'faq_refs' => [], 'enabled' => true,
]);
check_edition($legacyFlat['tier_editions'] === [], 'a Phase 1 flat legacy tier (predates Editions entirely) normalises to an empty list');

$occupantNoEditions = Schema::upsertOccupant([], ['label' => 'Standard'], true);
$detailNoEditions = Schema::normaliseTierSlot($occupantNoEditions);
check_edition($detailNoEditions['tier_editions'] === [], 'a brand new occupant with no Edition capability normalises to an empty list');

// A stored occupant already carrying Editions (as Phase 2+ will eventually
// write) round-trips through normaliseTierSlot correctly. The fixture still
// carries a legacy `default_edition_id` key — simulating data written by the
// previously-live "Make default" capability — to prove that retired concept
// is now silently ignored on read rather than erroring or resurrecting any
// special treatment for that Edition.
$storedWithEditions = [
    'current_occupant' => [
        'id' => 'occ_1', 'cz_platform_id' => 'CZT2A7KZ', 'addon_platform_id' => '',
        'platform_status' => 'active', 'is_explicitly_disabled' => false, 'is_addon' => false,
        'label' => 'Professional', 'ideal_for' => '', 'price' => 99.0, 'contact' => false,
        'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_1', 'inclusions_override' => [],
        'rate_sheet_items' => [], 'features' => [], 'faq_refs' => [],
        'tier_editions' => [
            ['id' => 'edt_x', 'title' => 'Monthly'],
            ['id' => 'edt_y', 'title' => 'Annual'],
        ],
        'default_edition_id' => 'edt_x',
    ],
    'history' => [],
];
$roundTripped = Schema::normaliseTierSlot($storedWithEditions);
check_edition(count($roundTripped['tier_editions']) === 2, 'a stored occupant\'s Editions round-trip through normaliseTierSlot');
check_edition(!array_key_exists('default_edition_id', $roundTripped), 'a legacy stored default_edition_id is not reflected in the normalised detail');

// ── upsertOccupant: the critical preservation guarantee ──────────────────────
//
// tier_editions must survive every ordinary Overview/Features/FAQs save and
// settle — the same mechanism that already preserves `history` — because no
// route in this phase (or any planned future Overview/Features/FAQs route)
// ever supplies this key in $data. If upsertOccupant ever stopped preserving
// it, an admin editing an unrelated Tier field would silently destroy that
// Tier's Editions.

$ordinaryEdit = Schema::upsertOccupant($storedWithEditions, [
    'label' => 'Professional (renamed)', 'price' => 129.0, 'billing_cycle' => 'monthly',
], true);
check_edition(count($ordinaryEdit['current_occupant']['tier_editions']) === 2, 'an ordinary Overview-shaped save preserves both Editions untouched');
check_edition(!array_key_exists('default_edition_id', $ordinaryEdit['current_occupant']), 'an ordinary Overview-shaped save does not resurrect the retired default_edition_id key');
check_edition($ordinaryEdit['current_occupant']['label'] === 'Professional (renamed)', 'the unrelated field the save actually targeted still updates normally');

// settleTierSlot round-trips through upsertOccupant — proving Publish/Settle
// on the parent Tier never wipes Edition data either.
$settled = Schema::settleTierSlot($storedWithEditions);
check_edition(count($settled['current_occupant']['tier_editions']) === 2, 'settleTierSlot (Publish/Settle) preserves both Editions');

// Supplying a raw tier_editions key in $data is not a mutation path —
// upsertOccupant never reads it from $data, only from the existing stored
// occupant, so a caller cannot smuggle Edition changes through the Overview
// save body.
$smuggleAttempt = Schema::upsertOccupant($storedWithEditions, [
    'label' => 'Professional', 'tier_editions' => [['id' => 'edt_z', 'title' => 'Smuggled']],
], true);
check_edition(count($smuggleAttempt['current_occupant']['tier_editions']) === 2, 'tier_editions in the Overview save body is ignored, not written');

// ── settleTierEditionOverview: leg_assignments survive Publish ──────────────
// Bug fix regression: the settle path's own rate_sheet_items sanitize used to
// omit the Edition's own draft-preferred commercial_legs, so
// sanitizeTierRateSheetSelections() silently dropped every leg_assignments
// entry at Publish time — not just a display gap, permanent data loss on the
// settled record, since sanitizeTierEdition()'s own later re-sanitize pass
// can only re-validate what survived this first one, never recover what it
// already stripped. See also the parallel occupant-side fix already correct
// in settleTierSlot() (2953-2975 above pass $commercialLegs through).

$editionWithLegDraft = Schema::sanitizeTierEdition([
    'id' => 'edt_leg', 'title' => 'Draft pending', 'platform_status' => 'active',
    'commercial_legs' => [
        ['id' => 'leg_x', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1, 'end_month' => null],
    ],
    'commitment_enabled' => false,
    'rate_sheet_items' => [],
    'drafts' => ['overview' => [
        'title' => 'Draft pending',
        'rate_sheet_id' => 'rs_test',
        'commercial_legs' => [
            ['id' => 'leg_x', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1, 'end_month' => null],
        ],
        'commitment_enabled' => false,
        'rate_sheet_items' => [
            ['item_id' => 'rate-vm', 'quantity' => 1, 'leg_assignments' => [
                ['leg_id' => 'leg_x', 'price_option_id' => null, 'quantity' => 1],
            ]],
        ],
    ]],
]);
$settledEdition = Schema::settleTierEditionOverview([$editionWithLegDraft], 'edt_leg')[0];
check_edition(
    $settledEdition['rate_sheet_items'] === [[
        'item_id' => 'rate-vm', 'quantity' => 1, 'price_option_id' => null,
        'leg_id' => null,
        'leg_assignments' => [['leg_id' => 'leg_x', 'price_option_id' => null, 'quantity' => 1]],
    ]],
    'settling an Edition\'s Overview draft preserves each selection\'s own leg_assignments instead of silently dropping them — no top-level leg_id here, so this row has no assignment 0, only the leg_x assignment',
);

echo "Tier Edition schema contract: PASS\n";
