<?php

namespace CompuZign\Platform\Modules\CostBuilder\Services;

use CompuZign\Platform\Modules\CostBuilder\Repositories\ServiceRepository;
use CompuZign\Platform\Modules\CostBuilder\Support\PriceParser;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;

class PricingBuilder
{
    private const ORDERED_CATEGORIES = [
        'Managed IT Services',
        'Cloud Solutions',
        'Cybersecurity',
        'Support & Consulting',
    ];

    private const TIERS = [
        ['id' => 'basic',      'title' => 'Basic'],
        ['id' => 'standard',   'title' => 'Standard'],
        ['id' => 'premium',    'title' => 'Premium'],
        ['id' => 'enterprise', 'title' => 'Enterprise'],
    ];

    /**
     * In-memory map of service_id → active surface package meta.
     * Populated once per buildResponse() call; used for O(1) lookups in buildServicePayload().
     * Empty array = no active packages → legacy fallback for every service.
     *
     * @var array<int, array<string, mixed>>
     */
    private array $packageMap = [];

    public function __construct(
        private ServiceRepository $repository,
        private PackageRepository $packageRepository
    ) {}

    public function buildResponse(): array
    {
        // ── Bridge: load all active surface packages once, indexed by service ID ─
        // When no packages exist this returns [] in a single lightweight query.
        // All per-service lookups inside buildServicePayload() are O(1) array access.
        $this->packageMap = $this->packageRepository->findAllActiveIndexedByServiceId();

        $categories         = [];
        $servicesByCategory = [];

        foreach (self::ORDERED_CATEGORIES as $name) {
            $slug = sanitize_title($name);
            $term = $this->repository->findCategoryBySlug($slug);

            if (!$term) {
                $categories[]         = ['id' => null, 'name' => $name, 'slug' => $slug];
                $servicesByCategory[] = [
                    'category_id'   => null,
                    'category_name' => $name,
                    'category_slug' => $slug,
                    'services'      => [],
                ];
                continue;
            }

            $categories[] = [
                'id'   => (int) $term->term_id,
                'name' => $term->name,
                'slug' => $term->slug,
            ];

            $posts    = $this->repository->findByCategory((int) $term->term_id);
            $payloads = [];

            foreach ($posts as $post) {
                $meta = $this->repository->getMeta($post->ID);
                if (isset($meta['is_active']) && $meta['is_active'] === false) {
                    continue;
                }
                $payloads[] = $this->buildServicePayload($post);
            }

            // sort_order in the compiled payload reflects the surface package's sort_position
            // when a package is active, or the canonical meta sort_order as fallback —
            // the overlay in buildServicePayload() normalises this before we sort.
            usort($payloads, fn($a, $b) =>
                ($a['meta']['sort_order'] ?? 0) <=> ($b['meta']['sort_order'] ?? 0)
                ?: strcmp($a['title'], $b['title'])
            );

            $servicesByCategory[] = [
                'category_id'   => (int) $term->term_id,
                'category_name' => $term->name,
                'category_slug' => $term->slug,
                'services'      => $payloads,
            ];
        }

        return [
            'categories'           => $categories,
            'tiers'                => self::TIERS,
            'services_by_category' => $servicesByCategory,
        ];
    }

    public function buildServicePayload(\WP_Post $post): array
    {
        // ── Legacy compilation (unchanged) ────────────────────────────────────
        $meta         = $this->repository->getMeta($post->ID);
        $billingCycle = $meta['billing_cycle'] ?? 'monthly';
        $pricing      = $this->normalizePricing($this->repository->getPricing($post->ID), $billingCycle);
        $terms        = $this->repository->getCategories($post->ID);

        $categories = array_map(fn($t) => [
            'id'   => (int) $t->term_id,
            'name' => $t->name,
            'slug' => $t->slug,
        ], $terms);

        $rawExplicit = $this->repository->getInclusions($post->ID);
        if (!empty($rawExplicit)) {
            [$inclusions, $tierInclusions] = $this->resolveExplicitInclusions($rawExplicit);
            foreach ($tierInclusions as $tierId => $tierIncs) {
                if (isset($pricing['tiers'][$tierId])) {
                    $pricing['tiers'][$tierId]['inclusions'] = $tierIncs;
                }
            }
        } else {
            $inclusions = $this->collectInclusions($pricing['tiers']);
        }

        $faqs = $this->normalizeFaqs($this->repository->getFaqs($post->ID));

        $hasTierInclusions = false;
        foreach (['basic', 'standard', 'premium', 'enterprise'] as $tierId) {
            if (!empty($pricing['tiers'][$tierId]['inclusions'])) {
                $hasTierInclusions = true;
                break;
            }
        }
        $isAvailable  = !empty($inclusions) && $hasTierInclusions;
        $availability = [
            'is_available' => $isAvailable,
            'message'      => $isAvailable ? '' : 'Currently this service is not available.',
        ];

        $payload = [
            'id'           => (int) $post->ID,
            'title'        => $post->post_title,
            'slug'         => $post->post_name,
            'excerpt'      => $post->post_excerpt,
            'content'      => $post->post_content,
            'categories'   => $categories,
            'inclusions'   => $inclusions,
            'faqs'         => $faqs,
            'availability' => $availability,
            'meta'         => [
                'short_description' => $meta['short_description'] ?? '',
                'long_description'  => $meta['long_description'] ?? '',
                'billing_cycle'     => $meta['billing_cycle'] ?? 'monthly',
                'sla'               => $meta['sla'] ?? '',
                'uptime'            => $meta['uptime'] ?? '',
                'notes'             => $meta['notes'] ?? '',
                'popular_tier'      => $meta['popular_tier'] ?? null,
                'sort_order'        => isset($meta['sort_order']) ? (int) $meta['sort_order'] : 0,
                'is_active'         => isset($meta['is_active']) ? (bool) $meta['is_active'] : true,
            ],
            'pricing' => $pricing,
        ];

        // ── Bridge overlay ─────────────────────────────────────────────────────
        // Only executes when an active surface package exists for this service.
        // When packageMap is empty (no packages created yet) this branch is never
        // reached and the payload above is returned byte-for-byte as legacy output.
        $package = $this->packageMap[$post->ID] ?? null;
        if ($package !== null) {
            $payload = $this->overlayPackage($payload, $package);
        }

        return $payload;
    }

