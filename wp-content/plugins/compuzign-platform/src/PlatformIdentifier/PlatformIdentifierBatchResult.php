<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformIdentifier;

final class PlatformIdentifierBatchResult
{
    /**
     * @param array<int, array{native_reference: int|string, message: string}> $conflicts
     */
    public function __construct(
        private int|string|null $nextCursor,
        private bool $complete,
        private int $processed,
        private int $assigned,
        private int $preserved,
        private array $conflicts
    ) {}

    public function nextCursor(): int|string|null { return $this->nextCursor; }
    public function complete(): bool { return $this->complete; }
    public function processed(): int { return $this->processed; }
    public function assigned(): int { return $this->assigned; }
    public function preserved(): int { return $this->preserved; }

    /** @return array<int, array{native_reference: int|string, message: string}> */
    public function conflicts(): array { return $this->conflicts; }
}
