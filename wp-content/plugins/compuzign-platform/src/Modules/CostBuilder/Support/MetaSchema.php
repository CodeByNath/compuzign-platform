<?php

namespace CompuZign\Platform\Modules\CostBuilder\Support;

class MetaSchema
{
    private const ALLOWED_TIERS = ['basic', 'standard', 'premium', 'enterprise'];

    public function register(): void
    {
        add_action('init', [$this, 'registerPostMeta']);
    }

    public function registerPostMeta(): void
    {
        register_post_meta('cz_service', 'cz_service_meta', [
            'type'              => 'object',
            'single'            => true,
            'default'           => $this->defaultMeta(),
            'show_in_rest'      => ['schema' => $this->metaSchema()],
            'sanitize_callback' => [self::class, 'sanitizeMeta'],
        ]);

        register_post_meta('cz_service', 'cz_service_pricing', [
            'type'              => 'object',
            'single'            => true,
            'default'           => $this->defaultPricing(),
            'show_in_rest'      => ['schema' => $this->pricingSchema()],
            'sanitize_callback' => [self::class, 'sanitizePricing'],
        ]);
    }

    public static function sanitizeMeta(mixed $meta): array
    {
        if (!is_array($meta)) {
            $meta = [];
        }

        $defaults = (new self())->defaultMeta();

        return [
            'short_description' => sanitize_text_field($meta['short_description'] ?? $defaults['short_description']),
            'long_description'  => sanitize_textarea_field($meta['long_description'] ?? $defaults['long_description']),
            'billing_cycle'     => sanitize_text_field($meta['billing_cycle'] ?? $defaults['billing_cycle']),
            'sla'               => sanitize_text_field($meta['sla'] ?? $defaults['sla']),
            'uptime'            => sanitize_text_field($meta['uptime'] ?? $defaults['uptime']),
            'notes'             => sanitize_textarea_field($meta['notes'] ?? $defaults['notes']),
            'popular_tier'      => self::validateTier($meta['popular_tier'] ?? '') ?? $defaults['popular_tier'],
            'sort_order'        => absint($meta['sort_order'] ?? $defaults['sort_order']),
            'is_active'         => (bool) ($meta['is_active'] ?? $defaults['is_active']),
        ];
    }

    public static function sanitizePricing(mixed $pricing): array
    {
        if (!is_array($pricing)) {
            $pricing = [];
        }

        $inTiers  = $pricing['tiers'] ?? $pricing;
        $outTiers = [];

        foreach (self::ALLOWED_TIERS as $tier) {
            $src            = $inTiers[$tier] ?? [];
            $outTiers[$tier] = [
                'price'    => PriceParser::parse($src['price'] ?? null),
                'features' => isset($src['features']) && is_array($src['features']) ? array_values($src['features']) : [],
            ];
        }

        $bundle = $pricing['bundle'] ?? [];

        return [
            'tiers'  => $outTiers,
            'bundle' => [
                'title'       => $bundle['title'] ?? '',
                'description' => $bundle['description'] ?? '',
                'price'       => PriceParser::parse($bundle['price'] ?? null),
            ],
        ];
    }

    public function defaultMeta(): array
    {
        return [
            'short_description' => '',
            'long_description'  => '',
            'billing_cycle'     => 'monthly',
            'sla'               => '',
            'uptime'            => '',
            'notes'             => '',
            'popular_tier'      => 'premium',
            'sort_order'        => 0,
            'is_active'         => true,
        ];
    }

    public function defaultPricing(): array
    {
        return [
            'tiers'  => array_fill_keys(self::ALLOWED_TIERS, ['price' => null, 'features' => []]),
            'bundle' => ['title' => '', 'description' => '', 'price' => null],
        ];
    }

    private static function validateTier(string $tier): ?string
    {
        $tier = trim($tier);
        return in_array($tier, self::ALLOWED_TIERS, true) ? $tier : null;
    }

    private function metaSchema(): array
    {
        return [
            'type'       => 'object',
            'properties' => [
                'short_description' => ['type' => 'string'],
                'long_description'  => ['type' => 'string'],
                'billing_cycle'     => ['type' => 'string'],
                'sla'               => ['type' => 'string'],
                'uptime'            => ['type' => 'string'],
                'notes'             => ['type' => 'string'],
                'popular_tier'      => ['type' => 'string', 'enum' => self::ALLOWED_TIERS],
                'sort_order'        => ['type' => 'integer'],
                'is_active'         => ['type' => 'boolean'],
            ],
        ];
    }

    private function pricingSchema(): array
    {
        $tierSchema = [
            'type'       => 'object',
            'properties' => [
                'price'    => ['type' => ['number', 'null']],
                'features' => ['type' => 'array', 'items' => ['type' => 'string']],
            ],
        ];

        return [
            'type'       => 'object',
            'properties' => [
                'tiers'  => [
                    'type'       => 'object',
                    'properties' => array_fill_keys(self::ALLOWED_TIERS, $tierSchema),
                ],
                'bundle' => [
                    'type'       => 'object',
                    'properties' => [
                        'title'       => ['type' => 'string'],
                        'description' => ['type' => 'string'],
                        'price'       => ['type' => ['number', 'null']],
                    ],
                ],
            ],
        ];
    }
}
