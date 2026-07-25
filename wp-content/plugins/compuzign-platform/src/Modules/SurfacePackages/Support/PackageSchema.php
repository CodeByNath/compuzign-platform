<?php

/*
 * FILE INDEX
 *
 * PROMOTION_SCHEMA       Promotion identity, drafts, lifecycle, and sanitization
 * TIER_OCCUPANTS         Tier slot normalization, summaries, and Cost Builder projection
 * TIER_LIFECYCLE         Tier drafts, status derivation, and settling
 * OCCUPANT_BIN           Archive, restore, trash, and permanent deletion
 *
 * Search: SECTION: PROMOTION_SCHEMA
 *         SECTION: TIER_OCCUPANTS
 *         SECTION: TIER_LIFECYCLE
 *         SECTION: OCCUPANT_BIN
 */

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

/** Package-owned Promotion and Tier occupant/lifecycle rules. */
class PackageSchema
{
    // Station-level lifecycle: derived from tier occupants (deriveStationStatus),
    // never archived — occupants travel to the bin, the station shell does not.
    // 'archived' retired at E2 (confirmed unreachable).
    public const ALLOWED_PLATFORM_STATUSES   = ['active', 'disabled'];
    public const ALLOWED_TIERS               = ['basic', 'standard', 'premium', 'enterprise', 'ultimate'];
    public const ALLOWED_PROMOTION_STATUSES  = ['draft', 'active', 'archived'];
    public const ALLOWED_BASED_ON            = ['basic', 'standard', 'premium', 'enterprise', 'ultimate'];

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

    public static function sanitizeTierRateSheetSelections(mixed $items): array
    {
        if (!is_array($items)) { return []; }
        $out = [];
        $seen = [];
        foreach ($items as $item) {
            if (!is_array($item)) { continue; }
            $id = sanitize_text_field((string) ($item['item_id'] ?? ''));
            if ($id === '' || isset($seen[$id])) { continue; }
            $seen[$id] = true;
            $out[] = ['item_id' => $id, 'quantity' => max(1, (int) ($item['quantity'] ?? 1))];
        }
        return $out;
    }

    private static function sanitizePromotionDatetime(mixed $raw): ?string
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
    // ===================================================================
    // SECTION: PROMOTION_SCHEMA
    // ===================================================================
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
        // and sanitisation as Tier's tier-faqs module (ServiceController.php).
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

        $startsAt = self::sanitizePromotionDatetime($src['starts_at'] ?? null);
        $endsAt   = self::sanitizePromotionDatetime($src['ends_at'] ?? null);

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
    // ===================================================================
    // SECTION: TIER_OCCUPANTS
    // ===================================================================
    public static function isOccupantFormat(array $tier): bool
    {
        return array_key_exists('current_occupant', $tier);
    }

