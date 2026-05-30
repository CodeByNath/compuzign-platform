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
    public const ALLOWED_TYPES               = ['tier_configuration', 'bundle', 'promotion', 'homepage_collection', 'campaign'];
    public const ALLOWED_TIERS               = ['basic', 'standard', 'premium', 'enterprise'];
    public const ALLOWED_CONTEXTS            = ['cost-builder', 'homepage', 'pricing-page'];
    public const ALLOWED_PROMOTION_STATUSES  = ['draft', 'active', 'archived'];
    public const ALLOWED_BASED_ON            = ['basic', 'standard', 'premium', 'enterprise'];

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
            'promotion_tiers'    => self::sanitizePromotionTiers($data['promotion_tiers'] ?? []),
            'popular_tier'       => self::sanitizePopularTier($data['popular_tier'] ?? ''),
            'faq_refs'           => self::sanitizeFaqRefs($data['faq_refs'] ?? []),
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
                [
                    'label'               => '',
                    'price'               => null,
                    'billing_cycle'       => null,
                    'inclusions_override' => [],
                    'features'            => [],
                    'faq_refs'            => [],
                    'enabled'             => true,
                ]
            ),
            'promotion_tiers'    => [],
            'popular_tier'       => null,
            'faq_refs'           => [],
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

            // label: admin display override for the canonical tier title.
            $label = sanitize_text_field((string) ($src['label'] ?? ''));

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
                    $incId    = sanitize_text_field((string) ($inc['id'] ?? ''));
                    $incLabel = sanitize_text_field((string) ($inc['label'] ?? ''));
                    if ($incId !== '' && $incLabel !== '') {
                        $inclusions[] = ['id' => $incId, 'label' => $incLabel];
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

            // faq_refs: IDs of canonical FAQs selected for this tier.
            $tierFaqRefs = [];
            if (isset($src['faq_refs']) && is_array($src['faq_refs'])) {
                foreach ($src['faq_refs'] as $ref) {
                    $ref = sanitize_text_field((string) $ref);
                    if ($ref !== '') {
                        $tierFaqRefs[] = $ref;
                    }
                }
                $tierFaqRefs = array_values(array_unique($tierFaqRefs));
            }

            // enabled: false removes the tier from Cost Builder output entirely.
            $enabled = isset($src['enabled']) ? (bool) $src['enabled'] : true;

            $out[$tierId] = [
                'label'               => $label,
                'price'               => $price,
                'billing_cycle'       => $billingCycle,
                'inclusions_override' => $inclusions,
                'features'            => $features,
                'faq_refs'            => $tierFaqRefs,
                'enabled'             => $enabled,
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
     * FAQ IDs selected from the canonical cz_service_faqs pool.
     * Empty = all canonical FAQs apply (current PricingBuilder behaviour).
     *
     * @param  mixed $refs
     * @return string[]
     */
    private static function sanitizeFaqRefs(mixed $refs): array
    {
        if (!is_array($refs)) {
            return [];
        }

        $clean = [];
        foreach ($refs as $ref) {
            $id = sanitize_text_field((string) $ref);
            if ($id !== '') {
                $clean[] = $id;
            }
        }

        return array_values(array_unique($clean));
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

    // ── Promotion tier sanitizers ─────────────────────────────────────────────

    /**
     * Generates a server-side ID for a new promotion tier.
     * Call this in the controller before persisting a new record.
     */
    public static function generatePromotionTierId(): string
    {
        return 'promo_' . bin2hex(random_bytes(4));
    }

    /**
     * Sanitise the promotion_tiers array.
     * Records without a valid id are silently dropped.
     * Duplicate ids are deduplicated (first occurrence wins).
     *
     * @param  mixed $tiers
     * @return array<int, array<string, mixed>>
     */
    private static function sanitizePromotionTiers(mixed $tiers): array
    {
        if (!is_array($tiers)) {
            return [];
        }

        $out  = [];
        $seen = [];

        foreach ($tiers as $tier) {
            if (!is_array($tier)) {
                continue;
            }

            $clean = self::sanitizePromotionTier($tier);

            if ($clean === null) {
                continue;
            }

            if (isset($seen[$clean['id']])) {
                continue; // first occurrence wins
            }

            $seen[$clean['id']] = true;
            $out[] = $clean;
        }

        return $out;
    }

    /**
     * Sanitise a single promotion tier record.
     * Returns null when the record is structurally invalid (missing id).
     *
     * @param  array<string, mixed> $src
     * @return array<string, mixed>|null
     */
    private static function sanitizePromotionTier(array $src): ?array
    {
        // id is required — records without one cannot be addressed by the controller
        $id = sanitize_text_field((string) ($src['id'] ?? ''));
        if ($id === '') {
            return null;
        }

        $name = sanitize_text_field((string) ($src['name'] ?? ''));
        $slug = sanitize_title((string) ($src['slug'] ?? $name));

        $status = sanitize_text_field((string) ($src['status'] ?? 'draft'));
        if (!in_array($status, self::ALLOWED_PROMOTION_STATUSES, true)) {
            $status = 'draft';
        }

        // based_on: metadata only — stores the admin's authoring intent, never used at render time
        $basedOn = null;
        if (!empty($src['based_on'])) {
            $candidate = sanitize_text_field((string) $src['based_on']);
            if (in_array($candidate, self::ALLOWED_BASED_ON, true)) {
                $basedOn = $candidate;
            }
        }

        $headline    = sanitize_text_field((string) ($src['headline'] ?? ''));
        $description = sanitize_textarea_field((string) ($src['description'] ?? ''));

        $price = null;
        if (isset($src['price']) && $src['price'] !== null && $src['price'] !== '') {
            $price = (float) $src['price'];
        }

        $billingLabel = sanitize_text_field((string) ($src['billing_label'] ?? ''));

        $features   = self::sanitizeStringArray($src['features'] ?? []);
        $inclusions = self::sanitizeInclusionItems($src['inclusions'] ?? []);
        $exclusions = self::sanitizeInclusionItems($src['exclusions'] ?? []);

        $badge         = sanitize_text_field((string) ($src['badge'] ?? ''));
        $campaignLabel = sanitize_text_field((string) ($src['campaign_label'] ?? ''));

        $startsAt = self::sanitizeDatetime($src['starts_at'] ?? null);
        $endsAt   = self::sanitizeDatetime($src['ends_at'] ?? null);

        $priority   = (int) ($src['priority'] ?? 0);
        $isFeatured = (bool) ($src['is_featured'] ?? false);

        $metadata = self::sanitizeMetadata($src['metadata'] ?? []);

        return [
            'id'             => $id,
            'name'           => $name,
            'slug'           => $slug,
            'status'         => $status,
            'based_on'       => $basedOn,
            'headline'       => $headline,
            'description'    => $description,
            'price'          => $price,
            'billing_label'  => $billingLabel,
            'features'       => $features,
            'inclusions'     => $inclusions,
            'exclusions'     => $exclusions,
            'badge'          => $badge,
            'campaign_label' => $campaignLabel,
            'starts_at'      => $startsAt,
            'ends_at'        => $endsAt,
            'priority'       => $priority,
            'is_featured'    => $isFeatured,
            'metadata'       => $metadata,
        ];
    }

    /**
     * Sanitise a flat list of strings.
     * Empty strings are removed; non-string values are cast then sanitized.
     *
     * @param  mixed $items
     * @return string[]
     */
    private static function sanitizeStringArray(mixed $items): array
    {
        if (!is_array($items)) {
            return [];
        }

        return array_values(array_filter(
            array_map('sanitize_text_field', array_map('strval', $items)),
            fn(string $s) => $s !== ''
        ));
    }

    /**
     * Sanitise inclusion items as [{id, label}] pairs.
     * Follows the same shape as inclusions_override in core tiers.
     *
     * @param  mixed $items
     * @return array<int, array{id: string, label: string}>
     */
    private static function sanitizeInclusionItems(mixed $items): array
    {
        if (!is_array($items)) {
            return [];
        }

        $out = [];

        foreach ($items as $inc) {
            if (!is_array($inc)) {
                continue;
            }

            $incId    = sanitize_text_field((string) ($inc['id'] ?? ''));
            $incLabel = sanitize_text_field((string) ($inc['label'] ?? ''));

            if ($incId !== '' && $incLabel !== '') {
                $out[] = ['id' => $incId, 'label' => $incLabel];
            }
        }

        return $out;
    }

    /**
     * Sanitise the metadata map to a flat string→string structure.
     * Non-scalar values and empty keys are dropped.
     *
     * @param  mixed $meta
     * @return array<string, string>
     */
    private static function sanitizeMetadata(mixed $meta): array
    {
        if (!is_array($meta)) {
            return [];
        }

        $out = [];

        foreach ($meta as $key => $value) {
            $cleanKey = sanitize_key((string) $key);
            if ($cleanKey === '') {
                continue;
            }
            if (!is_string($value) && !is_numeric($value) && !is_bool($value)) {
                continue;
            }
            $out[$cleanKey] = sanitize_text_field((string) $value);
        }

        return $out;
    }
}
