<?php

namespace CompuZign\Platform\Modules\CostBuilder\Support;

class MetaSchema
{
    private const ALLOWED_TIERS            = ['basic', 'standard', 'premium', 'enterprise'];
    public  const ALLOWED_PLATFORM_STATUSES  = ['active', 'disabled', 'archived', 'trashed'];
    public  const ALLOWED_MODULE_TRANSITIONS  = ['settled', 'pending', 'not-configured'];
    public  const DRAFT_META_KEYS            = ['cz_service_overview_draft', 'cz_service_inclusions_draft', 'cz_service_faqs_draft'];

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

        // Draft meta keys — admin-only; never exposed to REST or CostBuilder.
        foreach (self::DRAFT_META_KEYS as $key) {
            register_post_meta('cz_service', $key, [
                'type'         => 'object',
                'single'       => true,
                'default'      => null,
                'show_in_rest' => false,
            ]);
        }
    }

    public static function sanitizeMeta(mixed $meta): array
    {
        if (!is_array($meta)) {
            $meta = [];
        }

        $defaults = (new self())->defaultMeta();

        // Sanitize module_status — each key must be 'settled', 'pending', or 'not-configured'.
        $rawModuleStatus = is_array($meta['module_status'] ?? null) ? $meta['module_status'] : [];
        $moduleStatus = [
            'overview'   => in_array($rawModuleStatus['overview']   ?? '', self::ALLOWED_MODULE_TRANSITIONS, true)
                            ? $rawModuleStatus['overview']   : $defaults['module_status']['overview'],
            'inclusions' => in_array($rawModuleStatus['inclusions'] ?? '', self::ALLOWED_MODULE_TRANSITIONS, true)
                            ? $rawModuleStatus['inclusions'] : $defaults['module_status']['inclusions'],
            'faqs'       => in_array($rawModuleStatus['faqs']       ?? '', self::ALLOWED_MODULE_TRANSITIONS, true)
                            ? $rawModuleStatus['faqs']       : $defaults['module_status']['faqs'],
        ];

        $rawStatus = sanitize_text_field($meta['platform_status'] ?? '');
        $platformStatus = in_array($rawStatus, self::ALLOWED_PLATFORM_STATUSES, true)
                          ? $rawStatus
                          : $defaults['platform_status'];

        return [
            'platform_status'   => $platformStatus,
            'module_status'     => $moduleStatus,
            'short_description' => sanitize_text_field($meta['short_description'] ?? $defaults['short_description']),
            'long_description'  => sanitize_textarea_field($meta['long_description'] ?? $defaults['long_description']),
            'billing_cycle'     => sanitize_text_field($meta['billing_cycle'] ?? $defaults['billing_cycle']),
            'sla'               => sanitize_text_field($meta['sla'] ?? $defaults['sla']),
            'uptime'            => sanitize_text_field($meta['uptime'] ?? $defaults['uptime']),
            'notes'             => sanitize_textarea_field($meta['notes'] ?? $defaults['notes']),
            'popular_tier'      => self::validateTier($meta['popular_tier'] ?? '') ?? $defaults['popular_tier'],
            'sort_order'        => absint($meta['sort_order'] ?? $defaults['sort_order']),
            // is_active is deprecated; retained in the output for backward compat during transition.
            // Do not write is_active on new records — read platform_status instead.
            'is_active'         => isset($meta['is_active']) ? (bool) $meta['is_active'] : $defaults['is_active'],
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
            'platform_status'   => 'disabled',
            'module_status'     => [
                'overview'   => 'pending',
                'inclusions' => 'not-configured',
                'faqs'       => 'not-configured',
            ],
            'short_description' => '',
            'long_description'  => '',
            'billing_cycle'     => 'monthly',
            'sla'               => '',
            'uptime'            => '',
            'notes'             => '',
            'popular_tier'      => 'premium',
            'sort_order'        => 0,
            // is_active is deprecated; kept at true as the legacy default so old code reading
            // only is_active still sees an "active" service (platform_status governs the real gate).
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

    /**
     * Backward-compat bridge: derive the effective platform_status for records that
     * pre-date the platform_status field. Call this anywhere platform_status needs to
     * be read from cz_service_meta and the record may not have been migrated yet.
     *
     * Resolution order:
     *   1. If platform_status is already present → use it directly.
     *   2. If is_active === false → disabled.
     *   3. post_status = 'publish' (old active service) → active.
     *   4. Otherwise (post_status = 'draft', old pending service) → disabled.
     */
    public static function resolvePlatformStatus(array $meta, string $postStatus): string
    {
        if (isset($meta['platform_status']) && in_array($meta['platform_status'], self::ALLOWED_PLATFORM_STATUSES, true)) {
            return $meta['platform_status'];
        }

        // Legacy record without platform_status — derive from is_active + post_status.
        if (isset($meta['is_active']) && $meta['is_active'] === false) {
            return 'disabled';
        }

        return $postStatus === 'publish' ? 'active' : 'disabled';
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
                'platform_status'   => ['type' => 'string', 'enum' => self::ALLOWED_PLATFORM_STATUSES],
                'module_status'     => [
                    'type'       => 'object',
                    'properties' => [
                        'overview'   => ['type' => 'string'],
                        'inclusions' => ['type' => 'string'],
                        'faqs'       => ['type' => 'string'],
                    ],
                ],
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
