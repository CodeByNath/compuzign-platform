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
    public const ALLOWED_PLATFORM_STATUSES   = ['active', 'disabled', 'archived'];
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

        $rawStatus       = sanitize_text_field((string) ($data['platform_status'] ?? ''));
        $platformStatus  = in_array($rawStatus, self::ALLOWED_PLATFORM_STATUSES, true) ? $rawStatus : 'disabled';

        return [
            'platform_status'    => $platformStatus,
            'package_type'       => self::sanitizeType($data['package_type'] ?? ''),
            'service_refs'       => self::sanitizeServiceRefs($data['service_refs'] ?? []),
            'tiers'              => self::sanitizeTiers($data['tiers'] ?? []),
            'promotion_tiers'    => self::sanitizePromotionTiers($data['promotion_tiers'] ?? []),
            'popular_tier'       => self::sanitizePopularTier($data['popular_tier'] ?? ''),
            'popular_label'      => self::sanitizePopularLabel($data['popular_label'] ?? ''),
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
            'platform_status'    => 'disabled',
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
            'popular_label'      => '',
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

            // contact: true means "contact/no fixed price"; overlays price as null in PricingBuilder.
            $contact = (bool) ($src['contact'] ?? false);

            $out[$tierId] = [
                'label'               => $label,
                'price'               => $price,
                'contact'             => $contact,
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

    private static function sanitizePopularLabel(mixed $label): string
    {
        return sanitize_text_field((string) $label);
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

    // ── Promotion Instance helpers (Phase 4) ──────────────────────────────────

    /**
     * Build a sanitised promotion instance from a request body.
     * Falls back to $existing values for any field absent from $body.
     * Merges $addedInclusions into the stored inclusions list.
     */
    public static function buildPromotionInstance(string $id, array $body, array $addedInclusions = [], array $existing = []): array
    {
        // Inclusions
        $inclusions = $existing['inclusions'] ?? [];
        if (array_key_exists('inclusions', $body) && is_array($body['inclusions'])) {
            $inclusions = [];
            foreach ($body['inclusions'] as $inc) {
                if (!is_array($inc)) { continue; }
                $iid = sanitize_text_field((string) ($inc['id'] ?? ''));
                $ilb = sanitize_text_field((string) ($inc['label'] ?? ''));
                if ($iid !== '' && $ilb !== '') { $inclusions[] = ['id' => $iid, 'label' => $ilb]; }
            }
        }
        foreach ($addedInclusions as $inc) {
            if (!in_array($inc['id'], array_column($inclusions, 'id'), true)) { $inclusions[] = $inc; }
        }

        // Exclusions
        $exclusions = $existing['exclusions'] ?? [];
        if (array_key_exists('exclusions', $body) && is_array($body['exclusions'])) {
            $exclusions = [];
            foreach ($body['exclusions'] as $exc) {
                if (!is_array($exc)) { continue; }
                $eid = sanitize_text_field((string) ($exc['id'] ?? ''));
                $elb = sanitize_text_field((string) ($exc['label'] ?? ''));
                if ($eid !== '' && $elb !== '') { $exclusions[] = ['id' => $eid, 'label' => $elb]; }
            }
        }

        // Features
        $features = $existing['features'] ?? [];
        if (array_key_exists('features', $body) && is_array($body['features'])) {
            $features = array_values(array_filter(
                array_map('sanitize_text_field', array_map('strval', $body['features'])),
                fn($f) => $f !== ''
            ));
        }

        // Price
        $price = $existing['price'] ?? null;
        if (array_key_exists('price', $body)) {
            $price = ($body['price'] !== null && $body['price'] !== '') ? (float) $body['price'] : null;
        }

        // Status
        $status = $existing['status'] ?? 'draft';
        if (!empty($body['status']) && in_array($body['status'], self::ALLOWED_PROMOTION_STATUSES, true)) {
            $status = $body['status'];
        }

        // based_on
        $basedOn = $existing['based_on'] ?? null;
        if (array_key_exists('based_on', $body)) {
            $candidate = sanitize_text_field((string) ($body['based_on'] ?? ''));
            $basedOn   = in_array($candidate, self::ALLOWED_BASED_ON, true) ? $candidate : null;
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
            'starts_at'      => self::parseDatetimeFromBody($body, $existing, 'starts_at'),
            'ends_at'        => self::parseDatetimeFromBody($body, $existing, 'ends_at'),
            'priority'       => (int) ($body['priority'] ?? $existing['priority'] ?? 0),
            'is_featured'    => (bool) ($body['is_featured'] ?? $existing['is_featured'] ?? false),
            'metadata'       => $existing['metadata'] ?? [],
        ];
    }

    public static function parseDatetimeFromBody(array $body, array $existing, string $key): ?string
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

    /**
     * Normalise a raw promotion instances array to the API response shape.
     * Records without a valid id are dropped.
     *
     * @param  mixed $instances
     * @return array<int, array<string, mixed>>
     */
    public static function normalisePromotionInstances(mixed $instances): array
    {
        if (!is_array($instances)) {
            return [];
        }
        $out = [];
        foreach ($instances as $tier) {
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
                'inclusions'     => self::coerceInclusionArray($tier['inclusions'] ?? []),
                'exclusions'     => self::coerceInclusionArray($tier['exclusions'] ?? []),
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
     * Find a promotion instance by ID within a flat instances array.
     * Returns the instance array or null if not found.
     */
    public static function findPromoInInstances(array $instances, string $promoId): ?array
    {
        foreach ($instances as $t) {
            if (is_array($t) && ($t['id'] ?? '') === $promoId) {
                return $t;
            }
        }
        return null;
    }

    private static function coerceInclusionArray(mixed $items): array
    {
        if (!is_array($items)) { return []; }
        $out = [];
        foreach ($items as $item) {
            if (!is_array($item)) { continue; }
            $id = (string) ($item['id'] ?? '');
            $lb = (string) ($item['label'] ?? '');
            if ($id !== '' && $lb !== '') { $out[] = ['id' => $id, 'label' => $lb]; }
        }
        return $out;
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

    // ── Tier Occupant helpers (Phase 2) ──────────────────────────────────────

    /**
     * Detect whether a tier slot is in Phase 2 occupant format.
     */
    public static function isOccupantFormat(array $tier): bool
    {
        return array_key_exists('current_occupant', $tier);
    }

    /**
     * Normalise a raw tier slot (Phase 1 flat OR Phase 2 occupant) to the
     * SurfaceTierDetail shape expected by admin API responses.
     * Returns the 8-field flat detail used by the frontend form.
     */
    public static function normaliseTierSlot(array $tier): array
    {
        if (self::isOccupantFormat($tier)) {
            $occ = $tier['current_occupant'] ?? null;
            if ($occ === null) {
                return self::emptyTierDetail();
            }
            return [
                'label'               => $occ['label'] ?? '',
                'price'               => isset($occ['price']) && $occ['price'] !== null ? (float) $occ['price'] : null,
                'contact'             => (bool) ($occ['contact'] ?? false),
                'billing_cycle'       => $occ['billing_cycle'] ?? null,
                'inclusions_override' => $occ['inclusions_override'] ?? [],
                'features'            => $occ['features'] ?? [],
                'faq_refs'            => $occ['faq_refs'] ?? [],
                'enabled'             => ($occ['platform_status'] ?? 'active') === 'active',
            ];
        }

        // Phase 1 flat format.
        if (empty($tier)) {
            return self::emptyTierDetail();
        }
        return [
            'label'               => $tier['label'] ?? '',
            'price'               => isset($tier['price']) && $tier['price'] !== null ? (float) $tier['price'] : null,
            'contact'             => (bool) ($tier['contact'] ?? false),
            'billing_cycle'       => $tier['billing_cycle'] ?? null,
            'inclusions_override' => $tier['inclusions_override'] ?? [],
            'features'            => $tier['features'] ?? [],
            'faq_refs'            => $tier['faq_refs'] ?? [],
            'enabled'             => isset($tier['enabled']) ? (bool) $tier['enabled'] : true,
        ];
    }

    /**
     * Normalise a tier slot to the SurfaceTierSummary shape used in list responses.
     */
    public static function summariseTierSlot(array $tier): array
    {
        $detail     = self::normaliseTierSlot($tier);
        $configured = !empty($detail['billing_cycle'])
            || $detail['price'] !== null
            || $detail['contact']
            || !empty($detail['inclusions_override'])
            || !empty($detail['faq_refs']);
        return [
            'label'           => $detail['label'],
            'price'           => $detail['price'],
            'billing_cycle'   => $detail['billing_cycle'],
            'inclusion_count' => count($detail['inclusions_override']),
            'faq_count'       => count($detail['faq_refs']),
            'enabled'         => $detail['enabled'],
            'configured'      => $configured,
        ];
    }

    /**
     * Extract the flat tier interface that PricingBuilder/overlayPackage() expects.
     * Returns null for empty shells (no output to Cost Builder).
     */
    public static function extractTierForCostBuilder(array $tier): ?array
    {
        if (self::isOccupantFormat($tier)) {
            $occ = $tier['current_occupant'] ?? null;
            if ($occ === null) {
                return null;
            }
            return [
                'label'               => $occ['label'] ?? '',
                'price'               => $occ['price'] ?? null,
                'contact'             => $occ['contact'] ?? false,
                'billing_cycle'       => $occ['billing_cycle'] ?? null,
                'inclusions_override' => $occ['inclusions_override'] ?? [],
                'features'            => $occ['features'] ?? [],
                'faq_refs'            => $occ['faq_refs'] ?? [],
                'enabled'             => ($occ['platform_status'] ?? 'active') === 'active',
            ];
        }

        // Phase 1 flat format — pass through; null for empty slots.
        return empty($tier) ? null : $tier;
    }

    /**
     * Create a new occupant or update the existing one inside a tier shell.
     * Preserves occupant id across edits; generates a new id for first configuration.
     * Does NOT write to history (history is reserved for future restore/swap).
     *
     * @param  array $tierSlot  Current tier slot (may be flat Phase 1, occupant Phase 2, or empty).
     * @param  array $data      Flat tier fields (label, price, contact, billing_cycle, inclusions_override, features, faq_refs).
     * @param  bool  $enabled   Maps to platform_status: active|disabled.
     * @return array            Updated tier slot in Phase 2 occupant format.
     */
    public static function upsertOccupant(array $tierSlot, array $data, bool $enabled): array
    {
        $history = [];
        $existingId = null;

        if (self::isOccupantFormat($tierSlot)) {
            $history    = $tierSlot['history'] ?? [];
            $existingId = $tierSlot['current_occupant']['id'] ?? null;
        }

        return [
            'current_occupant' => [
                'id'                  => $existingId ?? ('occ_' . bin2hex(random_bytes(4))),
                'platform_status'     => $enabled ? 'active' : 'disabled',
                'label'               => $data['label'] ?? '',
                'price'               => $data['price'] ?? null,
                'contact'             => $data['contact'] ?? false,
                'billing_cycle'       => $data['billing_cycle'] ?? null,
                'inclusions_override' => $data['inclusions_override'] ?? [],
                'features'            => $data['features'] ?? [],
                'faq_refs'            => $data['faq_refs'] ?? [],
            ],
            'history' => $history,
        ];
    }

    /**
     * Derive station-level platform_status from tier occupant states.
     * 'active' when at least one tier has a living active occupant; 'disabled' otherwise.
     * This is a Cost Builder visibility field, not Package Station lifecycle.
     */
    public static function deriveStationStatus(array $station): string
    {
        foreach (self::ALLOWED_TIERS as $tierId) {
            $tier = $station['tiers'][$tierId] ?? [];
            if (self::isOccupantFormat($tier)) {
                $occ = $tier['current_occupant'] ?? null;
                if ($occ !== null && ($occ['platform_status'] ?? 'active') === 'active') {
                    return 'active';
                }
            } else {
                // Phase 1 flat: active when non-empty and enabled is not explicitly false.
                if (!empty($tier) && (($tier['enabled'] ?? true) !== false)) {
                    return 'active';
                }
            }
        }
        return 'disabled';
    }

    /** @return array{label: string, price: null, contact: false, billing_cycle: null, inclusions_override: array, features: array, faq_refs: array, enabled: false} */
    private static function emptyTierDetail(): array
    {
        return [
            'label' => '', 'price' => null, 'contact' => false,
            'billing_cycle' => null, 'inclusions_override' => [],
            'features' => [], 'faq_refs' => [], 'enabled' => false,
        ];
    }
}
