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

    // Phase 2 tier lifecycle (P2 — store schema): the per-tier-module draft + status
    // layer stored inside each cz_service_package_station tier slot, alongside
    // current_occupant. Additive and inert in P2 — nothing reads these until P3.
    public const TIER_MODULES                = ['overview', 'features', 'faqs'];
    public const ALLOWED_MODULE_STATUSES     = ['not-configured', 'pending', 'settled'];

    // Lifecycle engine C1 — promotion instance envelope. Same module trio as tiers;
    // envelope statuses come from the engine (StationLifecycle::STATUSES), NOT from
    // ALLOWED_PROMOTION_STATUSES: the legacy top-level status field stays the
    // authoritative, client-facing value (and keeps its narrower vocabulary) until
    // the transition endpoints (C3) own all status writes.
    public const PROMOTION_MODULES           = ['overview', 'features', 'faqs'];

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

        // FAQ refs — plain string ids into the service's shared FAQ pool, same shape
        // and sanitisation as Tier's tier-faqs module (AdminServicesController.php).
        $faqRefs = $existing['faq_refs'] ?? [];
        if (array_key_exists('faq_refs', $body) && is_array($body['faq_refs'])) {
            $faqRefs = [];
            foreach ($body['faq_refs'] as $ref) {
                $ref = sanitize_text_field((string) $ref);
                if ($ref !== '') { $faqRefs[] = $ref; }
            }
        }

        // Price
        $price = $existing['price'] ?? null;
        if (array_key_exists('price', $body)) {
            $price = ($body['price'] !== null && $body['price'] !== '') ? (float) $body['price'] : null;
        }

        // Status — engine C2: travel state is never client-writable through saves.
        // The existing value is preserved; new instances start as draft. A body
        // `status` field is ignored (not rejected) so the pre-cutover UI keeps
        // working; the transition endpoints (C3) become the only status writes.
        $status = $existing['status'] ?? 'draft';

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

        $instance = [
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
            'faq_refs'       => $faqRefs,
            'badge'          => sanitize_text_field((string) ($body['badge'] ?? $existing['badge'] ?? '')),
            'campaign_label' => sanitize_text_field((string) ($body['campaign_label'] ?? $existing['campaign_label'] ?? '')),
            'starts_at'      => self::parseDatetimeFromBody($body, $existing, 'starts_at'),
            'ends_at'        => self::parseDatetimeFromBody($body, $existing, 'ends_at'),
            'priority'       => (int) ($body['priority'] ?? $existing['priority'] ?? 0),
            'is_featured'    => (bool) ($body['is_featured'] ?? $existing['is_featured'] ?? false),
            'metadata'       => $existing['metadata'] ?? [],
        ];

        // Lifecycle envelope passthrough (engine C1): whole-record saves must not
        // strip a persisted envelope. Sourced from $existing only — a request body
        // can never write lifecycle state; transitions (C3) own those writes.
        if (isset($existing['lifecycle']) && is_array($existing['lifecycle'])) {
            $instance['lifecycle'] = $existing['lifecycle'];
        }

        return $instance;
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
     * Engine C6 — is a promotion instance's schedule window open at $nowUtc?
     * starts_at/ends_at are stored as UTC 'Y-m-d H:i:s' (parseDatetimeFromBody),
     * so $nowUtc must be UTC too (current_time('mysql', true)). A null bound is
     * open-ended on that side. Scheduling is visibility logic layered on top of
     * lifecycle status — it is not a travel state and never mutates one.
     */
    public static function promotionWindowOpen(array $instance, string $nowUtc): bool
    {
        $starts = $instance['starts_at'] ?? null;
        if (is_string($starts) && $starts !== '' && $starts > $nowUtc) {
            return false;
        }
        $ends = $instance['ends_at'] ?? null;
        if (is_string($ends) && $ends !== '' && $ends < $nowUtc) {
            return false;
        }
        return true;
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
                // Additive (Phase 4) — defaults to [] for legacy/pre-existing instances
                // that predate this field, no data migration required.
                'faq_refs'       => is_array($tier['faq_refs'] ?? null) ? array_values(array_map('strval', $tier['faq_refs'])) : [],
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

    // ── Promotion instance lifecycle envelope (engine C1) ─────────────────────
    // Each instance gains a `lifecycle` map — the travelling-instance counterpart
    // of the tier slot's drafts/module_status layer, plus the engine's travel
    // state. Lazily backfilled on read (ensurePromotionLifecycle); never written
    // from a request body. The legacy top-level `status` field remains the
    // authoritative value until the transition endpoints (C3) own status writes;
    // lifecycle.status mirrors it in the meantime.

    /**
     * The empty envelope: travel state draft, no history, no pending drafts,
     * every module not-configured.
     *
     * @return array{status: string, previous_status: ?string, drafts: array<string, null>, module_status: array<string, string>}
     */
    public static function emptyPromotionLifecycle(): array
    {
        $drafts = [];
        $status = [];
        foreach (self::PROMOTION_MODULES as $module) {
            $drafts[$module] = null;
            $status[$module] = 'not-configured';
        }
        return [
            'status'          => 'draft',
            'previous_status' => null,
            'drafts'          => $drafts,
            'module_status'   => $status,
        ];
    }

    /**
     * Guarantee a valid lifecycle envelope on a promotion instance, deriving
     * defaults for missing/invalid keys. Idempotent.
     *
     * lifecycle.status backfills from the legacy top-level status (draft/active/
     * archived map 1:1 into the engine vocabulary; anything else → draft).
     * module_status defaults derive from settled content — parity with
     * ensureTierLifecycle's occupant-derived defaults.
     *
     * @param  array<string, mixed> $instance
     * @return array<string, mixed> the instance with `lifecycle` guaranteed
     */
    public static function ensurePromotionLifecycle(array $instance): array
    {
        $engineStatuses = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::STATUSES;
        $lc = (isset($instance['lifecycle']) && is_array($instance['lifecycle'])) ? $instance['lifecycle'] : [];

        // Travel state: the legacy top-level status remains authoritative until the
        // transition endpoints (C3) own all status writes — a valid top-level value
        // always wins, so a persisted envelope can never go stale against routes
        // that still write only the top-level field (archive/reactivate).
        $top    = $instance['status'] ?? null;
        $status = is_string($top) && in_array($top, $engineStatuses, true) ? $top : null;
        if ($status === null) {
            $stored = $lc['status'] ?? null;
            $status = is_string($stored) && in_array($stored, $engineStatuses, true) ? $stored : 'draft';
        }

        $previous = $lc['previous_status'] ?? null;
        if (!is_string($previous) || !in_array($previous, $engineStatuses, true)) {
            $previous = null;
        }

        $drafts       = (isset($lc['drafts']) && is_array($lc['drafts'])) ? $lc['drafts'] : [];
        $moduleStatus = (isset($lc['module_status']) && is_array($lc['module_status'])) ? $lc['module_status'] : [];
        foreach (self::PROMOTION_MODULES as $module) {
            if (!array_key_exists($module, $drafts)) {
                $drafts[$module] = null;
            }
            if (!in_array($moduleStatus[$module] ?? null, self::ALLOWED_MODULE_STATUSES, true)) {
                $moduleStatus[$module] = self::promotionModuleDefaultStatus($module, $instance);
            }
        }

        $instance['lifecycle'] = [
            'status'          => $status,
            'previous_status' => $previous,
            'drafts'          => $drafts,
            'module_status'   => $moduleStatus,
        ];
        return $instance;
    }

    /**
     * Content-derived module_status default for instances predating the envelope:
     * settled when the module already has settled content, else not-configured
     * (never pending — pending exists only once a draft has been saved).
     */
    private static function promotionModuleDefaultStatus(string $module, array $instance): string
    {
        $hasContent = match ($module) {
            'overview' => trim((string) ($instance['name'] ?? '')) !== '',
            'features' => is_array($instance['inclusions'] ?? null) && $instance['inclusions'] !== [],
            'faqs'     => is_array($instance['faq_refs'] ?? null) && $instance['faq_refs'] !== [],
            default    => false,
        };
        return $hasContent ? 'settled' : 'not-configured';
    }

    // ── Promotion module draft operations (engine C2) ─────────────────────────
    // Draft save / settle / revert for one promotion instance — the travelling-
    // instance counterpart of settleTierSlot and the tier module-draft writes.
    // All pure: instance in, instance out; the controller owns persistence.

    /**
     * Sanitise a promotion overview module draft: the module's scalar fields only.
     * Travel status is deliberately absent (engine-owned, never draftable);
     * schedule fields and metadata stay whole-record-save concerns.
     *
     * @return array<string, mixed>
     */
    public static function sanitizePromotionOverviewDraft(array $body): array
    {
        $basedOn   = sanitize_text_field((string) ($body['based_on'] ?? ''));
        $rawPrice  = $body['price'] ?? null;

        return [
            'name'           => sanitize_text_field((string) ($body['name'] ?? '')),
            'slug'           => sanitize_title((string) ($body['slug'] ?? '')),
            'based_on'       => in_array($basedOn, self::ALLOWED_BASED_ON, true) ? $basedOn : null,
            'headline'       => sanitize_text_field((string) ($body['headline'] ?? '')),
            'description'    => sanitize_textarea_field((string) ($body['description'] ?? '')),
            'price'          => ($rawPrice !== null && $rawPrice !== '') ? (float) $rawPrice : null,
            'billing_label'  => sanitize_text_field((string) ($body['billing_label'] ?? '')),
            'badge'          => sanitize_text_field((string) ($body['badge'] ?? '')),
            'campaign_label' => sanitize_text_field((string) ($body['campaign_label'] ?? '')),
            'priority'       => (int) ($body['priority'] ?? 0),
            'is_featured'    => (bool) ($body['is_featured'] ?? false),
        ];
    }

    /**
     * Persist one module draft onto an instance's lifecycle envelope and mark the
     * module pending. The settled fields and travel status are never touched.
     * Returns null when the module is unknown or the payload is missing its
     * module-keyed field.
     *
     * Body keying mirrors the tier module-draft endpoint: overview → the draft
     * fields themselves; features → body.inclusions; faqs → body.faq_refs.
     *
     * @param  array<string, mixed> $instance
     * @param  array<string, mixed> $body
     * @return array<string, mixed>|null
     */
    public static function savePromotionModuleDraft(array $instance, string $module, array $body): ?array
    {
        switch ($module) {
            case 'overview':
                $draft = self::sanitizePromotionOverviewDraft($body);
                break;
            case 'features':
                if (!is_array($body['inclusions'] ?? null)) {
                    return null;
                }
                $draft = self::coerceInclusionArray($body['inclusions']);
                break;
            case 'faqs':
                if (!is_array($body['faq_refs'] ?? null)) {
                    return null;
                }
                $draft = [];
                foreach ($body['faq_refs'] as $ref) {
                    $ref = sanitize_text_field((string) $ref);
                    if ($ref !== '') {
                        $draft[] = $ref;
                    }
                }
                break;
            default:
                return null;
        }

        $instance = self::ensurePromotionLifecycle($instance);
        $instance['lifecycle']['drafts'][$module]        = $draft;
        $instance['lifecycle']['module_status'][$module] = 'pending';
        return $instance;
    }

    /**
     * Settle an instance: commit the draft-preferred state of every module into
     * the settled fields, clear drafts, and re-derive module_status from the
     * committed content (settled where content exists, not-configured where it
     * doesn't — truthful, matching Service settle semantics rather than tier's
     * blanket commit). NO-OPs (returns the instance unchanged) when no drafts
     * exist. Travel status is never touched — publish (C3) composes settle +
     * activate itself.
     *
     * @param  array<string, mixed> $instance
     * @return array<string, mixed>
     */
    public static function settlePromotionInstance(array $instance): array
    {
        $instance = self::ensurePromotionLifecycle($instance);
        $drafts   = $instance['lifecycle']['drafts'];

        $hasDraft = false;
        foreach (self::PROMOTION_MODULES as $module) {
            if (($drafts[$module] ?? null) !== null) {
                $hasDraft = true;
                break;
            }
        }
        if (!$hasDraft) {
            return $instance;
        }

        $ov = is_array($drafts['overview'] ?? null) ? $drafts['overview'] : null;
        if ($ov !== null) {
            $name = (string) ($ov['name'] ?? $instance['name'] ?? '');
            $slug = ($ov['slug'] ?? '') !== ''
                ? (string) $ov['slug']
                : (sanitize_title($name) ?: (string) ($instance['slug'] ?? ''));

            $instance['name']           = $name;
            $instance['slug']           = $slug;
            $instance['based_on']       = $ov['based_on'] ?? null;
            $instance['headline']       = (string) ($ov['headline'] ?? '');
            $instance['description']    = (string) ($ov['description'] ?? '');
            $instance['price']          = $ov['price'] ?? null;
            $instance['billing_label']  = (string) ($ov['billing_label'] ?? '');
            $instance['badge']          = (string) ($ov['badge'] ?? '');
            $instance['campaign_label'] = (string) ($ov['campaign_label'] ?? '');
            $instance['priority']       = (int) ($ov['priority'] ?? 0);
            $instance['is_featured']    = (bool) ($ov['is_featured'] ?? false);
        }

        if (is_array($drafts['features'] ?? null)) {
            $instance['inclusions'] = $drafts['features'];
        }
        if (is_array($drafts['faqs'] ?? null)) {
            $instance['faq_refs'] = $drafts['faqs'];
        }

        foreach (self::PROMOTION_MODULES as $module) {
            $instance['lifecycle']['drafts'][$module]        = null;
            $instance['lifecycle']['module_status'][$module] = self::promotionModuleDefaultStatus($module, $instance);
        }
        return $instance;
    }

    /**
     * Revert one module draft: clear the slot and re-derive the module's status
     * from its settled content. Returns null for an unknown module.
     *
     * @param  array<string, mixed> $instance
     * @return array<string, mixed>|null
     */
    public static function revertPromotionModuleDraft(array $instance, string $module): ?array
    {
        if (!in_array($module, self::PROMOTION_MODULES, true)) {
            return null;
        }
        $instance = self::ensurePromotionLifecycle($instance);
        $instance['lifecycle']['drafts'][$module]        = null;
        $instance['lifecycle']['module_status'][$module] = self::promotionModuleDefaultStatus($module, $instance);
        return $instance;
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

    // ── Tier lifecycle layer (Phase 2 — P2 store schema) ─────────────────────
    //
    // Each cz_service_package_station tier slot gains a `drafts` map (pending
    // per-module edits, null when none) and a `module_status` map
    // (not-configured|pending|settled), stored alongside current_occupant/history.
    // current_occupant stays the settled record. These keys are additive and inert
    // in P2 — no read path surfaces or consumes them until P3.

    /**
     * The empty lifecycle layer: no pending drafts, every module not-configured.
     *
     * @return array{drafts: array<string, null>, module_status: array<string, string>}
     */
    public static function emptyTierLifecycle(): array
    {
        $drafts = [];
        $status = [];
        foreach (self::TIER_MODULES as $module) {
            $drafts[$module] = null;
            $status[$module] = 'not-configured';
        }
        return ['drafts' => $drafts, 'module_status' => $status];
    }

    /**
     * Ensure a tier slot carries a complete, valid lifecycle layer, defaulting any
     * missing/invalid keys. Idempotent. module_status defaults derive from occupant
     * presence: a configured occupant is a committed record (settled); an empty slot
     * is not-configured. This is the read-time defaulter — first wired into the read
     * path in P3; it is intentionally not called anywhere in P2.
     */
    public static function ensureTierLifecycle(array $slot): array
    {
        $configured = self::isOccupantFormat($slot) && !empty($slot['current_occupant']);
        $default    = $configured ? 'settled' : 'not-configured';

        $drafts = (isset($slot['drafts']) && is_array($slot['drafts'])) ? $slot['drafts'] : [];
        $status = (isset($slot['module_status']) && is_array($slot['module_status'])) ? $slot['module_status'] : [];

        foreach (self::TIER_MODULES as $module) {
            if (!array_key_exists($module, $drafts)) {
                $drafts[$module] = null;
            }
            if (!in_array($status[$module] ?? null, self::ALLOWED_MODULE_STATUSES, true)) {
                $status[$module] = $default;
            }
        }

        $slot['drafts']        = $drafts;
        $slot['module_status'] = $status;
        return $slot;
    }

    /**
     * Engine D1 — revert one tier module draft: clear the slot and re-derive the
     * module's status from the settled occupant (settled when an occupant exists,
     * not-configured otherwise — the same occupant-derived default
     * ensureTierLifecycle uses). Returns null for an unknown module.
     *
     * @param  array<string, mixed> $slot
     * @return array<string, mixed>|null
     */
    public static function revertTierModuleDraft(array $slot, string $module): ?array
    {
        if (!in_array($module, self::TIER_MODULES, true)) {
            return null;
        }
        $slot = self::ensureTierLifecycle($slot);
        $configured = self::isOccupantFormat($slot) && !empty($slot['current_occupant']);
        $slot['drafts'][$module]        = null;
        $slot['module_status'][$module] = $configured ? 'settled' : 'not-configured';
        return $slot;
    }

    /**
     * The lifecycle layer for a fully-committed tier slot: no pending drafts, every
     * module settled. Applied after an atomic (direct-commit) occupant write so the
     * persisted slot carries the P2 schema. Preserves current_occupant / history.
     */
    public static function commitTierLifecycle(array $slot): array
    {
        $status = [];
        foreach (self::TIER_MODULES as $module) {
            $status[$module] = 'settled';
        }
        $slot['drafts']        = self::emptyTierLifecycle()['drafts'];
        $slot['module_status'] = $status;
        return $slot;
    }

    /**
     * Settle a tier slot (Phase 2 — P3): commit the draft-preferred state of every
     * module into current_occupant, then clear drafts and mark all modules settled.
     * Draft wins over the settled occupant per module; a module with no draft keeps
     * its settled value. `enabled` is preserved from the existing occupant — settle
     * never toggles a tier's live state. Settles whatever is present (completeness is
     * a resolver/notes concern, not a backend gate).
     */
    public static function settleTierSlot(array $slot): array
    {
        $slot   = self::ensureTierLifecycle($slot);
        $occ    = self::isOccupantFormat($slot) ? ($slot['current_occupant'] ?? null) : null;
        $drafts = $slot['drafts'];

        // Defence-in-depth (carried-forward guard): nothing to settle — no current
        // occupant and no pending drafts. Do not mint an empty occupant; return the
        // slot unchanged (a null draft means "no draft"; an empty array is a real one).
        $hasDraft = false;
        foreach (self::TIER_MODULES as $module) {
            if (($drafts[$module] ?? null) !== null) { $hasDraft = true; break; }
        }
        if ($occ === null && !$hasDraft) {
            return $slot;
        }

        $ov = is_array($drafts['overview'] ?? null) ? $drafts['overview'] : [];

        $tierData = [
            'label'               => $ov['label']         ?? ($occ['label']         ?? ''),
            'price'               => array_key_exists('price', $ov) ? $ov['price'] : ($occ['price'] ?? null),
            'contact'             => $ov['contact']        ?? ($occ['contact']        ?? false),
            'billing_cycle'       => $ov['billing_cycle']  ?? ($occ['billing_cycle']  ?? null),
            'inclusions_override' => is_array($drafts['features'] ?? null) ? $drafts['features'] : ($occ['inclusions_override'] ?? []),
            'features'            => $occ['features'] ?? [],
            'faq_refs'            => is_array($drafts['faqs'] ?? null) ? $drafts['faqs'] : ($occ['faq_refs'] ?? []),
        ];
        $enabled = ($occ['platform_status'] ?? 'active') === 'active';

        return self::commitTierLifecycle(self::upsertOccupant($slot, $tierData, $enabled));
    }
}
