<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformIdentifier;

final class PlatformIdentifierBinding
{
    public function __construct(
        private PlatformIdentifier $identifier,
        private int|string|null $nativeReference,
        private string $status
    ) {}

    public function identifier(): PlatformIdentifier
    {
        return $this->identifier;
    }

    public function entityType(): string
    {
        return $this->identifier->entityType();
    }

    public function platformId(): string
    {
        return $this->identifier->value();
    }

    public function nativeReference(): int|string|null
    {
        return $this->nativeReference;
    }

    public function status(): string
    {
        return $this->status;
    }

    public function isBound(): bool
    {
        return $this->status === PlatformIdentifierStation::STATUS_BOUND;
    }

    public function isDeleted(): bool
    {
        return $this->status === PlatformIdentifierStation::STATUS_DELETED;
    }
}