    // ── Bridge ─────────────────────────────────────────────────────────────────

    /**
     * Apply surface package fields on top of a fully-compiled legacy payload.
     *
     * Only surface fields are replaced; canonical fields (title, description,
     * canonical inclusions pool, FAQs, SLA, categories, is_active, billing_cycle
     * on the service canonical record) are never touched by the overlay.
     *
     * Per-tier price overlay triggers only when the package tier has a non-null
     * price, allowing partial packages that configure only some tiers.
     *
     * @param  array<string, mixed> $payload compiled legacy payload
     * @param  array<string, mixed> $package active cz_package meta array
     * @return array<string, mixed>
     */
    private function overlayPackage(array $payload, array $package): array
    {
        // ── Tier pricing, billing cycle, inclusions ───────────────────────────
        foreach (['basic', 'standard', 'premium', 'enterprise'] as $tierId) {
            $pkgTier = $package['tiers'][$tierId] ?? null;
            if ($pkgTier === null || !isset($payload['pricing']['tiers'][$tierId])) {
                continue;
            }

            // Disabled tiers are removed from the output so Cost Builder never renders them.
            if (isset($pkgTier['enabled']) && $pkgTier['enabled'] === false) {
                unset($payload['pricing']['tiers'][$tierId]);
                continue;
            }

            // Price: overlay only when the package explicitly provides a value.
            // null price in the package means "not configured; keep legacy price."
            if ($pkgTier['price'] !== null) {
                $payload['pricing']['tiers'][$tierId]['price'] = $pkgTier['price'];
            }

            // Billing cycle: overlay when the package provides an explicit override.
            if (!empty($pkgTier['billing_cycle'])) {
                $payload['pricing']['tiers'][$tierId]['billing_cycle'] = $pkgTier['billing_cycle'];
            }

            // Inclusions: overlay when the package provides a non-empty set.
            // Empty inclusions_override = keep canonical inclusions for this tier.
            if (!empty($pkgTier['inclusions_override'])) {
                $payload['pricing']['tiers'][$tierId]['inclusions'] = $pkgTier['inclusions_override'];
                $payload['pricing']['tiers'][$tierId]['features']   = array_map(
                    fn(array $inc) => $inc['label'],
                    $pkgTier['inclusions_override']
                );
            } elseif (!empty($pkgTier['features'])) {
                $payload['pricing']['tiers'][$tierId]['features'] = $pkgTier['features'];
            }
        }

        // ── Bundle ────────────────────────────────────────────────────────────
        // Overlay when the package defines a bundle title or an explicit price.
        $bundle = $package['bundle'] ?? [];
        if (!empty($bundle['title']) || $bundle['price'] !== null) {
            $payload['pricing']['bundle'] = [
                'title'       => $bundle['title']       ?? '',
                'description' => $bundle['description'] ?? '',
                'price'       => $bundle['price']        ?? null,
            ];
        }

        // ── Popular tier ──────────────────────────────────────────────────────
        if (!empty($package['popular_tier'])) {
            $payload['meta']['popular_tier'] = $package['popular_tier'];
        }

        // ── Sort order ────────────────────────────────────────────────────────
        // sort_position from the package always overrides the canonical sort_order.
        // This ensures usort() in buildResponse() uses the surface ordering.
        $payload['meta']['sort_order'] = (int) ($package['sort_position'] ?? $payload['meta']['sort_order']);

        return $payload;
    }

