<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier;

/**
 * Package-owned identity adapter protocol.
 *
 * The callbacks retain entity storage, enumeration, and projection authority.
 * PlatformIdentifierStation remains the sole registry and generation owner.
 */
final class PackagePlatformIdentifierAdapter
{
    private \Closure $enumerate;
    private \Closure $readStored;
    private \Closure $claimStored;
    private \Closure $storedCollision;
    private \Closure $project;

    /**
     * @param callable(int|string|null, int): array $enumerate
     * @param callable(int|string): mixed $readStored
     * @param callable(int|string, string): mixed $claimStored
     * @param callable(string): bool $storedCollision
     * @param callable(int|string): mixed $project
     */
    public function __construct(
        private string $entityType,
        callable $enumerate,
        callable $readStored,
        callable $claimStored,
        callable $storedCollision,
        callable $project
    ) {
        $this->enumerate = \Closure::fromCallable($enumerate);
        $this->readStored = \Closure::fromCallable($readStored);
        $this->claimStored = \Closure::fromCallable($claimStored);
        $this->storedCollision = \Closure::fromCallable($storedCollision);
        $this->project = \Closure::fromCallable($project);
    }

    public function entityType(): string { return $this->entityType; }
    public function enumerate(int|string|null $cursor, int $limit): array { return ($this->enumerate)($cursor, $limit); }
    public function readStored(int|string $nativeReference): mixed { return ($this->readStored)($nativeReference); }
    public function claimStored(int|string $nativeReference, string $platformId): mixed { return ($this->claimStored)($nativeReference, $platformId); }
    public function storedCollision(string $platformId): bool { return (bool) ($this->storedCollision)($platformId); }
    public function project(int|string $nativeReference): mixed { return ($this->project)($nativeReference); }
}
