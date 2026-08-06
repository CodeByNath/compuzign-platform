<?php

declare(strict_types=1);

/*
 * Phase 3 contract: Tier Edition backend lifecycle and modules, exercised
 * through the real PackageStationController end to end — create, the one
 * consolidated 'overview' module's draft/settle/revert, the shared
 * StationLifecycle transitions (publish/disable/enable/archive/trash/
 * restore), CZTE assignment at first Active (mirroring settlePackageStationTier's
 * own CZT/CZTA reserve -> persist -> bind sequence), and guarded permanent
 * delete. Only WordPress core functions are stubbed, matching the
 * convention used by tier-occupant-platform-identity.php.
 */

$telOptions = [];

if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $telOptions;
        if (array_key_exists($key, $telOptions)) return false;
        $telOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $telOptions;
        return array_key_exists($key, $telOptions) ? $telOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $telOptions;
        $telOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_key')) {
    function sanitize_key(mixed $value): string { return strtolower((string) preg_replace('/[^a-z0-9_\-]/', '', (string) $value)); }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post { return $id === 909 ? new WP_Post($id, 'Tier Edition Service') : null; }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-08-06 00:00:00'; }
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

use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_edition_lifecycle(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier Edition lifecycle: ' . $message);
    }
}

function tel_default_station(): array
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

function tel_new_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository(), new PlatformIdentifierStation());
}

function tel_instance(): array
{
    global $telOptions;
    return TierInstanceSchema::findInstance($telOptions['cz_package_station']['tier_instances'], 'ti_primary') ?? [];
}

function tel_edition(string $tier = 'basic', ?string $editionId = null): ?array
{
    $occupant = tel_instance()['tiers'][$tier]['current_occupant'] ?? null;
    if ($occupant === null) return null;
    if ($editionId === null) return $occupant;
    foreach ($occupant['tier_editions'] ?? [] as $edition) {
        if (($edition['id'] ?? null) === $editionId) return $edition;
    }
    return null;
}

// ── Setup: a real settled, published occupant in slot 'basic' ───────────────

$telOptions = ['cz_package_station' => tel_default_station()];
tel_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'overview'],
    ['label' => 'Professional', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary'],
));
tel_new_controller()->settlePackageStationTier(new WP_REST_Request(['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic']));
$occupantId = tel_edition()['id'];
check_edition_lifecycle(is_string($occupantId) && $occupantId !== '', 'the parent occupant settles with a stable id');

// ── Create ────────────────────────────────────────────────────────────────

$create = tel_new_controller()->createTierEdition(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
    ['title' => 'Monthly'],
));
check_edition_lifecycle($create->get_status() === 200 && $create->get_data()['success'], 'creating an Edition succeeds');
$editionId = $create->get_data()['edition_id'];
check_edition_lifecycle(str_starts_with($editionId, 'edt_'), 'the created Edition has a minted edt_ id');

$stored = tel_edition('basic', $editionId);
check_edition_lifecycle($stored['platform_status'] === 'disabled', 'a new Edition is born disabled');
check_edition_lifecycle($stored['edition_platform_id'] === '', 'a new Edition mints no Platform identifier at creation');

$rejected = tel_new_controller()->createTierEdition(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
    [], // no title
));
check_edition_lifecycle($rejected->get_status() === 422, 'creating an Edition with no title is rejected');

// ── Module draft -> settle ───────────────────────────────────────────────────

$draft = tel_new_controller()->saveTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
    ['title' => 'Monthly', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary', 'minimum_term_value' => 1, 'minimum_term_unit' => 'month'],
));
check_edition_lifecycle($draft->get_status() === 200, 'saving the overview module draft succeeds');
$afterDraft = tel_edition('basic', $editionId);
check_edition_lifecycle($afterDraft['module_status']['overview'] === StationLifecycle::MODULE_PENDING, 'a saved draft marks the module pending');
check_edition_lifecycle($afterDraft['billing_cycle'] === null, 'the settled billing_cycle is untouched until settle — the draft lives separately');

$unknownModule = tel_new_controller()->saveTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'features'],
    ['title' => 'x'],
));
check_edition_lifecycle(($unknownModule->get_data()['success'] ?? true) === false, 'an Edition has exactly one module — any other module name is rejected');

$settle = tel_new_controller()->settleTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
));
check_edition_lifecycle($settle->get_status() === 200, 'settling the overview module succeeds');
$afterSettle = tel_edition('basic', $editionId);
check_edition_lifecycle($afterSettle['billing_cycle'] === 'monthly', 'settle commits the draft-preferred billing_cycle');
check_edition_lifecycle($afterSettle['minimum_term_value'] === 1.0, 'settle commits the draft-preferred minimum_term_value');
check_edition_lifecycle($afterSettle['minimum_term_unit'] === 'month', 'settle commits the draft-preferred minimum_term_unit');
check_edition_lifecycle($afterSettle['module_status']['overview'] === StationLifecycle::MODULE_SETTLED, 'settle marks the module settled');
check_edition_lifecycle($afterSettle['drafts']['overview'] === null, 'settle clears the draft');

