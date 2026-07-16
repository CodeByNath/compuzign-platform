<?php

namespace CompuZign\Platform\Modules\Service\Support;

/**
 * ServicePools — the write path for the Service-owned inclusion/FAQ pools.
 *
 * Features (inclusions) and FAQs are owned exclusively by the Service pools
 * (cz_service_inclusions / cz_service_faqs). Two callers add to them:
 *
 *   1. Service's own pool endpoints (/inclusion-pool/items, /faq-pool/items) —
 *      immediate canonical creation, no draft indirection.
 *   2. Package Station tier saves, which may carry `new_inclusions` / `new_faqs`
 *      and need a real pool id back to reference from a tier module draft.
 *
 * Extracted (unchanged) when the Package Station handlers left
 * AdminServicesController, so the two callers keep sharing ONE implementation
 * rather than duplicating the pool write. The complementary read/graph
 * operations live in Admin\Support\PoolReferences, which is deliberately pure
 * (no WordPress calls), so this meta read/write path could not live there.
 *
 * Writing to a pool never changes module_status and never touches drafts.
 * Dedupe is case-insensitive on label/question, or exact id match; a duplicate
 * resolves to the existing item rather than erroring or creating a copy.
 *
 * This is the Service module's one public support contract. Package Station
 * imports it directly, which is the intended direction: Package Station writes
 * references into pools that the Service owns, so it must go through the
 * Service's write path rather than touching cz_service_* meta itself. Nothing
 * outside the module may import ServiceController or its internals.
 *
 * The meta key constants below intentionally duplicate ServiceSchema's: this
 * class is consumed cross-module and stays standalone, and the pair is pinned
 * by the same canonical keys.
 */
final class ServicePools
{
    public const META_INCLUSIONS = 'cz_service_inclusions';
    public const META_FAQS       = 'cz_service_faqs';

    /** @return array<int, array{id: string, label: string}> */
    public static function addInclusions(int $serviceId, array $items): array
    {
        if (empty($items)) { return []; }
        $raw  = get_post_meta($serviceId, self::META_INCLUSIONS, true) ?: [];
        $pool = (isset($raw['inclusions']) && is_array($raw['inclusions'])) ? $raw['inclusions'] : [];
        $byId = array_flip(array_column($pool, 'id'));
        $byLb = array_flip(array_map('strtolower', array_column($pool, 'label')));
        $added = [];
        foreach ($items as $item) {
            $label = sanitize_text_field((string) ($item['label'] ?? ''));
            if ($label === '') { continue; }
            $id = sanitize_title($label);
            if (isset($byId[$id]) || isset($byLb[strtolower($label)])) { continue; }
            $inc = ['id' => $id, 'label' => $label];
            $pool[] = $inc; $added[] = $inc;
            $byId[$id] = true; $byLb[strtolower($label)] = true;
        }
        if (!empty($added)) {
            $raw['inclusions'] = $pool;
            if (!isset($raw['tier_inclusions']) || !is_array($raw['tier_inclusions'])) {
                $raw['tier_inclusions'] = array_fill_keys(\CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, []);
            }
            update_post_meta($serviceId, self::META_INCLUSIONS, $raw);
        }
        return $added;
    }

    /** @return string[] */
    public static function addFaqs(int $serviceId, array $items): array
    {
        if (empty($items)) { return []; }
        $pool = get_post_meta($serviceId, self::META_FAQS, true) ?: [];
        if (!is_array($pool)) { $pool = []; }
        $byId = array_flip(array_column($pool, 'id'));
        $byQ  = array_flip(array_map('strtolower', array_column($pool, 'question')));
        $added = [];
        foreach ($items as $item) {
            $q = sanitize_text_field((string) ($item['question'] ?? ''));
            $a = sanitize_textarea_field((string) ($item['answer'] ?? ''));
            if ($q === '') { continue; }
            $id = sanitize_title($q);
            if (isset($byId[$id]) || isset($byQ[strtolower($q)])) { continue; }
            $pool[] = ['id' => $id, 'question' => $q, 'answer' => $a];
            $added[] = $id; $byId[$id] = true; $byQ[strtolower($q)] = true;
        }
        if (!empty($added)) { update_post_meta($serviceId, self::META_FAQS, $pool); }
        return $added;
    }
}
