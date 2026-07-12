<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Repositories;

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;

/**
 * Single authority for Package Station storage.
 *
 * The station (package_manager, rate sheet, tiers, promotions, occupant bin,
 * status) lives in one WP option — COMPUZIGN option `cz_package_station` — fully
 * independent of any cz_service post. Deleting or disconnecting a Service
 * can no longer destroy commercial data; missing sources degrade to the
 * source_missing operational state at read time.
 *
 * Cutover compatibility (temporary, in loadStation()): when the option is
 * absent, the station is migrated once from the legacy Service-hosted
 * cz_service_package_station post meta. The originating service ID is kept
 * as legacy_host_service_id so stored item IDs (unprefixed for the old host,
 * `service:{id}:` for other sources) remain stable.
 */
class PackageRepository
{
    public const OPTION_KEY = 'cz_package_station';

    private const LEGACY_STATION_META   = 'cz_service_package_station';
    private const LEGACY_PROMOTION_META = 'cz_service_promotion_station';
    private const SERVICE_POST_TYPE     = 'cz_service';

    /** Request-scope cache: false = not loaded, null = no station exists. */
    private array|null|false $stationCache = false;

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
            return $this->stationCache = $this->ensurePromotions($station);
        }

        // One-time cutover migration from the legacy Service-hosted meta.
        $station = $this->migrateFromLegacyServiceMeta();
        if ($station !== null) {
            $station = $this->ensurePromotions($station);
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
     * reads it after this runs.
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
        $this->stationCache = $station;
        update_option(self::OPTION_KEY, $station, false);
    }

    /** Fresh station shell for first-time configuration. */
    public function defaultStation(): array
    {
        return [
            'platform_status'         => 'disabled',
            'tiers'                   => [],
            'popular_tier'            => null,
            'popular_label'           => '',
            'sort_position'           => 0,
            'bundle'                  => ['title' => '', 'description' => '', 'price' => null],
            'occupant_bin'            => [],
            'promotions'              => [],
            'package_manager'         => PackageManagerSchema::defaultManager(),
            'legacy_host_service_id'  => 0,
        ];
    }

    /**
     * Cutover bridge — copies the richest legacy Service-hosted station into
     * the option, once. The legacy meta is left in place untouched (read-only
     * safety net); nothing reads it after this migration runs.
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
                + (!empty($manager['rate_sheet']) ? 1000 : 0);
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
            $rawInc = get_post_meta($sourceServiceId, 'cz_service_inclusions', true) ?: [];
            foreach ((isset($rawInc['inclusions']) && is_array($rawInc['inclusions'])) ? $rawInc['inclusions'] : [] as $item) {
                if (!is_array($item) || empty($item['id'])) {
                    continue;
                }
                $inclusions[] = [...$item, 'id' => $prefix . (string) $item['id'], '_source_available' => $sourceAvailable];
            }
            $rawFaqs = get_post_meta($sourceServiceId, 'cz_service_faqs', true) ?: [];
            foreach (is_array($rawFaqs) ? $rawFaqs : [] as $item) {
                if (!is_array($item) || empty($item['id'])) {
                    continue;
                }
                $faqs[] = [...$item, 'id' => $prefix . (string) $item['id'], '_source_available' => $sourceAvailable];
            }
        }

        return [$inclusions, $faqs];
    }

    /**
     * Service IDs covered by the station: every existing, published source
     * service in the manager's relationships (the single indexing path).
     *
     * @return int[]
     */
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
        $station = $this->loadStation();
        if ($station === null) {
            return [];
        }

        // Visible iff active; empty status keeps legacy tolerance. Fail-closed.
        $pkgStatus = $station['platform_status'] ?? '';
        if ($pkgStatus !== '' && $pkgStatus !== 'active') {
            return [];
        }

        // valid_from/valid_until are stored UTC.
        $now = current_time('mysql', true);
        if (!empty($station['valid_from']) && $station['valid_from'] > $now) {
            return [];
        }
        if (!empty($station['valid_until']) && $station['valid_until'] < $now) {
            return [];
        }

        $manager = is_array($station['package_manager'] ?? null)
            ? PackageManagerSchema::sanitize($station['package_manager'])
            : PackageManagerSchema::defaultManager();
        [$incPool, $faqPool] = $this->sourcePools($station);
        $coveredServiceIds   = $this->coveredServiceIds($station);
        $hostId              = (int) ($station['legacy_host_service_id'] ?? 0);

        // Flat tier interface for PricingBuilder; null slots (empty shells) omitted.
        $flatTiers = [];
        foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
            $extracted = PackageSchema::extractTierForCostBuilder($station['tiers'][$tierId] ?? []);
            if ($extracted !== null) {
                $projection = PackageManagerSchema::projectTierRateSheet(
                    $hostId,
                    $manager,
                    $extracted['rate_sheet_items'] ?? [],
                    $incPool,
                    $faqPool,
                    (string) ($station['platform_status'] ?? 'disabled')
                );
                $extracted['price'] = $projection['price'];
                $extracted['inclusions_override'] = array_map(
                    fn(array $row): array => ['id' => $row['item_id'], 'label' => $row['label']],
                    array_values(array_filter(
                        $projection['selections'],
                        fn(array $row): bool => $row['resolved'] && ($row['source_type'] ?? null) === 'inclusion'
                    ))
                );
                $flatTiers[$tierId] = $extracted;
            }
        }
        $station['tiers'] = $flatTiers;

        // Promotions live on the station itself — Cost Builder reads them
        // straight from the Package Station, never from Service postmeta.
        $station['promotion_tiers'] = is_array($station['promotions'] ?? null)
            ? $station['promotions']
            : [];

        $map = [];
        foreach ($coveredServiceIds as $coveredServiceId) {
            $map[$coveredServiceId] = $station;
        }

        return $map;
    }

    /**
     * Service IDs whose package coverage is intentionally disabled, keyed by
     * service ID for O(1) lookup. PricingBuilder uses this to suppress the
     * legacy XLSX pricing fallback for those services.
     *
     * @return array<int, true>  service_id => true
     */
    public function findDisabledPackageServiceIds(): array
    {
        $station = $this->loadStation();
        if ($station === null) {
            return [];
        }

        if (($station['platform_status'] ?? '') !== 'disabled') {
            return [];
        }

        $set = [];
        foreach ($this->coveredServiceIds($station) as $serviceId) {
            $set[$serviceId] = true;
        }

        return $set;
    }
}
