<?php

namespace CompuZign\Platform\Modules\Admin\Support;

/**
 * PoolReferences — reference-graph utilities for the shared Service pools.
 *
 * Features (inclusions) and FAQs are owned exclusively by the Service pools
 * (cz_service_inclusions / cz_service_faqs). Tier occupants and Promotion
 * instances persist references only — `{id, label}` pairs where the id is
 * authoritative and the label is a display cache, or bare id strings for
 * FAQ refs. These helpers implement the two graph operations every station
 * shares:
 *
 *   1. Label refresh / dangling detection — resolve refs against the pool at
 *      read time. A resolving ref gets the pool's current label; a dangling
 *      ref keeps its cached label and is flagged, never crashed on, never
 *      auto-pruned (the pool item may return; restore must stay faithful).
 *
 *   2. Reference counting — collect every pool id referenced anywhere in the
 *      graph, including drafts, all promotion statuses, and binned occupants
 *      (the holders no admin ever looks at), so pool edits can warn before
 *      orphaning a referenced item.
 *
 * Pure array-in/array-out; no WordPress calls. Stations own their own meta
 * reads/writes and pass the raw arrays in.
 */
final class PoolReferences
{
    // ── Label refresh / dangling detection ────────────────────────────────────

    /**
     * Refresh `{id, label}` ref-pairs against the inclusion pool.
     * Id is authoritative: a resolving ref gets the pool's current label; a
     * dangling ref keeps its cached label and gains `missing => true` (unless
     * $flagMissing is false — used for exclusions, where an off-pool ref is
     * legitimate). Refs without an id are dropped; order is preserved.
     *
     * @param array<int, mixed> $pool cz_service_inclusions items: [{id, label}]
     * @param array<int, mixed> $refs stored ref-pairs: [{id, label}]
     * @return array<int, array{id: string, label: string, missing?: bool}>
     */
    public static function refreshInclusionLabels(array $pool, array $refs, bool $flagMissing = true): array
    {
        $labelById = [];
        foreach ($pool as $item) {
            if (!is_array($item)) {
                continue;
            }
            $id    = (string) ($item['id'] ?? '');
            $label = (string) ($item['label'] ?? '');
            if ($id !== '' && $label !== '') {
                $labelById[$id] = $label;
            }
        }

        $out = [];
        foreach ($refs as $ref) {
            if (!is_array($ref)) {
                continue;
            }
            $id = (string) ($ref['id'] ?? '');
            if ($id === '') {
                continue;
            }
            if (isset($labelById[$id])) {
                $out[] = ['id' => $id, 'label' => $labelById[$id]];
                continue;
            }
            $entry = ['id' => $id, 'label' => (string) ($ref['label'] ?? '')];
            if ($flagMissing) {
                $entry['missing'] = true;
            }
            $out[] = $entry;
        }
        return $out;
    }

    /**
     * Dangling FAQ refs: the subset of bare-id refs with no matching pool item.
     * Refs are returned in original order; never pruned from the source.
     *
     * @param array<int, mixed>  $pool cz_service_faqs items: [{id, question, answer}]
     * @param array<int, mixed>  $refs stored refs: [string]
     * @return string[] dangling ids
     */
    public static function missingFaqRefs(array $pool, array $refs): array
    {
        $known = [];
        foreach ($pool as $item) {
            if (is_array($item) && (string) ($item['id'] ?? '') !== '') {
                $known[(string) $item['id']] = true;
            }
        }

        $missing = [];
        foreach ($refs as $ref) {
            if (!is_string($ref) || $ref === '') {
                continue;
            }
            if (!isset($known[$ref])) {
                $missing[] = $ref;
            }
        }
        return $missing;
    }

    // ── Reference counting ─────────────────────────────────────────────────────

