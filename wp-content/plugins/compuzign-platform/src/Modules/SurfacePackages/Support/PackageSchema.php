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
    public const TIER_AUDIENCE_GROUPS        = ['personal_business', 'enterprise'];
    // An occupant's customer-group membership. An add-on belongs to its Tier
    // Group, not one customer audience, so a never-configured occupant
    // defaults to every group rather than a single value. An administrator
    // may still narrow it, including to none — that explicit choice is
    // preserved, not coerced back to "all".
    public const DEFAULT_TIER_AUDIENCE_GROUPS = ['personal_business', 'enterprise'];

    // Phase 2 tier lifecycle (P2 — store schema): the per-tier-module draft + status
    // layer stored inside each cz_service_package_station tier slot, alongside
    // current_occupant. Additive and inert in P2 — nothing reads these until P3.
    public const TIER_MODULES                = ['overview', 'features', 'faqs', 'commercial_schedule'];
    public const ALLOWED_MODULE_STATUSES     = ['not-configured', 'pending', 'settled'];

    // Commercial-leg model (Phase 0 — schema only, see docs/code-map/tier-edition.md):
    // the cadence vocabulary a Tier/Edition's own `active_billing_cycles` may draw
    // from. The legacy scalar `billing_cycle` (Simple Mode) predates this constant
    // and is intentionally left unvalidated against it — see sanitizeCommercialLegs().
    public const BILLING_CYCLES              = ['monthly', 'annually', 'one-time'];

    // Tier Pricing Rules — Commercial Legs are the sole pricing-schedule
    // mechanism (Simple Mode retired, see docs/code-map/tier-pricing-rules-plan.md).
    // A leg's own Payment Category and Billing Cycle vocabularies, validated
    // directly by sanitizeCommercialLegs() — independent of BILLING_CYCLES/
    // active_billing_cycles above, which stay reserved for the legacy scalar's
    // stored values and read/back-compat only.
    public const PAYMENT_CATEGORIES            = ['one-time', 'recurring'];
    public const COMMERCIAL_LEG_BILLING_CYCLES = ['upfront', 'monthly', 'yearly'];

    // Lifecycle engine C1 — promotion instance envelope. Same module trio as tiers;
    // envelope statuses come from the engine (StationLifecycle::STATUSES), NOT from
    // ALLOWED_PROMOTION_STATUSES: the legacy top-level status field stays the
    // authoritative, client-facing value (and keeps its narrower vocabulary) until
    // the transition endpoints (C3) own all status writes.
    public const PROMOTION_MODULES           = ['overview', 'features', 'faqs'];

    /**
     * @param array $legs the selection's own Tier/Edition's sanitized commercial_legs
     *              (sanitizeCommercialLegs() output), used only to resolve
     *              leg_assignments — never trusted from $items itself. Simple
     *              Mode (every pre-existing call site, and any Multi-Cycle
     *              occupant/Edition with no legs configured) omits the
     *              `leg_assignments` key from every row entirely rather than
     *              setting it to [] — the exact pre-existing
     *              { item_id, quantity, price_option_id } shape, asserted
     *              verbatim by rate-sheet-bundle.php and others, is preserved
     *              byte-for-byte for every record that has not opted into a
     *              commercial schedule.
     */
    public static function sanitizeTierRateSheetSelections(mixed $items, array $legs = []): array
    {
        if (!is_array($items)) { return []; }
        $legsById = [];
        foreach ($legs as $leg) {
            if (is_array($leg) && isset($leg['id'])) {
                $legsById[(string) $leg['id']] = $leg;
            }
        }
        $out = [];
        $seen = [];
        foreach ($items as $item) {
            if (!is_array($item)) { continue; }
            $id = sanitize_text_field((string) ($item['item_id'] ?? ''));
            if ($id === '' || isset($seen[$id])) { continue; }
            $seen[$id] = true;
            $rawOptionId = $item['price_option_id'] ?? null;
            $optionId = ($rawOptionId === null || $rawOptionId === '') ? null : sanitize_text_field((string) $rawOptionId);
            $row = [
                'item_id'         => $id,
                'quantity'        => max(1, (int) ($item['quantity'] ?? 1)),
                'price_option_id' => $optionId,
            ];
            if ($legsById !== []) {
                $row['leg_assignments'] = self::sanitizeLegAssignments($item['leg_assignments'] ?? [], $legsById);
            }
            $out[] = $row;
        }
        return $out;
    }

    /**
     * Sanitise one selection's per-leg Price Option choices. A leg_id must
     * resolve against the Tier/Edition's OWN commercial_legs (never trusted
     * from input) — the same not-fabricated posture sanitizeCommercialLegs()
     * uses for the legs themselves. Two assignments naming the same billing
     * cycle with an overlapping month range are a double-charge shape for
     * this one inclusion — the later one is dropped. Different cycles
     * overlapping is a normal shape (e.g. a one-time setup fee alongside a
     * monthly service spanning the same months) and is never rejected.
     */
    private static function sanitizeLegAssignments(mixed $assignments, array $legsById): array
    {
        if (!is_array($assignments) || $legsById === []) {
            return [];
        }
        $out = [];
        $seenLegIds = [];
        $acceptedRangesByCycle = [];
        foreach ($assignments as $assignment) {
            if (!is_array($assignment)) { continue; }
            $legId = sanitize_text_field((string) ($assignment['leg_id'] ?? ''));
            $leg = $legsById[$legId] ?? null;
            if ($legId === '' || isset($seenLegIds[$legId]) || $leg === null) {
                continue;
            }
            $cycle = (string) $leg['billing_cycle'];
            $start = (int) $leg['start_month'];
            // Indefinite (null end_month, no commitment bounding this leg) —
            // treat as unbounded for overlap purposes, never coerce null to 0
            // (which would make an Indefinite leg look like it ends before it
            // starts and corrupt every range comparison below).
            $end   = $leg['end_month'] === null ? PHP_INT_MAX : (int) $leg['end_month'];
            $overlaps = false;
            foreach ($acceptedRangesByCycle[$cycle] ?? [] as $range) {
                if ($start <= $range[1] && $range[0] <= $end) { $overlaps = true; break; }
            }
            if ($overlaps) {
                continue;
            }
            $seenLegIds[$legId] = true;
            $acceptedRangesByCycle[$cycle][] = [$start, $end];
            $rawOptionId = $assignment['price_option_id'] ?? null;
            $out[] = [
                'leg_id'          => $legId,
                'price_option_id' => ($rawOptionId === null || $rawOptionId === '') ? null : sanitize_text_field((string) $rawOptionId),
                // Per-leg quantity — same max(1, …) rule as the selection's own
                // top-level quantity. Lets one inclusion carry a different
                // quantity per leg (e.g. 2 seats upfront, 5 once recurring
                // starts) rather than one quantity forced across every leg.
                'quantity'        => max(1, (int) ($assignment['quantity'] ?? 1)),
            ];
        }
        return $out;
    }

    /**
     * Server-side id for a new commercial leg (parity with mintTierEditionId()).
     * sanitizeCommercialLegs() is a read/round-trip sanitiser like
     * sanitizeTierEdition() — it mints nothing; a leg with no id is
     * unrecoverable and dropped rather than fabricated, so callers that create
     * a new leg must mint its id here first.
     */
    public static function mintCommercialLegId(): string
    {
        return 'leg_' . bin2hex(random_bytes(4));
    }

    /**
     * Normalise a commitment declaration (minimum_term_value/unit) to a month
     * count for commercial-leg bounds-checking. Purely an internal conversion
     * for validation — never itself a stored field. Public so the Phase 5
     * batch migration tool (tools/migrate-commercial-legs.php) can derive
     * the exact same commitment bound PackageSchema's own settle/read paths
     * use, rather than re-deriving the value/unit -> months conversion.
     */
    public static function commitmentMonths(?float $value, ?string $unit): ?float
    {
        if ($value === null || $value <= 0) {
            return null;
        }
        return $unit === 'year' ? $value * 12 : $value;
    }

    /**
     * Sanitise the set of billing cadences a Tier/Edition's own commercial
     * legs may draw from. Distinct from the legacy scalar `billing_cycle`
     * (Simple Mode's own authoritative cycle) — see
     * docs/code-map/tier-edition.md.
     */
    public static function sanitizeActiveBillingCycles(mixed $cycles): array
    {
        if (!is_array($cycles)) {
            return [];
        }
        $out = [];
        foreach ($cycles as $cycle) {
            $cycle = is_string($cycle) ? trim($cycle) : '';
            if ($cycle !== '' && in_array($cycle, self::BILLING_CYCLES, true) && !in_array($cycle, $out, true)) {
                $out[] = $cycle;
            }
        }
        return $out;
    }

    /**
     * Sanitise a Tier/Edition's own commercial legs — each a scheduled
     * application of one Payment Category + Commercial Leg Billing Cycle
     * across an inclusive month range. A leg naming a cycle/category outside
     * COMMERCIAL_LEG_BILLING_CYCLES/PAYMENT_CATEGORIES, or an out-of-order/
     * zero start, is dropped rather than clamped or fabricated — the same
     * defensive posture sanitizeTierEditions() already uses for malformed
     * child rows. Commitment and Legs are independent concerns (Tier Pricing
     * Rules): $commitmentMonths is null whenever there is no commitment (the
     * caller already resolves this — see draftPreferredCommitmentMonths() —
     * including forcing null when commitment_enabled is false regardless of
     * any stored minimum_term_value), in which case `end_month` may be
     * omitted entirely (Indefinite, no upper bound). A non-null
     * $commitmentMonths bounds `end_month`: omitted end is invalid (a leg
     * under a real commitment must state where it ends) and an end beyond
     * the commitment is dropped. Re-run on every read/write, so shortening
     * the commitment after legs already exist silently drops whatever no
     * longer fits, with no separate cascade step required. Mints no id — see
     * mintCommercialLegId().
     */
    public static function sanitizeCommercialLegs(mixed $legs, ?float $commitmentMonths): array
    {
        if (!is_array($legs)) {
            return [];
        }
        $out = [];
        $seen = [];
        foreach ($legs as $leg) {
            if (!is_array($leg)) {
                continue;
            }
            $id = sanitize_text_field((string) ($leg['id'] ?? ''));
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $cycle = is_string($leg['billing_cycle'] ?? null) ? trim($leg['billing_cycle']) : '';
            if ($cycle === '' || !in_array($cycle, self::COMMERCIAL_LEG_BILLING_CYCLES, true)) {
                continue;
            }
            $category = is_string($leg['payment_category'] ?? null) ? trim($leg['payment_category']) : '';
            if ($category === '' || !in_array($category, self::PAYMENT_CATEGORIES, true)) {
                continue;
            }
            $start = (int) ($leg['start_month'] ?? 0);
            if ($start < 1) {
                continue;
            }
            $rawEnd = $leg['end_month'] ?? null;
            $end = ($rawEnd === null || $rawEnd === '') ? null : (int) $rawEnd;
            if ($commitmentMonths === null) {
                // No commitment — Indefinite (null end) is valid; a stated
                // end must still be a real, in-order range.
                if ($end !== null && ($end < $start || $end > 1200)) {
                    continue;
                }
            } else {
                // A real commitment bounds every leg — Indefinite is not a
                // valid shape under it, matching "leg durations may be
                // bounded by that commitment."
                if ($end === null || $end < $start || $end > $commitmentMonths) {
                    continue;
                }
            }
            $seen[$id] = true;
            $out[] = [
                'id'               => $id,
                'payment_category' => $category,
                'billing_cycle'    => $cycle,
                'start_month'      => $start,
                'end_month'        => $end,
            ];
        }
        return $out;
    }

    // A fixed, non-random id — never mintCommercialLegId() — so repeated
    // synthesis (e.g. on every read, before this is ever actually settled)
    // produces the SAME leg every time rather than a new one per call. Safe
    // from collision with a real minted id (always `leg_` + 8 hex chars):
    // this is deliberately longer and human-readable.
    private const LEGACY_SYNTHESIZED_LEG_ID = 'leg_legacy_default';

    /**
     * Bridge a legacy zero-leg record into the mandatory-leg model by
     * deriving its first Commercial Leg from EXISTING billing_cycle +
     * commitment state, backfilling leg_assignments onto its existing Rate
     * Sheet selections so pricing resolves through the same leg-assignment
     * path a multi-leg record already uses (preserving the same resolved
     * total — see PackageManagerSchema::projectCommercialLegs()).
     *
     * Fires ONLY when $billingCycle is a real, usable cadence. A record with
     * Rate Sheet selections but no billing_cycle is deliberately left alone
     * (returned unchanged, same as a genuinely fresh record) — Rate Sheet
     * rows carry price/quantity, never Payment Category/Billing Cycle, and
     * are never used to fabricate commercial meaning that was never stored.
     * See docs/code-map/tier-pricing-rules-plan.md.
     *
     * Called from the read path (normaliseTierSlot()) and the settle path
     * (settleTierSlot(), sanitizeTierEdition()) alike — never itself required
     * to run (PackageSchema stays permissive; a record this can't derive a
     * leg for simply keeps commercial_legs: [], exactly as it does today).
     * Reused verbatim by the Phase 5 batch migration tool so a record
     * migrated in bulk resolves to the exact same leg/backfill a settle
     * would have produced for it.
     *
     * @return array{commercial_legs: array, rate_sheet_items: array}
     */
    public static function synthesizeFirstCommercialLeg(?string $billingCycle, ?float $commitmentMonths, array $rateSheetItems): array
    {
        $unchanged = ['commercial_legs' => [], 'rate_sheet_items' => $rateSheetItems];
        if (!is_string($billingCycle) || $billingCycle === '') {
            return $unchanged;
        }
        if ($billingCycle === 'one-time') {
            $category = 'one-time';
            $cycle    = 'upfront';
        } elseif ($billingCycle === 'monthly') {
            $category = 'recurring';
            $cycle    = 'monthly';
        } elseif ($billingCycle === 'annually') {
            $category = 'recurring';
            $cycle    = 'yearly';
        } else {
            // An unrecognised legacy billing_cycle value carries no usable
            // cadence to derive from — same as no billing_cycle at all.
            return $unchanged;
        }
        $leg = [
            'id'               => self::LEGACY_SYNTHESIZED_LEG_ID,
            'payment_category' => $category,
            'billing_cycle'    => $cycle,
            'start_month'      => 1,
            'end_month'        => $commitmentMonths !== null ? (int) $commitmentMonths : null,
        ];
        $backfilled = array_map(function ($item) {
            if (!is_array($item)) {
                return $item;
            }
            // An item that already carries a real assignment predates this
            // synthesis or was already migrated — never overwritten.
            if (empty($item['leg_assignments'])) {
                $item['leg_assignments'] = [[
                    'leg_id'          => self::LEGACY_SYNTHESIZED_LEG_ID,
                    'price_option_id' => $item['price_option_id'] ?? null,
                    'quantity'        => $item['quantity'] ?? 1,
                ]];
            }
            return $item;
        }, $rateSheetItems);
        return ['commercial_legs' => [$leg], 'rate_sheet_items' => $backfilled];
    }

    /**
     * Sanitize the multi-select audience_groups. An explicitly-empty array is
     * a valid, preserved administrator choice — callers apply the "missing
     * key defaults to all groups" fallback themselves via
     * `?? DEFAULT_TIER_AUDIENCE_GROUPS` before this only filters/dedupes
     * whatever array was actually given.
     */
    public static function sanitizeTierAudienceGroups(mixed $groups): array
    {
        if (!is_array($groups)) {
            return self::DEFAULT_TIER_AUDIENCE_GROUPS;
        }
        $out = [];
        foreach ($groups as $group) {
            $group = is_string($group) ? trim($group) : '';
            if ($group !== '' && in_array($group, self::TIER_AUDIENCE_GROUPS, true) && !in_array($group, $out, true)) {
                $out[] = $group;
            }
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
     * Whether a slot's own raw content is genuinely configured, apart from
     * the drafts/module_status bookkeeping keys ensureTierLifecycle() always
     * adds (which would otherwise make every slot — including a truly empty
     * one — look non-empty). Occupant envelopes are configured only when they
     * hold a real current_occupant; Phase 1 flat legacy slots are configured
     * when they carry any field beyond that bookkeeping layer.
     */
    private static function hasConfiguredContent(array $slot): bool
    {
        return self::isOccupantFormat($slot)
            ? !empty($slot['current_occupant'])
            : !empty(array_diff_key($slot, ['drafts' => true, 'module_status' => true]));
    }

    /**
     * The domain predicate for "does this slot count as an active occupant":
     * a fixed slot's existence in the schema is capacity only, and the parent
     * Tier System's own status is never consulted here — only a genuinely
     * assigned, configured occupant whose own platform_status is 'active'
     * counts. Occupant format requires a real current_occupant explicitly
     * marked active (a missing/malformed platform_status never defaults to
     * active — fail closed). Phase 1 flat legacy slots count only when they
     * carry real configured content and are not explicitly disabled.
     */
    public static function isActiveOccupant(array $slot): bool
    {
        if (self::isOccupantFormat($slot)) {
            $occ = $slot['current_occupant'] ?? null;
            return is_array($occ) && ($occ['platform_status'] ?? null) === 'active';
        }
        return self::hasConfiguredContent($slot) && (($slot['enabled'] ?? true) !== false);
    }

    /**
     * The canonical fact behind the Disabled pill: whether an administrator
     * explicitly disabled this occupant. Not history — a plain boolean, never
     * previous_platform_status/disable_mask. array_key_exists detects legacy
     * occupants stored before this marker existed: a markerless Active
     * occupant is not explicitly disabled (it remains Active); a markerless
     * Disabled occupant is read conservatively as explicitly disabled so its
     * presentation never silently changes. A missing occupant is never
     * explicitly disabled.
     */
    public static function isExplicitlyDisabled(?array $occupant): bool
    {
        if ($occupant === null) {
            return false;
        }
        if (array_key_exists('is_explicitly_disabled', $occupant)) {
            return (bool) $occupant['is_explicitly_disabled'];
        }
        return ($occupant['platform_status'] ?? 'active') === 'disabled';
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
            $editions = self::sanitizeTierEditions($occ['tier_editions'] ?? []);
            $editionBin = self::ensureTierEditionBin($occ)['tier_edition_bin'];
            $activeBillingCycles = self::sanitizeActiveBillingCycles($occ['active_billing_cycles'] ?? []);
            $commitmentEnabled = (bool) ($occ['commitment_enabled'] ?? false);
            $commitmentMonths = $commitmentEnabled ? self::commitmentMonths(
                isset($occ['minimum_term_value']) && $occ['minimum_term_value'] !== null ? (float) $occ['minimum_term_value'] : null,
                $occ['minimum_term_unit'] ?? null
            ) : null;
            $commercialLegs = self::sanitizeCommercialLegs($occ['commercial_legs'] ?? [], $commitmentMonths);
            // Bridge a legacy zero-leg record into the mandatory-leg model —
            // read-time only here (never persisted by a plain GET); the same
            // derivation also runs at settle time below, which is what
            // actually persists it. See synthesizeFirstCommercialLeg().
            $rateSheetItemsSource = is_array($occ['rate_sheet_items'] ?? null) ? $occ['rate_sheet_items'] : [];
            if ($commercialLegs === []) {
                $synthesized = self::synthesizeFirstCommercialLeg($occ['billing_cycle'] ?? null, $commitmentMonths, $rateSheetItemsSource);
                $commercialLegs = $synthesized['commercial_legs'];
                $rateSheetItemsSource = $synthesized['rate_sheet_items'];
            }
            return [
                'occupant_id'          => isset($occ['id']) ? (string) $occ['id'] : null,
                'platform_id'          => (string) ($occ['cz_platform_id'] ?? ''),
                'addon_platform_id'    => (string) ($occ['addon_platform_id'] ?? ''),
                'label'               => $occ['label'] ?? '',
                'ideal_for'           => $occ['ideal_for'] ?? '',
                'audience_groups'     => self::sanitizeTierAudienceGroups($occ['audience_groups'] ?? self::DEFAULT_TIER_AUDIENCE_GROUPS),
                'price'               => isset($occ['price']) && $occ['price'] !== null ? (float) $occ['price'] : null,
                'contact'             => (bool) ($occ['contact'] ?? false),
                'billing_cycle'       => $occ['billing_cycle'] ?? null,
                // Same permanent-Default concern as price/contact/billing_cycle
                // above — the occupant's own commitment, independent of any
                // Edition's own minimum_term_value/unit. See docs/code-map/tier-edition.md.
                'minimum_term_value'  => isset($occ['minimum_term_value']) && $occ['minimum_term_value'] !== null ? (float) $occ['minimum_term_value'] : null,
                'minimum_term_unit'   => $occ['minimum_term_unit'] ?? null,
                // Independent of commercial_legs below — gates only Commitment
                // Unit/Minimum Commitment (Tier Pricing Rules). Commercial Legs
                // are never nested under, disabled by, or cleared because this
                // is false. See docs/code-map/tier-pricing-rules-plan.md.
                'commitment_enabled'  => $commitmentEnabled,
                // Multi-cycle commercial schedule (Phase 0 — schema only). Empty
                // for every occupant that has never used this capability: Simple
                // Mode's own billing_cycle/price_option_id above stay fully
                // authoritative and untouched — see docs/code-map/tier-edition.md.
                'active_billing_cycles' => $activeBillingCycles,
                'commercial_legs'       => $commercialLegs,
                'inclusions_override' => $occ['inclusions_override'] ?? [],
                'rate_sheet_id'       => self::defaultRateSheetId($occ['rate_sheet_id'] ?? null, $occ['rate_sheet_items'] ?? []),
                'rate_sheet_items'    => self::sanitizeTierRateSheetSelections($rateSheetItemsSource, $commercialLegs),
                'features'            => $occ['features'] ?? [],
                'faq_refs'            => $occ['faq_refs'] ?? [],
                'enabled'             => ($occ['platform_status'] ?? 'active') === 'active',
                // Occupant-level selection mode: whether this Tier is offered as an
                // exclusive normal choice (false) or as a stackable add-on alongside
                // the customer's chosen normal Tier (true). Orthogonal to
                // platform_status/module_status — never inferred from either.
                'is_addon'            => (bool) ($occ['is_addon'] ?? false),
                // Canonical Disabled fact — see isExplicitlyDisabled(). Never the
                // raw unmasked platform_status: 'disabled' value, which a merely
                // unpublished (Pending) occupant also carries.
                'is_explicitly_disabled' => self::isExplicitlyDisabled($occ),
                // Tier Edition — independently addressed, independently
                // lifecycled child records; absent/empty for every occupant
                // that has never used this capability. See SECTION: TIER_EDITION.
                'tier_editions'       => $editions,
                // Occupant-owned physical bin (Phase 6) — Editions physically
                // relocated out of tier_editions[] by an explicit "move to
                // bin" action. Absent/empty for every occupant that has
                // never used this capability. See SECTION: TIER_EDITION_BIN.
                'tier_edition_bin'    => $editionBin,
            ];
        }

        // Phase 1 flat format.
        if (empty($tier)) {
            return self::emptyTierDetail();
        }
        return [
            'occupant_id'          => null,
            'platform_id'          => (string) ($tier['cz_platform_id'] ?? ''),
            'addon_platform_id'    => (string) ($tier['addon_platform_id'] ?? ''),
            'label'               => $tier['label'] ?? '',
            'ideal_for'           => $tier['ideal_for'] ?? '',
            'audience_groups'     => self::sanitizeTierAudienceGroups($tier['audience_groups'] ?? self::DEFAULT_TIER_AUDIENCE_GROUPS),
            'price'               => isset($tier['price']) && $tier['price'] !== null ? (float) $tier['price'] : null,
            'contact'             => (bool) ($tier['contact'] ?? false),
            'billing_cycle'       => $tier['billing_cycle'] ?? null,
            // Phase 1 flat slots predate this capability entirely — nothing to
            // carry forward at this layer.
            'minimum_term_value'  => null,
            'minimum_term_unit'   => null,
            'commitment_enabled'  => false,
            // Phase 1 flat slots predate commercial legs entirely, same as
            // minimum_term above — nothing to carry forward at this layer.
            'active_billing_cycles' => [],
            'commercial_legs'       => [],
            'inclusions_override' => $tier['inclusions_override'] ?? [],
            'rate_sheet_id'       => self::defaultRateSheetId($tier['rate_sheet_id'] ?? null, $tier['rate_sheet_items'] ?? []),
            'rate_sheet_items'    => self::sanitizeTierRateSheetSelections($tier['rate_sheet_items'] ?? []),
            'features'            => $tier['features'] ?? [],
            'faq_refs'            => $tier['faq_refs'] ?? [],
            'enabled'             => isset($tier['enabled']) ? (bool) $tier['enabled'] : true,
            // Legacy Phase 1 slots predate this field; default to a normal Tier.
            'is_addon'            => (bool) ($tier['is_addon'] ?? false),
            // Phase 1 flat slots predate the occupant marker entirely — no explicit
            // Disable concept exists at this layer.
            'is_explicitly_disabled' => false,
            // Phase 1 flat slots predate Editions entirely; there is nothing
            // to sanitise or preserve at this layer.
            'tier_editions'       => [],
            'tier_edition_bin'    => [],
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
            'is_addon'        => $detail['is_addon'],
            'is_explicitly_disabled' => $detail['is_explicitly_disabled'],
        ];
    }

    // ── Default declaration / Edition options for the public projection ──────
    // The occupant's own commercial fields ARE the Default declaration,
    // permanently — they are never displaced by an Edition's terms. An
    // Edition never blends into extractTierForCostBuilder()'s primary
    // fields; it is exposed only as one more entry in edition_options(),
    // the same in-card switch choice every other Edition is. The occupant
    // remains the one public Tier; an Edition never becomes a second
    // selectable card, and switching among edition_options never changes
    // which Tier/card is selected.

    /**
     * Public-safe Edition list for the Cost Builder's in-card switch.
     * ACTIVE Editions only — a Pending, Disabled, Archived, or Trashed
     * Edition is never offered to a customer, the exact same
     * enabled/configured discipline overlayPackage() already applies to the
     * occupant itself. Carries no edition_platform_id (CZTE stays an
     * admin/audit/connection identity, never a public or cart-facing one —
     * the agreed boundary) and no admin-only fields (admin_description,
     * rate_sheet_items, module_status/drafts). `id` here is an opaque
     * selector key only, the same role TierId ('basic'|'standard'|…)
     * already plays publicly — not a claim on the Platform Identifier
     * vocabulary. Every entry here is an ALTERNATE to the occupant's own
     * Default declaration — never itself "the" default; the frontend
     * switch always starts on the occupant's own resolved values.
     *
     * @return array<int, array<string, mixed>>
     */
    private static function publicTierEditionOptions(array $occ): array
    {
        $editions = is_array($occ['tier_editions'] ?? null) ? $occ['tier_editions'] : [];
        if ($editions === []) {
            return [];
        }
        $engine = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;

        $out = [];
        foreach ($editions as $edition) {
            if (!is_array($edition) || ($edition['platform_status'] ?? null) !== $engine::STATUS_ACTIVE) {
                continue;
            }
            $out[] = [
                'id'                  => (string) ($edition['id'] ?? ''),
                'label'               => $edition['title'] ?? '',
                'price'               => $edition['price'] ?? null,
                'contact'             => (bool) ($edition['contact'] ?? false),
                'billing_cycle'       => $edition['billing_cycle'] ?? null,
                'minimum_term_value'  => $edition['minimum_term_value'] ?? null,
                'minimum_term_unit'   => $edition['minimum_term_unit'] ?? null,
                // Same inherit-when-empty rule the occupant itself uses
                // against Service-level canonical data.
                'inclusions_override' => !empty($edition['inclusions_override'])
                    ? $edition['inclusions_override']
                    : ($occ['inclusions_override'] ?? []),
                // An Edition's own multi-cycle schedule, independent of the
                // occupant's (never inherited — same rule as price/
                // billing_cycle/commitment above; see
                // sanitizeTierEdition()). Raw here: PackageRepository's own
                // projection re-prices each leg through projectCommercialLegs()
                // the same way it re-prices `price` above, since this
                // extraction has no Rate Sheet read model to resolve against.
                'active_billing_cycles' => is_array($edition['active_billing_cycles'] ?? null)
                    ? array_values($edition['active_billing_cycles'])
                    : [],
                'commercial_legs'     => is_array($edition['commercial_legs'] ?? null)
                    ? $edition['commercial_legs']
                    : [],
            ];
        }
        return $out;
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
                'audience_groups'     => self::sanitizeTierAudienceGroups($occ['audience_groups'] ?? self::DEFAULT_TIER_AUDIENCE_GROUPS),
                'price'               => isset($occ['price']) && $occ['price'] !== null ? (float) $occ['price'] : null,
                'contact'             => (bool) ($occ['contact'] ?? false),
                'billing_cycle'       => $occ['billing_cycle'] ?? null,
                'inclusions_override' => is_array($occ['inclusions_override'] ?? null) ? $occ['inclusions_override'] : [],
                'rate_sheet_id'       => self::defaultRateSheetId($occ['rate_sheet_id'] ?? null, $occ['rate_sheet_items'] ?? []),
                // The occupant's own legs, passed through so a row's own
                // leg_assignments survive this extraction — otherwise every
                // commercial leg below would resolve against a selection
                // list with no leg_assignments at all, exactly like
                // upsertOccupant()'s own save-path call already does.
                'rate_sheet_items'    => self::sanitizeTierRateSheetSelections(
                    $occ['rate_sheet_items'] ?? [],
                    is_array($occ['commercial_legs'] ?? null) ? $occ['commercial_legs'] : []
                ),
                'features'            => $occ['features'] ?? [],
                'faq_refs'            => is_array($occ['faq_refs'] ?? null) ? $occ['faq_refs'] : [],
                'enabled'             => ($occ['platform_status'] ?? 'active') === 'active',
                'is_addon'            => (bool) ($occ['is_addon'] ?? false),
                // Additive only. Absent/empty for every occupant that has
                // never used Editions; the switch renders nothing beyond
                // the occupant's own Default when there is no genuine
                // alternate choice.
                'edition_options'     => self::publicTierEditionOptions($occ),
                // The occupant's own permanent Default commitment — same
                // field, same public-projection treatment as price/
                // billing_cycle/contact above. Null for every occupant that
                // has never configured one, exactly like before this field
                // existed. An Edition's own minimum_term_value/unit remains
                // scoped to its own edition_options[] entry and never blends
                // in here — same rule already applied to price/billing_cycle.
                'minimum_term_value'  => $occ['minimum_term_value'] ?? null,
                'minimum_term_unit'   => $occ['minimum_term_unit'] ?? null,
                // The occupant's own multi-cycle schedule (Phase 3 — public
                // projection). Raw here, same reason as edition_options'
                // commercial_legs above: PackageRepository::
                // projectTierInstanceForCostBuilder() re-prices each leg
                // through PackageManagerSchema::projectCommercialLegs() once
                // it has the Rate Sheet read model this extraction does not.
                // Empty for every occupant that has never used this
                // capability — Simple Mode is unaffected.
                'active_billing_cycles' => is_array($occ['active_billing_cycles'] ?? null)
                    ? array_values($occ['active_billing_cycles'])
                    : [],
                'commercial_legs'     => is_array($occ['commercial_legs'] ?? null)
                    ? $occ['commercial_legs']
                    : [],
            ];
        }

        // Phase 1 flat format — pass through; null for empty slots. Carry a
        // resolved rate_sheet_id so Cost Builder can scope pricing by sheet.
        if (empty($tier)) {
            return null;
        }
        $tier['rate_sheet_id'] = self::defaultRateSheetId($tier['rate_sheet_id'] ?? null, $tier['rate_sheet_items'] ?? []);
        $tier['is_addon']      = (bool) ($tier['is_addon'] ?? false);
        return $tier;
    }

    /**
     * Create a new occupant or update the existing one inside a tier shell.
     * Preserves occupant id across edits; generates a new id for first configuration.
     * Does NOT write to history (history is reserved for future restore/swap).
     *
     * @param  array $tierSlot  Current tier slot (may be flat Phase 1, occupant Phase 2, or empty).
     * @param  array $data      Flat tier fields (label, price, contact, billing_cycle, inclusions_override, features, faq_refs, is_addon).
     * @param  bool  $enabled   Maps to platform_status: active|disabled.
     * @return array            Updated tier slot in Phase 2 occupant format.
     */
    public static function upsertOccupant(array $tierSlot, array $data, bool $enabled): array
    {
        $history = [];
        $existingId = null;
        $existingRateSheetId = null;
        $existingPlatformId = '';
        $existingAddonPlatformId = '';
        $existingExplicitlyDisabled = false;
        // Falls back to the existing occupant's own value (not hardcoded
        // false) so a caller that does not yet know about this field — e.g.
        // the legacy flat atomic tier-save path, which never sends it —
        // never silently resets it. See sanitizeCommercialLegs().
        $existingCommitmentEnabled = false;
        // Editions are mutated only through their own Package-Station-owned
        // child operations (Phase 2+), never through this Overview/Features/
        // FAQs occupant save path — so this function only ever preserves
        // them verbatim, exactly like `history`. Reading $data here would
        // let an unrelated Overview save silently smuggle Edition changes.
        $existingTierEditions = [];
        // Same verbatim-preservation rule for the occupant-owned Edition bin
        // (Phase 6) — a plain Overview save/Publish must never silently
        // empty it. Mutated only through the dedicated bin operations below.
        $existingTierEditionBin = [];

        if (self::isOccupantFormat($tierSlot)) {
            $history    = $tierSlot['history'] ?? [];
            $existingId = $tierSlot['current_occupant']['id'] ?? null;
            $existingRateSheetId = self::normaliseRateSheetId($tierSlot['current_occupant']['rate_sheet_id'] ?? null);
            $existingPlatformId = (string) ($tierSlot['current_occupant']['cz_platform_id'] ?? '');
            $existingAddonPlatformId = (string) ($tierSlot['current_occupant']['addon_platform_id'] ?? '');
            $existingExplicitlyDisabled = self::isExplicitlyDisabled($tierSlot['current_occupant'] ?? null);
            $existingCommitmentEnabled = (bool) ($tierSlot['current_occupant']['commitment_enabled'] ?? false);
            $existingTierEditions = self::sanitizeTierEditions($tierSlot['current_occupant']['tier_editions'] ?? []);
            $existingTierEditionBin = self::ensureTierEditionBin($tierSlot['current_occupant'] ?? [])['tier_edition_bin'];
        } elseif (self::hasConfiguredContent($tierSlot)) {
            $existingPlatformId = (string) ($tierSlot['cz_platform_id'] ?? '');
            $existingAddonPlatformId = (string) ($tierSlot['addon_platform_id'] ?? '');
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

        // Structured minimum commitment — the occupant's own permanent Default
        // declaration carries the same shape/sanitize rule as an Edition's own
        // minimum_term_value/unit (sanitizeTierEdition()): empty/null stays
        // null, anything else coerces to float. Kept local rather than shared
        // with sanitizeTierEdition() — the same small-vocabulary-duplication
        // precedent BILLING_CYCLES/MINIMUM_TERM_UNITS already use on the
        // frontend, not a new decision.
        $minTermValue = null;
        if (isset($data['minimum_term_value']) && $data['minimum_term_value'] !== null && $data['minimum_term_value'] !== '') {
            $minTermValue = (float) $data['minimum_term_value'];
        }
        $minTermUnit = (isset($data['minimum_term_unit']) && $data['minimum_term_unit'] !== '')
            ? sanitize_text_field((string) $data['minimum_term_unit'])
            : null;

        // Independent of commercial_legs below — see sanitizeCommercialLegs().
        $commitmentEnabled = array_key_exists('commitment_enabled', $data)
            ? (bool) $data['commitment_enabled']
            : $existingCommitmentEnabled;

        // Multi-cycle commercial schedule — same local, not-shared-with-Edition
        // precedent as $minTermValue/$minTermUnit above. Legs are re-validated
        // against this same save's own commitment every time, so a commitment
        // shortened in the same request drops whatever no longer fits with no
        // separate cascade step. active_billing_cycles no longer gates legs —
        // kept only for read/back-compat, see BILLING_CYCLES.
        $activeBillingCycles = self::sanitizeActiveBillingCycles($data['active_billing_cycles'] ?? []);
        $commercialLegs = self::sanitizeCommercialLegs(
            $data['commercial_legs'] ?? [],
            $commitmentEnabled ? self::commitmentMonths($minTermValue, $minTermUnit) : null
        );

        // First configuration (no prior binding) keeps the incoming selections;
        // Refinement 4 above already dropped them to [] on a sheet switch.
        $selections = $switched
            ? []
            : self::sanitizeTierRateSheetSelections($data['rate_sheet_items'] ?? [], $commercialLegs);

        return [
            'current_occupant' => [
                'id'                  => $existingId ?? ('occ_' . bin2hex(random_bytes(4))),
                'cz_platform_id'      => $existingPlatformId,
                'addon_platform_id'   => $existingAddonPlatformId,
                'platform_status'     => $enabled ? 'active' : 'disabled',
                // Preserved across every edit that is not itself a Disable/Enable/
                // Publish/Restore transition (those write it directly). Defaults
                // false for a genuinely new occupant — never disabled until an
                // administrator explicitly disables it.
                'is_explicitly_disabled' => $existingExplicitlyDisabled,
                // Selection-mode flag, orthogonal to platform_status: whether this
                // occupant is offered as the customer's one normal Tier or as a
                // stackable add-on. Defaults false — every occupant is a normal
                // Tier unless a caller explicitly marks it an add-on.
                'is_addon'            => (bool) ($data['is_addon'] ?? false),
                'label'               => $data['label'] ?? '',
                'ideal_for'           => $data['ideal_for'] ?? '',
                'audience_groups'     => self::sanitizeTierAudienceGroups($data['audience_groups'] ?? self::DEFAULT_TIER_AUDIENCE_GROUPS),
                'price'               => $data['price'] ?? null,
                'contact'             => $data['contact'] ?? false,
                'billing_cycle'       => $data['billing_cycle'] ?? null,
                // Same permanent-Default concern as price/contact/billing_cycle
                // above — an occupant-owned scalar, not an Edition-only one. See
                // docs/code-map/tier-edition.md.
                'minimum_term_value'  => $minTermValue,
                'minimum_term_unit'   => $minTermUnit,
                'commitment_enabled'  => $commitmentEnabled,
                'active_billing_cycles' => $activeBillingCycles,
                'commercial_legs'       => $commercialLegs,
                'rate_sheet_id'       => $rateSheetId,
                'inclusions_override' => $data['inclusions_override'] ?? [],
                'rate_sheet_items'    => $selections,
                'features'            => $data['features'] ?? [],
                'faq_refs'            => $data['faq_refs'] ?? [],
                // Preserved verbatim — see the note above the extraction at
                // the top of this function. Never populated from $data.
                'tier_editions'       => $existingTierEditions,
                'tier_edition_bin'    => $existingTierEditionBin,
            ],
            'history' => $history,
        ];
    }

    /**
     * First-save persistence boundary: mint a durable, unpublished
     * current_occupant shell for a slot that has none yet, so a stable
     * occupant_id and the shared occupant lifecycle (pills, notifications,
     * footer, Disable/Enable) exist immediately after the first successful
     * Overview module Save — before Publish. Carries no settled data (the
     * Overview draft stays in drafts.overview until Publish settles it) and
     * mints no Platform identifier; that remains the Publish/settle
     * boundary, unchanged. No-op — returns $slot unchanged — once an
     * occupant already exists, so later saves and existing occupants are
     * never touched.
     */
    public static function ensurePendingOccupant(array $slot): array
    {
        if (self::isOccupantFormat($slot) && !empty($slot['current_occupant'])) {
            return $slot;
        }
        $created = self::upsertOccupant($slot, [], false);
        $slot['current_occupant'] = $created['current_occupant'];
        $slot['history']          = $created['history'];
        return $slot;
    }

    // ===================================================================
    // SECTION: TIER_EDITION
    // ===================================================================
    // A Tier Edition is an independently addressed, independently
    // lifecycled child record nested inside current_occupant.tier_editions[]
    // — not a TIER_MODULES entry, not another occupant, not an Add-on. These
    // are pure storage sanitisers only: no mutation route exists yet. Every
    // helper here mints no id and no Platform identifier — see
    // mintTierEditionId() for id minting and the Package Station identity
    // adapter for CZTE assignment, both exercised starting at the settlement
    // boundary that owns creation, not here.

    public static function mintTierEditionId(): string
    {
        return 'edt_' . bin2hex(random_bytes(4));
    }

    /**
     * Sanitise the whole tier_editions[] collection. Malformed entries and
     * duplicate ids are dropped rather than failing the whole occupant —
     * the same defensive posture as TierInstanceSchema::sanitizeInstances().
     *
     * @return array<int, array<string, mixed>>
     */
    public static function sanitizeTierEditions(mixed $editions): array
    {
        if (!is_array($editions)) {
            return [];
        }
        $out  = [];
        $seen = [];
        foreach ($editions as $candidate) {
            $edition = self::sanitizeTierEdition($candidate);
            if ($edition === null || isset($seen[$edition['id']])) {
                continue;
            }
            $seen[$edition['id']] = true;
            $out[] = $edition;
        }
        return $out;
    }

    /**
     * Sanitise one stored Edition row. This is a read/round-trip sanitiser,
     * not a create path: it mints no id and no edition_platform_id — a row
     * with no id is unrecoverable and dropped rather than fabricated.
     *
     * @return array<string, mixed>|null
     */
    public static function sanitizeTierEdition(mixed $edition): ?array
    {
        if (!is_array($edition)) {
            return null;
        }
        $id = sanitize_text_field((string) ($edition['id'] ?? ''));
        if ($id === '') {
            return null;
        }

        $engine = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $status = sanitize_text_field((string) ($edition['platform_status'] ?? $engine::STATUS_DISABLED));
        if (!$engine::isValidStatus($status)) {
            $status = $engine::STATUS_DISABLED;
        }
        $previousStatus = $edition['previous_platform_status'] ?? null;
        $previousStatus = (is_string($previousStatus) && $engine::isValidStatus($previousStatus)) ? $previousStatus : null;

        $price = null;
        if (isset($edition['price']) && $edition['price'] !== null && $edition['price'] !== '') {
            $price = (float) $edition['price'];
        }
        $minTermValue = null;
        if (isset($edition['minimum_term_value']) && $edition['minimum_term_value'] !== null && $edition['minimum_term_value'] !== '') {
            $minTermValue = (float) $edition['minimum_term_value'];
        }
        $minTermUnit = (isset($edition['minimum_term_unit']) && $edition['minimum_term_unit'] !== '')
            ? sanitize_text_field((string) $edition['minimum_term_unit'])
            : null;

        // Independent of commercial_legs below — see sanitizeCommercialLegs().
        $commitmentEnabled = (bool) ($edition['commitment_enabled'] ?? false);

        // Multi-cycle commercial schedule — an Edition's own, independent of
        // the parent occupant's (never inherited, same rule as price/
        // billing_cycle/commitment above). See docs/code-map/tier-edition.md.
        $activeBillingCycles = self::sanitizeActiveBillingCycles($edition['active_billing_cycles'] ?? []);
        $editionCommitmentMonths = $commitmentEnabled ? self::commitmentMonths($minTermValue, $minTermUnit) : null;
        $commercialLegs = self::sanitizeCommercialLegs($edition['commercial_legs'] ?? [], $editionCommitmentMonths);
        $editionRateSheetItemsSource = is_array($edition['rate_sheet_items'] ?? null) ? $edition['rate_sheet_items'] : [];
        // Bridge a legacy zero-leg Edition into the mandatory-leg model — see
        // synthesizeFirstCommercialLeg(). This function is both the read
        // projection and the settle-time sanitizer for an Edition, so this
        // single call site covers both the same way the occupant's separate
        // normaliseTierSlot()/settleTierSlot() call sites do together.
        if ($commercialLegs === []) {
            $editionBillingCycle = (isset($edition['billing_cycle']) && $edition['billing_cycle'] !== '')
                ? sanitize_text_field((string) $edition['billing_cycle'])
                : null;
            $synthesized = self::synthesizeFirstCommercialLeg($editionBillingCycle, $editionCommitmentMonths, $editionRateSheetItemsSource);
            $commercialLegs = $synthesized['commercial_legs'];
            $editionRateSheetItemsSource = $synthesized['rate_sheet_items'];
        }

        return [
            'id'                       => $id,
            // Output-only until the settlement boundary assigns it — mirrors
            // cz_platform_id/addon_platform_id's own empty-string-until-bound
            // convention on the occupant itself.
            'edition_platform_id'      => sanitize_text_field((string) ($edition['edition_platform_id'] ?? '')),
            'title'                    => sanitize_text_field((string) ($edition['title'] ?? '')),
            'admin_description'        => sanitize_textarea_field((string) ($edition['admin_description'] ?? '')),

            'platform_status'          => $status,
            'previous_platform_status' => $previousStatus,
            // Same shared marker convention as the occupant's own
            // is_explicitly_disabled — see isExplicitlyDisabled(). An Edition
            // does not invent a second Disabled representation.
            'is_explicitly_disabled'   => (bool) ($edition['is_explicitly_disabled'] ?? false),
            'module_status'            => is_array($edition['module_status'] ?? null) ? $edition['module_status'] : [],
            'drafts'                   => is_array($edition['drafts'] ?? null) ? $edition['drafts'] : [],

            'rate_sheet_id'            => self::normaliseRateSheetId($edition['rate_sheet_id'] ?? null),
            'rate_sheet_items'         => self::sanitizeTierRateSheetSelections($editionRateSheetItemsSource, $commercialLegs),
            'price'                    => $price,
            'contact'                  => (bool) ($edition['contact'] ?? false),
            'billing_cycle'            => (isset($edition['billing_cycle']) && $edition['billing_cycle'] !== '')
                ? sanitize_text_field((string) $edition['billing_cycle'])
                : null,
            'minimum_term_value'       => $minTermValue,
            'minimum_term_unit'        => $minTermUnit,
            'commitment_enabled'       => $commitmentEnabled,
            // Additive only, an Edition's own — never inherited from the
            // parent occupant (unlike inclusions_override/faq_refs below).
            // Empty for every Edition that has never used this capability.
            'active_billing_cycles'    => $activeBillingCycles,
            'commercial_legs'          => $commercialLegs,

            // Empty means inherit the parent occupant's own inclusions_override
            // / faq_refs — the same empty-means-inherit rule the occupant
            // itself already uses against Service-level canonical data in
            // PricingBuilder::overlayPackage(). Non-empty is this Edition's
            // explicit declaration override, using the occupant's own field
            // names rather than a parallel document model.
            'inclusions_override'      => is_array($edition['inclusions_override'] ?? null)
                ? array_values(array_filter($edition['inclusions_override'], 'is_array'))
                : [],
            'faq_refs'                 => is_array($edition['faq_refs'] ?? null)
                ? array_values(array_map(static fn($ref): string => sanitize_text_field((string) $ref), $edition['faq_refs']))
                : [],
        ];
    }

    // ── Phase 2: nested child lookup, add, replace, guarded delete ───────────
    // Mirrors PackageCategoryGroups::create()/find()/replace()/delete() —
    // the proven "array-of-records inside the shared option, each with its
    // own id, lifecycle, and Platform identity" pattern — one level deeper,
    // scoped to one occupant's tier_editions[] rather than a top-level
    // collection. No REST route exists yet; that is Phase 3.

    public static function findTierEdition(array $editions, string $editionId): ?array
    {
        foreach ($editions as $edition) {
            if (is_array($edition) && ($edition['id'] ?? null) === $editionId) {
                return $edition;
            }
        }
        return null;
    }

    /** Replace one Edition row by id; an unknown id is a no-op. */
    public static function replaceTierEdition(array $editions, array $next): array
    {
        return self::sanitizeTierEditions(array_map(
            static fn($edition) => is_array($edition) && ($edition['id'] ?? null) === ($next['id'] ?? '') ? $next : $edition,
            $editions
        ));
    }

    /**
     * Add a new Edition to an occupant. Always mints its own id — never
     * accepts a caller-supplied one, unlike PackageCategoryGroups::create()'s
     * optional $groupId — because nothing outside this function has a
     * legitimate reason to pre-choose an Edition's storage address. Born
     * disabled with no modules settled, exactly matching the Package Family
     * row's own create semantics. Mints no Platform identifier — CZTE is
     * assigned at the settlement boundary (Phase 3), not at creation.
     *
     * @return array{tier_editions: array, edition: array}
     */
    public static function addTierEdition(array $editions, array $data): array
    {
        $title = sanitize_text_field((string) ($data['title'] ?? ''));
        if ($title === '') {
            throw new \InvalidArgumentException('Tier Edition title is required.');
        }
        $engine = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $edition = self::sanitizeTierEdition([
            'id'                  => self::mintTierEditionId(),
            'title'               => $title,
            'admin_description'   => $data['admin_description'] ?? '',
            'platform_status'     => $engine::STATUS_DISABLED,
            'rate_sheet_id'       => $data['rate_sheet_id'] ?? null,
            'rate_sheet_items'    => $data['rate_sheet_items'] ?? [],
            'billing_cycle'       => $data['billing_cycle'] ?? null,
            'contact'             => $data['contact'] ?? false,
            'minimum_term_value'  => $data['minimum_term_value'] ?? null,
            'minimum_term_unit'   => $data['minimum_term_unit'] ?? null,
            'commitment_enabled'  => $data['commitment_enabled'] ?? false,
            'active_billing_cycles' => $data['active_billing_cycles'] ?? [],
            'commercial_legs'       => $data['commercial_legs'] ?? [],
            'inclusions_override' => $data['inclusions_override'] ?? [],
            'faq_refs'            => $data['faq_refs'] ?? [],
        ]);
        return ['tier_editions' => self::sanitizeTierEditions([...$editions, $edition]), 'edition' => $edition];
    }

    /**
     * Permanent delete. Engine gate (trashed only, mirroring
     * PackageCategoryGroups::delete()). $isParentDeletion bypasses the gate:
     * deleting the whole occupant/Tier legitimately removes every Edition
     * with it (the required cascade rule — see Phase 4). There is no
     * default-Edition guard: the occupant's own declaration is the
     * permanent Default and is never represented by a row in this
     * collection, so no Edition's deletion can ever leave "the default"
     * unresolved.
     */
    public static function deleteTierEdition(
        array $editions,
        string $editionId,
        bool $isParentDeletion = false
    ): array {
        $edition = self::findTierEdition($editions, $editionId);
        if ($edition === null) {
            throw new \InvalidArgumentException('Tier Edition not found.');
        }
        if (!$isParentDeletion) {
            $engine = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
            if (!$engine::canDelete((string) ($edition['platform_status'] ?? ''))) {
                throw new \InvalidArgumentException('Only a trashed Tier Edition can be permanently deleted.');
            }
        }
        return self::sanitizeTierEditions(array_values(array_filter(
            $editions,
            static fn($candidate) => !is_array($candidate) || ($candidate['id'] ?? null) !== $editionId
        )));
    }

    // ── Phase 3: one module (overview), draft -> settle/revert ───────────────
    // A single consolidated module, not the parent occupant's three-module
    // Overview/Features/FAQs split — mirrors PackageCategoryGroups, which
    // also carries multiple editable fields (label, description) under one
    // 'overview' module rather than one module per field group. An Edition's
    // total editable surface (title, description, Rate Sheet binding +
    // selections, billing cycle, commitment, declaration override) is closer
    // in size to a Family row than to a whole Tier occupant.

    public static function saveTierEditionDraft(array $editions, string $editionId, array $data): array
    {
        $edition = self::findTierEdition($editions, $editionId);
        if ($edition === null) {
            throw new \InvalidArgumentException('Tier Edition not found.');
        }
        $title = sanitize_text_field((string) ($data['title'] ?? ''));
        if ($title === '') {
            throw new \InvalidArgumentException('Tier Edition title is required.');
        }
        $edition['drafts']['overview'] = [
            'title'                => $title,
            'admin_description'    => $data['admin_description'] ?? '',
            'rate_sheet_id'        => $data['rate_sheet_id'] ?? null,
            'rate_sheet_items'     => $data['rate_sheet_items'] ?? [],
            'billing_cycle'        => $data['billing_cycle'] ?? null,
            'contact'              => $data['contact'] ?? false,
            'minimum_term_value'   => $data['minimum_term_value'] ?? null,
            'minimum_term_unit'    => $data['minimum_term_unit'] ?? null,
            'commitment_enabled'   => $data['commitment_enabled'] ?? false,
            'active_billing_cycles' => $data['active_billing_cycles'] ?? [],
            'commercial_legs'       => $data['commercial_legs'] ?? [],
            'inclusions_override'  => $data['inclusions_override'] ?? [],
            'faq_refs'             => $data['faq_refs'] ?? [],
        ];
        $edition['module_status']['overview'] = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::MODULE_PENDING;
        return self::replaceTierEdition($editions, $edition);
    }

    /**
     * Settle the draft-preferred state into the Edition row, then clear the
     * draft and mark the module settled. Switching the bound Rate Sheet
     * clears row selections — the same Refinement 4 rule the parent
     * occupant already applies in settleTierSlot().
     */
    public static function settleTierEditionOverview(array $editions, string $editionId): array
    {
        $edition = self::findTierEdition($editions, $editionId);
        if ($edition === null) {
            throw new \InvalidArgumentException('Tier Edition not found.');
        }
        $draft = is_array($edition['drafts']['overview'] ?? null) ? $edition['drafts']['overview'] : null;
        if ($draft === null) {
            return $editions;
        }

        $existingRateSheetId = self::normaliseRateSheetId($edition['rate_sheet_id'] ?? null);
        $draftRateSheetId = array_key_exists('rate_sheet_id', $draft)
            ? self::normaliseRateSheetId($draft['rate_sheet_id'])
            : $existingRateSheetId;
        $switched = $existingRateSheetId !== null && $draftRateSheetId !== $existingRateSheetId;
        $selections = $switched
            ? []
            : self::sanitizeTierRateSheetSelections($draft['rate_sheet_items'] ?? ($edition['rate_sheet_items'] ?? []));

        $edition['title']               = $draft['title'] ?? $edition['title'];
        $edition['admin_description']   = $draft['admin_description'] ?? $edition['admin_description'];
        $edition['rate_sheet_id']       = $draftRateSheetId;
        $edition['rate_sheet_items']    = $selections;
        $edition['billing_cycle']       = $draft['billing_cycle'] ?? $edition['billing_cycle'];
        $edition['contact']             = $draft['contact'] ?? $edition['contact'];
        $edition['minimum_term_value']  = array_key_exists('minimum_term_value', $draft) ? $draft['minimum_term_value'] : $edition['minimum_term_value'];
        $edition['minimum_term_unit']   = array_key_exists('minimum_term_unit', $draft) ? $draft['minimum_term_unit'] : $edition['minimum_term_unit'];
        $edition['commitment_enabled']  = array_key_exists('commitment_enabled', $draft) ? $draft['commitment_enabled'] : $edition['commitment_enabled'];
        $edition['active_billing_cycles'] = array_key_exists('active_billing_cycles', $draft) ? $draft['active_billing_cycles'] : $edition['active_billing_cycles'];
        $edition['commercial_legs']       = array_key_exists('commercial_legs', $draft) ? $draft['commercial_legs'] : $edition['commercial_legs'];
        $edition['inclusions_override'] = $draft['inclusions_override'] ?? $edition['inclusions_override'];
        $edition['faq_refs']            = $draft['faq_refs'] ?? $edition['faq_refs'];

        $edition = self::sanitizeTierEdition($edition);
        $edition['drafts']['overview']        = null;
        $edition['module_status']['overview'] = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::MODULE_SETTLED;
        return self::replaceTierEdition($editions, $edition);
    }

    /** Discard a pending draft without touching the settled Edition data. */
    public static function revertTierEditionOverview(array $editions, string $editionId): array
    {
        $edition = self::findTierEdition($editions, $editionId);
        if ($edition === null) {
            throw new \InvalidArgumentException('Tier Edition not found.');
        }
        $engine = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $edition['drafts']['overview'] = null;
        $edition['module_status']['overview'] = $edition['title'] !== ''
            ? $engine::MODULE_SETTLED
            : $engine::MODULE_NOT_CONFIGURED;
        return self::replaceTierEdition($editions, $edition);
    }

    // ── Phase 3: shared StationLifecycle transitions ─────────────────────────
    // Mirrors PackageCategoryGroups::applyStatus()/applyDisabledMask()/
    // restore() exactly — the same engine, the same permissive-target
    // contract, the same explicit Disable/Enable mask. No new status names,
    // no new transition logic.

    /** Permissive status application, same contract as Package Family's own /status endpoint. */
    public static function applyTierEditionStatus(array $editions, string $editionId, string $target): array
    {
        $edition = self::findTierEdition($editions, $editionId);
        if ($edition === null) {
            throw new \InvalidArgumentException('Tier Edition not found.');
        }
        $engine = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        if (!$engine::isValidStatus($target) || $target === $engine::STATUS_DRAFT) {
            throw new \InvalidArgumentException('Invalid platform_status.');
        }
        $change = $engine::applyStatus(
            (string) $edition['platform_status'],
            $target,
            $edition['previous_platform_status'] ?? null
        );
        $edition['platform_status']          = $change['status'];
        $edition['previous_platform_status'] = $change['previous_status'];
        return self::replaceTierEdition($editions, $edition);
    }

    /** Explicit Disable/Enable mask; neither action publishes or settles. */
    public static function applyTierEditionDisabledMask(array $editions, string $editionId, string $action): array
    {
        $edition = self::findTierEdition($editions, $editionId);
        if ($edition === null) {
            throw new \InvalidArgumentException('Tier Edition not found.');
        }
        $engine = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $current  = (string) $edition['platform_status'];
        $previous = $edition['previous_platform_status'] ?? null;

        if ($action === 'disable') {
            if (!$engine::isLive($current)) {
                throw new \InvalidArgumentException('Only an active or pending Tier Edition can be disabled.');
            }
            $edition['platform_status'] = $engine::STATUS_DISABLED;
            $edition['previous_platform_status'] = $current === $engine::STATUS_ACTIVE || $previous === null
                ? $current
                : $previous;
        } elseif ($action === 'enable') {
            if ($current !== $engine::STATUS_DISABLED || $previous === null) {
                throw new \InvalidArgumentException('Only an explicitly disabled Tier Edition can be enabled.');
            }
            $edition['platform_status'] = $engine::STATUS_DISABLED;
            $edition['previous_platform_status'] = null;
        } else {
            throw new \InvalidArgumentException('Invalid action.');
        }

        return self::replaceTierEdition($editions, $edition);
    }

    /** restore: archived|trashed -> disabled — never straight to active. */
    public static function restoreTierEdition(array $editions, string $editionId): array
    {
        $edition = self::findTierEdition($editions, $editionId);
        if ($edition === null) {
            throw new \InvalidArgumentException('Tier Edition not found.');
        }
        $engine = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $change = $engine::restore((string) $edition['platform_status']);
        if ($change === null) {
            throw new \InvalidArgumentException('Tier Edition is not in a restorable state.');
        }
        $edition['platform_status']          = $change['status'];
        $edition['previous_platform_status'] = $change['previous_status'];
        return self::replaceTierEdition($editions, $edition);
    }

    // ===================================================================
    // SECTION: TIER_EDITION_BIN
    // ===================================================================
    // Phase 6 — a narrow, occupant-owned physical bin for Editions, mirroring
    // the station-level occupant_bin's own archive/restore/trash/delete shape
    // one level deeper: current_occupant.tier_edition_bin[], not the
    // top-level station['occupant_bin']. Deliberately decoupled from
    // platform_status — moving an Edition into/out of this array is a
    // separate act from the existing engine-transition /status endpoint
    // (applyTierEditionStatus): an Edition must already be archived or
    // trashed (StationLifecycle::isBinned) before it can be moved here, and
    // moving it here never itself changes platform_status. This keeps every
    // existing live/archived/trashed Edition already sitting in
    // tier_editions[] — and the existing /status endpoint — byte-identical;
    // only an explicit new bin operation ever populates tier_edition_bin[].
    // The bin entry carries the full Edition record (CZTE included) plus
    // only the metadata its own bin lifecycle needs — no origin_tier,
    // previous_enabled, or cascaded_edition_ids, none of which have meaning
    // for a record that never leaves its parent occupant.

    /**
     * Guarantee a well-formed tier_edition_bin on an occupant: malformed
     * entries are dropped, statuses clamped to the engine's bin vocabulary.
     * Idempotent, lazy (parity with ensureOccupantBin) — an occupant that has
     * never used this capability simply gains [].
     *
     * @param  array<string, mixed> $occupant
     * @return array<string, mixed>
     */
    public static function ensureTierEditionBin(array $occupant): array
    {
        $raw = (isset($occupant['tier_edition_bin']) && is_array($occupant['tier_edition_bin'])) ? $occupant['tier_edition_bin'] : [];
        if ($raw === []) {
            $occupant['tier_edition_bin'] = [];
            return $occupant;
        }
        // Only referenced once there is actually something to clamp — the
        // same lazy-dependency posture sanitizeTierEdition() already has
        // (empty tier_editions[] never touches StationLifecycle either),
        // so an occupant that has never used either capability stays free
        // of any Admin-module dependency in the hot read path.
        $binStatuses = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::BIN_STATUSES;

        $out = [];
        foreach ($raw as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $binId   = (string) ($entry['bin_id'] ?? '');
            $edition = self::sanitizeTierEdition($entry['edition'] ?? null);
            if ($binId === '' || $edition === null) {
                continue;
            }
            $status = $entry['status'] ?? '';
            if (!in_array($status, $binStatuses, true)) {
                $status = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::STATUS_ARCHIVED;
            }
            $out[] = [
                'bin_id'       => $binId,
                'edition'      => $edition,
                'status'       => $status,
                'displaced_at' => is_string($entry['displaced_at'] ?? null) ? $entry['displaced_at'] : null,
            ];
        }

        $occupant['tier_edition_bin'] = $out;
        return $occupant;
    }

    /** Locate a bin entry by id inside an ensured tier_edition_bin. */
    private static function findTierEditionBinIndex(array $bin, string $binId): ?int
    {
        foreach ($bin as $i => $entry) {
            if (($entry['bin_id'] ?? '') === $binId) {
                return $i;
            }
        }
        return null;
    }

    /**
     * Move one Edition out of tier_editions[] and into this occupant's own
     * tier_edition_bin[]. Requires the Edition to already be archived or
     * trashed — the existing /status endpoint remains the only way to reach
     * those statuses; this operation never itself changes platform_status,
     * it only relocates the row and mirrors its current status onto the bin
     * entry's own status field. Active numbering for the remaining
     * tier_editions[] compacts naturally because it is derived from array
     * order/count only — nothing here renumbers anything.
     *
     * @param  array<string, mixed> $occupant
     * @return array{occupant: array<string, mixed>, entry: array<string, mixed>}|array{error: string}
     */
    public static function moveTierEditionToBin(array $occupant, string $editionId, string $binId, ?string $displacedAt): array
    {
        $engine   = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $editions = is_array($occupant['tier_editions'] ?? null) ? $occupant['tier_editions'] : [];
        $edition  = self::findTierEdition($editions, $editionId);
        if ($edition === null) {
            return ['error' => 'unknown_edition'];
        }
        if (!$engine::isBinned((string) ($edition['platform_status'] ?? ''))) {
            return ['error' => 'not_binnable'];
        }

        $occupant = self::ensureTierEditionBin($occupant);
        $occupant['tier_editions'] = array_values(array_filter(
            $editions,
            static fn($candidate) => !is_array($candidate) || ($candidate['id'] ?? null) !== $editionId
        ));

        $entry = [
            'bin_id'       => $binId,
            'edition'      => $edition,
            'status'       => $edition['platform_status'],
            'displaced_at' => $displacedAt,
        ];
        $occupant['tier_edition_bin'][] = $entry;

        return ['occupant' => $occupant, 'entry' => $entry];
    }

    /**
     * Restore a binned Edition back into tier_editions[], appended to the
     * end. Display numbering is derived from array order/count only, so
     * there is no swap or retarget mode and no attempt to return the Edition
     * to whatever number it previously displayed at — restoring into an
     * already-populated active list simply lands after the last entry.
     * Reuses restoreTierEdition() verbatim for the archived|trashed ->
     * disabled transition, the same "restore always lands disabled, never
     * active" rule every other station-owned record in this codebase
     * already follows.
     *
     * @param  array<string, mixed> $occupant
     * @return array{occupant: array<string, mixed>, entry: array<string, mixed>}|array{error: string}
     */
    public static function restoreTierEditionFromBin(array $occupant, string $binId): array
    {
        $engine   = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $occupant = self::ensureTierEditionBin($occupant);
        $index    = self::findTierEditionBinIndex($occupant['tier_edition_bin'], $binId);
        if ($index === null) {
            return ['error' => 'unknown_bin_entry'];
        }
        $entry = $occupant['tier_edition_bin'][$index];
        if (!$engine::canRestore((string) $entry['status'])) {
            return ['error' => 'restore_illegal'];
        }

        array_splice($occupant['tier_edition_bin'], $index, 1);

        $editions   = is_array($occupant['tier_editions'] ?? null) ? $occupant['tier_editions'] : [];
        $editions[] = $entry['edition'];
        $occupant['tier_editions'] = self::restoreTierEdition($editions, (string) $entry['edition']['id']);

        return ['occupant' => $occupant, 'entry' => $entry];
    }

    /**
     * Trash a bin entry (archived -> trashed), engine-validated, mirroring
     * trashBinnedOccupant(). The nested Edition's own platform_status is
     * kept in sync with the entry's status, the same "one lifecycle
     * vocabulary" rule the entry mirrors it from at move-to-bin time.
     *
     * @param  array<string, mixed> $occupant
     * @return array{occupant: array<string, mixed>, entry: array<string, mixed>}|array{error: string}
     */
    public static function trashTierEditionBinEntry(array $occupant, string $binId): array
    {
        $engine   = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $occupant = self::ensureTierEditionBin($occupant);
        $index    = self::findTierEditionBinIndex($occupant['tier_edition_bin'], $binId);
        if ($index === null) {
            return ['error' => 'unknown_bin_entry'];
        }
        $entry  = $occupant['tier_edition_bin'][$index];
        $change = $engine::trash((string) $entry['status'], $entry['edition']['previous_platform_status'] ?? null);
        if ($change === null) {
            return ['error' => 'trash_illegal'];
        }

        $entry['status']                            = $change['status'];
        $entry['edition']['platform_status']        = $change['status'];
        $entry['edition']['previous_platform_status'] = $change['previous_status'];
        $occupant['tier_edition_bin'][$index] = $entry;

        return ['occupant' => $occupant, 'entry' => $entry];
    }

    /**
     * Permanently remove a trashed bin entry — the only operation that
     * removes a tier_edition_bin[] row. Legal only from trashed
     * (engine-validated), mirroring deleteBinnedOccupant().
     *
     * @param  array<string, mixed> $occupant
     * @return array{occupant: array<string, mixed>, entry: array<string, mixed>}|array{error: string}
     */
    public static function deleteTierEditionBinEntry(array $occupant, string $binId): array
    {
        $engine   = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $occupant = self::ensureTierEditionBin($occupant);
        $index    = self::findTierEditionBinIndex($occupant['tier_edition_bin'], $binId);
        if ($index === null) {
            return ['error' => 'unknown_bin_entry'];
        }
        $entry = $occupant['tier_edition_bin'][$index];
        if (!$engine::canDelete((string) $entry['status'])) {
            return ['error' => 'delete_illegal'];
        }
        array_splice($occupant['tier_edition_bin'], $index, 1);
        return ['occupant' => $occupant, 'entry' => $entry];
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
            $tier = is_array($station['tiers'][$tierId] ?? null) ? $station['tiers'][$tierId] : [];
            if (self::isActiveOccupant($tier)) {
                return 'active';
            }
        }
        return 'disabled';
    }

    /** @return array{label: string, price: null, contact: false, billing_cycle: null, inclusions_override: array, features: array, faq_refs: array, enabled: false, is_addon: false, tier_editions: array} */
    private static function emptyTierDetail(): array
    {
        return [
            'occupant_id' => null, 'platform_id' => '', 'addon_platform_id' => '',
            'label' => '', 'ideal_for' => '',
            'audience_groups' => self::DEFAULT_TIER_AUDIENCE_GROUPS,
            'price' => null, 'contact' => false,
            'billing_cycle' => null, 'minimum_term_value' => null, 'minimum_term_unit' => null,
            'commitment_enabled' => false,
            'active_billing_cycles' => [], 'commercial_legs' => [],
            'rate_sheet_id' => null, 'inclusions_override' => [], 'rate_sheet_items' => [],
            'features' => [], 'faq_refs' => [], 'enabled' => false, 'is_addon' => false,
            'tier_editions' => [], 'tier_edition_bin' => [],
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
        $configured = self::hasConfiguredContent($slot);
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
                // Cascade-history (Phase 4): the exact Edition ids THIS bin
                // entry's own archive moment carried with the parent — never
                // recomputed at trash/restore time. An Edition already
                // archived/trashed independently before this entry was
                // created is never in this list, so later trash/restore
                // cascades can never touch it. See archiveTierOccupant().
                'cascaded_edition_ids' => is_array($entry['cascaded_edition_ids'] ?? null)
                    ? array_values(array_unique(array_map('strval', array_filter($entry['cascaded_edition_ids'], 'is_string'))))
                    : [],
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
    // ── Phase 4: parent-to-child cascade (thin orchestration only) ───────────
    // Each helper reuses the exact per-Edition transition functions already
    // proven in Phase 3 (applyTierEditionStatus/restoreTierEdition) — no
    // duplicated transition logic. The one new rule is which ids a cascade
    // is allowed to touch: only those this SAME bin-entry archive originally
    // carried, recorded once and never recomputed, so an Edition already
    // independently archived/trashed before the parent moved is never
    // swept up by a later Tier-level trash or restore.

    /**
     * Archive every currently-live Edition alongside its parent occupant,
     * recording exactly which ids were carried.
     *
     * @return array{0: array, 1: list<string>}
     */
    private static function cascadeArchiveTierEditions(array $occupant): array
    {
        $engine   = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $editions = is_array($occupant['tier_editions'] ?? null) ? $occupant['tier_editions'] : [];
        $carried  = [];
        foreach ($editions as $edition) {
            if (!is_array($edition)) {
                continue;
            }
            $id = (string) ($edition['id'] ?? '');
            if ($id === '' || !$engine::isLive((string) ($edition['platform_status'] ?? ''))) {
                continue;
            }
            $editions = self::applyTierEditionStatus($editions, $id, $engine::STATUS_ARCHIVED);
            $carried[] = $id;
        }
        $occupant['tier_editions'] = $editions;
        return [$occupant, $carried];
    }

    /** Trash only the ids a prior archive of this same bin entry already carried. */
    private static function cascadeTrashTierEditions(array $occupant, array $carriedIds): array
    {
        $engine   = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $editions = is_array($occupant['tier_editions'] ?? null) ? $occupant['tier_editions'] : [];
        foreach ($carriedIds as $id) {
            $edition = self::findTierEdition($editions, (string) $id);
            if ($edition !== null && $engine::canTrash((string) ($edition['platform_status'] ?? ''))) {
                $editions = self::applyTierEditionStatus($editions, (string) $id, $engine::STATUS_TRASHED);
            }
        }
        $occupant['tier_editions'] = $editions;
        return $occupant;
    }

    /** Restore only the ids this bin entry's own archive carried, back to disabled alongside the parent. */
    private static function cascadeRestoreTierEditions(array $occupant, array $carriedIds): array
    {
        $engine   = \CompuZign\Platform\Modules\Admin\Support\StationLifecycle::class;
        $editions = is_array($occupant['tier_editions'] ?? null) ? $occupant['tier_editions'] : [];
        foreach ($carriedIds as $id) {
            $edition = self::findTierEdition($editions, (string) $id);
            if ($edition !== null && $engine::canRestore((string) ($edition['platform_status'] ?? ''))) {
                $editions = self::restoreTierEdition($editions, (string) $id);
            }
        }
        $occupant['tier_editions'] = $editions;
        return $occupant;
    }

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

        [$occupant, $cascadedEditionIds] = self::cascadeArchiveTierEditions($occupant);

        $entry = [
            'bin_id'           => $binId,
            'origin_tier'      => $tierId,
            'occupant'         => $occupant,
            'status'           => 'archived',
            'previous_enabled' => ($occupant['platform_status'] ?? 'active') === 'active',
            'displaced_at'     => $displacedAt,
            'cascaded_edition_ids' => $cascadedEditionIds,
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
            [$displacedOccupant, $displacedCascadedIds] = self::cascadeArchiveTierEditions($canonical['current_occupant']);
            $displaced = [
                'bin_id'           => $newBinId,
                'origin_tier'      => $tierId,
                'occupant'         => $displacedOccupant,
                'status'           => 'archived',
                'previous_enabled' => $detail['enabled'],
                'displaced_at'     => $displacedAt,
                'cascaded_edition_ids' => $displacedCascadedIds,
            ];
            $station['occupant_bin'][] = $displaced;
            $slot = [
                'current_occupant' => null,
                'history'          => $canonical['history'],
                'drafts'           => $slot['drafts'],
                'module_status'    => $slot['module_status'],
            ];
        }

        $carriedEditionIds = is_array($entry['cascaded_edition_ids'] ?? null) ? $entry['cascaded_edition_ids'] : [];
        $occupant = self::cascadeRestoreTierEditions($entry['occupant'], $carriedEditionIds);
        $occupant['platform_status'] = 'disabled';
        // Restore always clears the marker, even for an occupant that was
        // explicitly Disabled at archive time — the same unmasked-Pending
        // landing Enable produces.
        $occupant['is_explicitly_disabled'] = false;

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

        $entry = $station['occupant_bin'][$index];
        $carriedEditionIds = is_array($entry['cascaded_edition_ids'] ?? null) ? $entry['cascaded_edition_ids'] : [];
        $entry['occupant'] = self::cascadeTrashTierEditions($entry['occupant'] ?? [], $carriedEditionIds);
        $entry['status'] = $change['status'];

        $station['occupant_bin'][$index] = $entry;
        return ['station' => $station, 'entry' => $entry];
    }

    /**
     * Permanently delete a bin entry (engine D3) — the only operation that removes
     * an entry from occupant_bin. Legal only from trashed (engine-validated).
     *
     * Parent permanent deletion cascade (Phase 4) needs no Edition-specific
     * code here: array_splice() below discards the whole entry, occupant AND
     * every nested Edition, in one structural removal. There is nothing to
     * iterate — the same reason CZT/CZTA need no explicit per-field cleanup
     * on this same path. Individual Edition permanent delete
     * (PackageStationController::deleteTierEditionEndpoint) remains
     * separately guarded while the parent occupant is still live.
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
    /**
     * The slot's own draft-preferred, commitment_enabled-gated commitment
     * (converted to months) — a pending Overview draft wins, else the
     * settled occupant's own value, the exact rule settleTierSlot() uses at
     * commit time. Null whenever commitment_enabled is false, regardless of
     * any stored minimum_term_value — Commitment and Legs are independent
     * (see sanitizeCommercialLegs()), so this is purely "what bound, if any,
     * applies to a leg's end_month" — never a gate on whether legs
     * themselves are usable. The shared lookup behind
     * draftPreferredCommercialLegs() and sanitizeCommercialLegsForSlot()
     * below; Overview and Commercial Schedule may be saved in either order
     * and both resolve correctly.
     */
    private static function draftPreferredCommitmentMonths(array $slot): ?float
    {
        $occ = self::isOccupantFormat($slot) ? ($slot['current_occupant'] ?? []) : [];
        // Owned by the Commercial Schedule module's own draft (Tier Pricing
        // Rules), not Overview — see docs/code-map/tier-pricing-rules-plan.md.
        $cs  = is_array($slot['drafts']['commercial_schedule'] ?? null) ? $slot['drafts']['commercial_schedule'] : [];
        $commitmentEnabled = (bool) (array_key_exists('commitment_enabled', $cs) ? $cs['commitment_enabled'] : ($occ['commitment_enabled'] ?? false));
        if (!$commitmentEnabled) {
            return null;
        }
        $minTermValue = array_key_exists('minimum_term_value', $cs) ? $cs['minimum_term_value'] : ($occ['minimum_term_value'] ?? null);
        $minTermUnit  = array_key_exists('minimum_term_unit', $cs)  ? $cs['minimum_term_unit']  : ($occ['minimum_term_unit']  ?? null);
        return self::commitmentMonths(
            is_numeric($minTermValue) ? (float) $minTermValue : null,
            is_string($minTermUnit) ? $minTermUnit : null
        );
    }

    /**
     * The slot's own draft-preferred commercial_legs — a pending Commercial
     * Schedule draft wins, else the settled occupant's own value. Exposed so
     * the sibling Features module can resolve/validate its own
     * leg_assignments against legs that exist only in a not-yet-settled
     * Commercial Schedule draft — the natural authoring order is declare
     * legs, then assign inclusions to them, all before Publish ever runs.
     * Read-only; never itself settles or persists anything.
     */
    public static function draftPreferredCommercialLegs(array $slot): array
    {
        $slot = self::ensureTierLifecycle($slot);
        $occ  = self::isOccupantFormat($slot) ? ($slot['current_occupant'] ?? []) : [];
        $cs   = is_array($slot['drafts']['commercial_schedule'] ?? null) ? $slot['drafts']['commercial_schedule'] : [];
        return self::sanitizeCommercialLegs(
            array_key_exists('commercial_legs', $cs) ? $cs['commercial_legs'] : ($occ['commercial_legs'] ?? []),
            self::draftPreferredCommitmentMonths($slot)
        );
    }

    /**
     * Sanitise a Commercial Schedule module's OWN newly-submitted legs
     * against the slot's draft-preferred commitment — the controller's
     * draft-save entry point, so a malformed/out-of-bound leg is caught
     * immediately rather than only at Publish. settleTierSlot() re-runs this
     * same validation at commit time regardless, so a subsequently-shortened
     * commitment still re-drops whatever no longer fits.
     */
    public static function sanitizeCommercialLegsForSlot(array $slot, mixed $legs): array
    {
        $slot = self::ensureTierLifecycle($slot);
        return self::sanitizeCommercialLegs($legs, self::draftPreferredCommitmentMonths($slot));
    }

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
        // Commercial Schedule's own module draft — the legs themselves, kept a
        // separate module from Overview (which owns active_billing_cycles,
        // alongside billing_cycle/commitment) so the two can be authored/saved
        // independently, exactly like Features/FAQs already are.
        $cs = is_array($drafts['commercial_schedule'] ?? null) ? $drafts['commercial_schedule'] : [];

        // The Tier's bound Rate Sheet: draft-preferred, occupant fallback.
        // Owned by the Commercial Schedule module's draft (Tier Pricing
        // Rules), not Overview — see docs/code-map/tier-pricing-rules-plan.md.
        $occRateSheetId   = self::normaliseRateSheetId($occ['rate_sheet_id'] ?? null);
        $draftRateSheetId = array_key_exists('rate_sheet_id', $cs)
            ? self::normaliseRateSheetId($cs['rate_sheet_id'])
            : $occRateSheetId;
        // Refinement 4 — switching an already-bound occupant to a different sheet
        // clears its selections; picking new rows is a separate settle against the
        // re-bound occupant. Non-switch settles keep the draft-preferred selections.
        $switchingSheet = $occRateSheetId !== null && $draftRateSheetId !== $occRateSheetId;

        // Draft-preferred like every other Commercial Schedule field above; an
        // edited-but-unsettled commitment/cycle change wins, otherwise the
        // settled occupant's existing value carries forward untouched.
        $minTermValue = array_key_exists('minimum_term_value', $cs) ? $cs['minimum_term_value'] : ($occ['minimum_term_value'] ?? null);
        $minTermUnit  = array_key_exists('minimum_term_unit', $cs)  ? $cs['minimum_term_unit']  : ($occ['minimum_term_unit']  ?? null);
        $commitmentEnabled = (bool) (array_key_exists('commitment_enabled', $cs) ? $cs['commitment_enabled'] : ($occ['commitment_enabled'] ?? false));
        $activeBillingCycles = self::sanitizeActiveBillingCycles(
            array_key_exists('active_billing_cycles', $cs) ? $cs['active_billing_cycles'] : ($occ['active_billing_cycles'] ?? [])
        );
        // Commercial Schedule module's own draft-preferred merge, same rule as
        // Features/FAQs below — a module with no draft keeps its settled value.
        // Independent of commitment_enabled except for the bound it passes —
        // see sanitizeCommercialLegs().
        $commitmentMonths = $commitmentEnabled ? self::commitmentMonths(
            is_numeric($minTermValue) ? (float) $minTermValue : null,
            is_string($minTermUnit) ? $minTermUnit : null
        ) : null;
        $commercialLegs = self::sanitizeCommercialLegs(
            array_key_exists('commercial_legs', $cs) ? $cs['commercial_legs'] : ($occ['commercial_legs'] ?? []),
            $commitmentMonths
        );

        $rawSelectionsSource = is_array($drafts['features'] ?? null) ? $drafts['features'] : ($occ['rate_sheet_items'] ?? []);
        // Bridge a legacy zero-leg record into the mandatory-leg model — this
        // is the derivation that actually persists (normaliseTierSlot()'s own
        // call is read-time-only display, never itself a write). Harmless
        // when $switchingSheet is also true: $selections below still
        // unconditionally clears to [] in that case, so a leg synthesized
        // with a since-discarded backfill is still a correct leg, just with
        // nothing (yet) assigned to it. See synthesizeFirstCommercialLeg().
        if ($commercialLegs === []) {
            $synthesized = self::synthesizeFirstCommercialLeg(
                $ov['billing_cycle'] ?? ($occ['billing_cycle'] ?? null),
                $commitmentMonths,
                is_array($rawSelectionsSource) ? $rawSelectionsSource : []
            );
            $commercialLegs = $synthesized['commercial_legs'];
            $rawSelectionsSource = $synthesized['rate_sheet_items'];
        }

        $selections = $switchingSheet
            ? []
            : self::sanitizeTierRateSheetSelections($rawSelectionsSource, $commercialLegs);

        $tierData = [
            'label'               => $ov['label']         ?? ($occ['label']         ?? ''),
            'ideal_for'           => $ov['ideal_for']     ?? ($occ['ideal_for']     ?? ''),
            'audience_groups'     => self::sanitizeTierAudienceGroups($ov['audience_groups'] ?? ($occ['audience_groups'] ?? self::DEFAULT_TIER_AUDIENCE_GROUPS)),
            'price'               => null,
            'contact'             => $ov['contact']        ?? ($occ['contact']        ?? false),
            'billing_cycle'       => $ov['billing_cycle']  ?? ($occ['billing_cycle']  ?? null),
            'minimum_term_value'  => $minTermValue,
            'minimum_term_unit'   => $minTermUnit,
            'commitment_enabled'  => $commitmentEnabled,
            'active_billing_cycles' => $activeBillingCycles,
            'commercial_legs'       => $commercialLegs,
            'rate_sheet_id'       => $draftRateSheetId,
            'inclusions_override' => [],
            'rate_sheet_items'    => $selections,
            'features'            => $occ['features'] ?? [],
            'faq_refs'            => is_array($drafts['faqs'] ?? null) ? $drafts['faqs'] : ($occ['faq_refs'] ?? []),
            // Draft-preferred like every other overview scalar: an edited-but-
            // unsettled is_addon change wins, otherwise the settled occupant's
            // existing value carries forward untouched.
            'is_addon'            => $ov['is_addon']       ?? ($occ['is_addon']       ?? false),
        ];

        // Publish alone activates and clears the explicit Disable marker —
        // Enable is a separate transition that never activates on its own, and
        // Disable/Enable never touch this settle path.
        $result = self::commitTierLifecycle(self::upsertOccupant($slot, $tierData, true));
        if (is_array($result['current_occupant'] ?? null)) {
            $result['current_occupant']['is_explicitly_disabled'] = false;
        }
        return $result;
    }
}
