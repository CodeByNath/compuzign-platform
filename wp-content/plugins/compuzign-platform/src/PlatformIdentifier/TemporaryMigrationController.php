<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformIdentifier;

use CompuZign\Platform\Modules\Admin\Support\CategoryMeta;
use CompuZign\Platform\Modules\Service\Support\ServiceSchema;

/** Temporary REST migration surface. Remove after the live one-time assignment. */
final class TemporaryMigrationController
{
    private const PROGRESS_OPTION = 'cz_platform_identifier_migration_v1';
    private const LOCK_OPTION = 'cz_platform_identifier_migration_lock_v1';
    private const LIMIT = 100;
    private const LOCK_SECONDS = 45;

    public function __construct(private PlatformIdentifierStation $identifiers) {}

    public function register(): void { add_action('rest_api_init', [$this, 'registerRoutes']); }

    public function registerRoutes(): void
    {
        register_rest_route('compuzign/v1', '/admin/platform-identifiers/migration', [
            ['methods' => 'GET', 'callback' => [$this, 'status'], 'permission_callback' => [$this, 'requireAdmin']],
            ['methods' => 'POST', 'callback' => [$this, 'run'], 'permission_callback' => [$this, 'requireAdmin'], 'args' => [
                'action' => ['required' => true, 'type' => 'string', 'enum' => ['dry-run', 'assign']],
                'entity_type' => ['required' => false, 'type' => 'string', 'enum' => [PlatformIdentifierPolicy::SERVICE, PlatformIdentifierPolicy::CATEGORY]],
            ]],
        ]);
    }

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Core\PlatformAccess::CAP);
    }

    public function status(\WP_REST_Request $request): \WP_REST_Response
    {
        $progress = $this->progress();
        return rest_ensure_response(['complete' => (bool) ($progress['complete'] ?? false), 'progress' => $progress]);
    }

    public function run(\WP_REST_Request $request): \WP_REST_Response
    {
        if ($request->get_param('action') === 'dry-run') {
            return rest_ensure_response(['dry_run' => true, 'reports' => [
                PlatformIdentifierPolicy::SERVICE => $this->dryCheck(PlatformIdentifierPolicy::SERVICE),
                PlatformIdentifierPolicy::CATEGORY => $this->dryCheck(PlatformIdentifierPolicy::CATEGORY),
            ]]);
        }

        $entityType = (string) $request->get_param('entity_type');
        if (!in_array($entityType, [PlatformIdentifierPolicy::SERVICE, PlatformIdentifierPolicy::CATEGORY], true)) {
            return new \WP_REST_Response(['message' => 'Only Service and Category migration is supported.'], 422);
        }

        $preflight = $this->dryCheck($entityType);
        if ($preflight['conflicts'] !== []) {
            return new \WP_REST_Response(['message' => 'Migration stopped: conflicts require review.', 'report' => $preflight], 409);
        }

        $lock = $this->acquireLock();
        if ($lock === null) {
            return new \WP_REST_Response(['message' => 'A Platform Identifier migration batch is already running.'], 409);
        }

        try {
            $progress = $this->progress();
            $cursor = (int) ($progress[$entityType]['cursor'] ?? 0);
            $result = $this->assignBatch($entityType, $cursor);
            if ($result->conflicts() !== []) {
                return new \WP_REST_Response(['message' => 'Migration stopped on a batch conflict.', 'conflicts' => $result->conflicts()], 409);
            }

            $progress[$entityType] = ['cursor' => (int) $result->nextCursor(), 'complete' => $result->complete()];
            $progress['complete'] = (bool) ($progress[PlatformIdentifierPolicy::SERVICE]['complete'] ?? false)
                && (bool) ($progress[PlatformIdentifierPolicy::CATEGORY]['complete'] ?? false);
            if ($progress['complete']) $progress['completed_at'] = gmdate(DATE_ATOM);
            $this->writeProgress($progress);

            return rest_ensure_response(['entity_type' => $entityType, 'processed' => $result->processed(),
                'assigned' => $result->assigned(), 'preserved' => $result->preserved(),
                'conflicts' => [], 'next_cursor' => $result->nextCursor(),
                'entity_complete' => $result->complete(), 'complete' => $progress['complete']]);
        } finally {
            $this->releaseLock($lock);
        }
    }

    /** @return array{processed:int,would_assign:int,would_preserve:int,conflicts:list<array<string,mixed>>} */
    private function dryCheck(string $entityType): array
    {
        $ids = $this->allIds($entityType);
        $seen = []; $assign = 0; $preserve = 0; $conflicts = [];
        foreach ($ids as $id) {
            $stored = $this->readId($entityType, $id);
            if ($stored === '') { $assign++; continue; }
            if (!$this->identifiers->validate($entityType, $stored)) {
                $conflicts[] = ['native_reference' => $id, 'message' => 'Invalid stored Platform ID.']; continue;
            }
            if (isset($seen[$stored])) {
                $conflicts[] = ['native_reference' => $id, 'message' => 'Duplicate stored Platform ID.', 'platform_id' => $stored]; continue;
            }
            $seen[$stored] = $id;
            try {
                $forward = $this->identifiers->resolve($stored);
                $reverse = $this->identifiers->lookupNative($entityType, $id);
                foreach ([$forward, $reverse] as $binding) {
                    if ($binding !== null && (!$binding->isBound() || $binding->entityType() !== $entityType || $binding->nativeReference() !== $id || $binding->platformId() !== $stored)) {
                        throw PlatformIdentifierConflict::registry('stored and registry bindings disagree.');
                    }
                }
                $preserve++;
            } catch (\Throwable $error) {
                $conflicts[] = ['native_reference' => $id, 'message' => $error->getMessage(), 'platform_id' => $stored];
            }
        }
        return ['processed' => count($ids), 'would_assign' => $assign, 'would_preserve' => $preserve, 'conflicts' => $conflicts];
    }

    private function assignBatch(string $entityType, int $cursor): PlatformIdentifierBatchResult
    {
        return $this->identifiers->assignExistingBatch($entityType, $cursor, self::LIMIT,
            fn(int|string|null $offset, int $limit): array => $this->page($entityType, (int) $offset, $limit),
            fn(int|string $id): string => $this->readId($entityType, (int) $id),
            fn(int|string $id, string $platformId): mixed => $entityType === PlatformIdentifierPolicy::SERVICE
                ? add_post_meta((int) $id, ServiceSchema::PLATFORM_ID_META, $platformId, true)
                : CategoryMeta::claimPlatformId((int) $id, $platformId),
            fn(string $platformId): bool => $this->storedIdExists($entityType, $platformId));
    }

    /** @return list<int> */
    private function allIds(string $entityType): array { return $this->page($entityType, 0, -1)['items']; }
    /** @return array{items:list<int>,next_cursor:int,complete:bool} */
    private function page(string $entityType, int $offset, int $limit): array
    {
        if ($entityType === PlatformIdentifierPolicy::SERVICE) {
            $raw = get_posts(['post_type' => ServiceSchema::POST_TYPE, 'post_status' => 'any', 'numberposts' => $limit,
                'offset' => $offset, 'orderby' => 'ID', 'order' => 'ASC', 'fields' => 'ids', 'no_found_rows' => true]);
        } else {
            $args = ['taxonomy' => CategoryMeta::TAXONOMY, 'hide_empty' => false, 'offset' => $offset,
                'orderby' => 'term_id', 'order' => 'ASC', 'fields' => 'ids'];
            if ($limit !== -1) $args['number'] = $limit;
            $raw = get_terms($args);
        }
        $ids = array_map('intval', is_array($raw) ? $raw : []);
        return ['items' => $ids, 'next_cursor' => $offset + count($ids), 'complete' => $limit === -1 || count($ids) < $limit];
    }

    private function readId(string $entityType, int $id): string
    {
        if ($entityType === PlatformIdentifierPolicy::CATEGORY) return CategoryMeta::platformId($id);
        $value = get_post_meta($id, ServiceSchema::PLATFORM_ID_META, true);
        return is_string($value) ? $value : '';
    }

    private function storedIdExists(string $entityType, string $platformId): bool
    {
        if ($entityType === PlatformIdentifierPolicy::SERVICE) {
            $matches = get_posts(['post_type' => ServiceSchema::POST_TYPE, 'post_status' => 'any', 'numberposts' => 1,
                'fields' => 'ids', 'meta_key' => ServiceSchema::PLATFORM_ID_META, 'meta_value' => $platformId]);
        } else {
            $matches = get_terms(['taxonomy' => CategoryMeta::TAXONOMY, 'hide_empty' => false, 'number' => 1,
                'fields' => 'ids', 'meta_key' => CategoryMeta::PLATFORM_ID_META, 'meta_value' => $platformId]);
        }
        return is_array($matches) && $matches !== [];
    }

    /** @return array<string,mixed> */
    private function progress(): array { $value = get_option(self::PROGRESS_OPTION, []); return is_array($value) ? $value : []; }
    /** @param array<string,mixed> $progress */
    private function writeProgress(array $progress): void
    {
        if (get_option(self::PROGRESS_OPTION, null) === null) add_option(self::PROGRESS_OPTION, $progress, '', 'no');
        else update_option(self::PROGRESS_OPTION, $progress, false);
    }
    private function acquireLock(): ?string
    {
        $existing = get_option(self::LOCK_OPTION, null);
        if (is_array($existing) && (int) ($existing['expires'] ?? 0) < time()) delete_option(self::LOCK_OPTION);
        $token = bin2hex(random_bytes(12));
        return add_option(self::LOCK_OPTION, ['token' => $token, 'expires' => time() + self::LOCK_SECONDS], '', 'no') ? $token : null;
    }
    private function releaseLock(string $token): void
    {
        $lock = get_option(self::LOCK_OPTION, null);
        if (is_array($lock) && hash_equals((string) ($lock['token'] ?? ''), $token)) delete_option(self::LOCK_OPTION);
    }
}
