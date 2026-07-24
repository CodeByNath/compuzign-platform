<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Http;

use CompuZign\Platform\Modules\Admin\Support\PoolReferences;
use CompuZign\Platform\Modules\Service\Support\ServicePools;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageStationSchema;

/**
 * Package Station admin write/read endpoints — manager, tiers, occupant bin,
 * and the station-level popular selection.
 *
 * Ownership: these handlers moved here from the former AdminServicesController,
 * where they only ever lived because Package Station data used to be stored on
 * the Service post. That data now lives in independent option storage
 * (PackageRepository — cz_package_station); the handlers followed their data.
 *
 * The URLs are deliberately UNCHANGED and remain Service-scoped
 * (/admin/services/{id}/package-station/...). Route path is not code ownership:
 * {id} is navigation context only — it never owns or selects storage. Every
 * read/write goes through PackageRepository. See
 * docs/code-map/service-station.md.
 *
 * Promotions are a child collection of the Package Station and are owned by
 * Promotions\Http\PromotionsController, which reads and writes the same
 * PackageRepository storage.
 *
 * ServicePools is imported from Service\Support: the tier save path may carry
 * new_inclusions/new_faqs, which must be written through the Service-owned pool
 * contract rather than by touching cz_service_* meta here.
 */
class PackageStationController
{
    /**
     * Service post type — route context only. These endpoints validate that the
     * {id} in the path is a real Service before using it as navigation context;
     * the Service entity itself stays owned by the Service boundary.
     */
    private const POST_TYPE = 'cz_service';

    public function __construct(private PackageRepository $repository)
    {
    }

    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    /** Single Package Station authority (independent option storage). */
    private function packages(): PackageRepository
    {
        return $this->repository;
    }

