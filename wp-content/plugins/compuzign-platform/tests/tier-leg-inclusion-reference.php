<?php

declare(strict_types=1);

/*
 * Commercial Leg identity, Phase 3 — inclusion references use Leg identity.
 *
 * TierRateSheetLegAssignment.leg_platform_id replaces the old positional
 * leg_index: an inclusion's Additional-Leg assignment now references that
 * Leg by identity — its Phase 1 internal `id` while still drafting (before
 * the Leg has ever been Published and has no CZTL/CZTEL yet — legitimate
 * draft addressing, composition/identity invariant rule 11), resolved to
 * the real Platform ID by PackageSchema::resolveLegAssignmentPlatformIds()
 * the exact moment that Leg's own identity is minted
 * (PackageStationController::reserveTierLegPlatformIds).
 *
 * The exact case this proves, mirroring the Phase 1/2 reorder tests one
 * level deeper:
 *
 *   inclusion -> CZTL-D
 *   CZTL-D moves from position 4 to position 2
 *   inclusion still -> CZTL-D
 *
 * for both the Tier occupant and a Tier Edition. This exercises the real
 * controller/repository/identity stack, matching
 * tier-leg-platform-identity.php's own convention.
 */

$tliOptions = [];

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_key')) {
    function sanitize_key(mixed $value): string { return strtolower((string) preg_replace('/[^a-z0-9_\-]/', '', (string) $value)); }
}
if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $tliOptions;
        if (array_key_exists($key, $tliOptions)) return false;
        $tliOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $tliOptions;
        return array_key_exists($key, $tliOptions) ? $tliOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $tliOptions;
        $tliOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post { return $id === 909 ? new WP_Post($id, 'Tier Leg Inclusion Reference Service') : null; }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-08-22 00:00:00'; }
}
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response(mixed $value): WP_REST_Response
    {
        return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
    }
}
if (!class_exists('WP_Post')) {
    class WP_Post
    {
        public string $post_type = 'cz_service';
        public function __construct(public int $ID, public string $post_title) {}
    }
}
if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request
    {
        public function __construct(private array $params = [], private array $body = []) {}
        public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
        public function get_json_params(): array { return $this->body; }
    }
}
if (!class_exists('WP_REST_Response')) {
    class WP_REST_Response
    {
        public function __construct(private mixed $data = null, private int $status = 200) {}
        public function get_data(): mixed { return $this->data; }
        public function get_status(): int { return $this->status; }
    }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_leg_inclusion_ref(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('Leg inclusion reference: ' . $message);
}

function tli_default_station(): array
{
    $primaryInstance = [
        'tier_instance_id' => 'ti_primary', 'cz_platform_id' => '',
        'title' => 'Primary Tier Set', 'description' => '', 'status' => 'disabled',
        'allowed_rate_sheet_ids' => [], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => TierInstanceSchema::emptyTierMap(), 'occupant_bin' => [],
    ];
    return [
        'platform_status' => 'disabled',
        'tier_instances' => [$primaryInstance],
        'tier_assignments' => [], 'sort_position' => 0,
        'bundle' => ['title' => '', 'description' => '', 'price' => null],
        'promotions' => [], 'package_manager' => PackageManagerSchema::defaultManager(),
        'legacy_host_service_id' => 909,
    ];
}

function tli_new_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository(), new PlatformIdentifierStation());
}

function tli_instance(): array
{
    global $tliOptions;
    return TierInstanceSchema::findInstance($tliOptions['cz_package_station']['tier_instances'], 'ti_primary') ?? [];
}

function tli_four_legs(): array
{
    return [
        ['billing_cycle' => 'A-cycle', 'from_month' => 1,  'to_month' => 10],
        ['billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20],
        ['billing_cycle' => 'C-cycle', 'from_month' => 21, 'to_month' => 30],
        ['billing_cycle' => 'D-cycle', 'from_month' => 31, 'to_month' => 40],
    ];
}

function tli_by_cycle(array $legs, string $cycle): array
{
    foreach ($legs as $leg) {
        if ($leg['billing_cycle'] === $cycle) return $leg;
    }
    throw new RuntimeException("No leg with billing_cycle {$cycle}");
}

// Mirrors api.ts's own stripLegSelfIdentity(): a real client never resubmits
// a Leg's own platform_id (rejectPlatformIdMutation blocks the whole request
// if it does) even when resaving legs[] read straight from a previous
// response, exactly like resaving any other module never round-trips
// cz_platform_id/edition_platform_id either.
function tli_strip_leg_platform_ids(array $legs): array
{
    return array_map(static function (array $leg): array {
        unset($leg['platform_id']);
        return $leg;
    }, $legs);
}

// ═══════════════════════════════════════════════════════════════════════════
// PART A — Tier occupant: an inclusion's Additional-Leg assignment resolves
// from Leg D's internal id (drafted pre-Publish) to its real CZTL on first
// Publish, then survives D moving from position 4 to position 2 untouched.
// ═══════════════════════════════════════════════════════════════════════════

$tliOptions = ['cz_package_station' => tli_default_station()];

tli_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'overview'],
    ['label' => 'Starter Cloud', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary'],
));

