<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformIdentifier;

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;

/** Temporary REST migration surface. Remove after the live one-time assignment. */
final class TemporaryMigrationController
{
    private const PROGRESS_OPTION = 'cz_package_family_identifier_migration_v1';
    private const LOCK_OPTION = 'cz_package_family_identifier_migration_lock_v1';
    private const LIMIT = 100;
    private const LOCK_SECONDS = 45;

    public function __construct(
        private PlatformIdentifierStation $identifiers,
        private ?PackageRepository $packages = null
    ) {}

    public function register(): void { add_action('rest_api_init', [$this, 'registerRoutes']); }

    public function registerRoutes(): void
    {
        register_rest_route('compuzign/v1', '/admin/platform-identifiers/migration', [
            ['methods' => 'GET', 'callback' => [$this, 'status'], 'permission_callback' => [$this, 'requireAdmin']],
            ['methods' => 'POST', 'callback' => [$this, 'run'], 'permission_callback' => [$this, 'requireAdmin'], 'args' => [
                'action' => ['required' => true, 'type' => 'string', 'enum' => ['dry-run', 'assign']],
                'entity_type' => ['required' => false, 'type' => 'string', 'enum' => [PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP]],
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
                PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP => $this->dryCheck(PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP),
            ]]);
        }

        $entityType = (string) $request->get_param('entity_type');
        if ($entityType !== PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP) {
            return new \WP_REST_Response(['message' => 'Only Package Family migration is supported.'], 422);
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
            $cursor = isset($progress[$entityType]['cursor']) && is_string($progress[$entityType]['cursor'])
                ? $progress[$entityType]['cursor']
                : null;
            $result = $this->assignBatch($entityType, $cursor);
            if ($result->conflicts() !== []) {
                return new \WP_REST_Response(['message' => 'Migration stopped on a batch conflict.', 'conflicts' => $result->conflicts()], 409);
            }

            $progress[$entityType] = ['cursor' => $result->nextCursor(), 'complete' => $result->complete()];
            $progress['complete'] = $result->complete();
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

    private function assignBatch(string $entityType, int|string|null $cursor): PlatformIdentifierBatchResult
    {
        $packages = $this->packages();
        return $this->identifiers->assignExistingBatch(
            $entityType,
            is_string($cursor) && $cursor !== '' ? $cursor : null,
            self::LIMIT,
            static fn(int|string|null $after, int $limit): array => $packages->familyAssignmentPage(
                is_string($after) && $after !== '' ? $after : null,
                $limit
            ),
            static fn(int|string $id): string => $packages->familyPlatformId((string) $id),
            static fn(int|string $id, string $platformId): bool => $packages->claimFamilyPlatformId((string) $id, $platformId),
            static fn(string $platformId): bool => $packages->familyPlatformIdExists($platformId)
        );
    }

    /** @return list<string> */
    private function allIds(string $entityType): array
    {
        $ids = [];
        $cursor = null;
        do {
            $page = $this->packages()->familyAssignmentPage($cursor, 500);
            $ids = [...$ids, ...$page['items']];
            $cursor = $page['next_cursor'];
        } while (!$page['complete']);
        return $ids;
    }

    private function readId(string $entityType, int|string $id): string
    {
        return $this->packages()->familyPlatformId((string) $id);
    }

    private function storedIdExists(string $entityType, string $platformId): bool
    {
        return $this->packages()->familyPlatformIdExists($platformId);
    }

    private function packages(): PackageRepository
    {
        return $this->packages ??= new PackageRepository();
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