    /**
     * Collect every inclusion-pool id referenced anywhere in the station graph.
     * Spans tier occupants + module drafts, binned occupants (occupant_bin —
     * additive, absent pre-D2), and promotion instances of every status
     * including their lifecycle drafts (additive, absent pre-C1).
     *
     * @param array<string, mixed> $packageStation     cz_service_package_station
     * @param array<int, mixed>    $promotionInstances Package Station promotion instances
     * @return array<string, string[]> pool id → holder labels (e.g. 'tier:premium', 'promo:promo_ab12:draft')
     */
    public static function collectInclusionRefs(array $packageStation, array $promotionInstances): array
    {
        $map = [];
        $add = static function (mixed $ref, string $holder) use (&$map): void {
            $id = is_array($ref) ? (string) ($ref['id'] ?? '') : (is_string($ref) ? $ref : '');
            if ($id !== '') {
                $map[$id][] = $holder;
            }
        };

        $tiers = $packageStation['tiers'] ?? [];
        foreach ((is_array($tiers) ? $tiers : []) as $tierId => $slot) {
            if (!is_array($slot)) {
                continue;
            }
            $occ = $slot['current_occupant'] ?? null;
            foreach ((is_array($occ) ? ($occ['inclusions_override'] ?? []) : []) as $ref) {
                $add($ref, "tier:$tierId");
            }
            $draft = $slot['drafts']['features'] ?? null;
            foreach ((is_array($draft) ? $draft : []) as $ref) {
                $add($ref, "tier:$tierId:draft");
            }
        }

        $bin = $packageStation['occupant_bin'] ?? [];
        foreach ((is_array($bin) ? $bin : []) as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $binId = (string) ($entry['bin_id'] ?? '');
            $occ   = $entry['occupant'] ?? null;
            foreach ((is_array($occ) ? ($occ['inclusions_override'] ?? []) : []) as $ref) {
                $add($ref, "bin:$binId");
            }
        }

        foreach ($promotionInstances as $inst) {
            if (!is_array($inst)) {
                continue;
            }
            $pid = (string) ($inst['id'] ?? '');
            foreach ((is_array($inst['inclusions'] ?? null) ? $inst['inclusions'] : []) as $ref) {
                $add($ref, "promo:$pid");
            }
            foreach ((is_array($inst['exclusions'] ?? null) ? $inst['exclusions'] : []) as $ref) {
                $add($ref, "promo:$pid:exclusions");
            }
            $draft = $inst['lifecycle']['drafts']['features'] ?? null;
            foreach ((is_array($draft) ? $draft : []) as $ref) {
                $add($ref, "promo:$pid:draft");
            }
        }

        return $map;
    }

    /**
     * Collect every FAQ-pool id referenced anywhere in the station graph.
     * Same holder span and label scheme as collectInclusionRefs.
     *
     * @param array<string, mixed> $packageStation     cz_service_package_station
     * @param array<int, mixed>    $promotionInstances Package Station promotion instances
     * @return array<string, string[]> pool id → holder labels
     */
    public static function collectFaqRefs(array $packageStation, array $promotionInstances): array
    {
        $map = [];
        $add = static function (mixed $ref, string $holder) use (&$map): void {
            if (is_string($ref) && $ref !== '') {
                $map[$ref][] = $holder;
            }
        };

        $tiers = $packageStation['tiers'] ?? [];
        foreach ((is_array($tiers) ? $tiers : []) as $tierId => $slot) {
            if (!is_array($slot)) {
                continue;
            }
            $occ = $slot['current_occupant'] ?? null;
            foreach ((is_array($occ) ? ($occ['faq_refs'] ?? []) : []) as $ref) {
                $add($ref, "tier:$tierId");
            }
            $draft = $slot['drafts']['faqs'] ?? null;
            foreach ((is_array($draft) ? $draft : []) as $ref) {
                $add($ref, "tier:$tierId:draft");
            }
        }

        $bin = $packageStation['occupant_bin'] ?? [];
        foreach ((is_array($bin) ? $bin : []) as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $binId = (string) ($entry['bin_id'] ?? '');
            $occ   = $entry['occupant'] ?? null;
            foreach ((is_array($occ) ? ($occ['faq_refs'] ?? []) : []) as $ref) {
                $add($ref, "bin:$binId");
            }
        }

        foreach ($promotionInstances as $inst) {
            if (!is_array($inst)) {
                continue;
            }
            $pid = (string) ($inst['id'] ?? '');
            foreach ((is_array($inst['faq_refs'] ?? null) ? $inst['faq_refs'] : []) as $ref) {
                $add($ref, "promo:$pid");
            }
            $draft = $inst['lifecycle']['drafts']['faqs'] ?? null;
            foreach ((is_array($draft) ? $draft : []) as $ref) {
                $add($ref, "promo:$pid:draft");
            }
        }

        return $map;
    }
}
