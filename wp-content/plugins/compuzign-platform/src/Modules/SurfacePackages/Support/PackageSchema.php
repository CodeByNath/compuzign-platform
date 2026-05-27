<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

/**
 * Registers and validates the cz_package post meta on cz_surface_package posts.
 *
 * Schema is intentionally kept private (show_in_rest = false) — surface packages
 * are admin-managed operational constructs, not public API resources.
 */
class PackageSchema
{
    public const ALLOWED_TYPES    = ['tier_configuration', 'bundle', 'promotion', 'homepage_collection', 'campaign'];
    public const ALLOWED_TIERS    = ['basic', 'standard', 'premium', 'enterprise'];
    public const ALLOWED_CONTEXTS = ['cost-builder', 'homepage', 'pricing-page'];

    public function register(): void
    {
        add_action('init', [$this, 'registerPostMeta']);
    }

    public function registerPostMeta(): void
    {
        register_post_meta('cz_surface_package', 'cz_package', [
            'type'              => 'object',
            'single'            => true,
            'default'           => $this->defaultPackage(),
            'show_in_rest'      => false,
            'sanitize_callback' => [self::class, 'sanitize'],
        ]);
    }

    /**
     * Sanitise and validate inbound cz_package data.
     * Returns a fully-shaped array regardless of input quality.
     *
     * @param  mixed $data
     * @return array<string, mixed>
     */
    public static function sanitize(mixed $data): array
    {
        if (!is_array($data)) {
            $data = [];
        }

        return [
            'package_type'       => self::sanitizeType($data['package_type'] ?? ''),
            'service_refs'       => self::sanitizeServiceRefs($data['service_refs'] ?? []),
            'tiers'              => self::sanitizeTiers($data['tiers'] ?? []),
            'popular_tier'       => self::sanitizePopularTier($data['popular_tier'] ?? ''),
            'sort_position'      => (int) ($data['sort_position'] ?? 0),
            'display_contexts'   => self::sanitizeContexts($data['display_contexts'] ?? []),
            'bundle'             => self::sanitizeBundle($data['bundle'] ?? []),
            'valid_from'         => self::sanitizeDatetime($data['valid_from'] ?? null),
            'valid_until'        => self::sanitizeDatetime($data['valid_until'] ?? null),
            'migration_complete' => (bool) ($data['migration_complete'] ?? false),
        ];
    }

    /** @return array<string, mixed> */
    public function defaultPackage(): array
    {
        return [
            'package_type'       => 'tier_configuration',
            'service_refs'       => [],
            'tiers'              => array_fill_keys(
                self::ALLOWED_TIERS,
                ['price' => null, 'billing_cycle' => null, 'inclusions_override' => [], 'features' => []]
            ),
            'popular_tier'       => null,
            'sort_position'      => 0,
            'display_contexts'   => ['cost-builder'],
            'bundle'             => ['title' => '', 'description' => '', 'price' => null],
            'valid_from'         => null,
            'valid_until'        => null,
            'migration_complete' => false,
        ];
    }

    // ── Private sanitizers ────────────────────────────────────────────────────

    private static function sanitizeType(mixed $type): string
    {
        $type = sanitize_text_field((string) $type);
        return in_array($type, self::ALLOWED_TYPES, true) ? $type : 'tier_configuration';
    }

    /**
     * @param  mixed $refs
     * @return int[]
     */
    private static function sanitizeServiceRefs(mixed $refs): array
    {
        if (!is_array($refs)) {
            return [];
        }

        $clean = [];
        foreach ($refs as $ref) {
            $id = absint($ref);
            if ($id > 0) {
                $clean[] = $id;
            }
        }

        return array_values(array_unique($clean));
    }

    /**
     * @param  mixed $tiers
     * @return array<string, array<string, mixed>>
     */
    private static function sanitizeTiers(mixed $tiers): array
    {
        if (!is_array($tiers)) {
            $tiers = [];
        }

        $out = [];

        foreach (self::ALLOWED_TIERS as $tierId) {
            $src = $tiers[$tierId] ?? [];

            // price: numeric or null. null means "not configured in this package".
            $price = null;
            if (isset($src['price']) && $src['price'] !== null && $src['price'] !== '') {
                $price = (float) $src['price'];
            }

            // billing_cycle: string or null (null = inherit from canonical service record)
            $billingCycle = null;
            if (!empty($src['billing_cycle'])) {
                $billingCycle = sanitize_text_field((string) $src['billing_cycle']);
            }

            // inclusions_override: explicit [{id, label}] pairs. Empty = use canonical inclusions.
            $inclusions = [];
            if (isset($src['inclusions_override']) && is_array($src['inclusions_override'])) {
                foreach ($src['inclusions_override'] as $inc) {
                    if (!is_array($inc)) {
                        continue;
                    }
                    $id    = sanitize_text_field((string) ($inc['id'] ?? ''));
                    $label = sanitize_text_field((string) ($inc['label'] ?? ''));
                    if ($id !== '' && $label !== '') {
                        $inclusions[] = ['id' => $id, 'label' => $label];
                    }
                }
            }

            // features: flat string list (transitional; prefer inclusions_override)
            $features = [];
            if (isset($src['features']) && is_array($src['features'])) {
                $features = array_values(array_filter(
                    array_map('sanitize_text_field', array_map('strval', $src['features'])),
                    fn($f) => $f !== ''
                ));
            }

            $out[$tierId] = [
                'price'               => $price,
                'billing_cycle'       => $billingCycle,
                'inclusions_override' => $inclusions,
                'features'            => $features,
            ];
        }

        return $out;
    }

    private static function sanitizePopularTier(mixed $tier): ?string
    {
        $tier = sanitize_text_field((string) $tier);
        return in_array($tier, self::ALLOWED_TIERS, true) ? $tier : null;
    }

    /**
     * @param  mixed $contexts
     * @return string[]
     */
    private static function sanitizeContexts(mixed $contexts): array
    {
        if (!is_array($contexts)) {
            return ['cost-builder'];
        }

        $clean = [];
        foreach ($contexts as $ctx) {
            $ctx = sanitize_text_field((string) $ctx);
            if (in_array($ctx, self::ALLOWED_CONTEXTS, true)) {
                $clean[] = $ctx;
            }
        }

        return !empty($clean) ? array_values(array_unique($clean)) : ['cost-builder'];
    }

    /**
     * @param  mixed $bundle
     * @return array{title: string, description: string, price: float|null}
     */
    private static function sanitizeBundle(mixed $bundle): array
    {
        if (!is_array($bundle)) {
            $bundle = [];
        }

        $price = null;
        if (isset($bundle['price']) && $bundle['price'] !== null && $bundle['price'] !== '') {
            $price = (float) $bundle['price'];
        }

        return [
            'title'       => sanitize_text_field((string) ($bundle['title'] ?? '')),
            'description' => sanitize_textarea_field((string) ($bundle['description'] ?? '')),
            'price'       => $price,
        ];
    }

    private static function sanitizeDatetime(mixed $raw): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        $ts = strtotime((string) $raw);
        return ($ts !== false) ? gmdate('Y-m-d H:i:s', $ts) : null;
    }
}
