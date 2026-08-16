<?php

/*
 * FILE INDEX
 *
 * STATION_PERSISTENCE    Load, cache, defaults, save, and legacy migration
 * PROMOTION_PERSISTENCE  Promotion collection load and save
 * SOURCE_PROJECTIONS     Inclusion/FAQ pools and Service provenance
 * PACKAGE_LOOKUPS        Coverage and active/disabled Package indexes
 *
 * Search: SECTION: STATION_PERSISTENCE
 *         SECTION: PROMOTION_PERSISTENCE
 *         SECTION: SOURCE_PROJECTIONS
 *         SECTION: PACKAGE_LOOKUPS
 */

namespace CompuZign\Platform\Modules\SurfacePackages\Repositories;

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference;

/**
 * Single authority for Package Station storage.
 *
 * The station (Package Manager, Tier instances and assignments, Promotions,
 * and aggregate status) lives in one WP option — COMPUZIGN option
 * `cz_package_station` — fully independent of any cz_service post. Deleting or
 * disconnecting a Service can no longer destroy commercial data; missing
 * sources degrade to the source_missing operational state at read time.
 *
 * Cutover compatibility (temporary, in loadStation()): when the option is
 * absent, the station is migrated once from the legacy Service-hosted
 * cz_service_package_station post meta. The originating service ID is kept
 * as legacy_host_service_id so stored item IDs (unprefixed for the old host,
 * `service:{id}:` for other sources) remain stable.
 */
class PackageRepository
{
    // ===================================================================
    // SECTION: STATION_PERSISTENCE
    // ===================================================================
    public const OPTION_KEY = 'cz_package_station';

    private const LEGACY_STATION_META   = 'cz_service_package_station';
    private const LEGACY_PROMOTION_META = 'cz_service_promotion_station';
    private const SERVICE_POST_TYPE     = 'cz_service';

    /** Request-scope cache: false = not loaded, null = no station exists. */
    private array|null|false $stationCache = false;

    /** Assignment-resolved public index, built at most once per request. */
    private array|false $activePackageMapCache = false;

    /** Direct Family-assignment customer projection, built once per request. */
    private array|false $activeFamilyOfferCache = false;

    // ── Storage authority ─────────────────────────────────────────────────────

    /**
     * Load the station from its independent anchor. Returns null when no
     * station exists anywhere (fresh install, nothing to migrate).
     */
    public function loadStation(): ?array
    {
        if ($this->stationCache !== false) {
            return $this->stationCache;
        }

        $station = get_option(self::OPTION_KEY, null);
        if (is_array($station) && !empty($station)) {
            $station = $this->ensurePromotions($station);
            return $this->stationCache = TierInstanceSchema::liftLegacyStation($station);
        }

        // One-time cutover migration from the legacy Service-hosted meta.
        $station = $this->migrateFromLegacyServiceMeta();
        if ($station !== null) {
            $station = $this->ensurePromotions($station);
            $station = TierInstanceSchema::liftLegacyStation($station);
        }

        return $this->stationCache = $station;
    }

    // ── Promotions (child collection of the independent station) ──────────────

    /**
     * Raw promotion instances stored on the station. The station is the only
     * authority — no Service postmeta is read.
     *
     * @return array<int, array<string, mixed>>
     */
    // ===================================================================
    // SECTION: PROMOTION_PERSISTENCE
    // ===================================================================
    public function loadPromotions(): array
    {
        $station = $this->loadStation();
        return is_array($station['promotions'] ?? null) ? $station['promotions'] : [];
    }

    /** Persist the promotion collection atomically inside the station. */
    public function savePromotions(array $instances): void
    {
        $station = $this->loadStation() ?? $this->defaultStation();
        $station['promotions'] = array_values($instances);
        $this->saveStation($station);
    }

    /**
     * Cutover bridge — promotions used to live on Service postmeta
     * (cz_service_promotion_station). The first load after cutover copies the
     * richest migrated Service-hosted collection into the station, once. The
     * legacy meta is left in place untouched (read-only safety net); nothing
     * reads it after this runs. This established load-time bridge deliberately
     * bypasses saveStation: routing it through the Tier canonical write boundary
     * would prune legacy Tier keys during a read rather than a real mutation.
     */
    private function ensurePromotions(array $station): array
    {
        if (array_key_exists('promotions', $station)) {
            return $station;
        }

        $serviceIds = get_posts([
            'post_type'              => self::SERVICE_POST_TYPE,
            'post_status'            => 'any',
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]);

        $best = [];
        foreach (is_array($serviceIds) ? $serviceIds : [] as $serviceId) {
            $promoStation = get_post_meta((int) $serviceId, self::LEGACY_PROMOTION_META, true);
            if (!is_array($promoStation) || empty($promoStation['migrated'])) {
                continue;
            }
            $instances = is_array($promoStation['instances'] ?? null) ? $promoStation['instances'] : [];
            if (count($instances) > count($best)) {
                $best = $instances;
            }
        }

        $station['promotions'] = array_values($best);
        update_option(self::OPTION_KEY, $station, false);

        return $station;
    }

    /** Persist the station atomically to its independent anchor. */
    public function saveStation(array $station): void
    {
        // The read path exposes a legacy-only station without writing. Its first
        // real mutation lifts the Tier data before pruning the obsolete top-level
        // projection from this one atomic persistence candidate.
        $station = TierInstanceSchema::liftLegacyStation($station, true);
        $updated = update_option(self::OPTION_KEY, $station, false);

        // WordPress also returns false when the value is already unchanged, so
        // false alone is not a persistence failure. Read the option back and
        // compare the exact serialized value before deciding. Keep the previous
        // request cache untouched until persistence has been confirmed; otherwise
        // a failed write could still be returned to the caller as if it succeeded.
        if (!$updated) {
            $persisted = get_option(self::OPTION_KEY, null);
            if (serialize($persisted) !== serialize($station)) {
                throw new \RuntimeException('package_station_persistence_failed');
            }
        }

        $this->stationCache = $station;
        $this->activePackageMapCache = false;
        $this->activeFamilyOfferCache = false;
    }

    /** Fresh station shell for first-time configuration. */
    public function defaultStation(): array
    {
        return [
            'platform_status'         => 'disabled',
            'tier_instances'          => TierInstanceSchema::defaultInstances(),
            'tier_assignments'        => [],
            'sort_position'           => 0,
            'bundle'                  => ['title' => '', 'description' => '', 'price' => null],
            'promotions'              => [],
            'package_manager'         => PackageManagerSchema::defaultManager(),
            'legacy_host_service_id'  => 0,
        ];
    }

    /** Package-owned scalar identity read for one native Family reference. */
    public function familyPlatformId(string $groupId): string
    {
        $station = $this->loadStation();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        $group = PackageCategoryGroups::find($manager['category_groups'], $groupId);
        return is_array($group) ? (string) ($group['cz_platform_id'] ?? '') : '';
    }

    /** Immutable scalar claim used by PlatformIdentifierStation assignment. */
    public function claimFamilyPlatformId(string $groupId, string $platformId): bool
    {
        $station = $this->loadStation();
        if (!is_array($station)) return false;
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        $group = PackageCategoryGroups::find($manager['category_groups'], $groupId);
        if ($group === null) return false;
        $stored = (string) ($group['cz_platform_id'] ?? '');
        if ($stored !== '') return $stored === $platformId;
        $group['cz_platform_id'] = $platformId;
        $manager['category_groups'] = PackageCategoryGroups::replace($manager['category_groups'], $group);
        $station['package_manager'] = $manager;
        $this->saveStation($station);
        return $this->familyPlatformId($groupId) === $platformId;
    }

    public function familyPlatformIdExists(string $platformId): bool
    {
        $station = $this->loadStation();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        foreach ($manager['category_groups'] as $group) {
            if (is_array($group) && ($group['cz_platform_id'] ?? '') === $platformId) return true;
        }
        return false;
    }

    /**
     * Bounded, stable native Family identities for Platform-ID assignment.
     * The cursor is the last processed string group_id, not a mutable offset.
     *
     * @return array{items: list<string>, next_cursor: string|null, complete: bool}
     */
    public function familyAssignmentPage(?string $cursor, int $limit): array
    {
        if ($limit < 1 || $limit > 500) {
            throw new \InvalidArgumentException('Package Family assignment limit must be between 1 and 500.');
        }

        $station = $this->loadStation();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        $ids = [];
        foreach ($manager['category_groups'] as $group) {
            $groupId = is_array($group) ? (string) ($group['group_id'] ?? '') : '';
            if ($groupId !== '' && ($cursor === null || strcmp($groupId, $cursor) > 0)) {
                $ids[] = $groupId;
            }
        }
        sort($ids, SORT_STRING);

        $items = array_slice($ids, 0, $limit);
        return [
            'items' => $items,
            'next_cursor' => $items === [] ? $cursor : $items[array_key_last($items)],
            'complete' => count($ids) <= $limit,
        ];
    }

