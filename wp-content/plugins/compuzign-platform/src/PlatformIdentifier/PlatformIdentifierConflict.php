<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformIdentifier;

final class PlatformIdentifierConflict extends \RuntimeException
{
    public static function unsupportedEntityType(string $entityType): self
    {
        return new self("Unsupported Platform identifier entity type: {$entityType}");
    }

    public static function invalidIdentifier(string $entityType, string $platformId): self
    {
        return new self("Invalid Platform identifier '{$platformId}' for entity type '{$entityType}'.");
    }

    public static function registry(string $message): self
    {
        return new self('Platform identifier registry conflict: ' . $message);
    }

    public static function immutable(string $existing, string $requested): self
    {
        return new self("Platform identifier is immutable; '{$existing}' cannot be replaced by '{$requested}'.");
    }
}