    // ── Legacy internals (unchanged) ──────────────────────────────────────────

    public function normalizePricing(array $pricing, string $billingCycle = 'monthly'): array
    {
        $inTiers  = $pricing['tiers'] ?? $pricing;
        $outTiers = [];

        foreach (['basic', 'standard', 'premium', 'enterprise'] as $k) {
            $src = $inTiers[$k] ?? [];

            $features = isset($src['features']) && is_array($src['features'])
                ? array_values(array_filter(array_map('trim', $src['features']), fn($f) => $f !== ''))
                : [];

            $outTiers[$k] = [
                'price'         => PriceParser::parse($src['price'] ?? null),
                'billing_cycle' => $billingCycle,
                'inclusions'    => array_map(fn($f) => ['id' => sanitize_title($f), 'label' => $f], $features),
                'features'      => $features,
            ];
        }

        $bundleSrc = $pricing['bundle'] ?? [];

        return [
            'tiers'  => $outTiers,
            'bundle' => [
                'title'       => $bundleSrc['title'] ?? '',
                'description' => $bundleSrc['description'] ?? '',
                'price'       => PriceParser::parse($bundleSrc['price'] ?? null),
            ],
        ];
    }

    /**
     * Resolve explicit inclusions from cz_service_inclusions meta.
     *
     * Supports two formats:
     *   Normalized: {inclusions: [{id, label}], tier_inclusions: {basic: [id,...], ...}}
     *   Legacy:     [{id, label, tiers?: ['basic','standard',...]}]
     *
     * Returns [$servicePool, $perTierMap].
     */
    private function resolveExplicitInclusions(array $raw): array
    {
        if (isset($raw['inclusions']) && is_array($raw['inclusions'])) {
            return $this->resolveNormalizedInclusions($raw);
        }

        $servicePool    = [];
        $tierInclusions = ['basic' => [], 'standard' => [], 'premium' => [], 'enterprise' => []];

        foreach ($raw as $item) {
            if (!is_array($item)) {
                continue;
            }
            $id    = trim($item['id'] ?? '');
            $label = trim($item['label'] ?? '');
            if ($id === '' || $label === '') {
                continue;
            }

            $inc           = ['id' => $id, 'label' => $label];
            $servicePool[] = $inc;

            $assignedTiers = isset($item['tiers']) && is_array($item['tiers'])
                ? $item['tiers']
                : array_keys($tierInclusions);

            foreach ($assignedTiers as $tierId) {
                if (isset($tierInclusions[$tierId])) {
                    $tierInclusions[$tierId][] = $inc;
                }
            }
        }

        return [$servicePool, $tierInclusions];
    }

    /**
     * Resolve normalized format: {inclusions: [{id, label}], tier_inclusions: {tierId: [id,...]}}
     * Returns [$servicePool, $perTierMap].
     */
    private function resolveNormalizedInclusions(array $raw): array
    {
        $lookup      = [];
        $servicePool = [];

        foreach ($raw['inclusions'] as $item) {
            if (!is_array($item)) {
                continue;
            }
            $id    = trim($item['id'] ?? '');
            $label = trim($item['label'] ?? '');
            if ($id === '' || $label === '') {
                continue;
            }
            $inc           = ['id' => $id, 'label' => $label];
            $lookup[$id]   = $inc;
            $servicePool[] = $inc;
        }

        $tierInclusions = ['basic' => [], 'standard' => [], 'premium' => [], 'enterprise' => []];
        $tierMap        = isset($raw['tier_inclusions']) && is_array($raw['tier_inclusions'])
            ? $raw['tier_inclusions']
            : [];

        foreach (array_keys($tierInclusions) as $tierId) {
            foreach ($tierMap[$tierId] ?? [] as $id) {
                if (isset($lookup[$id])) {
                    $tierInclusions[$tierId][] = $lookup[$id];
                }
            }
        }

        return [$servicePool, $tierInclusions];
    }

    private function collectInclusions(array $tiers): array
    {
        $seen   = [];
        $result = [];
        foreach ($tiers as $tierData) {
            foreach ($tierData['inclusions'] as $inc) {
                if ($inc['label'] !== '' && !isset($seen[$inc['id']])) {
                    $seen[$inc['id']] = true;
                    $result[]         = $inc;
                }
            }
        }
        return $result;
    }

    private function normalizeFaqs(array $rawFaqs): array
    {
        $result = [];
        foreach ($rawFaqs as $item) {
            if (!is_array($item)) {
                continue;
            }
            $question = trim($item['question'] ?? '');
            $answer   = trim($item['answer'] ?? '');
            if ($question === '') {
                continue;
            }
            $result[] = [
                'id'       => (isset($item['id']) && $item['id'] !== '') ? (string) $item['id'] : sanitize_title($question),
                'question' => $question,
                'answer'   => $answer,
            ];
        }
        return $result;
    }
}
