<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Http;

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;

/**
 * Admin-only REST endpoints for Surface Package management.
 *
 * GET  /admin/surface-packages                          list (publish + draft)
 * GET  /admin/surface-packages/{id}                    detail with service inclusions/FAQs
 * POST /admin/surface-packages/{id}/tiers/{tier}       upsert tier configuration
 * POST /admin/surface-packages/{id}/disable            set cz_package.platform_status → disabled
 * POST /admin/surface-packages/{id}/enable             set cz_package.platform_status → active
 */
class AdminSurfacePackagesController
{
    public function __construct(private PackageRepository $repository) {}

    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        $ns = 'compuzign/v1';

        register_rest_route($ns, '/admin/surface-packages', [
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'list'],
                'permission_callback' => [$this, 'requireAdmin'],
            ],
            [
                'methods'             => 'POST',
                'callback'            => [$this, 'create'],
                'permission_callback' => [$this, 'requireAdmin'],
            ],
        ]);

        register_rest_route($ns, '/admin/surface-packages/(?P<id>\d+)', [
            'methods'             => 'GET',
            'callback'            => [$this, 'detail'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'validate_callback' => fn($v) => is_numeric($v)],
            ],
        ]);

        register_rest_route($ns, '/admin/surface-packages/(?P<id>\d+)/tiers/(?P<tier>[a-z]+)', [
            'methods'             => 'POST',
            'callback'            => [$this, 'saveTier'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'   => ['required' => true, 'validate_callback' => fn($v) => is_numeric($v)],
                'tier' => [
                    'required'          => true,
                    'validate_callback' => fn($v) => in_array($v, PackageSchema::ALLOWED_TIERS, true),
                ],
            ],
        ]);

        register_rest_route($ns, '/admin/surface-packages/(?P<id>\d+)/tiers/(?P<tier>[a-z]+)/enabled', [
            'methods'             => 'POST',
            'callback'            => [$this, 'setTierEnabled'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'   => ['required' => true, 'validate_callback' => fn($v) => is_numeric($v)],
                'tier' => [
                    'required'          => true,
                    'validate_callback' => fn($v) => in_array($v, PackageSchema::ALLOWED_TIERS, true),
                ],
            ],
        ]);

        register_rest_route($ns, '/admin/surface-packages/(?P<id>\d+)/promotion-tiers', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createPromotionTier'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'validate_callback' => fn($v) => is_numeric($v)],
            ],
        ]);

        // /archive and /reactivate must be registered before the bare /{promo} pattern so they are not swallowed.
        register_rest_route($ns, '/admin/surface-packages/(?P<id>\d+)/promotion-tiers/(?P<promo>[a-z0-9_]+)/archive', [
            'methods'             => 'POST',
            'callback'            => [$this, 'archivePromotionTier'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'    => ['required' => true, 'validate_callback' => fn($v) => is_numeric($v)],
                'promo' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);

        register_rest_route($ns, '/admin/surface-packages/(?P<id>\d+)/promotion-tiers/(?P<promo>[a-z0-9_]+)/reactivate', [
            'methods'             => 'POST',
            'callback'            => [$this, 'reactivatePromotionTier'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'    => ['required' => true, 'validate_callback' => fn($v) => is_numeric($v)],
                'promo' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);

        register_rest_route($ns, '/admin/surface-packages/(?P<id>\d+)/promotion-tiers/(?P<promo>[a-z0-9_]+)', [
            'methods'             => 'POST',
            'callback'            => [$this, 'savePromotionTier'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'    => ['required' => true, 'validate_callback' => fn($v) => is_numeric($v)],
                'promo' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);

        register_rest_route($ns, '/admin/surface-packages/(?P<id>\d+)/disable', [
            'methods'             => 'POST',
            'callback'            => [$this, 'disable'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'validate_callback' => fn($v) => is_numeric($v)],
            ],
        ]);

        register_rest_route($ns, '/admin/surface-packages/(?P<id>\d+)/enable', [
            'methods'             => 'POST',
            'callback'            => [$this, 'enable'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'validate_callback' => fn($v) => is_numeric($v)],
            ],
        ]);
    }

    // ── list ──────────────────────────────────────────────────────────────────

    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        $posts = $this->repository->findAll();

        $packages = array_map(function (\WP_Post $post): array {
            $pkg = get_post_meta($post->ID, 'cz_package', true);

            if (!is_array($pkg)) {
                return $this->emptyPackageRow($post);
            }

            $serviceRefs = array_map('intval', $pkg['service_refs'] ?? []);
            $services    = $this->resolveServiceNames($serviceRefs);

            // Phase 2: read tier data from cz_service_package_station.
            // Falls back to cz_package tiers for un-migrated services.
            $station    = $this->loadStationForPackage($pkg);
            $tierSource = $station['tiers'] ?? $pkg['tiers'] ?? [];

            $tierSummary = [];
            foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
                $tierSummary[$tierId] = PackageSchema::summariseTierSlot($tierSource[$tierId] ?? []);
            }

            $rawPkgStatus    = $station ? ($station['platform_status'] ?? '') : ($pkg['platform_status'] ?? '');
            $resolvedPkgStatus = in_array($rawPkgStatus, PackageSchema::ALLOWED_PLATFORM_STATUSES, true)
                                 ? $rawPkgStatus
                                 : ($post->post_status === 'publish' ? 'active' : 'disabled');

            return [
                'post_id'            => (int) $post->ID,
                'post_status'        => $post->post_status,
                'platform_status'    => $resolvedPkgStatus,
                'title'              => $post->post_title,
                'package_type'       => $pkg['package_type'] ?? 'tier_configuration',
                'service_refs'       => $serviceRefs,
                'services'           => $services,
                'tiers'              => $tierSummary,
                'promotion_tiers'    => $this->normalisePromotionTiers($pkg['promotion_tiers'] ?? []),
                'popular_tier'       => $station ? ($station['popular_tier'] ?? $pkg['popular_tier'] ?? null) : ($pkg['popular_tier'] ?? null),
                'popular_label'      => $station ? ($station['popular_label'] ?? $pkg['popular_label'] ?? '') : ($pkg['popular_label'] ?? ''),
                'faq_refs'           => $pkg['faq_refs'] ?? [],
                'display_contexts'   => $pkg['display_contexts'] ?? ['cost-builder'],
                'migration_complete' => (bool) ($pkg['migration_complete'] ?? false),
                'valid_from'         => $pkg['valid_from'] ?? null,
                'valid_until'        => $pkg['valid_until'] ?? null,
            ];
        }, $posts);

        return rest_ensure_response([
            'success'  => true,
            'total'    => count($packages),
            'packages' => $packages,
        ]);
    }

    // ── migration read-only guard ─────────────────────────────────────────────
    // Phase 1: cz_surface_package is retired/read-only. Package data is now owned
    // by cz_service_package_station meta. Tier and package write operations are
    // blocked here until the new commercial management UI is implemented in Phase 2.
    // Promotion writes are intentionally NOT blocked — they remain the active path
    // until Phase 4 moves them to the Promotion Station.

    private function migrationReadOnly(): \WP_REST_Response
    {
        return new \WP_REST_Response([
            'success' => false,
            'code'    => 'package_migration_read_only',
            'message' => 'cz_surface_package is in retired/read-only state. '
                       . 'Package data is now managed via cz_service_package_station on the Service Station. '
                       . 'Tier and package writes are unavailable until the Phase 2 commercial management UI is complete.',
        ], 423);
    }

    // ── create ────────────────────────────────────────────────────────────────

    public function create(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->migrationReadOnly();

        // @phpstan-ignore-next-line — blocked during Phase 1 migration; restore in Phase 2
        $body = $request->get_json_params();
        if (!is_array($body)) {
            return $this->error('Invalid request body.', 400);
        }

        $serviceId = (int) ($body['service_id'] ?? 0);
        if ($serviceId <= 0) {
            return $this->error('service_id is required.', 422);
        }

        $servicePost = get_post($serviceId);
        if (!$servicePost instanceof \WP_Post || $servicePost->post_type !== 'cz_service') {
            return $this->error('Service not found.', 422);
        }

        $title = sanitize_text_field((string) ($body['title'] ?? ''));
        if ($title === '') {
            $title = $servicePost->post_title;
        }

        // Rule 1 + 9: post_status = publish always; platform_status owns the lifecycle.
        $postId = wp_insert_post([
            'post_type'   => 'cz_surface_package',
            'post_status' => 'publish',
            'post_title'  => $title,
        ], true);

        if (is_wp_error($postId)) {
            return $this->error($postId->get_error_message(), 500);
        }

        update_post_meta((int) $postId, 'cz_package', [
            'platform_status'    => 'disabled',
            'package_type'       => 'tier_configuration',
            'service_refs'       => [$serviceId],
            'tiers'              => [],
            'popular_tier'       => null,
            'popular_label'      => '',
            'promotion_tiers'    => [],
            'faq_refs'           => [],
            'display_contexts'   => ['cost-builder'],
            'migration_complete' => false,
        ]);

        return rest_ensure_response([
            'success'    => true,
            'package_id' => (int) $postId,
        ]);
    }

    // ── detail ────────────────────────────────────────────────────────────────

    public function detail(\WP_REST_Request $request): \WP_REST_Response
    {
        $packageId = (int) $request->get_param('id');
        $post      = get_post($packageId);

        if (!$post instanceof \WP_Post || $post->post_type !== 'cz_surface_package') {
            return $this->error('Package not found.', 404);
        }

        $pkg = get_post_meta($packageId, 'cz_package', true);
        if (!is_array($pkg)) {
            $pkg = (new PackageSchema())->defaultPackage();
        }

        $serviceRefs = array_map('intval', $pkg['service_refs'] ?? []);
        $service     = !empty($serviceRefs) ? $this->loadServiceDetail($serviceRefs[0]) : null;

        // Phase 2: read tier data from cz_service_package_station; fall back to cz_package.
        $station    = $this->loadStationForPackage($pkg);
        $tierSource = $station['tiers'] ?? $pkg['tiers'] ?? [];

        $tiers = [];
        foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
            $tiers[$tierId] = PackageSchema::normaliseTierSlot($tierSource[$tierId] ?? []);
        }

        $rawStatus    = $station ? ($station['platform_status'] ?? '') : ($pkg['platform_status'] ?? '');
        $resolvedStatus = in_array($rawStatus, PackageSchema::ALLOWED_PLATFORM_STATUSES, true)
                          ? $rawStatus
                          : ($post->post_status === 'publish' ? 'active' : 'disabled');

        return rest_ensure_response([
            'success' => true,
            'package' => [
                'post_id'            => (int) $post->ID,
                'post_status'        => $post->post_status,
                'platform_status'    => $resolvedStatus,
                'title'              => $post->post_title,
                'package_type'       => $pkg['package_type'] ?? 'tier_configuration',
                'service_refs'       => $serviceRefs,
                'tiers'              => $tiers,
                'promotion_tiers'    => $this->normalisePromotionTiers($pkg['promotion_tiers'] ?? []),
                'popular_tier'       => $station ? ($station['popular_tier'] ?? $pkg['popular_tier'] ?? null) : ($pkg['popular_tier'] ?? null),
                'popular_label'      => $station ? ($station['popular_label'] ?? $pkg['popular_label'] ?? '') : ($pkg['popular_label'] ?? ''),
                'faq_refs'           => $pkg['faq_refs'] ?? [],
                'display_contexts'   => $pkg['display_contexts'] ?? ['cost-builder'],
                'migration_complete' => (bool) ($pkg['migration_complete'] ?? false),
            ],
            'service' => $service,
        ]);
    }

    // ── saveTier ──────────────────────────────────────────────────────────────

    public function saveTier(\WP_REST_Request $request): \WP_REST_Response
    {
        $packageId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));

        $post = get_post($packageId);
        if (!$post instanceof \WP_Post || $post->post_type !== 'cz_surface_package') {
            return $this->error('Package not found.', 404);
        }

        $body = $request->get_json_params();
        if (!is_array($body)) {
            return $this->error('Invalid request body.', 400);
        }

        $pkg = get_post_meta($packageId, 'cz_package', true);
        if (!is_array($pkg)) {
            $pkg = (new PackageSchema())->defaultPackage();
        }

        $serviceRefs = array_map('intval', $pkg['service_refs'] ?? []);
        $serviceId   = $serviceRefs[0] ?? 0;
        if ($serviceId <= 0) {
            return $this->error('No service linked to this package.', 422);
        }

        $station = get_post_meta($serviceId, 'cz_service_package_station', true);
        if (!is_array($station) || empty($station)) {
            return $this->error('Package Station not found on service. Run Phase 1 migration first.', 422);
        }

        // ── Add new canonical inclusions/FAQs to Service Core ─────────────────
        $addedInclusions = [];
        if (!empty($body['new_inclusions']) && is_array($body['new_inclusions'])) {
            $addedInclusions = $this->addInclusionsToService($serviceId, $body['new_inclusions']);
        }

        $addedFaqRefs = [];
        if (!empty($body['new_faqs']) && is_array($body['new_faqs'])) {
            $addedFaqRefs = $this->addFaqsToService($serviceId, $body['new_faqs']);
        }

        // ── Resolve current tier detail for fallback values ────────────────────
        $existingDetail = PackageSchema::normaliseTierSlot($station['tiers'][$tierId] ?? []);

        // ── Inclusions ────────────────────────────────────────────────────────
        $inclusions = [];
        if (array_key_exists('inclusions_override', $body) && is_array($body['inclusions_override'])) {
            foreach ($body['inclusions_override'] as $inc) {
                if (!is_array($inc)) { continue; }
                $id    = sanitize_text_field((string) ($inc['id'] ?? ''));
                $label = sanitize_text_field((string) ($inc['label'] ?? ''));
                if ($id !== '' && $label !== '') {
                    $inclusions[] = ['id' => $id, 'label' => $label];
                }
            }
        } else {
            $inclusions = $existingDetail['inclusions_override'];
        }
        foreach ($addedInclusions as $inc) {
            if (!in_array($inc['id'], array_column($inclusions, 'id'), true)) {
                $inclusions[] = $inc;
            }
        }

        // ── FAQ refs ──────────────────────────────────────────────────────────
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

        // Phase 2: write occupant to tier shell in cz_service_package_station.
        $station['tiers'][$tierId] = PackageSchema::upsertOccupant(
            $station['tiers'][$tierId] ?? ['current_occupant' => null, 'history' => []],
            $tierData,
            $enabled
        );

        // ── Popular tier (station-level field) ────────────────────────────────
        if (array_key_exists('popular', $body)) {
            if ((bool) $body['popular']) {
                $station['popular_tier']  = $tierId;
                $station['popular_label'] = sanitize_text_field((string) ($body['popular_label'] ?? ''));
            } elseif (($station['popular_tier'] ?? null) === $tierId) {
                $station['popular_tier'] = null;
            }
        }

        // Derive station platform_status from tier occupant states.
        $station['platform_status'] = PackageSchema::deriveStationStatus($station);

        update_post_meta($serviceId, 'cz_service_package_station', $station);

        return rest_ensure_response([
            'success'              => true,
            'package_meta'         => $this->stationToPackageMeta($station, $packageId),
            'new_inclusions_added' => count($addedInclusions),
            'new_faqs_added'       => count($addedFaqRefs),
        ]);
    }

    // ── disable / enable ──────────────────────────────────────────────────────

    public function disable(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->migrationReadOnly();
    }

    public function enable(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->migrationReadOnly();
    }

    /**
     * Toggle the enabled flag of a single tier without touching price or inclusions.
     * Body: { enabled: bool }
     */
    public function setTierEnabled(\WP_REST_Request $request): \WP_REST_Response
    {
        $packageId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));

        $post = get_post($packageId);
        if (!$post instanceof \WP_Post || $post->post_type !== 'cz_surface_package') {
            return $this->error('Package not found.', 404);
        }

        $body    = $request->get_json_params();
        $enabled = isset($body['enabled']) ? (bool) $body['enabled'] : true;

        $pkg         = get_post_meta($packageId, 'cz_package', true);
        $serviceRefs = is_array($pkg) ? array_map('intval', $pkg['service_refs'] ?? []) : [];
        $serviceId   = $serviceRefs[0] ?? 0;
        if ($serviceId <= 0) {
            return $this->error('No service linked to this package.', 422);
        }

        $station = get_post_meta($serviceId, 'cz_service_package_station', true);
        if (!is_array($station) || empty($station)) {
            return $this->error('Package Station not found on service.', 422);
        }

        $tierSlot = $station['tiers'][$tierId] ?? [];

        if (PackageSchema::isOccupantFormat($tierSlot)) {
            // Phase 2: update occupant platform_status.
            if (!empty($tierSlot['current_occupant'])) {
                $station['tiers'][$tierId]['current_occupant']['platform_status'] = $enabled ? 'active' : 'disabled';
            }
        } else {
            // Phase 1 flat: update enabled field.
            if (!empty($tierSlot)) {
                $station['tiers'][$tierId]['enabled'] = $enabled;
            }
        }

        $station['platform_status'] = PackageSchema::deriveStationStatus($station);
        update_post_meta($serviceId, 'cz_service_package_station', $station);

        return rest_ensure_response(['success' => true, 'tier_id' => $tierId, 'enabled' => $enabled]);
    }

    /**
     * Rule 9: package enable/disable writes platform_status to cz_package meta.
     * post_status is never touched — all normal package records stay post_status=publish.
     */
    private function setStatus(int $packageId, string $platformStatus): \WP_REST_Response
    {
        $post = get_post($packageId);
        if (!$post instanceof \WP_Post || $post->post_type !== 'cz_surface_package') {
            return $this->error('Package not found.', 404);
        }

        $pkg = get_post_meta($packageId, 'cz_package', true);
        if (!is_array($pkg)) {
            $pkg = (new PackageSchema())->defaultPackage();
        }

        $pkg['platform_status'] = $platformStatus;
        update_post_meta($packageId, 'cz_package', $pkg);

        return rest_ensure_response([
            'success'         => true,
            'platform_status' => $platformStatus,
            // Deprecated: kept during transition so any frontend reading post_status still works.
            'post_status'     => $post->post_status,
        ]);
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Modules\Admin\AdminRouter::CAP);
    }

    // ── Service Core helpers ──────────────────────────────────────────────────

    /**
     * Add new inclusions to the service's cz_service_inclusions pool.
     * Returns the array of actually-added [{id, label}] items.
     *
     * @param  int   $serviceId
     * @param  array $items     [{label: string}]
     * @return array<int, array{id: string, label: string}>
     */
    private function addInclusionsToService(int $serviceId, array $items): array
    {
        $raw  = get_post_meta($serviceId, 'cz_service_inclusions', true) ?: [];
        $pool = (isset($raw['inclusions']) && is_array($raw['inclusions'])) ? $raw['inclusions'] : [];

        $byId    = array_flip(array_column($pool, 'id'));
        $byLabel = array_flip(array_map('strtolower', array_column($pool, 'label')));
        $added   = [];

        foreach ($items as $item) {
            $label = sanitize_text_field((string) ($item['label'] ?? ''));
            if ($label === '') {
                continue;
            }
            $id = sanitize_title($label);
            if (isset($byId[$id]) || isset($byLabel[strtolower($label)])) {
                continue;
            }
            $inc           = ['id' => $id, 'label' => $label];
            $pool[]        = $inc;
            $added[]       = $inc;
            $byId[$id]     = true;
            $byLabel[strtolower($label)] = true;
        }

        if (!empty($added)) {
            $raw['inclusions'] = $pool;
            if (!isset($raw['tier_inclusions']) || !is_array($raw['tier_inclusions'])) {
                $raw['tier_inclusions'] = array_fill_keys(PackageSchema::ALLOWED_TIERS, []);
            }
            update_post_meta($serviceId, 'cz_service_inclusions', $raw);
        }

        return $added;
    }

    /**
     * Add new FAQs to the service's cz_service_faqs pool.
     * Returns the IDs of actually-added FAQs.
     *
     * @param  int   $serviceId
     * @param  array $items     [{question: string, answer: string}]
     * @return string[]
     */
    private function addFaqsToService(int $serviceId, array $items): array
    {
        $pool = get_post_meta($serviceId, 'cz_service_faqs', true) ?: [];
        if (!is_array($pool)) {
            $pool = [];
        }

        $byId       = array_flip(array_column($pool, 'id'));
        $byQuestion = array_flip(array_map('strtolower', array_column($pool, 'question')));
        $addedIds   = [];

        foreach ($items as $item) {
            $question = sanitize_text_field((string) ($item['question'] ?? ''));
            $answer   = sanitize_textarea_field((string) ($item['answer'] ?? ''));
            if ($question === '') {
                continue;
            }
            $id = sanitize_title($question);
            if (isset($byId[$id]) || isset($byQuestion[strtolower($question)])) {
                continue;
            }
            $pool[]        = ['id' => $id, 'question' => $question, 'answer' => $answer];
            $addedIds[]    = $id;
            $byId[$id]     = true;
            $byQuestion[strtolower($question)] = true;
        }

        if (!empty($addedIds)) {
            update_post_meta($serviceId, 'cz_service_faqs', $pool);
        }

        return $addedIds;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * @param  int[]  $serviceIds
     * @return array<int, array{id: int, title: string, slug: string}>
     */
    private function resolveServiceNames(array $serviceIds): array
    {
        $out = [];
        foreach ($serviceIds as $id) {
            $post = get_post($id);
            if ($post instanceof \WP_Post && $post->post_type === 'cz_service') {
                $out[] = ['id' => (int) $post->ID, 'title' => $post->post_title, 'slug' => $post->post_name];
            } else {
                $out[] = ['id' => $id, 'title' => '(deleted)', 'slug' => ''];
            }
        }
        return $out;
    }

    /**
     * @return array{id: int, title: string, slug: string, excerpt: string, inclusions: array, faqs: array}|null
     */
    private function loadServiceDetail(int $serviceId): ?array
    {
        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== 'cz_service') {
            return null;
        }

        // Inclusion pool from canonical cz_service_inclusions meta.
        $rawInc   = get_post_meta($serviceId, 'cz_service_inclusions', true) ?: [];
        $incPool  = (isset($rawInc['inclusions']) && is_array($rawInc['inclusions']))
            ? $rawInc['inclusions']
            : (is_array($rawInc) ? $rawInc : []);

        $inclusions = [];
        foreach ($incPool as $item) {
            if (!is_array($item)) continue;
            $id    = sanitize_text_field((string) ($item['id'] ?? ''));
            $label = sanitize_text_field((string) ($item['label'] ?? ''));
            if ($id !== '' && $label !== '') {
                $inclusions[] = ['id' => $id, 'label' => $label];
            }
        }

        // FAQ pool from canonical cz_service_faqs meta.
        $rawFaqs = get_post_meta($serviceId, 'cz_service_faqs', true) ?: [];
        $faqs    = [];
        foreach ((is_array($rawFaqs) ? $rawFaqs : []) as $item) {
            if (!is_array($item)) continue;
            $id       = sanitize_text_field((string) ($item['id'] ?? ''));
            $question = sanitize_text_field((string) ($item['question'] ?? ''));
            $answer   = sanitize_textarea_field((string) ($item['answer'] ?? ''));
            if ($question !== '') {
                $faqs[] = ['id' => $id !== '' ? $id : sanitize_title($question), 'question' => $question, 'answer' => $answer];
            }
        }

        return [
            'id'         => (int) $post->ID,
            'title'      => $post->post_title,
            'slug'       => $post->post_name,
            'excerpt'    => $post->post_excerpt,
            'inclusions' => $inclusions,
            'faqs'       => $faqs,
        ];
    }

    /**
     * Summarise tiers for the list view. Delegates to PackageSchema::summariseTierSlot()
     * which handles both Phase 1 flat and Phase 2 occupant formats.
     *
     * @param  mixed $tiers
     * @return array<string, array{label: string, price: float|null, billing_cycle: string|null, inclusion_count: int, faq_count: int, enabled: bool, configured: bool}>
     */
    private function summariseTiers(mixed $tiers): array
    {
        if (!is_array($tiers)) {
            $tiers = [];
        }
        $out = [];
        foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
            $out[$tierId] = PackageSchema::summariseTierSlot($tiers[$tierId] ?? []);
        }
        return $out;
    }

    /**
     * Load the cz_service_package_station meta for the service referenced by a package.
     * Returns the station array, or null if the service hasn't been migrated yet.
     */
    private function loadStationForPackage(array $pkg): ?array
    {
        $serviceRefs = array_map('intval', $pkg['service_refs'] ?? []);
        $serviceId   = $serviceRefs[0] ?? 0;
        if ($serviceId <= 0) {
            return null;
        }
        $station = get_post_meta($serviceId, 'cz_service_package_station', true);
        return (is_array($station) && !empty($station)) ? $station : null;
    }

    /**
     * Shape a cz_service_package_station array into the SurfacePackageDetailData response
     * expected by the frontend (TierSaveResponse.package_meta).
     */
    private function stationToPackageMeta(array $station, int $packageId): array
    {
        $post  = get_post($packageId);
        $tiers = [];
        foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
            $tiers[$tierId] = PackageSchema::normaliseTierSlot($station['tiers'][$tierId] ?? []);
        }
        return [
            'post_id'            => $packageId,
            'post_status'        => $post ? $post->post_status : 'publish',
            'platform_status'    => $station['platform_status'] ?? 'disabled',
            'title'              => $post ? $post->post_title : '',
            'package_type'       => 'tier_configuration',
            'service_refs'       => [],
            'tiers'              => $tiers,
            'promotion_tiers'    => [],
            'popular_tier'       => $station['popular_tier'] ?? null,
            'popular_label'      => $station['popular_label'] ?? '',
            'faq_refs'           => $station['faq_refs'] ?? [],
            'display_contexts'   => $station['display_contexts'] ?? ['cost-builder'],
            'migration_complete' => true,
        ];
    }

    private function emptyPackageRow(\WP_Post $post): array
    {
        return [
            'post_id'            => (int) $post->ID,
            'post_status'        => $post->post_status,
            'platform_status'    => 'disabled',
            'title'              => $post->post_title,
            'package_type'       => null,
            'service_refs'       => [],
            'services'           => [],
            'tiers'              => [],
            'promotion_tiers'    => [],
            'popular_tier'       => null,
            'faq_refs'           => [],
            'display_contexts'   => [],
            'migration_complete' => false,
            'valid_from'         => null,
            'valid_until'        => null,
        ];
    }

    // ── Promotion tier write endpoints ────────────────────────────────────────

    public function createPromotionTier(\WP_REST_Request $request): \WP_REST_Response
    {
        $packageId = (int) $request->get_param('id');
        $post      = get_post($packageId);

        if (!$post instanceof \WP_Post || $post->post_type !== 'cz_surface_package') {
            return $this->error('Package not found.', 404);
        }

        $body = $request->get_json_params();
        if (!is_array($body)) {
            return $this->error('Invalid request body.', 400);
        }

        $pkg = get_post_meta($packageId, 'cz_package', true);
        if (!is_array($pkg)) {
            $pkg = (new PackageSchema())->defaultPackage();
        }

        $serviceRefs     = array_map('intval', $pkg['service_refs'] ?? []);
        $serviceId       = $serviceRefs[0] ?? 0;
        $addedInclusions = [];

        if (!empty($body['new_inclusions']) && is_array($body['new_inclusions']) && $serviceId > 0) {
            $addedInclusions = $this->addInclusionsToService($serviceId, $body['new_inclusions']);
        }

        $promoId = PackageSchema::generatePromotionTierId();
        $tier    = $this->buildPromotionTier($promoId, $body, $addedInclusions);

        if (!isset($pkg['promotion_tiers']) || !is_array($pkg['promotion_tiers'])) {
            $pkg['promotion_tiers'] = [];
        }
        $pkg['promotion_tiers'][] = $tier;

        update_post_meta($packageId, 'cz_package', $pkg);

        $saved     = get_post_meta($packageId, 'cz_package', true);
        $savedTier = $this->findPromoInMeta($saved, $promoId) ?? $tier;

        return rest_ensure_response(['success' => true, 'promo_id' => $promoId, 'promotion_tier' => $savedTier]);
    }

    public function savePromotionTier(\WP_REST_Request $request): \WP_REST_Response
    {
        $packageId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));

        $post = get_post($packageId);
        if (!$post instanceof \WP_Post || $post->post_type !== 'cz_surface_package') {
            return $this->error('Package not found.', 404);
        }

        $body = $request->get_json_params();
        if (!is_array($body)) {
            return $this->error('Invalid request body.', 400);
        }

        $pkg = get_post_meta($packageId, 'cz_package', true);
        if (!is_array($pkg)) {
            return $this->error('Package meta not found.', 404);
        }

        $promos = is_array($pkg['promotion_tiers'] ?? null) ? $pkg['promotion_tiers'] : [];
        $idx    = null;
        foreach ($promos as $i => $t) {
            if (is_array($t) && ($t['id'] ?? '') === $promoId) {
                $idx = $i;
                break;
            }
        }

        if ($idx === null) {
            return $this->error('Promotion tier not found.', 404);
        }

        $serviceRefs     = array_map('intval', $pkg['service_refs'] ?? []);
        $serviceId       = $serviceRefs[0] ?? 0;
        $addedInclusions = [];

        if (!empty($body['new_inclusions']) && is_array($body['new_inclusions']) && $serviceId > 0) {
            $addedInclusions = $this->addInclusionsToService($serviceId, $body['new_inclusions']);
        }

        $promos[$idx]           = $this->buildPromotionTier($promoId, $body, $addedInclusions, $promos[$idx]);
        $pkg['promotion_tiers'] = array_values($promos);

        update_post_meta($packageId, 'cz_package', $pkg);

        $saved     = get_post_meta($packageId, 'cz_package', true);
        $savedTier = $this->findPromoInMeta($saved, $promoId) ?? $promos[$idx];

        return rest_ensure_response(['success' => true, 'promo_id' => $promoId, 'promotion_tier' => $savedTier]);
    }

    public function archivePromotionTier(\WP_REST_Request $request): \WP_REST_Response
    {
        $packageId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));

        $post = get_post($packageId);
        if (!$post instanceof \WP_Post || $post->post_type !== 'cz_surface_package') {
            return $this->error('Package not found.', 404);
        }

        $pkg = get_post_meta($packageId, 'cz_package', true);
        if (!is_array($pkg)) {
            return $this->error('Package meta not found.', 404);
        }

        $promos = is_array($pkg['promotion_tiers'] ?? null) ? $pkg['promotion_tiers'] : [];
        $found  = false;

        foreach ($promos as &$tier) {
            if (is_array($tier) && ($tier['id'] ?? '') === $promoId) {
                $tier['status'] = 'archived';
                $found = true;
                break;
            }
        }
        unset($tier);

        if (!$found) {
            return $this->error('Promotion tier not found.', 404);
        }

        $pkg['promotion_tiers'] = $promos;
        update_post_meta($packageId, 'cz_package', $pkg);

        return rest_ensure_response(['success' => true, 'promo_id' => $promoId, 'status' => 'archived']);
    }

    public function reactivatePromotionTier(\WP_REST_Request $request): \WP_REST_Response
    {
        $packageId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));

        $post = get_post($packageId);
        if (!$post instanceof \WP_Post || $post->post_type !== 'cz_surface_package') {
            return $this->error('Package not found.', 404);
        }

        $pkg = get_post_meta($packageId, 'cz_package', true);
        if (!is_array($pkg)) {
            return $this->error('Package meta not found.', 404);
        }

        $promos = is_array($pkg['promotion_tiers'] ?? null) ? $pkg['promotion_tiers'] : [];
        $found  = false;

        foreach ($promos as &$tier) {
            if (is_array($tier) && ($tier['id'] ?? '') === $promoId) {
                $tier['status'] = 'active';
                $found = true;
                break;
            }
        }
        unset($tier);

        if (!$found) {
            return $this->error('Promotion tier not found.', 404);
        }

        $pkg['promotion_tiers'] = $promos;
        update_post_meta($packageId, 'cz_package', $pkg);

        return rest_ensure_response(['success' => true, 'promo_id' => $promoId, 'status' => 'active']);
    }

    // ── Promotion tier helpers ─────────────────────────────────────────────────

    /**
     * Builds a sanitised promotion tier array from a request body.
     * Falls back to $existing values for any field not present in $body.
     * Merges $addedInclusions into the stored inclusions list.
     *
     * @param  string $id
     * @param  array  $body
     * @param  array  $addedInclusions
     * @param  array  $existing
     * @return array<string, mixed>
     */
    private function buildPromotionTier(string $id, array $body, array $addedInclusions = [], array $existing = []): array
    {
        // Inclusions: [{id, label}] selected from service pool.
        $inclusions = $existing['inclusions'] ?? [];
        if (array_key_exists('inclusions', $body) && is_array($body['inclusions'])) {
            $inclusions = [];
            foreach ($body['inclusions'] as $inc) {
                if (!is_array($inc)) continue;
                $incId    = sanitize_text_field((string) ($inc['id'] ?? ''));
                $incLabel = sanitize_text_field((string) ($inc['label'] ?? ''));
                if ($incId !== '' && $incLabel !== '') {
                    $inclusions[] = ['id' => $incId, 'label' => $incLabel];
                }
            }
        }
        foreach ($addedInclusions as $inc) {
            if (!in_array($inc['id'], array_column($inclusions, 'id'), true)) {
                $inclusions[] = $inc;
            }
        }

        // Exclusions: [{id, label}] from service pool, not included in this promotion.
        $exclusions = $existing['exclusions'] ?? [];
        if (array_key_exists('exclusions', $body) && is_array($body['exclusions'])) {
            $exclusions = [];
            foreach ($body['exclusions'] as $exc) {
                if (!is_array($exc)) continue;
                $excId    = sanitize_text_field((string) ($exc['id'] ?? ''));
                $excLabel = sanitize_text_field((string) ($exc['label'] ?? ''));
                if ($excId !== '' && $excLabel !== '') {
                    $exclusions[] = ['id' => $excId, 'label' => $excLabel];
                }
            }
        }

        // Features (add-ons): flat string list.
        $features = $existing['features'] ?? [];
        if (array_key_exists('features', $body) && is_array($body['features'])) {
            $features = array_values(array_filter(
                array_map('sanitize_text_field', array_map('strval', $body['features'])),
                fn($f) => $f !== ''
            ));
        }

        // Price.
        $price = $existing['price'] ?? null;
        if (array_key_exists('price', $body)) {
            $price = ($body['price'] !== null && $body['price'] !== '') ? (float) $body['price'] : null;
        }

        // Status.
        $status = $existing['status'] ?? 'draft';
        if (!empty($body['status']) && in_array($body['status'], PackageSchema::ALLOWED_PROMOTION_STATUSES, true)) {
            $status = $body['status'];
        }

        // based_on.
        $basedOn = $existing['based_on'] ?? null;
        if (array_key_exists('based_on', $body)) {
            $candidate = sanitize_text_field((string) ($body['based_on'] ?? ''));
            $basedOn   = in_array($candidate, PackageSchema::ALLOWED_BASED_ON, true) ? $candidate : null;
        }

        $name = sanitize_text_field((string) ($body['name'] ?? $existing['name'] ?? ''));
        $slug = !empty($body['slug'])
            ? sanitize_title((string) $body['slug'])
            : (sanitize_title($name) ?: ($existing['slug'] ?? ''));

        return [
            'id'             => $id,
            'name'           => $name,
            'slug'           => $slug,
            'status'         => $status,
            'based_on'       => $basedOn,
            'headline'       => sanitize_text_field((string) ($body['headline'] ?? $existing['headline'] ?? '')),
            'description'    => sanitize_textarea_field((string) ($body['description'] ?? $existing['description'] ?? '')),
            'price'          => $price,
            'billing_label'  => sanitize_text_field((string) ($body['billing_label'] ?? $existing['billing_label'] ?? '')),
            'features'       => $features,
            'inclusions'     => $inclusions,
            'exclusions'     => $exclusions,
            'badge'          => sanitize_text_field((string) ($body['badge'] ?? $existing['badge'] ?? '')),
            'campaign_label' => sanitize_text_field((string) ($body['campaign_label'] ?? $existing['campaign_label'] ?? '')),
            'starts_at'      => $this->parseDatetimeField($body, $existing, 'starts_at'),
            'ends_at'        => $this->parseDatetimeField($body, $existing, 'ends_at'),
            'priority'       => (int) ($body['priority'] ?? $existing['priority'] ?? 0),
            'is_featured'    => (bool) ($body['is_featured'] ?? $existing['is_featured'] ?? false),
            'metadata'       => $existing['metadata'] ?? [],
        ];
    }

    private function parseDatetimeField(array $body, array $existing, string $key): ?string
    {
        if (!array_key_exists($key, $body)) {
            return $existing[$key] ?? null;
        }
        if ($body[$key] === null || $body[$key] === '') {
            return null;
        }
        $ts = strtotime((string) $body[$key]);
        return ($ts !== false) ? gmdate('Y-m-d H:i:s', $ts) : null;
    }

    private function findPromoInMeta(mixed $meta, string $promoId): ?array
    {
        $tiers = is_array($meta) ? ($meta['promotion_tiers'] ?? []) : [];
        foreach ($tiers as $t) {
            if (is_array($t) && ($t['id'] ?? '') === $promoId) {
                return $t;
            }
        }
        return null;
    }

    /**
     * Normalise a raw promotion_tiers array from package meta into the API shape.
     * Records without a valid id are dropped.
     * Coerces inclusions/exclusions to [{id, label}] — drops any legacy string values.
     *
     * @param  mixed $tiers
     * @return array<int, array<string, mixed>>
     */
    private function normalisePromotionTiers(mixed $tiers): array
    {
        if (!is_array($tiers)) {
            return [];
        }

        $out = [];

        foreach ($tiers as $tier) {
            if (!is_array($tier) || empty($tier['id'])) {
                continue;
            }

            $out[] = [
                'id'             => (string) $tier['id'],
                'name'           => $tier['name'] ?? '',
                'slug'           => $tier['slug'] ?? '',
                'status'         => $tier['status'] ?? 'draft',
                'based_on'       => $tier['based_on'] ?? null,
                'headline'       => $tier['headline'] ?? '',
                'description'    => $tier['description'] ?? '',
                'price'          => isset($tier['price']) && $tier['price'] !== null ? (float) $tier['price'] : null,
                'billing_label'  => $tier['billing_label'] ?? '',
                'features'       => is_array($tier['features'] ?? null) ? $tier['features'] : [],
                'inclusions'     => $this->coerceInclusionItems($tier['inclusions'] ?? []),
                'exclusions'     => $this->coerceInclusionItems($tier['exclusions'] ?? []),
                'badge'          => $tier['badge'] ?? '',
                'campaign_label' => $tier['campaign_label'] ?? '',
                'starts_at'      => $tier['starts_at'] ?? null,
                'ends_at'        => $tier['ends_at'] ?? null,
                'priority'       => (int) ($tier['priority'] ?? 0),
                'is_featured'    => (bool) ($tier['is_featured'] ?? false),
                'metadata'       => is_array($tier['metadata'] ?? null) ? $tier['metadata'] : [],
            ];
        }

        return $out;
    }

    /**
     * Coerce a raw inclusions/exclusions array to [{id, label}] only.
     * Plain strings (legacy seed data) are silently dropped.
     *
     * @param  mixed $items
     * @return array<int, array{id: string, label: string}>
     */
    private function coerceInclusionItems(mixed $items): array
    {
        if (!is_array($items)) {
            return [];
        }
        $out = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue; // drop legacy plain strings
            }
            $id    = (string) ($item['id'] ?? '');
            $label = (string) ($item['label'] ?? '');
            if ($id !== '' && $label !== '') {
                $out[] = ['id' => $id, 'label' => $label];
            }
        }
        return $out;
    }

    private function error(string $message, int $status = 400): \WP_REST_Response
    {
        return new \WP_REST_Response(['success' => false, 'message' => $message], $status);
    }
}
