<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformIdentifier;

final class PlatformIdentifierReservation
{
    public function __construct(private PlatformIdentifier $identifier) {}

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
}
