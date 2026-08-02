<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

/**
 * Canonical native references for Package-owned Platform identities.
 *
 * Composite references use length-prefixed segments so punctuation in an
 * owner-minted id can never make two different records share one registry
 * address. These strings identify records; they do not replace the owner's
 * existing mutation addresses.
 */
final class PackagePlatformNativeReference
{
    public static function tierGroup(string $tierInstanceId): string
    {
        return self::single('tier-group', $tierInstanceId);
    }

    public static function tierOccupant(string $tierInstanceId, string $occupantId): string
    {
        return self::composite('tier-occupant', [$tierInstanceId, $occupantId]);
    }

    public static function rateSheet(string $rateSheetId): string
    {
        return self::single('rate-sheet', $rateSheetId);
    }

    public static function rateSheetGroup(string $rateSheetId, string $groupId): string
    {
        return self::composite('rate-sheet-group', [$rateSheetId, $groupId]);
    }

    /** @return list<string>|null */
    public static function parse(string $reference, string $context, int $segments): ?array
    {
        $prefix = $context . ':';
        if (!str_starts_with($reference, $prefix)) {
            return null;
        }

        $remaining = substr($reference, strlen($prefix));
        $values = [];
        for ($index = 0; $index < $segments; $index++) {
            if (!preg_match('/^(0|[1-9][0-9]*):/', $remaining, $match)) {
                return null;
            }
            $lengthToken = $match[1];
            $length = (int) $lengthToken;
            $remaining = substr($remaining, strlen($lengthToken) + 1);
            if (strlen($remaining) < $length) {
                return null;
            }
            $value = substr($remaining, 0, $length);
            if ($value === '') {
                return null;
            }
            $values[] = $value;
            $remaining = substr($remaining, $length);
        }

        return $remaining === '' ? $values : null;
    }

    private static function single(string $context, string $value): string
    {
        return self::composite($context, [$value]);
    }

    /** @param list<string> $values */
    private static function composite(string $context, array $values): string
    {
        $reference = $context . ':';
        foreach ($values as $value) {
            $value = trim($value);
            if ($value === '') {
                throw new \InvalidArgumentException('Platform native-reference segments must be non-empty.');
            }
            $reference .= strlen($value) . ':' . $value;
        }
        return $reference;
    }
}