// Revert proof: draft a change, revert it, confirm the settled value survives.
tel_new_controller()->saveTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
    ['title' => 'Monthly', 'billing_cycle' => 'annually', 'rate_sheet_id' => 'rs_primary'],
));
$revert = tel_new_controller()->revertTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
));
check_edition_lifecycle($revert->get_status() === 200, 'reverting the overview module succeeds');
$afterRevert = tel_edition('basic', $editionId);
check_edition_lifecycle($afterRevert['billing_cycle'] === 'monthly', 'revert discards the pending draft, leaving the settled billing_cycle (monthly, not annually) untouched');
check_edition_lifecycle($afterRevert['drafts']['overview'] === null, 'revert clears the draft');

// ── Publish (first Active) assigns CZTE ──────────────────────────────────────

$publish1 = tel_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'active'],
));
check_edition_lifecycle($publish1->get_status() === 200 && $publish1->get_data()['success'], 'publishing (platform_status=active) an Edition succeeds');
$publishedEdition = tel_edition('basic', $editionId);
$editionPlatformId1 = $publishedEdition['edition_platform_id'] ?? '';
check_edition_lifecycle(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION, $editionPlatformId1), 'first Active assigns a validly formatted CZTE');
check_edition_lifecycle($publishedEdition['platform_status'] === 'active', 'the Edition is now Active');

$nativeReference = PackagePlatformNativeReference::tierEdition('ti_primary', $occupantId, $editionId);
$forward1 = $telOptions['cz_platform_identifier_v1_' . $editionPlatformId1];
check_edition_lifecycle($forward1['status'] === PlatformIdentifierStation::STATUS_BOUND, 'the registry record is bound, not merely reserved');
check_edition_lifecycle($forward1['native_reference'] === $nativeReference, 'CZTE binds to this exact occupant-qualified Tier Edition native reference');

// Repeat publish reuses the same identifier, no double reservation.
$publish2 = tel_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'active'],
));
check_edition_lifecycle($publish2->get_status() === 200, 'a repeat publish still succeeds');
check_edition_lifecycle((tel_edition('basic', $editionId)['edition_platform_id'] ?? '') === $editionPlatformId1, 'a repeat publish reuses the exact same CZTE, never a second one');

// ── Disable / Enable ──────────────────────────────────────────────────────────

$disable = tel_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'action' => 'disable'],
));
check_edition_lifecycle($disable->get_status() === 200, 'disabling an Active Edition succeeds');
$afterDisable = tel_edition('basic', $editionId);
check_edition_lifecycle($afterDisable['platform_status'] === 'disabled', 'Disable masks to disabled');
check_edition_lifecycle($afterDisable['previous_platform_status'] === 'active', 'Disable captures the prior live state');
check_edition_lifecycle($afterDisable['edition_platform_id'] === $editionPlatformId1, 'CZTE is unchanged by Disable');

$enable = tel_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'action' => 'enable'],
));
check_edition_lifecycle($enable->get_status() === 200, 'enabling an explicitly-disabled Edition succeeds');
$afterEnable = tel_edition('basic', $editionId);
check_edition_lifecycle($afterEnable['previous_platform_status'] === null, 'Enable clears the mask (same unmasked-Pending landing the rest of the platform uses)');
check_edition_lifecycle($afterEnable['edition_platform_id'] === $editionPlatformId1, 'CZTE is unchanged by Enable');

// ── Archive / Trash / Restore ────────────────────────────────────────────────

tel_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'active'],
));
$archive = tel_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'archived'],
));
check_edition_lifecycle($archive->get_status() === 200, 'archiving an Active Edition succeeds');
$afterArchive = tel_edition('basic', $editionId);
check_edition_lifecycle($afterArchive['platform_status'] === 'archived', 'the Edition is archived');
check_edition_lifecycle($afterArchive['previous_platform_status'] === 'active', 'archive captures the prior live state');
check_edition_lifecycle($afterArchive['edition_platform_id'] === $editionPlatformId1, 'CZTE is unchanged by Archive');

$trash = tel_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'trashed'],
));
check_edition_lifecycle($trash->get_status() === 200, 'trashing an archived Edition succeeds');
check_edition_lifecycle(tel_edition('basic', $editionId)['platform_status'] === 'trashed', 'the Edition is trashed');

