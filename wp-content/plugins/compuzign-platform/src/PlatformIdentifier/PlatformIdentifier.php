<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformIdentifier;

final class PlatformIdentifier
{
    public function __construct(
        private string $entityType,
        private string $value
    ) {
        if (!PlatformIdentifierPolicy::validate($entityType, $value)) {
            throw PlatformIdentifierConflict::invalidIdentifier($entityType, $value);
        }
    }

    public function entityType(): string
    {
        return $this->entityType;
    }

    public function value(): string
    {
        return $this->value;
    }
}