    public function registerRoutes(): void
    {
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getPackageStation'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

        // Package Station Manager — operational-facts-only read model.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/manager', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getPackageStationManager'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

        // Atomic configuration commit. This is not a lifecycle transition:
        // only explicitly submitted decisions are upserted and settled.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/manager', [
            'methods'             => 'POST',
            'callback'            => [$this, 'savePackageStationManager'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/tiers/(?P<tier>[a-z]+)', [
            'methods'             => 'POST',
            'callback'            => [$this, 'savePackageStationTier'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'   => ['required' => true, 'type' => 'integer'],
                'tier' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, true)],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/tiers/(?P<tier>[a-z]+)/enabled', [
            'methods'             => 'POST',
            'callback'            => [$this, 'setPackageStationTierEnabled'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'   => ['required' => true, 'type' => 'integer'],
                'tier' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, true)],
            ],
        ]);

        // Phase 2 — P3: per-module tier draft save. Persists a draft and marks the
        // module pending; does not commit current_occupant. Additive to the atomic
        // save route above, which stays live. Not called by the frontend until P5.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/tiers/(?P<tier>[a-z]+)/modules/(?P<module>[a-z]+)', [
            'methods'             => 'POST',
            'callback'            => [$this, 'savePackageStationTierModule'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'     => ['required' => true, 'type' => 'integer'],
                'tier'   => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, true)],
                'module' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::TIER_MODULES, true)],
            ],
        ]);

        // Phase 2 — P3: settle a tier. Commits the draft-preferred state into
        // current_occupant, clears drafts, marks all modules settled.
        // ── Tier occupant archive (engine D2) ─────────────────────────────────
        // The shell never travels; the settled occupant moves into occupant_bin.
        // Pending drafts block the move unless discard_drafts: true is confirmed.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/tiers/(?P<tier>[a-z]+)/archive', [
            'methods'             => 'POST',
            'callback'            => [$this, 'archivePackageStationTierOccupant'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'   => ['required' => true, 'type' => 'integer'],
                'tier' => ['required' => true, 'type' => 'string'],
            ],
        ]);

        // ── Occupant bin travel (engine D3) ───────────────────────────────────
        // Restore returns a binned occupant to its origin shell when empty;
        // an occupied origin demands an explicit mode (swap displaces the
        // current content into the bin — one atomic meta write; retarget picks
        // an empty shell). Trash/delete legality comes from StationLifecycle;
        // DELETE is the only remover (parity with the promotion C3 routes).
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/bin/(?P<bin>[a-z0-9_]+)/restore', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restorePackageStationBinEntry'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'  => ['required' => true, 'type' => 'integer'],
                'bin' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/bin/(?P<bin>[a-z0-9_]+)/trash', [
            'methods'             => 'POST',
            'callback'            => [$this, 'trashPackageStationBinEntry'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'  => ['required' => true, 'type' => 'integer'],
                'bin' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/bin/(?P<bin>[a-z0-9_]+)', [
            'methods'             => 'DELETE',
            'callback'            => [$this, 'deletePackageStationBinEntry'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'  => ['required' => true, 'type' => 'integer'],
                'bin' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);

        // ── Per-module tier revert (engine D1) ────────────────────────────────
        // Discard one module's pending draft; module_status re-derives from the
        // settled occupant. Counterpart of the promotion module revert route.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/tiers/(?P<tier>[a-z]+)/modules/(?P<module>overview|features|faqs)/revert', [
            'methods'             => 'POST',
            'callback'            => [$this, 'revertPackageStationTierModule'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'     => ['required' => true, 'type' => 'integer'],
                'tier'   => ['required' => true, 'type' => 'string'],
                'module' => ['required' => true, 'type' => 'string'],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/tiers/(?P<tier>[a-z]+)/settle', [
            'methods'             => 'POST',
            'callback'            => [$this, 'settlePackageStationTier'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'   => ['required' => true, 'type' => 'integer'],
                'tier' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, true)],
            ],
        ]);

        // Phase 2 — P5: station-level popular tier selection. `popular_tier` is a
        // package-module concern, not part of the per-tier overview draft, so it
        // gets its own station-level write (body: { tier_id: string|null, label }).
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/popular', [
            'methods'             => 'POST',
            'callback'            => [$this, 'setPackageStationPopular'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);
    }

    public function getPackageStation(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $PMS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema::class;
        $rawManager = is_array($station['package_manager'] ?? null) ? $station['package_manager'] : $PMS::defaultManager();
        $sanitizedManager = $PMS::sanitize($rawManager);
        [$incPool, $faqPool] = $this->packages()->sourcePools($station, $sanitizedManager['sources']);
        $managerModel = $PMS::buildReadModel($serviceId, $sanitizedManager, $incPool, $faqPool, (string) ($station['platform_status'] ?? 'disabled'));
        $tiers = [];
        foreach ($PS::ALLOWED_TIERS as $tierId) {
            // P3 additive read exposure: settled detail (unchanged 8 fields) plus the
            // raw drafts + module_status, returned SEPARATELY. No server-side merge —
            // the hook derives draft-preferred client-side (parity with useServiceStation).
            $slot   = $PS::ensureTierLifecycle($station['tiers'][$tierId] ?? []);
            $detail = $PS::normaliseTierSlot($slot);
            $detail['drafts']        = $slot['drafts'];
            $detail['module_status'] = $slot['module_status'];
            // B2 — pool refs resolve at read time: id authoritative, label refreshed
            // from the pool, danglers flagged (missing) but never pruned. Applies to
            // the settled occupant AND the pending features draft; the admin save
            // round-trip then persists the refreshed labels.
            $detail['inclusions_override'] = PoolReferences::refreshInclusionLabels(
                $incPool,
                is_array($detail['inclusions_override'] ?? null) ? $detail['inclusions_override'] : []
            );
            if (is_array($detail['drafts']['features'] ?? null)) {
                $detail['drafts']['features'] = $PS::sanitizeTierRateSheetSelections($detail['drafts']['features']);
            }
            $effectiveSelections = is_array($detail['drafts']['features'] ?? null)
                ? $detail['drafts']['features']
                : ($detail['rate_sheet_items'] ?? []);
            $rateProjection = $PMS::projectTierRateSheet(
                $serviceId, $rawManager, $effectiveSelections, $incPool,
                $faqPool, (string) ($station['platform_status'] ?? 'disabled'),
                $detail['rate_sheet_id'] ?? null
            );
            $detail['rate_sheet_selections'] = $rateProjection['selections'];
            $detail['rate_sheet_items'] = $PS::sanitizeTierRateSheetSelections($effectiveSelections);
            $detail['price'] = $rateProjection['price'];
            $detail['contact'] = false;
            $detail['inclusions_override'] = array_map(
                fn(array $row): array => ['id' => $row['item_id'], 'label' => $row['label'], 'missing' => !$row['resolved']],
                array_values(array_filter($rateProjection['selections'], fn(array $row): bool => ($row['source_type'] ?? null) === 'inclusion'))
            );
            $detail['faq_refs'] = array_values(array_map(
                fn(array $row): string => (string) $row['source_id'],
                array_filter($rateProjection['selections'], fn(array $row): bool => ($row['source_type'] ?? null) === 'faq' && !empty($row['resolved']))
            ));
            if (is_array($detail['drafts']['overview'] ?? null)) {
                $detail['drafts']['overview']['price'] = $rateProjection['price'];
            }
            $tiers[$tierId] = $detail;
        }

        // D2 additive read exposure: the occupant bin (lazy-normalised; [] pre-D2).
        $station = $PS::ensureOccupantBin($station);

        return rest_ensure_response([
            'success'    => true,
            'service_id' => $serviceId,
            'station'    => [
                'platform_status' => $station['platform_status'] ?? 'disabled',
                'tiers'           => $tiers,
                'popular_tier'    => $station['popular_tier'] ?? null,
                'popular_label'   => $station['popular_label'] ?? '',
                'sort_position'   => (int) ($station['sort_position'] ?? 0),
                'bundle'          => $station['bundle'] ?? ['title' => '', 'description' => '', 'price' => null],
                'occupant_bin'    => $station['occupant_bin'],
            ],
            'service' => [
                'id'         => $serviceId,
                'title'      => $post->post_title,
                'inclusions' => array_values(array_filter(
                    is_array($incPool) ? $incPool : [],
                    fn($i) => is_array($i) && !empty($i['id']) && !empty($i['label'])
                )),
                'faqs'       => array_values(array_filter(
                    $faqPool,
                    fn($i) => is_array($i) && !empty($i['question'])
                )),
                'rate_sheets' => $managerModel['rate_sheets'],
                'package_relationships' => $managerModel['items'],
            ],
        ]);
    }

    /**
     * Package Station Manager read endpoint (Phase B). Pure read: sanitizes
     * whatever `station.package_manager` currently holds (or in-memory
     * defaults it for a station that predates the key — never persisted here,
     * per the no-write-on-read contract), reconciles against the live
     * inclusion/FAQ pools, and returns PackageManagerSchema::buildReadModel's
     * operational-facts-only shape. No presentation status, no notes, no
     * writes of any kind.
     */
    public function getPackageStationManager(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $PMS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema::class;

        // In-memory default for a station that predates package_manager — never
        // written back here; sanitize() always returns a fully-shaped array
        // regardless of what (if anything) was actually stored.
        $rawManager = is_array($station['package_manager'] ?? null) ? $station['package_manager'] : $PMS::defaultManager();
        $manager    = $PMS::sanitize($rawManager);
        [$incPool, $faqPool] = $this->packages()->sourcePools($station, $manager['sources']);

        // Stored platform_status is the parent operational fact (per the
        // accepted Phase B plan) — same field Cost Builder visibility already
        // trusts, not a re-derivation.
        $platformStatus = (string) ($station['platform_status'] ?? 'disabled');

        $readModel = $PMS::buildReadModel($serviceId, $manager, $incPool, $faqPool, $platformStatus);

        return rest_ensure_response([
            'success' => true,
            'manager' => $readModel,
        ]);
    }

    /**
     * Commit complete group configuration plus explicit Manager item
     * decisions. Omitted persisted decisions survive; omitted provisional
     * source items never enter storage and remain not-configured.
     */
    public function savePackageStationManager(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $body = $request->get_json_params();
        // rate_sheets is a PARTIAL upsert set (may be empty) and rate_sheet_deletions
        // an explicit id list — neither need enumerate the full inventory. Legacy
        // clients may still send a singular rate_sheet; accept it as one upsert.
        $hasRateSheets = array_key_exists('rate_sheets', $body ?? []) || array_key_exists('rate_sheet', $body ?? []);
        if (!is_array($body) || !isset($body['sources'], $body['groups'], $body['item_decisions']) || !$hasRateSheets) {
            return rest_ensure_response([
                'success' => false,
                'message' => 'Sources, groups, item_decisions, and rate_sheets are required.',
            ]);
        }

        $submittedRateSheets = array_key_exists('rate_sheets', $body)
            ? $body['rate_sheets']
            : (is_array($body['rate_sheet'] ?? null) ? [$body['rate_sheet']] : []);
        if (!is_array($submittedRateSheets)) {
            return rest_ensure_response(['success' => false, 'message' => 'rate_sheets must be an array.']);
        }
        $rateSheetDeletions = is_array($body['rate_sheet_deletions'] ?? null) ? $body['rate_sheet_deletions'] : [];

        // First-time configuration bootstraps the independent station anchor.
        $station = $this->packages()->loadStation() ?? $this->packages()->defaultStation();

        // Delete guard (Refinement 2): a sheet still bound by any Tier occupant
        // cannot be removed — archive it first. Deletion is only ever explicit.
        $referenced = $this->rateSheetIdsReferencedByTiers($station);
        foreach ($rateSheetDeletions as $deleteId) {
            $deleteId = sanitize_text_field((string) $deleteId);
            if ($deleteId !== '' && isset($referenced[$deleteId])) {
                return rest_ensure_response([
                    'success' => false,
                    'code'    => 'rate_sheet_in_use',
                    'message' => 'This Rate Sheet is still used by a Tier. Archive it or move those Tiers first.',
                ]);
            }
        }

        $PMS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema::class;
        $rawManager = is_array($station['package_manager'] ?? null)
            ? $station['package_manager']
            : $PMS::defaultManager();
        $submittedSources = PackageStationSchema::sanitizeSourceRelationships($body['sources']);
        [$incPool, $faqPool] = $this->packages()->sourcePools($station, $submittedSources);

        try {
            $manager = $PMS::commitConfiguration(
                $rawManager,
                $body['groups'],
                $body['item_decisions'],
                $incPool,
                $faqPool,
                $submittedRateSheets,
                $submittedSources,
                $rateSheetDeletions
            );
        } catch (\InvalidArgumentException $e) {
            return rest_ensure_response(['success' => false, 'message' => $e->getMessage()]);
        }

        // One postmeta write is the atomic storage boundary. Do not derive or
        // alter platform_status: the Manager owns no lifecycle.
        $station['package_manager'] = $manager;
        $this->packages()->saveStation($station);

        $platformStatus = (string) ($station['platform_status'] ?? 'disabled');
        $readModel = $PMS::buildReadModel($serviceId, $manager, $incPool, $faqPool, $platformStatus);

        return rest_ensure_response([
            'success' => true,
            'manager' => $readModel,
        ]);
    }

    /**
     * Rate Sheet ids currently bound by a Tier occupant — a stored occupant
     * with selections, or a pending features draft. A legacy occupant carrying
     * selections but no id resolves against the migrated primary sheet, matching
     * the read-time default. Feeds the manager save delete-guard.
     *
     * @return array<string, true>
     */
    private function rateSheetIdsReferencedByTiers(array $station): array
    {
        $primary = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema::PRIMARY_RATE_SHEET_ID;
        $referenced = [];
        foreach (is_array($station['tiers'] ?? null) ? $station['tiers'] : [] as $slot) {
            if (!is_array($slot)) { continue; }
            $occupant      = is_array($slot['current_occupant'] ?? null) ? $slot['current_occupant'] : [];
            $draftFeatures = $slot['drafts']['features'] ?? null;
            $hasSelections = (is_array($occupant['rate_sheet_items'] ?? null) && $occupant['rate_sheet_items'] !== [])
                || (is_array($draftFeatures) && $draftFeatures !== []);
            if (!$hasSelections) { continue; }
            $id = trim((string) ($occupant['rate_sheet_id'] ?? ''));
            $referenced[$id !== '' ? $id : $primary] = true;
        }
        return $referenced;
    }

    public function savePackageStationTier(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $body = $request->get_json_params();
        if (!is_array($body)) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid request body.']);
        }

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        // Add new inclusions/FAQs to the canonical pools of the service whose
        // items resolve unprefixed (the station's legacy host), so the stored
        // item IDs keep matching the source-pool namespace scheme.
        $poolServiceId   = (int) ($station['legacy_host_service_id'] ?? 0) ?: $serviceId;
        $addedInclusions = ServicePools::addInclusions($poolServiceId, $body['new_inclusions'] ?? []);
        $addedFaqRefs    = ServicePools::addFaqs($poolServiceId, $body['new_faqs'] ?? []);

        $existingDetail = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::normaliseTierSlot(
            $station['tiers'][$tierId] ?? []
        );

        // Inclusions
        $inclusions = [];
        if (array_key_exists('inclusions_override', $body) && is_array($body['inclusions_override'])) {
            foreach ($body['inclusions_override'] as $inc) {
                if (!is_array($inc)) { continue; }
                $id = sanitize_text_field((string) ($inc['id'] ?? ''));
                $lb = sanitize_text_field((string) ($inc['label'] ?? ''));
                if ($id !== '' && $lb !== '') { $inclusions[] = ['id' => $id, 'label' => $lb]; }
            }
        } else {
            $inclusions = $existingDetail['inclusions_override'];
        }
        foreach ($addedInclusions as $inc) {
            if (!in_array($inc['id'], array_column($inclusions, 'id'), true)) { $inclusions[] = $inc; }
        }

        // FAQ refs
        $faqRefs = [];
        if (array_key_exists('faq_refs', $body) && is_array($body['faq_refs'])) {
            foreach ($body['faq_refs'] as $ref) {
                $ref = sanitize_text_field((string) $ref);
                if ($ref !== '') { $faqRefs[] = $ref; }
            }
        } else {
            $faqRefs = $existingDetail['faq_refs'];
        }
        foreach ($addedFaqRefs as $id) {
            if (!in_array($id, $faqRefs, true)) { $faqRefs[] = $id; }
        }

        $contact = !empty($body['contact']);
        $price   = null;
        if (!$contact && array_key_exists('price', $body) && $body['price'] !== null && $body['price'] !== '') {
            $price = (float) $body['price'];
        }
        $enabled = array_key_exists('enabled', $body) ? (bool) $body['enabled'] : $existingDetail['enabled'];

        $tierData = [
            'label'               => sanitize_text_field((string) ($body['label'] ?? $existingDetail['label'])),
            'price'               => $price,
            'contact'             => $contact,
            'billing_cycle'       => sanitize_text_field((string) ($body['billing_cycle'] ?? $existingDetail['billing_cycle'] ?? 'monthly')),
            'inclusions_override' => $inclusions,
            'features'            => [],
            'faq_refs'            => $faqRefs,
        ];

        // P2 store schema: an atomic tier save is a direct commit — the written slot
        // carries the lifecycle layer with no pending drafts and every module settled.
        // Additive/inert (no read path consumes it yet); response shape is unchanged
        // because it is built from normaliseTierSlot, which ignores these keys.
        $station['tiers'][$tierId] = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::commitTierLifecycle(
            \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::upsertOccupant(
                $station['tiers'][$tierId] ?? ['current_occupant' => null, 'history' => []],
                $tierData,
                $enabled
            )
        );

        if (array_key_exists('popular', $body)) {
            if ((bool) $body['popular']) {
                $station['popular_tier']  = $tierId;
                $station['popular_label'] = sanitize_text_field((string) ($body['popular_label'] ?? ''));
            } elseif (($station['popular_tier'] ?? null) === $tierId) {
                $station['popular_tier'] = null;
            }
        }

        $station['platform_status'] = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::deriveStationStatus($station);
        $this->packages()->saveStation($station);

        $tiers = [];
        foreach (\CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS as $tid) {
            $tiers[$tid] = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::normaliseTierSlot($station['tiers'][$tid] ?? []);
        }

        return rest_ensure_response([
            'success'              => true,
            'station'              => array_merge($station, ['tiers' => $tiers]),
            'new_inclusions_added' => count($addedInclusions),
            'new_faqs_added'       => count($addedFaqRefs),
        ]);
    }

    public function setPackageStationTierEnabled(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $body    = $request->get_json_params();
        $enabled = isset($body['enabled']) ? (bool) $body['enabled'] : true;

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $tierSlot = $station['tiers'][$tierId] ?? [];
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        if ($PS::isOccupantFormat($tierSlot)) {
            if (!empty($tierSlot['current_occupant'])) {
                $station['tiers'][$tierId]['current_occupant']['platform_status'] = $enabled ? 'active' : 'disabled';
            }
        } else {
            if (!empty($tierSlot)) {
                $station['tiers'][$tierId]['enabled'] = $enabled;
            }
        }

        $station['platform_status'] = $PS::deriveStationStatus($station);
        $this->packages()->saveStation($station);

        return rest_ensure_response(['success' => true, 'tier_id' => $tierId, 'enabled' => $enabled]);
    }

    /**
     * Phase 2 — P3: per-module tier draft save.
     * Persists drafts[$module] and marks the module pending. Does NOT touch
     * current_occupant, so Cost Builder visibility (platform_status) is unchanged.
     * References only — P3 does not create service-pool items (that is a later phase).
     */
    public function savePackageStationTierModule(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));
        $module    = sanitize_key((string) $request->get_param('module'));

        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        if (!in_array($module, $PS::TIER_MODULES, true)) {
            return rest_ensure_response(['success' => false, 'message' => 'Unknown module.']);
        }

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $body = $request->get_json_params();
        if (!is_array($body)) { $body = []; }

        $slot = $PS::ensureTierLifecycle($station['tiers'][$tierId] ?? []);

        if ($module === 'overview') {
            $contact = !empty($body['contact']);
            $price   = null;
            if (!$contact && array_key_exists('price', $body) && $body['price'] !== null && $body['price'] !== '') {
                $price = (float) $body['price'];
            }
            $draftValue = [
                'label'         => sanitize_text_field((string) ($body['label'] ?? '')),
                'ideal_for'     => sanitize_textarea_field((string) ($body['ideal_for'] ?? '')),
                'price'         => null,
                'contact'       => $contact,
                'billing_cycle' => sanitize_text_field((string) ($body['billing_cycle'] ?? '')),
            ];
        } elseif ($module === 'features') {
            $draftValue = $PS::sanitizeTierRateSheetSelections($body['rate_sheet_items'] ?? []);
        } else { // faqs
            $draftValue = [];
            if (is_array($body['faq_refs'] ?? null)) {
                foreach ($body['faq_refs'] as $ref) {
                    $ref = sanitize_text_field((string) $ref);
                    if ($ref !== '') { $draftValue[] = $ref; }
                }
            }
        }

        $slot['drafts'][$module]        = $draftValue;
        $slot['module_status'][$module] = 'pending';
        $station['tiers'][$tierId]      = $slot;
        $this->packages()->saveStation($station);

        return rest_ensure_response([
            'success'       => true,
            'tier_id'       => $tierId,
            'module'        => $module,
            'tier'          => $PS::normaliseTierSlot($slot),
            'drafts'        => $slot['drafts'],
            'module_status' => $slot['module_status'],
        ]);
    }

    /**
     * Engine D2 — archive a shell's occupant into the occupant_bin. Pending
     * drafts block the move unless discard_drafts: true (the UI confirms first);
     * the failure carries code: pending_drafts so the client can prompt. One
     * atomic meta write covers the bin append, the shell emptying, and the
     * station-status re-derive.
     */
    public function archivePackageStationTierOccupant(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $body          = $request->get_json_params();
        $discardDrafts = is_array($body) && !empty($body['discard_drafts']);

        $result = $PS::archiveTierOccupant(
            $station,
            $tierId,
            $discardDrafts,
            $PS::generateBinId(),
            current_time('mysql', true)
        );

        if (isset($result['error'])) {
            $message = match ($result['error']) {
                'unknown_tier'   => 'Unknown tier.',
                'no_occupant'    => 'This tier has no settled occupant to archive.',
                'pending_drafts' => 'This tier has unsettled changes. Discard them to archive.',
                default          => 'Archive failed.',
            };
            return rest_ensure_response(['success' => false, 'code' => $result['error'], 'message' => $message]);
        }

        $this->packages()->saveStation($result['station']);

        $slot = $result['station']['tiers'][$tierId];
        return rest_ensure_response([
            'success'         => true,
            'tier_id'         => $tierId,
            'tier'            => $PS::normaliseTierSlot($slot),
            'drafts'          => $slot['drafts'],
            'module_status'   => $slot['module_status'],
            'bin_entry'       => $result['entry'],
            'occupant_bin'    => $result['station']['occupant_bin'],
            'platform_status' => $result['station']['platform_status'] ?? 'disabled',
        ]);
    }

    /**
     * Engine D3 — restore a binned occupant into a shell. Plain restore targets
     * the origin shell (must be empty); body may carry mode: swap|retarget plus
     * target_tier (retarget) and discard_drafts. Swap is composed in memory by
     * the schema op and persisted here in a SINGLE meta write. Failures carry
     * code so the UI can prompt (target_occupied → offer swap/retarget,
     * pending_drafts → confirm discard).
     */
    public function restorePackageStationBinEntry(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $binId     = sanitize_key((string) $request->get_param('bin'));
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $body          = $request->get_json_params();
        $mode          = is_array($body) && isset($body['mode']) ? sanitize_key((string) $body['mode']) : '';
        $targetTier    = is_array($body) && isset($body['target_tier']) ? sanitize_key((string) $body['target_tier']) : '';
        $discardDrafts = is_array($body) && !empty($body['discard_drafts']);

        $result = $PS::restoreBinnedOccupant(
            $station,
            $binId,
            $mode === '' ? null : $mode,
            $targetTier === '' ? null : $targetTier,
            $discardDrafts,
            $PS::generateBinId(),
            current_time('mysql', true)
        );

        if (isset($result['error'])) {
            $message = match ($result['error']) {
                'unknown_bin_entry'   => 'Bin entry not found.',
                'invalid_mode'        => 'Invalid restore mode.',
                'restore_illegal'     => 'This entry cannot be restored.',
                'origin_unknown'      => 'This entry has no origin tier. Retarget it into an empty tier.',
                'unknown_tier'        => 'Unknown target tier.',
                'target_occupied'     => 'The target tier is occupied. Swap with its occupant or retarget to an empty tier.',
                'target_not_occupied' => 'The origin tier is empty — restore without swap.',
                'pending_drafts'      => 'The target tier has unsettled changes. Discard them to restore.',
                default               => 'Restore failed.',
            };
            return rest_ensure_response(['success' => false, 'code' => $result['error'], 'message' => $message]);
        }

        $this->packages()->saveStation($result['station']);

        $tierId = $result['tier_id'];
        $slot   = $result['station']['tiers'][$tierId];
        return rest_ensure_response([
            'success'         => true,
            'bin_id'          => $binId,
            'tier_id'         => $tierId,
            'tier'            => $PS::normaliseTierSlot($slot),
            'drafts'          => $slot['drafts'],
            'module_status'   => $slot['module_status'],
            'displaced_entry' => $result['displaced'],
            'occupant_bin'    => $result['station']['occupant_bin'],
            'platform_status' => $result['station']['platform_status'] ?? 'disabled',
        ]);
    }

    /** Engine D3 — trash a bin entry (archived → trashed, engine-validated). */
    public function trashPackageStationBinEntry(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $binId     = sanitize_key((string) $request->get_param('bin'));
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $result = $PS::trashBinnedOccupant($station, $binId);
        if (isset($result['error'])) {
            $message = match ($result['error']) {
                'unknown_bin_entry' => 'Bin entry not found.',
                'trash_illegal'     => 'Only archived entries can be moved to trash.',
                default             => 'Trash failed.',
            };
            return rest_ensure_response(['success' => false, 'code' => $result['error'], 'message' => $message]);
        }

        $this->packages()->saveStation($result['station']);

        return rest_ensure_response([
            'success'      => true,
            'bin_id'       => $binId,
            'bin_entry'    => $result['entry'],
            'occupant_bin' => $result['station']['occupant_bin'],
        ]);
    }

    /**
     * Engine D3 — permanently delete a bin entry. Legal only from trashed
     * (engine-validated); the only operation removing an occupant_bin entry.
     */
    public function deletePackageStationBinEntry(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $binId     = sanitize_key((string) $request->get_param('bin'));
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $result = $PS::deleteBinnedOccupant($station, $binId);
        if (isset($result['error'])) {
            $message = match ($result['error']) {
                'unknown_bin_entry' => 'Bin entry not found.',
                'delete_illegal'    => 'Only trashed entries can be permanently deleted.',
                default             => 'Delete failed.',
            };
            return rest_ensure_response(['success' => false, 'code' => $result['error'], 'message' => $message]);
        }

        $this->packages()->saveStation($result['station']);

        return rest_ensure_response([
            'success'      => true,
            'bin_id'       => $binId,
            'deleted'      => true,
            'occupant_bin' => $result['station']['occupant_bin'],
        ]);
    }

    /**
     * Engine D1 — revert one tier module draft. Clears drafts[module]; the
     * module's status re-derives from the settled occupant. Response shape
     * matches savePackageStationTierModule so the hook patches identically.
     */
    public function revertPackageStationTierModule(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));
        $module    = sanitize_key((string) $request->get_param('module'));
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }
        if (!in_array($tierId, $PS::ALLOWED_TIERS, true)) {
            return rest_ensure_response(['success' => false, 'message' => 'Unknown tier.']);
        }

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $slot = $PS::revertTierModuleDraft($station['tiers'][$tierId] ?? [], $module);
        if ($slot === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid module.']);
        }

        $station['tiers'][$tierId] = $slot;
        $this->packages()->saveStation($station);

        return rest_ensure_response([
            'success'       => true,
            'tier_id'       => $tierId,
            'module'        => $module,
            'tier'          => $PS::normaliseTierSlot($slot),
            'drafts'        => $slot['drafts'],
            'module_status' => $slot['module_status'],
        ]);
    }

    /**
     * Phase 2 — P3: settle a tier.
     * Commits the draft-preferred state of every module into current_occupant,
     * clears drafts, marks all modules settled, and re-derives station status.
     */
    public function settlePackageStationTier(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $slot = $PS::settleTierSlot($station['tiers'][$tierId] ?? []);
        $station['tiers'][$tierId]  = $slot;
        $station['platform_status'] = $PS::deriveStationStatus($station);
        $this->packages()->saveStation($station);

        return rest_ensure_response([
            'success'       => true,
            'tier_id'       => $tierId,
            'platform_status' => $station['platform_status'],
            'tier'          => $PS::normaliseTierSlot($slot),
            'drafts'        => $slot['drafts'],
            'module_status' => $slot['module_status'],
        ]);
    }

    /**
     * Phase 2 — P5: set the station-level popular tier.
     * `tier_id` selects the popular tier (must be a known tier); a null/empty
     * `tier_id` clears the selection. `label` is the popular badge text.
     */
    public function setPackageStationPopular(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $body   = $request->get_json_params();
        if (!is_array($body)) { $body = []; }
        $tierId = sanitize_key((string) ($body['tier_id'] ?? ''));

        if ($tierId !== '' && in_array($tierId, $PS::ALLOWED_TIERS, true)) {
            $station['popular_tier']  = $tierId;
            $station['popular_label'] = sanitize_text_field((string) ($body['label'] ?? ''));
        } else {
            $station['popular_tier']  = null;
            $station['popular_label'] = '';
        }

        $this->packages()->saveStation($station);

        return rest_ensure_response([
            'success'       => true,
            'popular_tier'  => $station['popular_tier'],
            'popular_label' => $station['popular_label'],
        ]);
    }

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Core\PlatformAccess::CAP);
    }
}
