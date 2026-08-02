<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformIdentifier;

use CompuZign\Platform\Modules\Admin\Support\CategoryMeta;
use CompuZign\Platform\Modules\Service\Support\ServiceSchema;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;

final class ExistingRecordAssignmentCommand
{
    public function __construct(
        private PlatformIdentifierStation $identifiers,
        private ?PackageRepository $packages = null
    ) {}

    /** @param list<string> $args @param array<string, mixed> $assocArgs */
    public function __invoke(array $args, array $assocArgs): void
    {
        $entityType = (string) ($args[0] ?? '');
        $selectors = [
            PlatformIdentifierPolicy::SERVICE,
            PlatformIdentifierPolicy::CATEGORY,
            'package-family',
        ];
        if (!in_array($entityType, $selectors, true)) {
            \WP_CLI::error('Entity must be service, category, or package-family.');
        }

        $limit  = filter_var($assocArgs['limit'] ?? 100, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 500]]);
        if ($limit === false) {
            \WP_CLI::error('Limit must be between 1 and 500.');
        }

        if ($entityType === 'package-family') {
            $cursor = isset($assocArgs['cursor']) && (string) $assocArgs['cursor'] !== ''
                ? (string) $assocArgs['cursor']
                : null;
            $result = $this->assignPackageFamilies($cursor, $limit);
        } else {
            $cursor = filter_var($assocArgs['cursor'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
            if ($cursor === false) {
                \WP_CLI::error('Cursor must be non-negative for service and category assignment.');
            }
            $result = $entityType === PlatformIdentifierPolicy::SERVICE
                ? $this->assignServices($cursor, $limit)
                : $this->assignCategories($cursor, $limit);
        }

        \WP_CLI::log((string) json_encode([
            'entity_type' => $entityType === 'package-family'
                ? PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP
                : $entityType,
            'next_cursor' => $result->nextCursor(),
            'complete' => $result->complete(),
            'processed' => $result->processed(),
            'assigned' => $result->assigned(),
            'preserved' => $result->preserved(),
            'conflicts' => $result->conflicts(),
        ], JSON_UNESCAPED_SLASHES));
    }

    private function assignServices(int $cursor, int $limit): PlatformIdentifierBatchResult
    {
        return $this->identifiers->assignExistingBatch(
            PlatformIdentifierPolicy::SERVICE,
            $cursor,
            $limit,
            static function (int|string|null $offset, int $pageSize): array {
                $items = get_posts([
                    'post_type' => ServiceSchema::POST_TYPE,
                    'post_status' => 'any',
                    'numberposts' => $pageSize,
                    'offset' => (int) $offset,
                    'orderby' => 'ID',
                    'order' => 'ASC',
                    'fields' => 'ids',
                    'no_found_rows' => true,
                ]);
                $ids = array_map('intval', is_array($items) ? $items : []);
                return ['items' => $ids, 'next_cursor' => (int) $offset + count($ids), 'complete' => count($ids) < $pageSize];
            },
            static fn(int|string $id): mixed => get_post_meta((int) $id, ServiceSchema::PLATFORM_ID_META, true),
            static fn(int|string $id, string $platformId): mixed => add_post_meta((int) $id, ServiceSchema::PLATFORM_ID_META, $platformId, true),
            static function (string $platformId): bool {
                $matches = get_posts([
                    'post_type' => ServiceSchema::POST_TYPE, 'post_status' => 'any',
                    'numberposts' => 1, 'fields' => 'ids', 'no_found_rows' => true,
                    'meta_key' => ServiceSchema::PLATFORM_ID_META, 'meta_value' => $platformId,
                ]);
                return is_array($matches) && $matches !== [];
            }
        );
    }

    private function assignCategories(int $cursor, int $limit): PlatformIdentifierBatchResult
    {
        return $this->identifiers->assignExistingBatch(
            PlatformIdentifierPolicy::CATEGORY,
            $cursor,
            $limit,
            static function (int|string|null $offset, int $pageSize): array {
                $items = get_terms([
                    'taxonomy' => CategoryMeta::TAXONOMY, 'hide_empty' => false,
                    'number' => $pageSize, 'offset' => (int) $offset,
                    'orderby' => 'term_id', 'order' => 'ASC', 'fields' => 'ids',
                ]);
                $ids = array_map('intval', is_array($items) ? $items : []);
                return ['items' => $ids, 'next_cursor' => (int) $offset + count($ids), 'complete' => count($ids) < $pageSize];
            },
            static fn(int|string $id): string => CategoryMeta::platformId((int) $id),
            static fn(int|string $id, string $platformId): bool => CategoryMeta::claimPlatformId((int) $id, $platformId),
            static function (string $platformId): bool {
                $matches = get_terms([
                    'taxonomy' => CategoryMeta::TAXONOMY, 'hide_empty' => false,
                    'number' => 1, 'fields' => 'ids',
                    'meta_key' => CategoryMeta::PLATFORM_ID_META, 'meta_value' => $platformId,
                ]);
                return is_array($matches) && $matches !== [];
            }
        );
    }

    private function assignPackageFamilies(?string $cursor, int $limit): PlatformIdentifierBatchResult
    {
        $packages = $this->packages ??= new PackageRepository();

        return $this->identifiers->assignExistingBatch(
            PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP,
            $cursor,
            $limit,
            static fn(int|string|null $after, int $pageSize): array => $packages->familyAssignmentPage(
                is_string($after) && $after !== '' ? $after : null,
                $pageSize
            ),
            static fn(int|string $groupId): string => $packages->familyPlatformId((string) $groupId),
            static fn(int|string $groupId, string $platformId): bool => $packages->claimFamilyPlatformId((string) $groupId, $platformId),
            static fn(string $platformId): bool => $packages->familyPlatformIdExists($platformId)
        );
    }
}