// Draft the four Legs first — sanitizeCommercialLegs mints each one's own
// internal id immediately, well before any Publish exists to mint a CZTL.
$pricingDraftResp = tli_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'pricing_rules'],
    ['rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'monthly', 'legs' => tli_four_legs()],
));
$draftedLegs = $pricingDraftResp->get_data()['drafts']['pricing_rules']['legs'];
$draftLegIdD = tli_by_cycle($draftedLegs, 'D-cycle')['id'];
check_leg_inclusion_ref(is_string($draftLegIdD) && str_starts_with($draftLegIdD, 'leg_'), 'Leg D already has its own stable internal id while still drafting, well before any CZTL exists');
check_leg_inclusion_ref(tli_by_cycle($draftedLegs, 'D-cycle')['platform_id'] === '', 'Leg D genuinely has no platform_id yet at draft time — nothing has minted one');

// An inclusion assignment references Leg D by that internal id — the only
// identity available to the admin at this point.
tli_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'features'],
    ['rate_sheet_items' => [
        ['item_id' => 'rate-vm', 'quantity' => 2, 'leg_assignments' => [
            ['price_option_id' => null, 'quantity' => 1, 'leg_platform_id' => $draftLegIdD],
        ]],
    ]],
));

$publish1 = tli_new_controller()->settlePackageStationTier(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
));
check_leg_inclusion_ref($publish1->get_status() === 200, 'first Publish (Legs + an inclusion referencing an unminted Leg by internal id) succeeds');

$occupant1 = tli_instance()['tiers']['basic']['current_occupant'];
$legDPlatformId = tli_by_cycle($occupant1['legs'], 'D-cycle')['platform_id'];
check_leg_inclusion_ref(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_LEG, $legDPlatformId), 'Leg D receives a validly formatted CZTL on this same Publish');

$inclusion = $occupant1['rate_sheet_items'][0];
check_leg_inclusion_ref($inclusion['item_id'] === 'rate-vm', 'the inclusion survives settlement');
$assignmentRef = $inclusion['leg_assignments'][0]['leg_platform_id'];
check_leg_inclusion_ref(
    $assignmentRef === $legDPlatformId,
    "the inclusion's assignment resolves from Leg D's internal id to its real CZTL ({$legDPlatformId}) on the SAME Publish that minted it — got {$assignmentRef}"
);

// ── THE reorder proof: move D from position 4 to position 2. The inclusion
//    is untouched by this save — only Pricing Rules' own legs[] changes. ──
$legIdA = tli_by_cycle($occupant1['legs'], 'A-cycle')['id'];
$legIdB = tli_by_cycle($occupant1['legs'], 'B-cycle')['id'];
$legIdC = tli_by_cycle($occupant1['legs'], 'C-cycle')['id'];
$legIdD = tli_by_cycle($occupant1['legs'], 'D-cycle')['id'];

tli_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'pricing_rules'],
    ['rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'monthly', 'legs' => [
        ['id' => $legIdA, 'billing_cycle' => 'A-cycle', 'from_month' => 1,  'to_month' => 10, 'sort_order' => 0],
        ['id' => $legIdB, 'billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20, 'sort_order' => 2],
        ['id' => $legIdC, 'billing_cycle' => 'C-cycle', 'from_month' => 21, 'to_month' => 30, 'sort_order' => 3],
        ['id' => $legIdD, 'billing_cycle' => 'D-cycle', 'from_month' => 31, 'to_month' => 40, 'sort_order' => 1],
    ]],
));
$publish2 = tli_new_controller()->settlePackageStationTier(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
));
check_leg_inclusion_ref($publish2->get_status() === 200, 'republish after reordering Legs succeeds');

$occupant2 = tli_instance()['tiers']['basic']['current_occupant'];
check_leg_inclusion_ref(
    array_column($occupant2['legs'], 'billing_cycle') === ['A-cycle', 'D-cycle', 'B-cycle', 'C-cycle'],
    'read-back Leg order after the move is A, D, B, C'
);
check_leg_inclusion_ref(tli_by_cycle($occupant2['legs'], 'D-cycle')['platform_id'] === $legDPlatformId, "D's own CZTL is unchanged by the move");
check_leg_inclusion_ref(
    $occupant2['rate_sheet_items'][0]['leg_assignments'][0]['leg_platform_id'] === $legDPlatformId,
    'the inclusion still references CZTL-D after D moved from position 4 to position 2 — the central Phase 3 claim'
);

// ═══════════════════════════════════════════════════════════════════════════
// PART B — Tier Edition: same proof, one level deeper (CZTEL).
// ═══════════════════════════════════════════════════════════════════════════