    /**
     * Normalise a raw tier slot (Phase 1 flat OR Phase 2 occupant) to the
     * SurfaceTierDetail shape expected by admin API responses.
     * Returns the flat detail used by the frontend form. Occupant envelopes
     * additionally expose their stable stored id as occupant_id; the shell key
     * remains the address used by lifecycle mutations.
     */
    public static function normaliseTierSlot(array $tier): array
    {
        if (self::isOccupantFormat($tier)) {
            $occ = $tier['current_occupant'] ?? null;
            if ($occ === null) {
                return self::emptyTierDetail();
            }
            return [
                'occupant_id'          => isset($occ['id']) ? (string) $occ['id'] : null,
                'label'               => $occ['label'] ?? '',
                'ideal_for'           => $occ['ideal_for'] ?? '',
                'price'               => isset($occ['price']) && $occ['price'] !== null ? (float) $occ['price'] : null,
                'contact'             => (bool) ($occ['contact'] ?? false),
                'billing_cycle'       => $occ['billing_cycle'] ?? null,
                'inclusions_override' => $occ['inclusions_override'] ?? [],
                'rate_sheet_id'       => self::defaultRateSheetId($occ['rate_sheet_id'] ?? null, $occ['rate_sheet_items'] ?? []),
                'rate_sheet_items'    => self::sanitizeTierRateSheetSelections($occ['rate_sheet_items'] ?? []),
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
            'occupant_id'          => null,
            'label'               => $tier['label'] ?? '',
            'ideal_for'           => $tier['ideal_for'] ?? '',
            'price'               => isset($tier['price']) && $tier['price'] !== null ? (float) $tier['price'] : null,
            'contact'             => (bool) ($tier['contact'] ?? false),
            'billing_cycle'       => $tier['billing_cycle'] ?? null,
            'inclusions_override' => $tier['inclusions_override'] ?? [],
            'rate_sheet_id'       => self::defaultRateSheetId($tier['rate_sheet_id'] ?? null, $tier['rate_sheet_items'] ?? []),
            'rate_sheet_items'    => self::sanitizeTierRateSheetSelections($tier['rate_sheet_items'] ?? []),
            'features'            => $tier['features'] ?? [],
            'faq_refs'            => $tier['faq_refs'] ?? [],
            'enabled'             => isset($tier['enabled']) ? (bool) $tier['enabled'] : true,
        ];
    }

    /**
     * Resolve an occupant's Rate Sheet identity. A stored id is preserved
     * verbatim; a legacy occupant that carries selections but no id defaults
     * to the migrated PRIMARY_RATE_SHEET_ID (Refinement 1 pairing). An occupant
     * with neither has no bound sheet.
     */
    private static function defaultRateSheetId(mixed $rateSheetId, mixed $selections): ?string
    {
        $id = is_string($rateSheetId) ? trim($rateSheetId) : '';
        if ($id !== '') {
            return $id;
        }
        return is_array($selections) && $selections !== []
            ? PackageManagerSchema::PRIMARY_RATE_SHEET_ID
            : null;
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
                'ideal_for'           => $occ['ideal_for'] ?? '',
                'price'               => $occ['price'] ?? null,
                'contact'             => $occ['contact'] ?? false,
                'billing_cycle'       => $occ['billing_cycle'] ?? null,
                'inclusions_override' => $occ['inclusions_override'] ?? [],
                'rate_sheet_id'       => self::defaultRateSheetId($occ['rate_sheet_id'] ?? null, $occ['rate_sheet_items'] ?? []),
                'rate_sheet_items'    => self::sanitizeTierRateSheetSelections($occ['rate_sheet_items'] ?? []),
                'features'            => $occ['features'] ?? [],
                'faq_refs'            => $occ['faq_refs'] ?? [],
                'enabled'             => ($occ['platform_status'] ?? 'active') === 'active',
            ];
        }

        // Phase 1 flat format — pass through; null for empty slots. Carry a
        // resolved rate_sheet_id so Cost Builder can scope pricing by sheet.
        if (empty($tier)) {
            return null;
        }
        $tier['rate_sheet_id'] = self::defaultRateSheetId($tier['rate_sheet_id'] ?? null, $tier['rate_sheet_items'] ?? []);
        return $tier;
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
        $existingRateSheetId = null;

        if (self::isOccupantFormat($tierSlot)) {
            $history    = $tierSlot['history'] ?? [];
            $existingId = $tierSlot['current_occupant']['id'] ?? null;
            $existingRateSheetId = self::normaliseRateSheetId($tierSlot['current_occupant']['rate_sheet_id'] ?? null);
        }

        // The Tier's bound sheet: an explicit incoming id wins; when omitted the
        // existing binding is kept.
        $rateSheetId = array_key_exists('rate_sheet_id', $data)
            ? self::normaliseRateSheetId($data['rate_sheet_id'])
            : $existingRateSheetId;

        // Refinement 4 — switching an already-bound occupant to a different sheet
        // drops its selections so A's rows never carry into B. First configuration
        // (no prior binding) keeps the incoming selections.
        $switched = $existingRateSheetId !== null && $rateSheetId !== $existingRateSheetId;
        $selections = $switched
            ? []
            : self::sanitizeTierRateSheetSelections($data['rate_sheet_items'] ?? []);

