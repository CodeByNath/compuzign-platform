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
 * POST /admin/surface-packages/{id}/disable            set post_status → draft
 * POST /admin/surface-packages/{id}/enable             set post_status → publish
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
            'methods'             => 'GET',
            'callback'            => [$this, 'list'],
            'permission_callback' => [$this, 'requireAdmin'],
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

            return [
                'post_id'            => (int) $post->ID,
                'post_status'        => $post->post_status,
                'title'              => $post->post_title,
                'package_type'       => $pkg['package_type'] ?? 'tier_configuration',
                'service_refs'       => $serviceRefs,
                'services'           => $services,
                'tiers'              => $this->summariseTiers($pkg['tiers'] ?? []),
                'popular_tier'       => $pkg['popular_tier'] ?? null,
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

        // Normalise tiers to always include new fields (backward compat for old records).
        $tiers = [];
        foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
            $t = $pkg['tiers'][$tierId] ?? [];
            $tiers[$tierId] = [
                'label'               => $t['label'] ?? '',
                'price'               => isset($t['price']) && $t['price'] !== null ? (float) $t['price'] : null,
                'billing_cycle'       => $t['billing_cycle'] ?? null,
                'inclusions_override' => $t['inclusions_override'] ?? [],
                'features'            => $t['features'] ?? [],
                'faq_refs'            => $t['faq_refs'] ?? [],
                'enabled'             => isset($t['enabled']) ? (bool) $t['enabled'] : true,
            ];
        }

        return rest_ensure_response([
            'success' => true,
            'package' => [
                'post_id'            => (int) $post->ID,
                'post_status'        => $post->post_status,
                'title'              => $post->post_title,
                'package_type'       => $pkg['package_type'] ?? 'tier_configuration',
                'service_refs'       => $serviceRefs,
                'tiers'              => $tiers,
                'popular_tier'       => $pkg['popular_tier'] ?? null,
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

        // Load current package meta (or bootstrap defaults).
        $pkg = get_post_meta($packageId, 'cz_package', true);
        if (!is_array($pkg)) {
            $pkg = (new PackageSchema())->defaultPackage();
        }

        $serviceRefs = array_map('intval', $pkg['service_refs'] ?? []);
        $serviceId   = $serviceRefs[0] ?? 0;

        // ── Add new canonical inclusions to Service Core ──────────────────────
        $addedInclusions = [];
        $newInclusions   = $body['new_inclusions'] ?? [];
        if (!empty($newInclusions) && is_array($newInclusions) && $serviceId > 0) {
            $addedInclusions = $this->addInclusionsToService($serviceId, $newInclusions);
        }

        // ── Add new canonical FAQs to Service Core ────────────────────────────
        $addedFaqRefs = [];
        $newFaqs      = $body['new_faqs'] ?? [];
        if (!empty($newFaqs) && is_array($newFaqs) && $serviceId > 0) {
            $addedFaqRefs = $this->addFaqsToService($serviceId, $newFaqs);
        }

        // ── Build updated tier ────────────────────────────────────────────────
        $existing = $pkg['tiers'][$tierId] ?? [];

        // Inclusions: body value wins; merge newly-added items on top.
        $inclusions = [];
        if (array_key_exists('inclusions_override', $body) && is_array($body['inclusions_override'])) {
            foreach ($body['inclusions_override'] as $inc) {
                if (!is_array($inc)) continue;
                $id    = sanitize_text_field((string) ($inc['id'] ?? ''));
                $label = sanitize_text_field((string) ($inc['label'] ?? ''));
                if ($id !== '' && $label !== '') {
                    $inclusions[] = ['id' => $id, 'label' => $label];
                }
            }
        } else {
            $inclusions = $existing['inclusions_override'] ?? [];
        }
        foreach ($addedInclusions as $inc) {
            $ids = array_column($inclusions, 'id');
            if (!in_array($inc['id'], $ids, true)) {
                $inclusions[] = $inc;
            }
        }

        // FAQ refs: body value wins; merge newly-added IDs on top.
        $faqRefs = [];
        if (array_key_exists('faq_refs', $body) && is_array($body['faq_refs'])) {
            $faqRefs = array_values(array_map('sanitize_text_field', array_map('strval', $body['faq_refs'])));
        } else {
            $faqRefs = $existing['faq_refs'] ?? [];
        }
        foreach ($addedFaqRefs as $ref) {
            if (!in_array($ref, $faqRefs, true)) {
                $faqRefs[] = $ref;
            }
        }

        $price = null;
        if (array_key_exists('price', $body) && $body['price'] !== null && $body['price'] !== '') {
            $price = (float) $body['price'];
        }

        $pkg['tiers'][$tierId] = [
            'label'               => sanitize_text_field((string) ($body['label'] ?? $existing['label'] ?? '')),
            'price'               => $price,
            'billing_cycle'       => sanitize_text_field((string) ($body['billing_cycle'] ?? $existing['billing_cycle'] ?? 'monthly')),
            'inclusions_override' => $inclusions,
            'features'            => $existing['features'] ?? [],
            'faq_refs'            => array_values(array_unique($faqRefs)),
            'enabled'             => array_key_exists('enabled', $body) ? (bool) $body['enabled'] : ($existing['enabled'] ?? true),
        ];

        // ── Popular tier (package-level) ──────────────────────────────────────
        if (array_key_exists('popular', $body)) {
            if ((bool) $body['popular']) {
                $pkg['popular_tier'] = $tierId;
            } elseif (($pkg['popular_tier'] ?? null) === $tierId) {
                $pkg['popular_tier'] = null;
            }
        }

        update_post_meta($packageId, 'cz_package', $pkg);

        // Re-read after sanitize_callback runs.
        $saved = get_post_meta($packageId, 'cz_package', true);

        return rest_ensure_response([
            'success'              => true,
            'package_meta'         => $saved,
            'new_inclusions_added' => count($addedInclusions),
            'new_faqs_added'       => count($addedFaqRefs),
        ]);
    }

    // ── disable / enable ──────────────────────────────────────────────────────

    public function disable(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->setStatus((int) $request->get_param('id'), 'draft');
    }

    public function enable(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->setStatus((int) $request->get_param('id'), 'publish');
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

        $pkg = get_post_meta($packageId, 'cz_package', true);
        if (!is_array($pkg) || !isset($pkg['tiers'][$tierId])) {
            return $this->error('Tier not found.', 404);
        }

        $pkg['tiers'][$tierId]['enabled'] = $enabled;
        update_post_meta($packageId, 'cz_package', $pkg);

        return rest_ensure_response(['success' => true, 'tier_id' => $tierId, 'enabled' => $enabled]);
    }

    private function setStatus(int $packageId, string $status): \WP_REST_Response
    {
        $post = get_post($packageId);
        if (!$post instanceof \WP_Post || $post->post_type !== 'cz_surface_package') {
            return $this->error('Package not found.', 404);
        }

        wp_update_post(['ID' => $packageId, 'post_status' => $status]);

        return rest_ensure_response(['success' => true, 'post_status' => $status]);
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    public function requireAdmin(): bool
    {
        return is_user_logged_in() && current_user_can('manage_options');
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
     * @param  mixed $tiers
     * @return array<string, array{label: string, price: float|null, billing_cycle: string|null, inclusion_count: int, enabled: bool}>
     */
    private function summariseTiers(mixed $tiers): array
    {
        if (!is_array($tiers)) {
            return [];
        }

        $out = [];
        foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
            $t          = $tiers[$tierId] ?? [];
            $out[$tierId] = [
                'label'           => $t['label'] ?? '',
                'price'           => isset($t['price']) && $t['price'] !== null ? (float) $t['price'] : null,
                'billing_cycle'   => $t['billing_cycle'] ?? null,
                'inclusion_count' => count($t['inclusions_override'] ?? []),
                'faq_count'       => count($t['faq_refs'] ?? []),
                'enabled'         => isset($t['enabled']) ? (bool) $t['enabled'] : true,
            ];
        }
        return $out;
    }

    private function emptyPackageRow(\WP_Post $post): array
    {
        return [
            'post_id'            => (int) $post->ID,
            'post_status'        => $post->post_status,
            'title'              => $post->post_title,
            'package_type'       => null,
            'service_refs'       => [],
            'services'           => [],
            'tiers'              => [],
            'popular_tier'       => null,
            'faq_refs'           => [],
            'display_contexts'   => [],
            'migration_complete' => false,
            'valid_from'         => null,
            'valid_until'        => null,
        ];
    }

    private function error(string $message, int $status = 400): \WP_REST_Response
    {
        return new \WP_REST_Response(['success' => false, 'message' => $message], $status);
    }
}
