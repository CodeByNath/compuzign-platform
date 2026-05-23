<?php

namespace CompuZign\Platform\Modules\CostBuilder\Services;

use CompuZign\Platform\Modules\CostBuilder\Repositories\ServiceRepository;
use CompuZign\Platform\Modules\CostBuilder\Support\PriceParser;

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

    public function __construct(private ServiceRepository $repository) {}

    public function buildResponse(): array
    {
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
        $meta         = $this->repository->getMeta($post->ID);
        $billingCycle = $meta['billing_cycle'] ?? 'monthly';
        $pricing      = $this->normalizePricing($this->repository->getPricing($post->ID), $billingCycle);
        $terms        = $this->repository->getCategories($post->ID);

        $categories = array_map(fn($t) => [
            'id'   => (int) $t->term_id,
            'name' => $t->name,
            'slug' => $t->slug,
        ], $terms);

        return [
            'id'         => (int) $post->ID,
            'title'      => $post->post_title,
            'slug'       => $post->post_name,
            'excerpt'    => $post->post_excerpt,
            'content'    => $post->post_content,
            'categories' => $categories,
            'inclusions' => $this->collectInclusions($pricing['tiers']),
            'faqs'       => [],
            'meta'       => [
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
    }

    public function normalizePricing(array $pricing, string $billingCycle = 'monthly'): array
    {
        $inTiers  = $pricing['tiers'] ?? $pricing;
        $outTiers = [];

        foreach (['basic', 'standard', 'premium', 'enterprise'] as $k) {
            $src      = $inTiers[$k] ?? [];
            $features = isset($src['features']) && is_array($src['features']) ? array_values($src['features']) : [];

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

    private function collectInclusions(array $tiers): array
    {
        $seen   = [];
        $result = [];
        foreach ($tiers as $tierData) {
            foreach ($tierData['inclusions'] as $inc) {
                if (!isset($seen[$inc['id']])) {
                    $seen[$inc['id']] = true;
                    $result[]         = $inc;
                }
            }
        }
        return $result;
    }
}