$restore = tel_new_controller()->restoreTierEditionEndpoint(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId],
));
check_edition_lifecycle($restore->get_status() === 200, 'restoring a trashed Edition succeeds');
$afterRestore = tel_edition('basic', $editionId);
check_edition_lifecycle($afterRestore['platform_status'] === 'disabled', 'restore always lands at disabled, never active');
check_edition_lifecycle($afterRestore['previous_platform_status'] === null, 'restore clears the mask');
check_edition_lifecycle($afterRestore['edition_platform_id'] === $editionPlatformId1, 'CZTE survives archive/trash/restore unchanged');

// ── Guarded permanent delete ──────────────────────────────────────────────────

$notTrashedDelete = tel_new_controller()->deleteTierEditionEndpoint(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId],
));
check_edition_lifecycle($notTrashedDelete->get_status() === 409, 'a non-trashed Edition cannot be permanently deleted');

tel_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'active'],
));
tel_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'archived'],
));
tel_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'trashed'],
));

// Second Edition, made the default, to prove the default-delete guard through the real endpoint.
tel_new_controller()->createTierEdition(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
    ['title' => 'Annual'],
));
$secondEditionId = null;
foreach (tel_edition('basic')['tier_editions'] as $candidate) {
    if ($candidate['id'] !== $editionId) { $secondEditionId = $candidate['id']; break; }
}
check_edition_lifecycle($secondEditionId !== null, 'a second Edition exists for the default-guard scenario');

$stationWithDefault = $telOptions['cz_package_station'];
$instanceWithDefault = TierInstanceSchema::findInstance($stationWithDefault['tier_instances'], 'ti_primary');
$instanceWithDefault['tiers']['basic']['current_occupant']['default_edition_id'] = $editionId;
$telOptions['cz_package_station'] = TierInstanceSchema::withInstance($stationWithDefault, 'ti_primary', $instanceWithDefault);

$defaultDeleteBlocked = tel_new_controller()->deleteTierEditionEndpoint(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId],
));
check_edition_lifecycle($defaultDeleteBlocked->get_status() === 409, 'the current default Edition cannot be permanently deleted even once trashed');

// The second Edition was never published — trash it directly (disabled is a
// live state, so canTrash() permits disabled -> trashed in one call) so the
// delete guard below is exercised against a genuinely trashed, non-default row.
tel_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $secondEditionId, 'platform_status' => 'trashed'],
));

$delete = tel_new_controller()->deleteTierEditionEndpoint(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $secondEditionId],
));
check_edition_lifecycle($delete->get_status() === 200, 'deleting a trashed, non-default Edition succeeds');
check_edition_lifecycle(tel_edition('basic', $secondEditionId) === null, 'the deleted Edition is genuinely gone');
check_edition_lifecycle(tel_edition('basic', $editionId) !== null, 'the surviving (default) Edition is untouched');

// ── Preservation: ordinary parent-occupant edits never touch Editions ───────

tel_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'overview'],
    ['label' => 'Professional (renamed)', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary'],
));
tel_new_controller()->settlePackageStationTier(new WP_REST_Request(['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic']));
$finalOccupant = tel_edition('basic');
check_edition_lifecycle(count($finalOccupant['tier_editions']) === 1, 'an ordinary parent Overview save + Publish leaves the surviving Edition untouched');
check_edition_lifecycle($finalOccupant['default_edition_id'] === $editionId, 'default_edition_id survives an ordinary parent Overview save + Publish');
check_edition_lifecycle($finalOccupant['label'] === 'Professional (renamed)', 'the unrelated parent field the save actually targeted still updates normally');

// ── Phase 5: setTierEditionDefault endpoint ──────────────────────────────────

$setDefault = tel_new_controller()->setTierEditionDefault(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
    ['edition_id' => $editionId],
));
check_edition_lifecycle($setDefault->get_status() === 200 && $setDefault->get_data()['default_edition_id'] === $editionId, 'setting the default Edition through the endpoint succeeds');
check_edition_lifecycle(tel_edition('basic')['default_edition_id'] === $editionId, 'the default persists onto the occupant');

$setUnknownDefault = tel_new_controller()->setTierEditionDefault(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
    ['edition_id' => 'edt_does_not_exist'],
));
check_edition_lifecycle($setUnknownDefault->get_data()['default_edition_id'] === null, 'setting the default to an unknown Edition id resolves to null rather than a dangling pointer');
check_edition_lifecycle(tel_edition('basic')['default_edition_id'] === null, 'the dangling attempt does not persist a stale id');

tel_new_controller()->setTierEditionDefault(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
    ['edition_id' => $editionId],
));
$clearDefault = tel_new_controller()->setTierEditionDefault(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
    ['edition_id' => ''],
));
check_edition_lifecycle($clearDefault->get_data()['default_edition_id'] === null, 'an empty edition_id clears the default');
check_edition_lifecycle(tel_edition('basic')['default_edition_id'] === null, 'the cleared default persists onto the occupant');

echo "Tier Edition lifecycle contract: PASS\n";