        return [
            'current_occupant' => [
                'id'                  => $existingId ?? ('occ_' . bin2hex(random_bytes(4))),
                'platform_status'     => $enabled ? 'active' : 'disabled',
                'label'               => $data['label'] ?? '',
                'ideal_for'           => $data['ideal_for'] ?? '',
                'price'               => $data['price'] ?? null,
                'contact'             => $data['contact'] ?? false,
                'billing_cycle'       => $data['billing_cycle'] ?? null,
                'rate_sheet_id'       => $rateSheetId,
                'inclusions_override' => $data['inclusions_override'] ?? [],
                'rate_sheet_items'    => $selections,
                'features'            => $data['features'] ?? [],
                'faq_refs'            => $data['faq_refs'] ?? [],
            ],
            'history' => $history,
        ];
    }

    /** Normalise a stored/inbound Rate Sheet id to a non-empty string or null. */
    private static function normaliseRateSheetId(mixed $rateSheetId): ?string
    {
        $id = is_string($rateSheetId) ? trim($rateSheetId) : '';
        return $id !== '' ? $id : null;
    }

    /**
     * Derive station-level platform_status from tier occupant states.
     * 'active' when at least one tier has a living active occupant; 'disabled' otherwise.
     * This is a Cost Builder visibility field, not Package Station lifecycle.
     */
    // ===================================================================
    // SECTION: TIER_LIFECYCLE
    // ===================================================================
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
            'occupant_id' => null, 'label' => '', 'ideal_for' => '', 'price' => null, 'contact' => false,
            'billing_cycle' => null, 'rate_sheet_id' => null, 'inclusions_override' => [], 'rate_sheet_items' => [],
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
        // Phase 1 flat tiers are settled occupants awaiting envelope migration,
        // not empty shells. Basic commonly remains in this shape longer because
        // it was populated first and has not travelled through an occupant write.
        $configured = self::isOccupantFormat($slot)
            ? !empty($slot['current_occupant'])
            : !empty(array_diff_key($slot, ['drafts' => true, 'module_status' => true]));
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

    // ── Occupant bin (engine D2) ───────────────────────────────────────────────
    // The shell never travels; the occupant does. Archived/trashed occupants move
    // into the station-level occupant_bin, remembering their origin shell so
    // restore can return them (or swap/retarget, D3). Bin entries carry the
    // occupant's pool refs untouched — content re-resolves at read time.

    /** Server-side id for a new bin entry (parity with generatePromotionTierId). */
    public static function generateBinId(): string
    {
        return 'bin_' . bin2hex(random_bytes(4));
    }

    /**
     * Guarantee a well-formed occupant_bin on a station: malformed entries are
     * dropped, statuses clamped to the engine's bin vocabulary. Idempotent, lazy
     * (parity with ensureTierLifecycle) — pre-D2 stations simply gain [].
     *
     * @param  array<string, mixed> $station
     * @return array<string, mixed>
     */
    // ===================================================================
    // SECTION: OCCUPANT_BIN
    // ===================================================================
    public static function ensureOccupantBin(array $station): array
    {
        $binStatuses = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::BIN_STATUSES;
        $raw = (isset($station['occupant_bin']) && is_array($station['occupant_bin'])) ? $station['occupant_bin'] : [];

        $out = [];
        foreach ($raw as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $binId    = (string) ($entry['bin_id'] ?? '');
            $occupant = $entry['occupant'] ?? null;
            if ($binId === '' || !is_array($occupant) || $occupant === []) {
                continue;
            }
            $status = $entry['status'] ?? '';
            if (!in_array($status, $binStatuses, true)) {
                $status = 'archived';
            }
            $origin = (string) ($entry['origin_tier'] ?? '');
            $out[] = [
                'bin_id'           => $binId,
                'origin_tier'      => in_array($origin, self::ALLOWED_TIERS, true) ? $origin : '',
                'occupant'         => $occupant,
                'status'           => $status,
                'previous_enabled' => (bool) ($entry['previous_enabled'] ?? false),
                'displaced_at'     => is_string($entry['displaced_at'] ?? null) ? $entry['displaced_at'] : null,
            ];
        }

        $station['occupant_bin'] = $out;
        return $station;
    }

    /**
     * Archive a shell's occupant (engine D2): the settled occupant moves into the
     * bin as an archived entry; the shell empties to not-configured (history
     * preserved — it belongs to the shell, not the occupant). Pending drafts
     * block the move unless $discardDrafts — archiving operates on settled state
     * only, never silently commits or destroys a draft. Pure; the controller owns
     * persistence and supplies bin_id / displaced_at.
     *
     * @param  array<string, mixed> $station
     * @return array{station: array<string, mixed>, entry: array<string, mixed>}|array{error: string}
     */
    public static function archiveTierOccupant(array $station, string $tierId, bool $discardDrafts, string $binId, ?string $displacedAt): array
    {
        if (!in_array($tierId, self::ALLOWED_TIERS, true)) {
            return ['error' => 'unknown_tier'];
        }

        $station = self::ensureOccupantBin($station);
        $slot    = self::ensureTierLifecycle($station['tiers'][$tierId] ?? []);

        $occupant = (self::isOccupantFormat($slot) && !empty($slot['current_occupant']))
            ? $slot['current_occupant']
            : null;
        if ($occupant === null) {
            return ['error' => 'no_occupant'];
        }

        $hasDraft = false;
        foreach (self::TIER_MODULES as $module) {
            if (($slot['drafts'][$module] ?? null) !== null) {
                $hasDraft = true;
                break;
            }
        }
        if ($hasDraft && !$discardDrafts) {
            return ['error' => 'pending_drafts'];
        }

        $entry = [
            'bin_id'           => $binId,
            'origin_tier'      => $tierId,
            'occupant'         => $occupant,
            'status'           => 'archived',
            'previous_enabled' => ($occupant['platform_status'] ?? 'active') === 'active',
            'displaced_at'     => $displacedAt,
        ];
        $station['occupant_bin'][] = $entry;

        // Empty the shell: no occupant, drafts cleared, every module not-configured.
        $slot['current_occupant'] = null;
        $slot['drafts']           = self::emptyTierLifecycle()['drafts'];
        foreach (self::TIER_MODULES as $module) {
            $slot['module_status'][$module] = 'not-configured';
        }
        $station['tiers'][$tierId]  = $slot;
        $station['platform_status'] = self::deriveStationStatus($station);

        return ['station' => $station, 'entry' => $entry];
    }

    /** Locate a bin entry by id inside an ensured occupant_bin. */
    private static function findBinIndex(array $bin, string $binId): ?int
    {
        foreach ($bin as $i => $entry) {
            if (($entry['bin_id'] ?? '') === $binId) {
                return $i;
            }
        }
        return null;
    }

    /**
     * Whether a shell currently holds settled content that a restore write would
     * clobber. Occupant format: a non-empty current_occupant. Phase 1 flat format:
     * any flat fields beyond the lifecycle layer (legacy data counts as occupied —
     * restore must never silently destroy it).
     */
    private static function shellOccupied(array $slot): bool
    {
        if (self::isOccupantFormat($slot)) {
            return !empty($slot['current_occupant']);
        }
        unset($slot['drafts'], $slot['module_status']);
        return !empty($slot);
    }

    /**
     * Restore a binned occupant into a shell (engine D3). Targeting rules:
     *   - no mode      → the origin shell, which must be empty; an occupied origin
     *                    demands an explicit mode (error target_occupied so the UI
     *                    can prompt swap|retarget).
     *   - mode swap    → the origin shell, which must be occupied; its current
     *                    content is displaced into the bin as a new archived entry
     *                    (bin_id/displaced_at supplied by the controller). The whole
     *                    exchange is composed in memory — the controller persists it
     *                    in ONE meta write, never two.
     *   - mode retarget→ an explicit empty target shell (origin irrelevant).
     *
     * The engine's restore landing state (disabled, never active) translates to
     * occupant platform_status: disabled. Modules land settled, drafts cleared
     * (commitTierLifecycle). Pending drafts on the target shell block the write
     * unless $discardDrafts — same never-destroy-authoring guard as archive (D2).
     * Pool refs travel untouched; labels re-refresh at read time (B2).
     *
     * @param  array<string, mixed> $station
     * @return array{station: array<string, mixed>, tier_id: string, entry: array<string, mixed>, displaced: array<string, mixed>|null}|array{error: string}
     */
    public static function restoreBinnedOccupant(array $station, string $binId, ?string $mode, ?string $targetTier, bool $discardDrafts, string $newBinId, ?string $displacedAt): array
    {
        $engine = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;

        if ($mode !== null && !in_array($mode, ['swap', 'retarget'], true)) {
            return ['error' => 'invalid_mode'];
        }

        $station = self::ensureOccupantBin($station);
        $index   = self::findBinIndex($station['occupant_bin'], $binId);
        if ($index === null) {
            return ['error' => 'unknown_bin_entry'];
        }
        $entry = $station['occupant_bin'][$index];

        if ($engine::restore($entry['status']) === null) {
            return ['error' => 'restore_illegal'];
        }

        if ($mode === 'retarget') {
            if (!in_array((string) $targetTier, self::ALLOWED_TIERS, true)) {
                return ['error' => 'unknown_tier'];
            }
            $tierId = $targetTier;
        } else {
            $tierId = $entry['origin_tier'];
            if ($tierId === '') {
                return ['error' => 'origin_unknown'];
            }
        }

        $slot     = self::ensureTierLifecycle($station['tiers'][$tierId] ?? []);
        $occupied = self::shellOccupied($slot);

        if ($mode !== 'swap' && $occupied) {
            return ['error' => 'target_occupied'];
        }
        if ($mode === 'swap' && !$occupied) {
            return ['error' => 'target_not_occupied'];
        }

        $hasDraft = false;
        foreach (self::TIER_MODULES as $module) {
            if (($slot['drafts'][$module] ?? null) !== null) { $hasDraft = true; break; }
        }
        if ($hasDraft && !$discardDrafts) {
            return ['error' => 'pending_drafts'];
        }

        array_splice($station['occupant_bin'], $index, 1);

        $displaced = null;
        if ($mode === 'swap') {
            // Canonicalise whatever the shell holds (occupant format keeps its id;
            // legacy flat content is minted into occupant form) and displace it.
            $detail    = self::normaliseTierSlot($slot);
            $canonical = self::upsertOccupant($slot, $detail, $detail['enabled']);
            $displaced = [
                'bin_id'           => $newBinId,
                'origin_tier'      => $tierId,
                'occupant'         => $canonical['current_occupant'],
                'status'           => 'archived',
                'previous_enabled' => $detail['enabled'],
                'displaced_at'     => $displacedAt,
            ];
            $station['occupant_bin'][] = $displaced;
            $slot = [
                'current_occupant' => null,
                'history'          => $canonical['history'],
                'drafts'           => $slot['drafts'],
                'module_status'    => $slot['module_status'],
            ];
        }

        $occupant                    = $entry['occupant'];
        $occupant['platform_status'] = 'disabled';

        $slot['current_occupant'] = $occupant;
        if (!isset($slot['history']) || !is_array($slot['history'])) {
            $slot['history'] = [];
        }
        $slot = self::commitTierLifecycle($slot);

        $station['tiers'][$tierId]  = $slot;
        $station['platform_status'] = self::deriveStationStatus($station);

        return ['station' => $station, 'tier_id' => $tierId, 'entry' => $entry, 'displaced' => $displaced];
    }

    /**
     * Trash a bin entry (engine D3): archived → trashed, legality via the engine.
     * Bin entries carry previous_enabled (a bool) instead of previous_status, so
     * the engine's previous_status output is deliberately unused — the restore
     * landing state is always disabled regardless.
     *
     * @param  array<string, mixed> $station
     * @return array{station: array<string, mixed>, entry: array<string, mixed>}|array{error: string}
     */
    public static function trashBinnedOccupant(array $station, string $binId): array
    {
        $engine  = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $station = self::ensureOccupantBin($station);
        $index   = self::findBinIndex($station['occupant_bin'], $binId);
        if ($index === null) {
            return ['error' => 'unknown_bin_entry'];
        }

        $change = $engine::trash($station['occupant_bin'][$index]['status']);
        if ($change === null) {
            return ['error' => 'trash_illegal'];
        }

        $station['occupant_bin'][$index]['status'] = $change['status'];
        return ['station' => $station, 'entry' => $station['occupant_bin'][$index]];
    }

    /**
     * Permanently delete a bin entry (engine D3) — the only operation that removes
     * an entry from occupant_bin. Legal only from trashed (engine-validated).
     *
     * @param  array<string, mixed> $station
     * @return array{station: array<string, mixed>, entry: array<string, mixed>}|array{error: string}
     */
    public static function deleteBinnedOccupant(array $station, string $binId): array
    {
        $engine  = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $station = self::ensureOccupantBin($station);
        $index   = self::findBinIndex($station['occupant_bin'], $binId);
        if ($index === null) {
            return ['error' => 'unknown_bin_entry'];
        }

        $entry = $station['occupant_bin'][$index];
        if (!$engine::canDelete($entry['status'])) {
            return ['error' => 'delete_illegal'];
        }

        array_splice($station['occupant_bin'], $index, 1);
        return ['station' => $station, 'entry' => $entry];
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
        $occ    = self::isOccupantFormat($slot)
            ? ($slot['current_occupant'] ?? null)
            : (!empty(array_diff_key($slot, ['drafts' => true, 'module_status' => true])) ? $slot : null);
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

        // The Tier's bound Rate Sheet: draft-preferred, occupant fallback.
        $occRateSheetId   = self::normaliseRateSheetId($occ['rate_sheet_id'] ?? null);
        $draftRateSheetId = array_key_exists('rate_sheet_id', $ov)
            ? self::normaliseRateSheetId($ov['rate_sheet_id'])
            : $occRateSheetId;
        // Refinement 4 — switching an already-bound occupant to a different sheet
        // clears its selections; picking new rows is a separate settle against the
        // re-bound occupant. Non-switch settles keep the draft-preferred selections.
        $switchingSheet = $occRateSheetId !== null && $draftRateSheetId !== $occRateSheetId;
        $selections = $switchingSheet
            ? []
            : (is_array($drafts['features'] ?? null)
                ? self::sanitizeTierRateSheetSelections($drafts['features'])
                : self::sanitizeTierRateSheetSelections($occ['rate_sheet_items'] ?? []));

        $tierData = [
            'label'               => $ov['label']         ?? ($occ['label']         ?? ''),
            'ideal_for'           => $ov['ideal_for']     ?? ($occ['ideal_for']     ?? ''),
            'price'               => null,
            'contact'             => $ov['contact']        ?? ($occ['contact']        ?? false),
            'billing_cycle'       => $ov['billing_cycle']  ?? ($occ['billing_cycle']  ?? null),
            'rate_sheet_id'       => $draftRateSheetId,
            'inclusions_override' => [],
            'rate_sheet_items'    => $selections,
            'features'            => $occ['features'] ?? [],
            'faq_refs'            => is_array($drafts['faqs'] ?? null) ? $drafts['faqs'] : ($occ['faq_refs'] ?? []),
        ];
        $enabled = self::isOccupantFormat($slot)
            ? (($occ['platform_status'] ?? 'active') === 'active')
            : (($occ['enabled'] ?? true) !== false);

        return self::commitTierLifecycle(self::upsertOccupant($slot, $tierData, $enabled));
    }
}