    /** Package-owned Tier Group scalar read using the canonical registry reference. */
    public function tierGroupPlatformId(string $nativeReference): string
    {
        $parts = PackagePlatformNativeReference::parse($nativeReference, 'tier-group', 1);
        if ($parts === null) return '';
        $station = $this->loadStation();
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $parts[0]);
        return is_array($instance) ? (string) ($instance['cz_platform_id'] ?? '') : '';
    }

    /** Immutable Tier Group scalar claim used only by PlatformIdentifierStation. */
    public function claimTierGroupPlatformId(string $nativeReference, string $platformId): bool
    {
        $parts = PackagePlatformNativeReference::parse($nativeReference, 'tier-group', 1);
        if ($parts === null) return false;
        $station = $this->loadStation();
        if (!is_array($station)) return false;
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $parts[0]);
        if ($instance === null) return false;
        $stored = (string) ($instance['cz_platform_id'] ?? '');
        if ($stored !== '') return $stored === $platformId;
        $instance['cz_platform_id'] = $platformId;
        $station = TierInstanceSchema::withInstance($station, $parts[0], $instance);
        $this->saveStation($station);
        return $this->tierGroupPlatformId($nativeReference) === $platformId;
    }

    public function tierGroupPlatformIdExists(string $platformId): bool
    {
        $station = $this->loadStation();
        foreach (is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [] as $instance) {
            if (is_array($instance) && ($instance['cz_platform_id'] ?? '') === $platformId) return true;
        }
        return false;
    }

    /** @return array{items:list<string>,next_cursor:string|null,complete:bool} */
    public function tierGroupAssignmentPage(?string $cursor, int $limit): array
    {
        if ($limit < 1 || $limit > 500) {
            throw new \InvalidArgumentException('Tier Group assignment limit must be between 1 and 500.');
        }
        $station = $this->loadStation();
        $ids = [];
        foreach (is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [] as $instance) {
            $id = is_array($instance) ? (string) ($instance['tier_instance_id'] ?? '') : '';
            if ($id !== '' && ($cursor === null || strcmp($id, $cursor) > 0)) $ids[] = $id;
        }
        sort($ids, SORT_STRING);
        $page = array_slice($ids, 0, $limit);
        return [
            'items' => array_map(static fn(string $id): string => PackagePlatformNativeReference::tierGroup($id), $page),
            'next_cursor' => $page === [] ? $cursor : $page[array_key_last($page)],
            'complete' => count($ids) <= $limit,
        ];
    }

    public function tierGroupProjection(string $nativeReference): ?array
    {
        $parts = PackagePlatformNativeReference::parse($nativeReference, 'tier-group', 1);
        if ($parts === null) return null;
        $station = $this->loadStation();
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $parts[0]);
        if ($instance === null) return null;
        // Derived, output-only, never stored: this Tier Group answering for its
        // own downstream structure so upstream consumers do not reproduce it.
        $instance['composition'] = $this->tierGroupComposition($station, $instance);
        return $instance;
    }

    /**
     * What this Tier Group composes, resolved live through its OWN structure:
     *
     *   Tier Group → Tiers → occupants → selected inclusions → Rate Sheet rows
     *   → the Service Category → Service provenance those rows already carry.
     *
     * Computed on read and never persisted — a stored counter would go stale on
     * every occupant, Rate Sheet, Service, or Edition write, and the platform
     * derives every comparable figure (`dependents()`, `activeTierSlotSummary()`,
     * the occupant's own Editions count) the same way.
     *
     * Scope is structural: the walk starts at this instance's own `tiers` map,
     * so no other Tier Group's occupants — and therefore no other Package
     * Family's composition — can be reached from here. The Tier Group gains no
     * ownership of a Service, Category, or Rate Sheet by counting what its own
     * occupants already reference.
     *
     * @return array{tiers:int, service_categories:int, services:int, inclusions:int}
     */
    private function tierGroupComposition(array $station, array $instance): array
    {
        return $this->composeTierGroup($this->compositionIndex($station), $instance)['composition'];
    }

    /**
     * What several Tier Groups derive, in one pass, keyed by
     * `tier_instance_id` — the batch form the Package Family list route needs
     * so a wall of N Families costs ONE read-model build rather than N.
     *
     * Each entry carries the group's `composition` (the four counts) and the
     * native `service_ids` behind it. Both come from ONE walk because they are
     * one fact: the Services a Family reaches and the number of them must never
     * be computed two different ways.
     *
     * Fails closed exactly as the canonical `CZTG` read does: a Tier Group with
     * no Platform ID is OMITTED, never returned under its native id. A caller
     * reading through here therefore can never obtain a composition it could
     * not equally have addressed by `CZTG`, so batching is a performance
     * detail and not a second, weaker way in.
     *
     * @param  array<int, string> $instanceIds
     * @return array<string, array{composition: array{tiers:int, service_categories:int, services:int, inclusions:int}, service_ids: array<int, int>}>
     */
    public function tierGroupDerivations(array $instanceIds): array
    {
        $ids = [];
        foreach ($instanceIds as $instanceId) {
            $instanceId = (string) $instanceId;
            if ($instanceId !== '') {
                $ids[$instanceId] = true;
            }
        }
        if ($ids === []) {
            return [];
        }

        $station = $this->loadStation();
        if (!is_array($station)) {
            return [];
        }

        // Built lazily and at most once: a station whose Tier Groups all lack a
        // CZTG must not pay for a read model nothing will consume.
        $index = null;
        $compositions = [];
        foreach (array_keys($ids) as $instanceId) {
            $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $instanceId);
            if ($instance === null || (string) ($instance['cz_platform_id'] ?? '') === '') {
                continue;
            }
            $index ??= $this->compositionIndex($station);
            $compositions[$instanceId] = $this->composeTierGroup($index, $instance);
        }

        return $compositions;
    }

    /**
     * Just the four counts, for callers that render a card and need no ids.
     *
     * @param  array<int, string> $instanceIds
     * @return array<string, array{tiers:int, service_categories:int, services:int, inclusions:int}>
     */
    public function tierGroupCompositions(array $instanceIds): array
    {
        return array_map(
            static fn(array $derivation): array => $derivation['composition'],
            $this->tierGroupDerivations($instanceIds)
        );
    }

    /**
     * The station-wide lookup every composition walk resolves rows against:
     * manager items by their own id, and Rate Sheet rows by the canonical
     * `(rate_sheet_id, item_id)` row identity. Depends only on the station, so
     * it is computed once and shared across Tier Groups.
     *
     * @return array{items: array<string, array<string, mixed>>, rows: array<string, array<string, array<string, mixed>>>}
     */
    private function compositionIndex(array $station): array
    {
        $manager = is_array($station['package_manager'] ?? null)
            ? PackageManagerSchema::sanitize($station['package_manager'])
            : PackageManagerSchema::defaultManager();
        [$inclusionPool, $faqPool] = $this->sourcePools($station);
        $readModel = PackageManagerSchema::buildReadModel(
            (int) ($station['legacy_host_service_id'] ?? 0),
            $manager,
            $inclusionPool,
            $faqPool,
            (string) ($station['platform_status'] ?? 'disabled')
        );

        $sourceByItemId = [];
        foreach (is_array($readModel['items'] ?? null) ? $readModel['items'] : [] as $item) {
            if (is_array($item)) {
                $sourceByItemId[(string) ($item['item_id'] ?? '')] = $item;
            }
        }
        $rowsBySheet = [];
        foreach (is_array($readModel['rate_sheets'] ?? null) ? $readModel['rate_sheets'] : [] as $sheet) {
            if (!is_array($sheet)) {
                continue;
            }
            $sheetId = (string) ($sheet['rate_sheet_id'] ?? '');
            foreach (is_array($sheet['items'] ?? null) ? $sheet['items'] : [] as $row) {
                if (is_array($row)) {
                    $rowsBySheet[$sheetId][(string) ($row['item_id'] ?? '')] = $row;
                }
            }
        }

        return ['items' => $sourceByItemId, 'rows' => $rowsBySheet];
    }

    /**
     * The walk itself, over ONE Tier Group's own slots. Pure with respect to
     * the index: it reads, and never rebuilds, the shared lookup.
     *
     * Services and Categories are collected by their OWN native identity — the
     * supplying Service's post id, the category term's id. Platform IDs remain
     * how a downstream reader RESOLVES either record; they are the wrong key to
     * COUNT by, because a Service or term whose CZS/CZC has not been assigned
     * yet would silently drop out and turn the tally into a report on
     * identifier backfill instead of on what the Tier Group actually reaches.
     *
     * @param  array{items: array<string, array<string, mixed>>, rows: array<string, array<string, array<string, mixed>>>} $index
     * @return array{composition: array{tiers:int, service_categories:int, services:int, inclusions:int}, service_ids: array<int, int>}
     */
    private function composeTierGroup(array $index, array $instance): array
    {
        $sourceByItemId = $index['items'];
        $rowsBySheet = $index['rows'];

        $tiers = 0;
        $seenRows = [];
        $services = [];
        $categories = [];

        foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
            $slot = is_array($instance['tiers'][$tierId] ?? null) ? $instance['tiers'][$tierId] : [];
            $occupant = is_array($slot['current_occupant'] ?? null) ? $slot['current_occupant'] : [];
            if ($occupant === []) {
                continue; // an empty shell is neither a Tier nor an Add-on
            }
            // Registration is the fact counted here, exactly as
            // `summarizeTierInstance`/`projectTierGroupConnectionRows` count it:
            // an occupant's own lifecycle status does not unregister its Tier.
            $tiers++;

            // The occupant's settled declaration. Its own pending drafts are a
            // Tier-level editing concern and are deliberately not composed here.
            $sheetId = (string) ($occupant['rate_sheet_id'] ?? '');
            foreach (is_array($occupant['rate_sheet_items'] ?? null) ? $occupant['rate_sheet_items'] : [] as $selection) {
                if (!is_array($selection)) {
                    continue;
                }
                $itemId = (string) ($selection['item_id'] ?? '');
                if ($itemId === '') {
                    continue;
                }
                $row = $rowsBySheet[$sheetId][$itemId] ?? null;
                $source = is_array($row) ? ($sourceByItemId[(string) ($row['source_item_id'] ?? '')] ?? null) : null;
                // Only an inclusion-sourced, resolving row is an Inclusion — an
                // unresolved selection references no live row, and a FAQ row is
                // not an inclusion. Same rule the Tier's own deck applies, and
                // it is applied BEFORE the row is recorded so a skipped row can
                // never occupy the identity of a real one.
                if (!is_array($source) || ($source['source_type'] ?? null) !== 'inclusion') {
                    continue;
                }

                // DEDUPE: row identity is the (rate_sheet_id, item_id) pair, so
                // the same row selected by several Tiers is ONE row of this
                // group's composition. Each Tier's own count is untouched.
                $rowKey = $sheetId . "\0" . $itemId;
                if (isset($seenRows[$rowKey])) {
                    continue;
                }
                $seenRows[$rowKey] = true;

                $serviceId = (int) ($source['source_service_id'] ?? 0);
                if ($serviceId > 0) {
                    $services[$serviceId] = true;
                }
                foreach (is_array($source['source_category_term_ids'] ?? null) ? $source['source_category_term_ids'] : [] as $categoryTermId) {
                    $categoryTermId = (int) $categoryTermId;
                    if ($categoryTermId > 0) {
                        $categories[$categoryTermId] = true;
                    }
                }
            }
        }

        // Ascending so the list route's output is stable between requests
        // regardless of which Tier happened to reach a Service first.
        $serviceIds = array_map('intval', array_keys($services));
        sort($serviceIds);

        return [
            'composition' => [
                'tiers'              => $tiers,
                'service_categories' => count($categories),
                'services'           => count($services),
                'inclusions'         => count($seenRows),
            ],
            'service_ids' => $serviceIds,
        ];
    }

    public function tierOccupantPlatformId(string $nativeReference, bool $addon = false): string
    {
        $located = $this->locateTierOccupant($nativeReference);
        if ($located === null) return '';
        $key = $addon ? 'addon_platform_id' : 'cz_platform_id';
        return (string) ($located['occupant'][$key] ?? '');
    }

    public function claimTierOccupantPlatformId(string $nativeReference, string $platformId, bool $addon = false): bool
    {
        $parts = PackagePlatformNativeReference::parse($nativeReference, 'tier-occupant', 2);
        if ($parts === null) return false;
        $station = $this->loadStation();
        if (!is_array($station)) return false;
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $parts[0]);
        if ($instance === null) return false;
        $key = $addon ? 'addon_platform_id' : 'cz_platform_id';
        $matches = 0;
        foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slotId => $slot) {
            if (is_array($slot['current_occupant'] ?? null) && (string) ($slot['current_occupant']['id'] ?? '') === $parts[1]) {
                $stored = (string) ($slot['current_occupant'][$key] ?? '');
                if ($stored !== '' && $stored !== $platformId) return false;
                $instance['tiers'][$slotId]['current_occupant'][$key] = $platformId;
                $matches++;
            }
        }
        foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $index => $entry) {
            if (is_array($entry['occupant'] ?? null) && (string) ($entry['occupant']['id'] ?? '') === $parts[1]) {
                $stored = (string) ($entry['occupant'][$key] ?? '');
                if ($stored !== '' && $stored !== $platformId) return false;
                $instance['occupant_bin'][$index]['occupant'][$key] = $platformId;
                $matches++;
            }
        }
        if ($matches !== 1) return false;
        $station = TierInstanceSchema::withInstance($station, $parts[0], $instance);
        $this->saveStation($station);
        return $this->tierOccupantPlatformId($nativeReference, $addon) === $platformId;
    }

    public function tierOccupantPlatformIdExists(string $platformId, bool $addon = false): bool
    {
        $key = $addon ? 'addon_platform_id' : 'cz_platform_id';
        $station = $this->loadStation();
        foreach (is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [] as $instance) {
            if (!is_array($instance)) continue;
            foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slot) {
                if (is_array($slot['current_occupant'] ?? null) && ($slot['current_occupant'][$key] ?? '') === $platformId) return true;
            }
            foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $entry) {
                if (is_array($entry['occupant'] ?? null) && ($entry['occupant'][$key] ?? '') === $platformId) return true;
            }
        }
        return false;
    }

    /** @return array{items:list<string>,next_cursor:string|null,complete:bool} */
    public function tierOccupantAssignmentPage(?string $cursor, int $limit, bool $addon = false): array
    {
        if ($limit < 1 || $limit > 500) throw new \InvalidArgumentException('Tier assignment limit must be between 1 and 500.');
        $station = $this->loadStation();
        $references = [];
        foreach (is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [] as $instance) {
            if (!is_array($instance)) continue;
            $instanceId = (string) ($instance['tier_instance_id'] ?? '');
            if ($instanceId === '') continue;
            foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slot) {
                $occupant = is_array($slot['current_occupant'] ?? null) ? $slot['current_occupant'] : null;
                $this->appendEligibleOccupantReference($references, $instanceId, $occupant, $addon);
            }
            foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $entry) {
                $occupant = is_array($entry['occupant'] ?? null) ? $entry['occupant'] : null;
                $this->appendEligibleOccupantReference($references, $instanceId, $occupant, $addon);
            }
        }
        $references = array_values(array_unique($references));
        sort($references, SORT_STRING);
        $eligible = array_values(array_filter($references, static fn(string $reference): bool => $cursor === null || strcmp($reference, $cursor) > 0));
        $page = array_slice($eligible, 0, $limit);
        return ['items' => $page, 'next_cursor' => $page === [] ? $cursor : $page[array_key_last($page)], 'complete' => count($eligible) <= $limit];
    }

    public function tierOccupantProjection(string $nativeReference): ?array
    {
        $located = $this->locateTierOccupant($nativeReference);
        if ($located === null) return null;
        return [
            'tier_instance_id' => $located['tier_instance_id'],
            'location' => $located['location'],
            'is_addon' => (bool) ($located['occupant']['is_addon'] ?? false),
            'occupant' => $located['occupant'],
        ];
    }

    /** @return array{tier_instance_id:string,location:string,occupant:array}|null */
    private function locateTierOccupant(string $nativeReference): ?array
    {
        $parts = PackagePlatformNativeReference::parse($nativeReference, 'tier-occupant', 2);
        if ($parts === null) return null;
        $station = $this->loadStation();
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $parts[0]);
        if ($instance === null) return null;
        $matches = [];
        foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slotId => $slot) {
            $occupant = is_array($slot['current_occupant'] ?? null) ? $slot['current_occupant'] : null;
            if ($occupant !== null && (string) ($occupant['id'] ?? '') === $parts[1]) $matches[] = ['tier_instance_id' => $parts[0], 'location' => 'slot:' . $slotId, 'occupant' => $occupant];
        }
        foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $entry) {
            $occupant = is_array($entry['occupant'] ?? null) ? $entry['occupant'] : null;
            if ($occupant !== null && (string) ($occupant['id'] ?? '') === $parts[1]) $matches[] = ['tier_instance_id' => $parts[0], 'location' => 'bin:' . (string) ($entry['bin_id'] ?? ''), 'occupant' => $occupant];
        }
        return count($matches) === 1 ? $matches[0] : null;
    }

    /** @param list<string> $references */
    private function appendEligibleOccupantReference(array &$references, string $instanceId, ?array $occupant, bool $addon): void
    {
        if ($occupant === null) return;
        $occupantId = (string) ($occupant['id'] ?? '');
        if ($occupantId === '') return;
        if ($addon && !((bool) ($occupant['is_addon'] ?? false) || (string) ($occupant['addon_platform_id'] ?? '') !== '')) return;
        $references[] = PackagePlatformNativeReference::tierOccupant($instanceId, $occupantId);
    }

    public function tierEditionPlatformId(string $nativeReference): string
    {
        $located = $this->locateTierEdition($nativeReference);
        return $located === null ? '' : (string) ($located['edition']['edition_platform_id'] ?? '');
    }

    public function claimTierEditionPlatformId(string $nativeReference, string $platformId): bool
    {
        $parts = PackagePlatformNativeReference::parse($nativeReference, 'tier-edition', 3);
        if ($parts === null) return false;
        [$instanceId, $occupantId, $editionId] = $parts;
        $station = $this->loadStation();
        if (!is_array($station)) return false;
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $instanceId);
        if ($instance === null) return false;
        $matches = 0;
        foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slotId => $slot) {
            $occupant = is_array($slot['current_occupant'] ?? null) ? $slot['current_occupant'] : null;
            if ($occupant === null || (string) ($occupant['id'] ?? '') !== $occupantId) continue;
            foreach (is_array($occupant['tier_editions'] ?? null) ? $occupant['tier_editions'] : [] as $index => $edition) {
                if (!is_array($edition) || (string) ($edition['id'] ?? '') !== $editionId) continue;
                $stored = (string) ($edition['edition_platform_id'] ?? '');
                if ($stored !== '' && $stored !== $platformId) return false;
                $instance['tiers'][$slotId]['current_occupant']['tier_editions'][$index]['edition_platform_id'] = $platformId;
                $matches++;
            }
            foreach (is_array($occupant['tier_edition_bin'] ?? null) ? $occupant['tier_edition_bin'] : [] as $binIndex => $binEntry) {
                $edition = is_array($binEntry['edition'] ?? null) ? $binEntry['edition'] : null;
                if ($edition === null || (string) ($edition['id'] ?? '') !== $editionId) continue;
                $stored = (string) ($edition['edition_platform_id'] ?? '');
                if ($stored !== '' && $stored !== $platformId) return false;
                $instance['tiers'][$slotId]['current_occupant']['tier_edition_bin'][$binIndex]['edition']['edition_platform_id'] = $platformId;
                $matches++;
            }
        }
        foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $binIndex => $entry) {
            $occupant = is_array($entry['occupant'] ?? null) ? $entry['occupant'] : null;
            if ($occupant === null || (string) ($occupant['id'] ?? '') !== $occupantId) continue;
            foreach (is_array($occupant['tier_editions'] ?? null) ? $occupant['tier_editions'] : [] as $index => $edition) {
                if (!is_array($edition) || (string) ($edition['id'] ?? '') !== $editionId) continue;
                $stored = (string) ($edition['edition_platform_id'] ?? '');
                if ($stored !== '' && $stored !== $platformId) return false;
                $instance['occupant_bin'][$binIndex]['occupant']['tier_editions'][$index]['edition_platform_id'] = $platformId;
                $matches++;
            }
            foreach (is_array($occupant['tier_edition_bin'] ?? null) ? $occupant['tier_edition_bin'] : [] as $editionBinIndex => $binEntry) {
                $edition = is_array($binEntry['edition'] ?? null) ? $binEntry['edition'] : null;
                if ($edition === null || (string) ($edition['id'] ?? '') !== $editionId) continue;
                $stored = (string) ($edition['edition_platform_id'] ?? '');
                if ($stored !== '' && $stored !== $platformId) return false;
                $instance['occupant_bin'][$binIndex]['occupant']['tier_edition_bin'][$editionBinIndex]['edition']['edition_platform_id'] = $platformId;
                $matches++;
            }
        }
        if ($matches !== 1) return false;
        $station = TierInstanceSchema::withInstance($station, $instanceId, $instance);
        $this->saveStation($station);
        return $this->tierEditionPlatformId($nativeReference) === $platformId;
    }

    public function tierEditionPlatformIdExists(string $platformId): bool
    {
        $station = $this->loadStation();
        foreach (is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [] as $instance) {
            if (!is_array($instance)) continue;
            foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slot) {
                $occupant = is_array($slot['current_occupant'] ?? null) ? $slot['current_occupant'] : null;
                if ($this->tierEditionListHasPlatformId($occupant, $platformId)) return true;
            }
            foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $entry) {
                $occupant = is_array($entry['occupant'] ?? null) ? $entry['occupant'] : null;
                if ($this->tierEditionListHasPlatformId($occupant, $platformId)) return true;
            }
        }
        return false;
    }

    /** @return array{items:list<string>,next_cursor:string|null,complete:bool} */
    public function tierEditionAssignmentPage(?string $cursor, int $limit): array
    {
        if ($limit < 1 || $limit > 500) throw new \InvalidArgumentException('Tier Edition assignment limit must be between 1 and 500.');
        $station = $this->loadStation();
        $references = [];
        foreach (is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [] as $instance) {
            if (!is_array($instance)) continue;
            $instanceId = (string) ($instance['tier_instance_id'] ?? '');
            if ($instanceId === '') continue;
            foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slot) {
                $occupant = is_array($slot['current_occupant'] ?? null) ? $slot['current_occupant'] : null;
                $this->appendEligibleEditionReferences($references, $instanceId, $occupant);
            }
            foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $entry) {
                $occupant = is_array($entry['occupant'] ?? null) ? $entry['occupant'] : null;
                $this->appendEligibleEditionReferences($references, $instanceId, $occupant);
            }
        }
        $references = array_values(array_unique($references));
        sort($references, SORT_STRING);
        $eligible = array_values(array_filter($references, static fn(string $reference): bool => $cursor === null || strcmp($reference, $cursor) > 0));
        $page = array_slice($eligible, 0, $limit);
        return ['items' => $page, 'next_cursor' => $page === [] ? $cursor : $page[array_key_last($page)], 'complete' => count($eligible) <= $limit];
    }

    public function tierEditionProjection(string $nativeReference): ?array
    {
        $located = $this->locateTierEdition($nativeReference);
        if ($located === null) return null;
        return [
            'tier_instance_id' => $located['tier_instance_id'],
            'occupant_id'      => $located['occupant_id'],
            'location'         => $located['location'],
            'edition'          => $located['edition'],
        ];
    }

    /** @return array{tier_instance_id:string,occupant_id:string,location:string,edition:array}|null */
    private function locateTierEdition(string $nativeReference): ?array
    {
        $parts = PackagePlatformNativeReference::parse($nativeReference, 'tier-edition', 3);
        if ($parts === null) return null;
        [$instanceId, $occupantId, $editionId] = $parts;
        $station = $this->loadStation();
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $instanceId);
        if ($instance === null) return null;
        $matches = [];
        foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slotId => $slot) {
            $occupant = is_array($slot['current_occupant'] ?? null) ? $slot['current_occupant'] : null;
            if ($occupant === null || (string) ($occupant['id'] ?? '') !== $occupantId) continue;
            foreach (is_array($occupant['tier_editions'] ?? null) ? $occupant['tier_editions'] : [] as $edition) {
                if (is_array($edition) && (string) ($edition['id'] ?? '') === $editionId) {
                    $matches[] = ['tier_instance_id' => $instanceId, 'occupant_id' => $occupantId, 'location' => 'slot:' . $slotId, 'edition' => $edition];
                }
            }
            foreach (is_array($occupant['tier_edition_bin'] ?? null) ? $occupant['tier_edition_bin'] : [] as $binEntry) {
                $edition = is_array($binEntry['edition'] ?? null) ? $binEntry['edition'] : null;
                if ($edition !== null && (string) ($edition['id'] ?? '') === $editionId) {
                    $matches[] = ['tier_instance_id' => $instanceId, 'occupant_id' => $occupantId, 'location' => 'slot:' . $slotId . ':edition-bin:' . (string) ($binEntry['bin_id'] ?? ''), 'edition' => $edition];
                }
            }
        }
        foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $entry) {
            $occupant = is_array($entry['occupant'] ?? null) ? $entry['occupant'] : null;
            if ($occupant === null || (string) ($occupant['id'] ?? '') !== $occupantId) continue;
            foreach (is_array($occupant['tier_editions'] ?? null) ? $occupant['tier_editions'] : [] as $edition) {
                if (is_array($edition) && (string) ($edition['id'] ?? '') === $editionId) {
                    $matches[] = ['tier_instance_id' => $instanceId, 'occupant_id' => $occupantId, 'location' => 'bin:' . (string) ($entry['bin_id'] ?? ''), 'edition' => $edition];
                }
            }
            foreach (is_array($occupant['tier_edition_bin'] ?? null) ? $occupant['tier_edition_bin'] : [] as $binEntry) {
                $edition = is_array($binEntry['edition'] ?? null) ? $binEntry['edition'] : null;
                if ($edition !== null && (string) ($edition['id'] ?? '') === $editionId) {
                    $matches[] = ['tier_instance_id' => $instanceId, 'occupant_id' => $occupantId, 'location' => 'bin:' . (string) ($entry['bin_id'] ?? '') . ':edition-bin:' . (string) ($binEntry['bin_id'] ?? ''), 'edition' => $edition];
                }
            }
        }
        return count($matches) === 1 ? $matches[0] : null;
    }

    private function tierEditionListHasPlatformId(?array $occupant, string $platformId): bool
    {
        if ($occupant === null) return false;
        foreach (is_array($occupant['tier_editions'] ?? null) ? $occupant['tier_editions'] : [] as $edition) {
            if (is_array($edition) && ($edition['edition_platform_id'] ?? '') === $platformId) return true;
        }
        foreach (is_array($occupant['tier_edition_bin'] ?? null) ? $occupant['tier_edition_bin'] : [] as $binEntry) {
            $edition = is_array($binEntry['edition'] ?? null) ? $binEntry['edition'] : null;
            if ($edition !== null && ($edition['edition_platform_id'] ?? '') === $platformId) return true;
        }
        return false;
    }

    /** @param list<string> $references */
    private function appendEligibleEditionReferences(array &$references, string $instanceId, ?array $occupant): void
    {
        if ($occupant === null) return;
        $occupantId = (string) ($occupant['id'] ?? '');
        if ($occupantId === '') return;
        foreach (is_array($occupant['tier_editions'] ?? null) ? $occupant['tier_editions'] : [] as $edition) {
            if (!is_array($edition)) continue;
            $editionId = (string) ($edition['id'] ?? '');
            if ($editionId === '') continue;
            $references[] = PackagePlatformNativeReference::tierEdition($instanceId, $occupantId, $editionId);
        }
        foreach (is_array($occupant['tier_edition_bin'] ?? null) ? $occupant['tier_edition_bin'] : [] as $binEntry) {
            $edition = is_array($binEntry['edition'] ?? null) ? $binEntry['edition'] : null;
            $editionId = is_array($edition) ? (string) ($edition['id'] ?? '') : '';
            if ($editionId === '') continue;
            $references[] = PackagePlatformNativeReference::tierEdition($instanceId, $occupantId, $editionId);
        }
    }

    public function rateSheetPlatformId(string $nativeReference, string $scope = 'sheet'): string
    {
        $located = $this->locateRateSheetIdentity($nativeReference, $scope);
        return $located === null ? '' : (string) ($located['record']['cz_platform_id'] ?? '');
    }

    public function claimRateSheetPlatformId(string $nativeReference, string $platformId, string $scope = 'sheet'): bool
    {
        $located = $this->locateRateSheetIdentity($nativeReference, $scope);
        if ($located === null) return false;
        $stored = (string) ($located['record']['cz_platform_id'] ?? '');
        if ($stored !== '') return $stored === $platformId;
        $station = $this->loadStation();
        if (!is_array($station)) return false;
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        foreach ($manager['rate_sheets'] as $sheetIndex => $sheet) {
            if ((string) ($sheet['rate_sheet_id'] ?? '') !== $located['rate_sheet_id']) continue;
            if ($scope === 'sheet') {
                $manager['rate_sheets'][$sheetIndex]['cz_platform_id'] = $platformId;
            } elseif ($scope === 'group') {
                foreach ($sheet['groups'] as $groupIndex => $group) {
                    if ((string) ($group['group_id'] ?? '') === $located['group_id']) {
                        $manager['rate_sheets'][$sheetIndex]['groups'][$groupIndex]['cz_platform_id'] = $platformId;
                    }
                }
            } elseif ($scope === 'item') {
                if (isset($located['bundle_id'])) {
                    foreach ($sheet['bundles'] ?? [] as $bundleIndex => $bundle) {
                        if ((string) ($bundle['bundle_id'] ?? '') === $located['bundle_id']) {
                            $manager['rate_sheets'][$sheetIndex]['bundles'][$bundleIndex]['compiled_item_cz_platform_id'] = $platformId;
                        }
                    }
                } else {
                    foreach ($sheet['items'] as $itemIndex => $item) {
                        if ((string) ($item['item_id'] ?? '') === $located['item_id']) {
                            $manager['rate_sheets'][$sheetIndex]['items'][$itemIndex]['cz_platform_id'] = $platformId;
                        }
                    }
                }
            } elseif ($scope === 'option') {
                foreach ($sheet['items'] as $itemIndex => $item) {
                    if ((string) ($item['item_id'] ?? '') !== $located['item_id']) continue;
                    foreach ($item['price_options'] ?? [] as $optionIndex => $option) {
                        if ((string) ($option['option_id'] ?? '') === $located['option_id']) {
                            $manager['rate_sheets'][$sheetIndex]['items'][$itemIndex]['price_options'][$optionIndex]['cz_platform_id'] = $platformId;
                        }
                    }
                }
                if (isset($located['bundle_id'])) {
                    foreach ($sheet['bundles'] ?? [] as $bundleIndex => $bundle) {
                        if ((string) ($bundle['bundle_id'] ?? '') !== $located['bundle_id']) continue;
                        foreach ($bundle['price_options'] ?? [] as $optionIndex => $option) {
                            if ((string) ($option['option_id'] ?? '') === $located['option_id']) {
                                $manager['rate_sheets'][$sheetIndex]['bundles'][$bundleIndex]['price_options'][$optionIndex]['cz_platform_id'] = $platformId;
                            }
                        }
                    }
                }
            } else {
                foreach ($sheet['bundles'] ?? [] as $bundleIndex => $bundle) {
                    if ((string) ($bundle['bundle_id'] ?? '') !== $located['bundle_id']) continue;
                    if ($scope === 'bundle') {
                        $manager['rate_sheets'][$sheetIndex]['bundles'][$bundleIndex]['cz_platform_id'] = $platformId;
                        continue;
                    }
                    if ($scope === 'bundle-price-option') {
                        foreach ($bundle['price_options'] ?? [] as $optionIndex => $option) {
                            if ((string) ($option['option_id'] ?? '') === $located['option_id']) {
                                $manager['rate_sheets'][$sheetIndex]['bundles'][$bundleIndex]['price_options'][$optionIndex]['cz_platform_id'] = $platformId;
                            }
                        }
                        continue;
                    }
                    if ($scope === 'bundle-item') {
                        $manager['rate_sheets'][$sheetIndex]['bundles'][$bundleIndex]['bundle_item_cz_platform_id'] = $platformId;
                        continue;
                    }
                    foreach ($bundle['items'] ?? [] as $itemIndex => $item) {
                        if ((string) ($item['item_id'] ?? '') !== $located['item_id']) continue;
                        if ($scope === 'bundle-included-item') {
                            $manager['rate_sheets'][$sheetIndex]['bundles'][$bundleIndex]['items'][$itemIndex]['cz_platform_id'] = $platformId;
                            continue;
                        }
                        foreach ($item['price_options'] ?? [] as $optionIndex => $option) {
                            if ((string) ($option['option_id'] ?? '') === $located['option_id']) {
                                $manager['rate_sheets'][$sheetIndex]['bundles'][$bundleIndex]['items'][$itemIndex]['price_options'][$optionIndex]['cz_platform_id'] = $platformId;
                            }
                        }
                    }
                }
            }
        }
        $station['package_manager'] = $manager;
        $this->saveStation($station);
        return $this->rateSheetPlatformId($nativeReference, $scope) === $platformId;
    }

    public function rateSheetPlatformIdExists(string $platformId, string $scope = 'sheet'): bool
    {
        $station = $this->loadStation();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        foreach ($manager['rate_sheets'] as $sheet) {
            if ($scope === 'sheet' && ($sheet['cz_platform_id'] ?? '') === $platformId) return true;
            if ($scope === 'group') foreach ($sheet['groups'] as $group) {
                if (($group['cz_platform_id'] ?? '') === $platformId) return true;
            }
            if ($scope === 'item') {
                foreach ($sheet['items'] as $item) {
                    if (($item['cz_platform_id'] ?? '') === $platformId) return true;
                }
                foreach ($sheet['bundles'] ?? [] as $bundle) {
                    if (($bundle['compiled_item_cz_platform_id'] ?? '') === $platformId) return true;
                }
            }
            if ($scope === 'option') foreach ($sheet['items'] as $item) {
                foreach ($item['price_options'] ?? [] as $option) {
                    if (($option['cz_platform_id'] ?? '') === $platformId) return true;
                }
            }
            if ($scope === 'option') foreach ($sheet['bundles'] ?? [] as $bundle) {
                foreach ($bundle['price_options'] ?? [] as $option) {
                    if (($option['cz_platform_id'] ?? '') === $platformId) return true;
                }
            }
            foreach ($sheet['bundles'] ?? [] as $bundle) {
                if ($scope === 'bundle' && ($bundle['cz_platform_id'] ?? '') === $platformId) return true;
                if ($scope === 'bundle-price-option') foreach ($bundle['price_options'] ?? [] as $option) {
                    if (($option['cz_platform_id'] ?? '') === $platformId) return true;
                }
                if ($scope === 'bundle-item' && ($bundle['bundle_item_cz_platform_id'] ?? '') === $platformId) return true;
                if ($scope === 'bundle-included-item') foreach ($bundle['items'] ?? [] as $item) {
                    if (($item['cz_platform_id'] ?? '') === $platformId) return true;
                }
                if ($scope === 'bundle-option') foreach ($bundle['items'] ?? [] as $item) {
                    foreach ($item['price_options'] ?? [] as $option) {
                        if (($option['cz_platform_id'] ?? '') === $platformId) return true;
                    }
                }
            }
        }
        return false;
    }

    /** @return array{items:list<string>,next_cursor:string|null,complete:bool} */
    public function rateSheetAssignmentPage(?string $cursor, int $limit, string $scope): array
    {
        if ($limit < 1 || $limit > 500) throw new \InvalidArgumentException('Rate Sheet assignment limit must be between 1 and 500.');
        if (!in_array($scope, ['sheet', 'group', 'item', 'option', 'bundle', 'bundle-price-option', 'bundle-item', 'bundle-included-item', 'bundle-option'], true)) throw new \InvalidArgumentException('Rate Sheet assignment scope is not one of the supported Rate Sheet scopes.');
        $station = $this->loadStation();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        $references = [];
        foreach ($manager['rate_sheets'] as $sheet) {
            $sheetId = (string) ($sheet['rate_sheet_id'] ?? '');
            if ($sheetId === '') continue;
            if ($scope === 'sheet') $references[] = PackagePlatformNativeReference::rateSheet($sheetId);
            elseif ($scope === 'group') foreach ($sheet['groups'] as $group) {
                $groupId = (string) ($group['group_id'] ?? '');
                if ($groupId !== '') $references[] = PackagePlatformNativeReference::rateSheetGroup($sheetId, $groupId);
            }
            elseif ($scope === 'item') {
                foreach ($sheet['items'] as $item) {
                    $itemId = (string) ($item['item_id'] ?? '');
                    if ($itemId !== '') $references[] = PackagePlatformNativeReference::rateSheetItem($sheetId, $itemId);
                }
                foreach ($sheet['bundles'] ?? [] as $bundle) {
                    $bundleId = (string) ($bundle['bundle_id'] ?? '');
                    if ($bundleId !== '') $references[] = PackagePlatformNativeReference::rateSheetItem($sheetId, PackageManagerSchema::deriveBundleRowId($bundleId));
                }
            }
            elseif ($scope === 'option') {
                foreach ($sheet['items'] as $item) {
                    $itemId = (string) ($item['item_id'] ?? '');
                    if ($itemId === '') continue;
                    foreach ($item['price_options'] ?? [] as $option) {
                        $optionId = (string) ($option['option_id'] ?? '');
                        if ($optionId !== '') $references[] = PackagePlatformNativeReference::rateSheetItemOption($sheetId, $itemId, $optionId);
                    }
                }
                foreach ($sheet['bundles'] ?? [] as $bundle) {
                    $bundleId = (string) ($bundle['bundle_id'] ?? '');
                    if ($bundleId === '') continue;
                    $compiledItemId = PackageManagerSchema::deriveBundleRowId($bundleId);
                    foreach ($bundle['price_options'] ?? [] as $option) {
                        $optionId = (string) ($option['option_id'] ?? '');
                        if ($optionId !== '') $references[] = PackagePlatformNativeReference::rateSheetItemOption($sheetId, $compiledItemId, $optionId);
                    }
                }
            }
            else foreach ($sheet['bundles'] ?? [] as $bundle) {
                $bundleId = (string) ($bundle['bundle_id'] ?? '');
                if ($bundleId === '') continue;
                if ($scope === 'bundle') {
                    $references[] = PackagePlatformNativeReference::rateSheetBundle($sheetId, $bundleId);
                    continue;
                }
                if ($scope === 'bundle-price-option') {
                    foreach ($bundle['price_options'] ?? [] as $option) {
                        $optionId = (string) ($option['option_id'] ?? '');
                        if ($optionId !== '') $references[] = PackagePlatformNativeReference::rateSheetBundleOption($sheetId, $bundleId, $optionId);
                    }
                    continue;
                }
                if ($scope === 'bundle-item') {
                    $references[] = PackagePlatformNativeReference::rateSheetBundleItem(
                        $sheetId,
                        $bundleId,
                        PackageManagerSchema::deriveBundleRowId($bundleId)
                    );
                    continue;
                }
                foreach ($bundle['items'] ?? [] as $item) {
                    $itemId = (string) ($item['item_id'] ?? '');
                    if ($itemId === '') continue;
                    if ($scope === 'bundle-included-item') {
                        $references[] = PackagePlatformNativeReference::rateSheetBundleIncludedItem($sheetId, $bundleId, $itemId);
                        continue;
                    }
                    foreach ($item['price_options'] ?? [] as $option) {
                        $optionId = (string) ($option['option_id'] ?? '');
                        if ($optionId !== '') $references[] = PackagePlatformNativeReference::rateSheetBundleItemOption($sheetId, $bundleId, $itemId, $optionId);
                    }
                }
            }
        }
        sort($references, SORT_STRING);
        $eligible = array_values(array_filter($references, static fn(string $reference): bool => $cursor === null || strcmp($reference, $cursor) > 0));
        $page = array_slice($eligible, 0, $limit);
        return ['items' => $page, 'next_cursor' => $page === [] ? $cursor : $page[array_key_last($page)], 'complete' => count($eligible) <= $limit];
    }

    public function rateSheetProjection(string $nativeReference, string $scope = 'sheet'): ?array
    {
        return $this->locateRateSheetIdentity($nativeReference, $scope);
    }

    /** @return array{rate_sheet_id:string,group_id?:string,bundle_id?:string,item_id?:string,option_id?:string,record:array}|null */
    private function locateRateSheetIdentity(string $nativeReference, string $scope): ?array
    {
        if (!in_array($scope, ['sheet', 'group', 'item', 'option', 'bundle', 'bundle-price-option', 'bundle-item', 'bundle-included-item', 'bundle-option'], true)) return null;
        $context = match ($scope) {
            'sheet'  => 'rate-sheet',
            'group'  => 'rate-sheet-group',
            'item'   => 'rate-sheet-item',
            'option' => 'rate-sheet-item-option',
            'bundle' => 'rate-sheet-bundle',
            'bundle-price-option' => 'rate-sheet-bundle-option',
            'bundle-item'   => 'rate-sheet-bundle-item',
            'bundle-included-item' => 'rate-sheet-bundle-included-item',
            'bundle-option' => 'rate-sheet-bundle-item-option',
        };
        $segments = match ($scope) {
            'sheet' => 1, 'group', 'item', 'bundle' => 2, 'option', 'bundle-item', 'bundle-included-item', 'bundle-price-option' => 3, 'bundle-option' => 4,
        };
        $parts = PackagePlatformNativeReference::parse($nativeReference, $context, $segments);
        if ($parts === null) return null;
        $station = $this->loadStation();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        $sheet = PackageManagerSchema::findRateSheet($manager['rate_sheets'], $parts[0]);
        if ($sheet === null) return null;
        if ($scope === 'sheet') return ['rate_sheet_id' => $parts[0], 'record' => $sheet];
        if ($scope === 'group') foreach ($sheet['groups'] as $group) {
            if ((string) ($group['group_id'] ?? '') === $parts[1]) {
                return ['rate_sheet_id' => $parts[0], 'group_id' => $parts[1], 'record' => $group];
            }
        }
        if ($scope === 'item') foreach ($sheet['items'] as $item) {
            if ((string) ($item['item_id'] ?? '') === $parts[1]) {
                return ['rate_sheet_id' => $parts[0], 'item_id' => $parts[1], 'record' => $item];
            }
        }
        if ($scope === 'item') foreach ($sheet['bundles'] ?? [] as $bundle) {
            $bundleId = (string) ($bundle['bundle_id'] ?? '');
            if ($bundleId !== '' && PackageManagerSchema::deriveBundleRowId($bundleId) === $parts[1]) {
                return [
                    'rate_sheet_id' => $parts[0],
                    'bundle_id' => $bundleId,
                    'item_id' => $parts[1],
                    'record' => [
                        'item_id' => $parts[1],
                        'cz_platform_id' => (string) ($bundle['compiled_item_cz_platform_id'] ?? ''),
                    ],
                ];
            }
        }
        if ($scope === 'option') foreach ($sheet['items'] as $item) {
            if ((string) ($item['item_id'] ?? '') !== $parts[1]) continue;
            foreach ($item['price_options'] ?? [] as $option) {
                if ((string) ($option['option_id'] ?? '') === $parts[2]) {
                    return ['rate_sheet_id' => $parts[0], 'item_id' => $parts[1], 'option_id' => $parts[2], 'record' => $option];
                }
            }
        }
        if ($scope === 'option') foreach ($sheet['bundles'] ?? [] as $bundle) {
            $bundleId = (string) ($bundle['bundle_id'] ?? '');
            if ($bundleId === '' || PackageManagerSchema::deriveBundleRowId($bundleId) !== $parts[1]) continue;
            foreach ($bundle['price_options'] ?? [] as $option) {
                if ((string) ($option['option_id'] ?? '') === $parts[2]) {
                    return [
                        'rate_sheet_id' => $parts[0], 'bundle_id' => $bundleId,
                        'item_id' => $parts[1], 'option_id' => $parts[2], 'record' => $option,
                    ];
                }
            }
        }
        if (!in_array($scope, ['bundle', 'bundle-price-option', 'bundle-item', 'bundle-included-item', 'bundle-option'], true)) return null;
        foreach ($sheet['bundles'] ?? [] as $bundle) {
            if ((string) ($bundle['bundle_id'] ?? '') !== $parts[1]) continue;
            if ($scope === 'bundle') {
                return ['rate_sheet_id' => $parts[0], 'bundle_id' => $parts[1], 'record' => $bundle];
            }
            if ($scope === 'bundle-item') {
                $compiledItemId = PackageManagerSchema::deriveBundleRowId($parts[1]);
                if ($parts[2] !== $compiledItemId) return null;
                return [
                    'rate_sheet_id' => $parts[0], 'bundle_id' => $parts[1],
                    'item_id' => $compiledItemId,
                    'record' => [
                        'item_id' => $compiledItemId,
                        'cz_platform_id' => (string) ($bundle['bundle_item_cz_platform_id'] ?? ''),
                    ],
                ];
            }
            if ($scope === 'bundle-price-option') {
                foreach ($bundle['price_options'] ?? [] as $option) {
                    if ((string) ($option['option_id'] ?? '') === $parts[2]) {
                        return ['rate_sheet_id' => $parts[0], 'bundle_id' => $parts[1], 'option_id' => $parts[2], 'record' => $option];
                    }
                }
            }
            foreach ($bundle['items'] ?? [] as $item) {
                if ((string) ($item['item_id'] ?? '') !== $parts[2]) continue;
                if ($scope === 'bundle-included-item') {
                    return ['rate_sheet_id' => $parts[0], 'bundle_id' => $parts[1], 'item_id' => $parts[2], 'record' => $item];
                }
                foreach ($item['price_options'] ?? [] as $option) {
                    if ((string) ($option['option_id'] ?? '') === $parts[3]) {
                        return [
                            'rate_sheet_id' => $parts[0], 'bundle_id' => $parts[1],
                            'item_id' => $parts[2], 'option_id' => $parts[3], 'record' => $option,
                        ];
                    }
                }
            }
        }
        return null;
    }

    /**
     * Every Rate Sheet identity protected by any instance lifecycle envelope.
     * Duplicate discoveries collapse into the returned id set.
     *
     * @return array<string, true>
     */
    public function rateSheetIdsInUse(array $station): array
    {
        $used = [];
        $instances = is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [];
        foreach ($instances as $instance) {
            if (is_array($instance)) {
                $this->collectRateSheetIdsFromInstance($instance, $used);
            }
        }

        return $used;
    }

    /** @return string[] */
    public function rateSheetInstanceIdsInUse(array $station, string $rateSheetId): array
    {
        $instanceIds = [];
        foreach (is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [] as $instance) {
            if (!is_array($instance)) {
                continue;
            }
            $used = [];
            $this->collectRateSheetIdsFromInstance($instance, $used);
            if (isset($used[$rateSheetId])) {
                $id = (string) ($instance['tier_instance_id'] ?? '');
                if ($id !== '') {
                    $instanceIds[] = $id;
                }
            }
        }
        return array_values(array_unique($instanceIds));
    }

    /** @param array<string, true> $used */
    private function collectRateSheetIdsFromInstance(array $instance, array &$used): void
    {
        $primary = PackageManagerSchema::PRIMARY_RATE_SHEET_ID;
        foreach (is_array($instance['allowed_rate_sheet_ids'] ?? null) ? $instance['allowed_rate_sheet_ids'] : [] as $rawId) {
            $id = is_scalar($rawId) ? trim((string) $rawId) : '';
            if ($id !== '') {
                $used[$id] = true;
            }
        }

        foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slot) {
            if (!is_array($slot)) {
                continue;
            }
            $occupant = is_array($slot['current_occupant'] ?? null)
                ? $slot['current_occupant']
                : (array_key_exists('current_occupant', $slot) ? [] : $slot);
            $occupantId = $this->resolvedRateSheetId($occupant, $primary);
            if ($occupantId !== null) {
                $used[$occupantId] = true;
            }

            $overview = is_array($slot['drafts']['overview'] ?? null) ? $slot['drafts']['overview'] : null;
            if ($overview !== null) {
                $overviewId = trim((string) ($overview['rate_sheet_id'] ?? ''));
                $used[$overviewId !== '' ? $overviewId : $primary] = true;
            }

            $features = $slot['drafts']['features'] ?? null;
            if (is_array($features) && $features !== []) {
                $bound = $overview !== null && array_key_exists('rate_sheet_id', $overview)
                    ? trim((string) ($overview['rate_sheet_id'] ?? ''))
                    : ($occupantId ?? '');
                $used[$bound !== '' ? $bound : $primary] = true;
            }

            foreach (is_array($slot['history'] ?? null) ? $slot['history'] : [] as $historical) {
                if (!is_array($historical)) {
                    continue;
                }
                $historicalId = $this->resolvedRateSheetId($historical, $primary);
                if ($historicalId !== null) {
                    $used[$historicalId] = true;
                }
            }
        }

        foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $entry) {
            $occupant = is_array($entry['occupant'] ?? null) ? $entry['occupant'] : [];
            $id = $this->resolvedRateSheetId($occupant, $primary);
            if ($id !== null) {
                $used[$id] = true;
            }
        }
    }

    private function resolvedRateSheetId(array $record, string $primary): ?string
    {
        $id = trim((string) ($record['rate_sheet_id'] ?? ''));
        if ($id !== '') {
            return $id;
        }
        return $record !== [] ? $primary : null;
    }

    /**
     * Cutover bridge — copies the richest legacy Service-hosted station into
     * the option, once. The legacy meta is left in place untouched (read-only
     * safety net); nothing reads it after this migration runs. The raw copy is
     * intentionally persisted before the in-memory Tier lift, so this read-time
     * import cannot also perform Phase 9 compatibility retirement. The first
     * real mutation passes through saveStation and canonicalises atomically.
     */
    private function migrateFromLegacyServiceMeta(): ?array
    {
        $serviceIds = get_posts([
            'post_type'              => self::SERVICE_POST_TYPE,
            'post_status'            => 'any',
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]);

        $bestId      = 0;
        $bestScore   = -1;
        $bestStation = null;

        foreach (is_array($serviceIds) ? $serviceIds : [] as $serviceId) {
            $station = get_post_meta((int) $serviceId, self::LEGACY_STATION_META, true);
            if (!is_array($station) || empty($station)) {
                continue;
            }
            $manager = is_array($station['package_manager'] ?? null) ? $station['package_manager'] : [];
            $score = count(is_array($manager['sources'] ?? null) ? $manager['sources'] : [])
                + count(is_array($manager['items'] ?? null) ? $manager['items'] : [])
                + count(is_array($station['tiers'] ?? null) ? $station['tiers'] : [])
                + (!empty($manager['rate_sheet']) || !empty($manager['rate_sheets']) ? 1000 : 0);
            if ($score > $bestScore) {
                $bestScore   = $score;
                $bestId      = (int) $serviceId;
                $bestStation = $station;
            }
        }

        if ($bestStation === null) {
            return null;
        }

        $bestStation['legacy_host_service_id'] = $bestId;
        update_option(self::OPTION_KEY, $bestStation, false);

        return $bestStation;
    }

    // ── Supply resolution (single canonical implementation) ──────────────────

    /**
     * Resolve Service-provider supply into namespaced item pools.
     * Item IDs stay unprefixed for the legacy host service and prefixed
     * `service:{id}:` for every other source — the ID scheme stored rate
     * sheets and tier selections were written against.
     *
     * @return array{0: array, 1: array} [$inclusions, $faqs]
     */
    // ===================================================================
    // SECTION: SOURCE_PROJECTIONS
    // ===================================================================
    public function sourcePools(array $station, ?array $sources = null): array
    {
        $manager = is_array($station['package_manager'] ?? null)
            ? PackageManagerSchema::sanitize($station['package_manager'])
            : PackageManagerSchema::defaultManager();
        $sources = $sources ?? $manager['sources'];
        $hostId  = (int) ($station['legacy_host_service_id'] ?? 0);

        // Legacy tolerance: a station configured before explicit source
        // relationships supplies from its migrated host service.
        if ($sources === [] && $hostId > 0) {
            $sources = [['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => $hostId]];
        }

        $inclusions = [];
        $faqs       = [];

        foreach ($sources as $source) {
            if (($source['provider_key'] ?? '') !== 'service' || ($source['entity_type'] ?? '') !== 'service') {
                continue;
            }
            $sourceServiceId = (int) ($source['entity_id'] ?? 0);
            $post = $sourceServiceId > 0 ? get_post($sourceServiceId) : null;
            if (!$post instanceof \WP_Post || $post->post_type !== self::SERVICE_POST_TYPE) {
                continue; // deleted source → its items degrade to source_missing downstream
            }
            $prefix = $sourceServiceId === $hostId ? '' : 'service:' . $sourceServiceId . ':';
            $serviceMeta = get_post_meta($sourceServiceId, 'cz_service_meta', true);
            $sourceAvailable = is_array($serviceMeta) && ($serviceMeta['platform_status'] ?? 'disabled') === 'active';
            // Supplying-Service provenance for the admin read model (Rate Sheet
            // filters, group dependency guards). Category names are the
            // Service-owned category-role terms only — group-role terms are a
            // different station and never read as a Service Category.
            //
            // The Platform IDs travel beside the names, read from the SAME
            // Service post and the SAME category-role terms already resolved
            // here. They are permanent downstream identity (a name is a label
            // and a native post/term id is not portable identity), so a reader
            // collating what an inclusion row represents never has to fall back
            // to matching display text. Empty when the owner holds none yet —
            // never substituted with a name, slug, or native id.
            $categories = $this->serviceCategoryProvenance($sourceServiceId);
            $provenance = [
                '_source_available'     => $sourceAvailable,
                '_source_service_id'    => $sourceServiceId,
                '_source_service_title' => html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                '_source_service_platform_id' => (string) get_post_meta(
                    $sourceServiceId,
                    \CompuZign\Platform\Modules\Service\Support\ServiceSchema::PLATFORM_ID_META,
                    true
                ),
                '_source_categories'    => $categories['names'],
                '_source_category_platform_ids' => $categories['platform_ids'],
                '_source_category_term_ids'     => $categories['term_ids'],
            ];
            $rawInc = get_post_meta($sourceServiceId, 'cz_service_inclusions', true) ?: [];
            foreach ((isset($rawInc['inclusions']) && is_array($rawInc['inclusions'])) ? $rawInc['inclusions'] : [] as $item) {
                if (!is_array($item) || empty($item['id'])) {
                    continue;
                }
                $inclusions[] = [...$item, 'id' => $prefix . (string) $item['id'], ...$provenance];
            }
            $rawFaqs = get_post_meta($sourceServiceId, 'cz_service_faqs', true) ?: [];
            foreach (is_array($rawFaqs) ? $rawFaqs : [] as $item) {
                if (!is_array($item) || empty($item['id'])) {
                    continue;
                }
                $faqs[] = [...$item, 'id' => $prefix . (string) $item['id'], ...$provenance];
            }
        }

        return [$inclusions, $faqs];
    }

    /**
     * Service-owned category provenance for a supplying service — category-role
     * terms only. A group-role term shares the taxonomy but is a different
     * station (Service Category Group) and must never read as a Service Category.
     *
     * One walk yields both facets of the same terms: the display `names` the
     * Rate Sheet filters already render, and the Category-owned permanent
     * `platform_ids` (CZC) a downstream reader identifies them by. A term
     * carrying no Platform ID yet contributes no identity rather than a
     * fabricated one, so identity is never inferred from a name or term id.
     *
     * The term's own `term_ids` travel alongside. Platform ID remains the
     * identity a downstream reader RESOLVES a Category by; the native term id
     * exists so a reader can COUNT distinct Categories without silently
     * dropping every term whose CZC has not been assigned yet. Counting by
     * Platform ID alone made the tally a report on identifier backfill rather
     * than on Categories.
     *
     * @return array{names: string[], platform_ids: string[], term_ids: int[]}
     */
    private function serviceCategoryProvenance(int $serviceId): array
    {
        $terms = wp_get_post_terms($serviceId, \CompuZign\Platform\Modules\Admin\Support\CategoryMeta::TAXONOMY, ['fields' => 'all']);
        if (!is_array($terms)) {
            return ['names' => [], 'platform_ids' => [], 'term_ids' => []];
        }
        $names = [];
        $platformIds = [];
        $termIds = [];
        foreach ($terms as $term) {
            if (!$term instanceof \WP_Term) {
                continue;
            }
            if (\CompuZign\Platform\Modules\Admin\Support\CategoryMeta::role((int) $term->term_id)
                !== \CompuZign\Platform\Modules\Admin\Support\CategoryMeta::STATION_ROLE_CATEGORY) {
                continue;
            }
            $names[] = html_entity_decode($term->name, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $termIds[] = (int) $term->term_id;
            $platformId = (string) get_term_meta(
                (int) $term->term_id,
                \CompuZign\Platform\Modules\Admin\Support\CategoryMeta::PLATFORM_ID_META,
                true
            );
            if ($platformId !== '') {
                $platformIds[] = $platformId;
            }
        }
        return [
            'names'        => $names,
            'platform_ids' => array_values(array_unique($platformIds)),
            'term_ids'     => array_values(array_unique($termIds)),
        ];
    }

    /**
     * Service IDs covered by the station: every existing, published source
     * service in the manager's relationships (the single indexing path).
     *
     * @return int[]
     */
    // ===================================================================
    // SECTION: PACKAGE_LOOKUPS
    // ===================================================================
    public function coveredServiceIds(array $station): array
    {
        $manager = is_array($station['package_manager'] ?? null)
            ? PackageManagerSchema::sanitize($station['package_manager'])
            : PackageManagerSchema::defaultManager();

        $sources = $manager['sources'];
        $hostId  = (int) ($station['legacy_host_service_id'] ?? 0);
        if ($sources === [] && $hostId > 0) {
            // Same legacy tolerance as sourcePools(): pre-relationship stations
            // cover their migrated host service.
            $sources = [['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => $hostId]];
        }

        $covered = [];
        foreach ($sources as $source) {
            if (($source['provider_key'] ?? '') !== 'service' || ($source['entity_type'] ?? '') !== 'service') {
                continue;
            }
            $serviceId = (int) ($source['entity_id'] ?? 0);
            $post = $serviceId > 0 ? get_post($serviceId) : null;
            if ($post instanceof \WP_Post && $post->post_type === self::SERVICE_POST_TYPE && $post->post_status === 'publish') {
                $covered[$serviceId] = true;
            }
        }

        return array_map('intval', array_keys($covered));
    }

    // ── Cost Builder projection (single read path) ────────────────────────────

    /**
     * Load the active station indexed by covered service ID. This is the only
     * mechanism by which packages reach the Cost Builder (and therefore the
     * Quote Builder). Empty map = no active package → legacy XLSX pricing.
     *
     * @return array<int, array<string, mixed>>  service_id => station array
     */
    public function findAllActiveIndexedByServiceId(): array
    {
        if ($this->activePackageMapCache !== false) {
            return $this->activePackageMapCache;
        }

        $station = $this->loadStation();
        if ($station === null) {
            return $this->activePackageMapCache = [];
        }

        // Visible iff active; empty status keeps legacy tolerance. Fail-closed.
        $pkgStatus = $station['platform_status'] ?? '';
        if ($pkgStatus !== '' && $pkgStatus !== 'active') {
            return $this->activePackageMapCache = [];
        }

        // valid_from/valid_until are stored UTC.
        $now = current_time('mysql', true);
        if (!empty($station['valid_from']) && $station['valid_from'] > $now) {
            return $this->activePackageMapCache = [];
        }
        if (!empty($station['valid_until']) && $station['valid_until'] < $now) {
            return $this->activePackageMapCache = [];
        }

        $rawManager = is_array($station['package_manager'] ?? null)
            ? $station['package_manager']
            : [];
        $manager = is_array($station['package_manager'] ?? null)
            ? PackageManagerSchema::sanitize($station['package_manager'])
            : PackageManagerSchema::defaultManager();
        $instances = TierInstanceSchema::sanitizeInstances($station['tier_instances'] ?? []);
        $consumerRegistry = [
            'package_family' => TierAssignmentSchema::consumerRegistryFor('package_family', $manager),
        ];
        $assignments = TierAssignmentSchema::sanitizeAssignments(
            $station['tier_assignments'] ?? [],
            $consumerRegistry,
            $instances
        );
        [$incPool, $faqPool] = $this->sourcePools($station);
        $coveredServiceIds   = $this->coveredServiceIds($station);
        $hostId              = (int) ($station['legacy_host_service_id'] ?? 0);
        $readModel = PackageManagerSchema::buildReadModel(
            $hostId,
            $manager,
            $incPool,
            $faqPool,
            'active'
        );
        // Keep the original source rows for ambiguity detection. Sanitisation
        // intentionally deduplicates identity, while a corrupt duplicate that
        // points one Service at two Families must fail closed publicly.
        $resolutionManager = $manager;
        $resolutionManager['sources'] = is_array($rawManager['sources'] ?? null)
            ? $rawManager['sources']
            : [];

        $map = [];
        $projectedByInstanceId = [];
        foreach ($coveredServiceIds as $coveredServiceId) {
            $instance = TierInstanceSchema::resolveInstanceForService(
                $coveredServiceId,
                $resolutionManager,
                $assignments,
                $instances
            );
            if ($instance === null) {
                continue;
            }

            $instanceId = (string) $instance['tier_instance_id'];
            if (!isset($projectedByInstanceId[$instanceId])) {
                $projectedByInstanceId[$instanceId] = $this->projectTierInstanceForCostBuilder(
                    $station,
                    $instance,
                    $readModel
                );
            }

            $map[$coveredServiceId] = $projectedByInstanceId[$instanceId];
        }

        return $this->activePackageMapCache = $map;
    }

    /**
     * Compile one already-resolved Tier Instance for public customer use.
     *
     * Resolution of the assignment consumer deliberately stays outside this
     * method. It compiles only the supplied Tier-system container through the
     * existing Rate Sheet projector, so Service and future Family reads share
     * one pricing/inclusion boundary without sharing their lookup path.
     *
     * @param array<string, mixed> $station
     * @param array<string, mixed> $instance
     * @param array<string, mixed> $readModel
     * @return array<string, mixed>
     */
    private function projectTierInstanceForCostBuilder(
        array $station,
        array $instance,
        array $readModel,
        bool $includeSelectedInclusionProvenance = false
    ): array
    {
        $projected = $station;
        $flatTiers = [];
        $selectedInclusionSourceIds = [];
        foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
            $extracted = PackageSchema::extractTierForCostBuilder($instance['tiers'][$tierId] ?? []);
            if ($extracted === null) {
                continue;
            }
            $rateProjection = PackageManagerSchema::projectTierRateSheetWith(
                $readModel,
                $extracted['rate_sheet_items'] ?? [],
                $extracted['rate_sheet_id'] ?? null,
                (bool) ($extracted['contact'] ?? false)
            );
            $extracted['price'] = $rateProjection['price'];
            $resolvedInclusions = array_values(array_filter(
                PackageManagerSchema::projectTierInclusions($rateProjection['selections']),
                static fn(array $row): bool => !$row['missing']
            ));
            $extracted['inclusions_override'] = array_map(
                static fn(array $row): array => ['id' => $row['id'], 'label' => $row['label'], 'quantity' => $row['quantity']],
                $resolvedInclusions
            );
            if ($includeSelectedInclusionProvenance) {
                $selectedInclusionSourceIds[$tierId] = array_values(array_map(
                    static fn(array $row): string => (string) $row['source_id'],
                    $resolvedInclusions
                ));
            }
            // Each public edition_option row prices from its own Edition's
            // rate_sheet_id/rate_sheet_items — the occupant's own selection
            // above is different — through this same authoritative projector.
            if (!empty($extracted['edition_options'])) {
                $occupant = PackageSchema::isOccupantFormat($instance['tiers'][$tierId] ?? [])
                    ? ($instance['tiers'][$tierId]['current_occupant'] ?? null)
                    : null;
                $rawEditions = is_array($occupant) ? PackageSchema::sanitizeTierEditions($occupant['tier_editions'] ?? []) : [];
                $editionPriceById = [];
                foreach (PackageManagerSchema::projectEditionPrices($readModel, $rawEditions) as $priced) {
                    $editionPriceById[$priced['id']] = $priced['price'];
                }
                $extracted['edition_options'] = array_map(
                    static fn(array $option): array => [...$option, 'price' => $editionPriceById[$option['id']] ?? $option['price']],
                    $extracted['edition_options']
                );
            }
            // The projector above is the only internal consumer of these two
            // keys; Rate Sheet binding identity itself never becomes a public
            // response field, even though the server-side projection needs it.
            unset($extracted['rate_sheet_id'], $extracted['rate_sheet_items']);
            $flatTiers[$tierId] = $extracted;
        }
        $projected['platform_status'] = 'active';
        $projected['tiers'] = $flatTiers;
        $projected['popular_tier'] = $instance['popular_tier'] ?? null;
        $projected['popular_label'] = (string) ($instance['popular_label'] ?? '');
        $projected['promotion_tiers'] = is_array($station['promotions'] ?? null)
            ? $station['promotions']
            : [];
        if ($includeSelectedInclusionProvenance) {
            $projected['_selected_inclusion_source_ids'] = $selectedInclusionSourceIds;
        }
        return $projected;
    }

    /**
     * Active Package Families with their directly assigned, compiled Tier
     * Instance. This path never discovers an instance through a Service.
     *
     * @return array<int, array<string, mixed>>
     */
    public function findAllActiveFamiliesForCostBuilder(): array
    {
        if ($this->activeFamilyOfferCache !== false) {
            return $this->activeFamilyOfferCache;
        }

        $station = $this->loadStation();
        if ($station === null) {
            return $this->activeFamilyOfferCache = [];
        }
        $packageStatus = $station['platform_status'] ?? '';
        if ($packageStatus !== '' && $packageStatus !== 'active') {
            return $this->activeFamilyOfferCache = [];
        }
        $now = current_time('mysql', true);
        if ((!empty($station['valid_from']) && $station['valid_from'] > $now)
            || (!empty($station['valid_until']) && $station['valid_until'] < $now)
        ) {
            return $this->activeFamilyOfferCache = [];
        }

        $manager = is_array($station['package_manager'] ?? null)
            ? PackageManagerSchema::sanitize($station['package_manager'])
            : PackageManagerSchema::defaultManager();
        $instances = TierInstanceSchema::sanitizeInstances($station['tier_instances'] ?? []);
        $assignments = TierAssignmentSchema::sanitizeAssignments(
            $station['tier_assignments'] ?? [],
            ['package_family' => TierAssignmentSchema::consumerRegistryFor('package_family', $manager)],
            $instances
        );
        [$inclusionPool, $faqPool] = $this->sourcePools($station);
        $readModel = PackageManagerSchema::buildReadModel(
            (int) ($station['legacy_host_service_id'] ?? 0),
            $manager,
            $inclusionPool,
            $faqPool,
            'active'
        );

        $families = [];
        foreach ($manager['category_groups'] as $family) {
            if (($family['platform_status'] ?? null) !== 'active') {
                continue;
            }
            $familyId = (string) ($family['group_id'] ?? '');
            $familyPlatformId = (string) ($family['cz_platform_id'] ?? '');
            if ($familyPlatformId === '') {
                continue;
            }
            $assignment = TierAssignmentSchema::findForConsumer(
                $assignments,
                'package_family',
                $familyId
            );
            if ($assignment === null) {
                continue;
            }
            $instance = TierInstanceSchema::findInstance(
                $instances,
                (string) ($assignment['tier_instance_id'] ?? '')
            );
            if ($instance === null
                || ($instance['status'] ?? null) !== 'active'
                || TierInstanceSchema::deriveInstanceStatus($instance) !== 'active'
                || (string) ($instance['cz_platform_id'] ?? '') === ''
            ) {
                continue;
            }

            $compiled = $this->projectTierInstanceForCostBuilder($station, $instance, $readModel, true);
            foreach ($compiled['tiers'] as $tierId => &$tier) {
                $slot = $instance['tiers'][$tierId] ?? [];
                $occupant = PackageSchema::isOccupantFormat($slot)
                    ? ($slot['current_occupant'] ?? null)
                    : null;
                if (!is_array($occupant)) {
                    unset($compiled['tiers'][$tierId]);
                    continue;
                }
                $tierPlatformId = !empty($tier['is_addon'])
                    ? (string) ($occupant['addon_platform_id'] ?? '')
                    : (string) ($occupant['cz_platform_id'] ?? '');
                if ($tierPlatformId === '') {
                    unset($compiled['tiers'][$tierId]);
                    continue;
                }
                $tier['occupant_id'] = (string) ($occupant['id'] ?? '');
                $tier['platform_id'] = $tierPlatformId;
                $editionPlatformIds = [];
                foreach (PackageSchema::sanitizeTierEditions($occupant['tier_editions'] ?? []) as $edition) {
                    $editionPlatformIds[(string) ($edition['id'] ?? '')] = (string) ($edition['edition_platform_id'] ?? '');
                }
                $tier['edition_options'] = array_values(array_filter(array_map(
                    static function (array $option) use ($editionPlatformIds): array {
                        $platformId = $editionPlatformIds[(string) ($option['id'] ?? '')] ?? '';
                        return [...$option, 'edition_platform_id' => $platformId];
                    },
                    is_array($tier['edition_options'] ?? null) ? $tier['edition_options'] : []
                ), static fn(array $option): bool => $option['edition_platform_id'] !== ''));
            }
            unset($tier);
            if ($compiled['tiers'] === []) {
                continue;
            }

            $managerItemsBySourceId = [];
            foreach (is_array($readModel['items'] ?? null) ? $readModel['items'] : [] as $item) {
                if (is_array($item) && ($item['source_type'] ?? null) === 'inclusion') {
                    $managerItemsBySourceId[(string) ($item['source_id'] ?? '')] = $item;
                }
            }
            $includedCategories = [];
            foreach ($compiled['_selected_inclusion_source_ids'] ?? [] as $tierSourceIds) {
                foreach (is_array($tierSourceIds) ? $tierSourceIds : [] as $sourceId) {
                    $managerItem = $managerItemsBySourceId[(string) $sourceId] ?? null;
                    if (!is_array($managerItem)) {
                        continue;
                    }
                    foreach (is_array($managerItem['source_categories'] ?? null) ? $managerItem['source_categories'] : [] as $categoryName) {
                        $includedCategories[(string) $categoryName] = true;
                    }
                }
            }
            unset($compiled['_selected_inclusion_source_ids']);

            $families[] = [
                'family_id'       => $familyId,
                'family_platform_id' => $familyPlatformId,
                'title'           => (string) ($family['label'] ?? ''),
                'description'     => (string) ($family['description'] ?? ''),
                'tier_instance_id' => (string) $instance['tier_instance_id'],
                'tier_instance_platform_id' => (string) $instance['cz_platform_id'],
                'tiers'           => $compiled['tiers'],
                'popular_tier'    => $compiled['popular_tier'],
                'popular_label'   => $compiled['popular_label'],
                'included_categories' => array_keys($includedCategories),
            ];
        }

        return $this->activeFamilyOfferCache = $families;
    }

    /**
     * Covered Service IDs without a public-ready assigned instance, keyed by
     * service ID for O(1) lookup. PricingBuilder uses this to suppress legacy
     * XLSX fallback when a Package relationship exists but fails closed.
     *
     * @return array<int, true>  service_id => true
     */
    public function findDisabledPackageServiceIds(): array
    {
        $station = $this->loadStation();
        if ($station === null) {
            return [];
        }

        $set = [];
        foreach ($this->coveredServiceIds($station) as $serviceId) {
            $set[$serviceId] = true;
        }
        return array_diff_key($set, $this->findAllActiveIndexedByServiceId());
    }
}
