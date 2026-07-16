<?php

namespace CompuZign\Platform\Modules\Promotions\Http;

use CompuZign\Platform\Modules\Admin\Support\PoolReferences;
use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;

/**
 * Promotion instances, modules, and lifecycle.
 *
 * Ownership: these handlers moved here from AdminServicesController, where they
 * only ever lived because Promotion data used to be stored on the Service post.
 * Promotions are a child collection of the independent Package Station and
 * persist through PackageRepository (cz_package_station) — that authority is
 * unchanged, and this module deliberately holds no storage of its own.
 *
 * The URLs are deliberately UNCHANGED and remain nested beneath the Package
 * Station's Service-scoped path
 * (/admin/services/{id}/package-station/promotions/...). Route nesting does not
 * determine module ownership: {id} is navigation context only — it never owns or
 * selects storage. See docs/code-map/service-station.md.
 */
class PromotionsController
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
        // ===================================================================
        // SECTION: PROMOTION_ROUTES
        // ===================================================================
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/promotions', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getPromotionStation'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/promotions', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createServicePromotion'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/promotions/(?P<promo>[a-z0-9_]+)/archive', [
            'methods'             => 'POST',
            'callback'            => [$this, 'archiveServicePromotion'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'    => ['required' => true, 'type' => 'integer'],
                'promo' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);

        // E2 retirement: the whole-record save route (POST .../promotions/{promo})
        // and the reactivate legacy alias are gone. Module drafts (C2) own content
        // writes; the transition endpoints (C3) own every status write.

        // ── Promotion module lifecycle (engine C2) ────────────────────────────
        // Per-module draft save / settle / revert — the travelling-instance
        // counterparts of the tier module routes. Travel status is never written
        // here; the transition endpoints (C3) own status.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/promotions/(?P<promo>[a-z0-9_]+)/modules/(?P<module>overview|features|faqs)', [
            'methods'             => 'POST',
            'callback'            => [$this, 'savePromotionModule'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'     => ['required' => true, 'type' => 'integer'],
                'promo'  => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
                'module' => ['required' => true, 'type' => 'string'],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/promotions/(?P<promo>[a-z0-9_]+)/settle', [
            'methods'             => 'POST',
            'callback'            => [$this, 'settlePromotion'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'    => ['required' => true, 'type' => 'integer'],
                'promo' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/promotions/(?P<promo>[a-z0-9_]+)/modules/(?P<module>overview|features|faqs)/revert', [
            'methods'             => 'POST',
            'callback'            => [$this, 'revertPromotionModule'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'     => ['required' => true, 'type' => 'integer'],
                'promo'  => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
                'module' => ['required' => true, 'type' => 'string'],
            ],
        ]);

        // ── Promotion travel transitions (engine C3) ──────────────────────────
        // The only status writes for promotion instances. Archive is rewired
        // through the engine on its existing route; the reactivate legacy alias
        // was retired at E2.
        foreach (['publish', 'toggle', 'trash', 'restore'] as $transition) {
            register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/promotions/(?P<promo>[a-z0-9_]+)/' . $transition, [
                'methods'             => 'POST',
                'callback'            => [$this, $transition . 'Promotion'],
                'permission_callback' => [$this, 'requireAdmin'],
                'args'                => [
                    'id'    => ['required' => true, 'type' => 'integer'],
                    'promo' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
                ],
            ]);
        }

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/promotions/(?P<promo>[a-z0-9_]+)', [
            'methods'             => 'DELETE',
            'callback'            => [$this, 'permanentDeletePromotion'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'    => ['required' => true, 'type' => 'integer'],
                'promo' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);
    }

    // ===================================================================
    // SECTION: PROMOTION_HANDLERS
    // ===================================================================
    public function getPromotionStation(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $PS  = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $raw = $this->packages()->loadPromotions();
        $instances = $PS::normalisePromotionInstances($raw);

        // C1 — lifecycle envelopes are ensured on the RAW instances (normalise
        // whitelists fields and would drop the stored envelope).
        $rawById = [];
        foreach ($raw as $rawInst) {
            if (is_array($rawInst) && !empty($rawInst['id'])) {
                $rawById[(string) $rawInst['id']] = $rawInst;
            }
        }

        // Pools come from the Package Manager's source relationships, never from
        // the navigation-context service's own postmeta.
        $station = $this->packages()->loadStation() ?? $this->packages()->defaultStation();
        [$incPool, $faqPool] = $this->packages()->sourcePools($station);

        foreach ($instances as &$inst) {
            // B2 — pool refs resolve at read time: id authoritative, labels refreshed
            // from the inclusion pool. Inclusions flag danglers (missing); exclusions
            // never do (an off-pool exclusion ref is legitimate). The admin save
            // round-trip then persists the refreshed labels.
            $inst['inclusions'] = PoolReferences::refreshInclusionLabels($incPool, $inst['inclusions']);
            $inst['exclusions'] = PoolReferences::refreshInclusionLabels($incPool, $inst['exclusions'], false);

            // C1 additive read exposure: raw drafts + module_status returned
            // SEPARATELY, no server-side merge — the hook derives draft-preferred
            // client-side (parity with the tier P3 read shape). Travel state stays
            // on the legacy top-level status field until C3.
            $ensured = $PS::ensurePromotionLifecycle($rawById[$inst['id']] ?? $inst);
            $inst['drafts']        = $ensured['lifecycle']['drafts'];
            $inst['module_status'] = $ensured['lifecycle']['module_status'];
            // Pending feature drafts hold pool refs too — same read-time refresh
            // as the settled fields (parity with the tier drafts.features path).
            if (is_array($inst['drafts']['features'] ?? null)) {
                $inst['drafts']['features'] = PoolReferences::refreshInclusionLabels($incPool, $inst['drafts']['features']);
            }
        }
        unset($inst);

        return rest_ensure_response([
            'success'    => true,
            'service_id' => $serviceId,
            'promotions' => $instances,
            'service'    => [
                'id'         => $serviceId,
                'title'      => $post->post_title,
                'inclusions' => array_values(array_filter(
                    is_array($incPool) ? $incPool : [],
                    fn($i) => is_array($i) && !empty($i['id']) && !empty($i['label'])
                )),
                'faqs' => array_values(array_filter(
                    $faqPool,
                    fn($i) => is_array($i) && !empty($i['question'])
                )),
            ],
        ]);
    }

    public function createServicePromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $body = $request->get_json_params();
        if (!is_array($body)) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid request body.']);
        }

        $PS      = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $promoId  = $PS::generatePromotionTierId();
        $instance = $PS::buildPromotionInstance($promoId, $body);

        $current   = $this->packages()->loadPromotions();
        $current[] = $instance;
        $this->packages()->savePromotions($current);

        return rest_ensure_response(['success' => true, 'promo_id' => $promoId, 'promotion_tier' => $instance]);
    }

    /** archive: active|disabled → archived. Engine transition on the existing route (C3). */
    public function archiveServicePromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->transitionPromotion($request, 'archive');
    }

    /** publish: draft|disabled → active, committing any pending drafts first (settle + activate). */
    public function publishPromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->transitionPromotion($request, 'publish');
    }

    /** toggle: active ⇄ disabled. */
    public function togglePromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->transitionPromotion($request, 'toggle');
    }

    /** trash: active|disabled|archived → trashed. */
    public function trashPromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->transitionPromotion($request, 'trash');
    }

    /** restore: archived|trashed → disabled — never straight to active. */
    public function restorePromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->transitionPromotion($request, 'restore');
    }

    /**
     * Permanent delete — the only operation that removes an instance from the
     * array. Legal only from trashed (engine-validated).
     */
    public function permanentDeletePromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $PS      = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $current = $this->packages()->loadPromotions();
        $index   = $this->findPromotionIndex($current, $promoId);
        if ($index === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Promotion not found.']);
        }

        $ensured = $PS::ensurePromotionLifecycle($current[$index]);
        if (!StationLifecycle::canDelete($ensured['lifecycle']['status'])) {
            return rest_ensure_response(['success' => false, 'message' => 'Only trashed promotions can be permanently deleted.']);
        }

        array_splice($current, $index, 1);
        $this->packages()->savePromotions($current);

        return rest_ensure_response(['success' => true, 'promo_id' => $promoId, 'deleted' => true]);
    }

    /**
     * C3 — apply one engine transition to a promotion instance. Writes BOTH the
     * legacy top-level status (still the public/back-compat field) and the
     * envelope's status/previous_status, keeping the mirror exact. publish
     * composes settle + activate: pending drafts are committed before the flip.
     */
    private function transitionPromotion(\WP_REST_Request $request, string $action): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $PS      = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $current = $this->packages()->loadPromotions();
        $index   = $this->findPromotionIndex($current, $promoId);
        if ($index === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Promotion not found.']);
        }

        $instance = $PS::ensurePromotionLifecycle($current[$index]);
        $status   = $instance['lifecycle']['status'];
        $previous = $instance['lifecycle']['previous_status'];

        $change = match ($action) {
            'publish' => StationLifecycle::publish($status, $previous),
            'toggle'  => StationLifecycle::toggle($status, $previous),
            'archive' => StationLifecycle::archive($status, $previous),
            'trash'   => StationLifecycle::trash($status, $previous),
            'restore' => StationLifecycle::restore($status),
            default   => null,
        };
        if ($change === null) {
            return rest_ensure_response([
                'success' => false,
                'message' => sprintf('Cannot %s a %s promotion.', $action, $status),
            ]);
        }

        if ($action === 'publish') {
            $instance = $PS::settlePromotionInstance($instance);
        }

        $instance['status']                          = $change['status'];
        $instance['lifecycle']['status']             = $change['status'];
        $instance['lifecycle']['previous_status']    = $change['previous_status'];

        $current[$index] = $instance;
        $this->packages()->savePromotions($current);

        $response = [
            'success'         => true,
            'promo_id'        => $promoId,
            'status'          => $change['status'],
            'previous_status' => $change['previous_status'],
        ];
        if ($action === 'publish') {
            // Publish settles: return the committed instance + lifecycle layer so
            // the client can patch in place (same contract as the C2 responses).
            $response += $this->promotionLifecycleResponse($serviceId, $instance);
        }
        return rest_ensure_response($response);
    }

    // ── Promotion module lifecycle handlers (engine C2) ───────────────────────

    /**
     * Per-module draft save: persists lifecycle.drafts[module], marks the module
     * pending. Settled fields and travel status are never touched.
     */
    public function savePromotionModule(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));
        $module    = sanitize_key((string) $request->get_param('module'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $body = $request->get_json_params();
        if (!is_array($body)) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid request body.']);
        }

        $PS      = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $current = $this->packages()->loadPromotions();
        $index   = $this->findPromotionIndex($current, $promoId);
        if ($index === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Promotion not found.']);
        }

        $updated = $PS::savePromotionModuleDraft($current[$index], $module, $body);
        if ($updated === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid module payload.']);
        }

        $current[$index] = $updated;
        $this->packages()->savePromotions($current);

        return rest_ensure_response($this->promotionLifecycleResponse($serviceId, $updated, $module));
    }

    /**
     * Settle: commit the draft-preferred state of every module into the settled
     * fields, clear drafts, re-derive module_status. No-ops (no write) when the
     * instance has no drafts. Travel status is never touched.
     */
    public function settlePromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $PS      = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $current = $this->packages()->loadPromotions();
        $index   = $this->findPromotionIndex($current, $promoId);
        if ($index === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Promotion not found.']);
        }

        $settled = $PS::settlePromotionInstance($current[$index]);
        if ($settled !== $current[$index]) {
            $current[$index] = $settled;
            $this->packages()->savePromotions($current);
        }

        return rest_ensure_response($this->promotionLifecycleResponse($serviceId, $settled));
    }

    /**
     * Per-module revert: discard the draft, module_status re-derives from the
     * settled content.
     */
    public function revertPromotionModule(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));
        $module    = sanitize_key((string) $request->get_param('module'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $PS      = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $current = $this->packages()->loadPromotions();
        $index   = $this->findPromotionIndex($current, $promoId);
        if ($index === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Promotion not found.']);
        }

        $updated = $PS::revertPromotionModuleDraft($current[$index], $module);
        if ($updated === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid module.']);
        }

        $current[$index] = $updated;
        $this->packages()->savePromotions($current);

        return rest_ensure_response($this->promotionLifecycleResponse($serviceId, $updated, $module));
    }

    /** Index of a promotion instance in the raw instances array, or null. */
    private function findPromotionIndex(array $instances, string $promoId): ?int
    {
        foreach ($instances as $i => $inst) {
            if (is_array($inst) && ($inst['id'] ?? '') === $promoId) {
                return $i;
            }
        }
        return null;
    }

    /**
     * Shared C2 response shape — parity with the tier module lifecycle responses:
     * the normalised instance (pool labels refreshed, B2) plus the raw drafts and
     * module_status returned SEPARATELY for the client-side draft-preferred merge.
     *
     * @param  array<string, mixed> $instance raw instance (lifecycle guaranteed)
     * @return array<string, mixed>
     */
    private function promotionLifecycleResponse(int $serviceId, array $instance, ?string $module = null): array
    {
        $PS      = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $ensured = $PS::ensurePromotionLifecycle($instance);

        // Pool refs resolve against the Package Manager source pools.
        $station = $this->packages()->loadStation() ?? $this->packages()->defaultStation();
        [$incPool] = $this->packages()->sourcePools($station);

        // Pending feature drafts hold pool refs too — same read-time refresh as
        // the settled fields (parity with the tier drafts.features path).
        $drafts = $ensured['lifecycle']['drafts'];
        if (is_array($drafts['features'] ?? null)) {
            $drafts['features'] = PoolReferences::refreshInclusionLabels($incPool, $drafts['features']);
        }

        $normalised = $PS::normalisePromotionInstances([$ensured])[0] ?? [];
        if ($normalised !== []) {
            $normalised['inclusions'] = PoolReferences::refreshInclusionLabels($incPool, $normalised['inclusions']);
            $normalised['exclusions'] = PoolReferences::refreshInclusionLabels($incPool, $normalised['exclusions'], false);
            $normalised['drafts']        = $drafts;
            $normalised['module_status'] = $ensured['lifecycle']['module_status'];
        }

        $response = [
            'success'        => true,
            'promo_id'       => (string) ($ensured['id'] ?? ''),
            'drafts'         => $drafts,
            'module_status'  => $ensured['lifecycle']['module_status'],
            'promotion_tier' => $normalised,
        ];
        if ($module !== null) {
            $response['module'] = $module;
        }
        return $response;
    }

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Modules\Admin\AdminRouter::CAP);
    }
}