$created = tli_new_controller()->createTierEdition(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
    ['title' => 'Annual'],
));
$editionId = $created->get_data()['edition_id'];

$editionDraftResp = tli_new_controller()->saveTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
    [
        'title' => 'Annual', 'rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'yearly',
        'legs' => tli_four_legs(),
        'rate_sheet_items' => [
            ['item_id' => 'rate-vm', 'quantity' => 3],
        ],
    ],
));
$editionDraftLegs = $editionDraftResp->get_data()['edition']['drafts']['overview']['legs'];
$editionDraftLegIdD = tli_by_cycle($editionDraftLegs, 'D-cycle')['id'];

// A SECOND draft save adds the inclusion's Leg-D assignment, referencing the
// SAME internal id the first save's own response just surfaced — mirroring
// how the admin UI would read a just-drafted Leg's id back before wiring up
// the inclusion assignment.
tli_new_controller()->saveTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
    [
        'title' => 'Annual', 'rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'yearly',
        'legs' => tli_strip_leg_platform_ids($editionDraftLegs),
        'rate_sheet_items' => [
            ['item_id' => 'rate-vm', 'quantity' => 3, 'leg_assignments' => [
                ['price_option_id' => null, 'quantity' => 1, 'leg_platform_id' => $editionDraftLegIdD],
            ]],
        ],
    ],
));
tli_new_controller()->settleTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
));
$activate1 = tli_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'active'],
));
check_leg_inclusion_ref($activate1->get_status() === 200, 'first Edition activation (Legs + an inclusion referencing an unminted Leg by internal id) succeeds');

$edition1 = $activate1->get_data()['edition'];
$editionLegDPlatformId = tli_by_cycle($edition1['legs'], 'D-cycle')['platform_id'];
check_leg_inclusion_ref(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION_LEG, $editionLegDPlatformId), "the Edition's own Leg D receives a validly formatted CZTEL on this same activation");
$editionAssignmentRef = $edition1['rate_sheet_items'][0]['leg_assignments'][0]['leg_platform_id'];
check_leg_inclusion_ref(
    $editionAssignmentRef === $editionLegDPlatformId,
    "the Edition's inclusion assignment resolves from Leg D's internal id to its real CZTEL on the SAME activation that minted it"
);

// Reorder the Edition's own Legs, then republish — the inclusion is
// untouched by this save.
$eLegIdA = tli_by_cycle($edition1['legs'], 'A-cycle')['id'];
$eLegIdB = tli_by_cycle($edition1['legs'], 'B-cycle')['id'];
$eLegIdC = tli_by_cycle($edition1['legs'], 'C-cycle')['id'];
$eLegIdD = tli_by_cycle($edition1['legs'], 'D-cycle')['id'];

// The Edition's whole draft is one consolidated module (TierEditionEditor.tsx
// — one draft, one Save), so a real reorder save resends every field, the
// inclusion included — its assignment now names D by its real CZTEL
// (captured above), same as the admin UI would resend from its own
// draft-preferred read state.
tli_new_controller()->saveTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
    ['title' => 'Annual', 'rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'yearly', 'legs' => [
        ['id' => $eLegIdA, 'billing_cycle' => 'A-cycle', 'from_month' => 1,  'to_month' => 10, 'sort_order' => 0],
        ['id' => $eLegIdB, 'billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20, 'sort_order' => 2],
        ['id' => $eLegIdC, 'billing_cycle' => 'C-cycle', 'from_month' => 21, 'to_month' => 30, 'sort_order' => 3],
        ['id' => $eLegIdD, 'billing_cycle' => 'D-cycle', 'from_month' => 31, 'to_month' => 40, 'sort_order' => 1],
    ], 'rate_sheet_items' => [
        ['item_id' => 'rate-vm', 'quantity' => 3, 'leg_assignments' => [
            ['price_option_id' => null, 'quantity' => 1, 'leg_platform_id' => $editionLegDPlatformId],
        ]],
    ]],
));
tli_new_controller()->settleTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
));
$activate2 = tli_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'active'],
));
check_leg_inclusion_ref($activate2->get_status() === 200, 'republishing the Edition after reordering its Legs succeeds');

$edition2 = $activate2->get_data()['edition'];
check_leg_inclusion_ref(
    array_column($edition2['legs'], 'billing_cycle') === ['A-cycle', 'D-cycle', 'B-cycle', 'C-cycle'],
    "the Edition's own read-back Leg order after the move is A, D, B, C"
);
check_leg_inclusion_ref(tli_by_cycle($edition2['legs'], 'D-cycle')['platform_id'] === $editionLegDPlatformId, "D's own CZTEL is unchanged by the move");
check_leg_inclusion_ref(
    $edition2['rate_sheet_items'][0]['leg_assignments'][0]['leg_platform_id'] === $editionLegDPlatformId,
    'the Edition inclusion still references CZTEL-D after D moved from position 4 to position 2'
);

echo "Leg inclusion reference contract (Phase 3): PASS\n";
