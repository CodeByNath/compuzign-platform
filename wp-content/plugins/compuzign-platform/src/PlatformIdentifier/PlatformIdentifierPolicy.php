<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformIdentifier;

/**
 * Closed vocabulary and format policy for permanent Platform identifiers.
 *
 * Extending identity support means adding one entry here and then wiring the
 * owning domain in its own implementation phase. The engine itself must not
 * branch on domain storage or behaviour.
 */
final class PlatformIdentifierPolicy
{
    public const SERVICE                 = 'service';
    public const CATEGORY                = 'category';
    public const PACKAGE_FAMILY_GROUP    = 'package_family_group';
    public const TIER_GROUP              = 'tier_group';
    public const TIER                    = 'tier';
    public const TIER_ADDON              = 'tier_addon';
    public const TIER_PROMOTION          = 'tier_promotion';
    public const PACKAGE_RATE_CARD       = 'package_rate_card';
    public const PACKAGE_RATE_CARD_GROUP = 'package_rate_card_group';
    public const PACKAGE_RATE_CARD_ITEM  = 'package_rate_card_item';

    public const ALPHABET    = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
    public const SUFFIX_LENGTH = 5;

    /** @var array<string, string> */
    private const PREFIXES = [
        self::SERVICE                 => 'CZS',
        self::CATEGORY                => 'CZC',
        self::PACKAGE_FAMILY_GROUP    => 'CZPG',
        self::TIER_GROUP              => 'CZTG',
        self::TIER                    => 'CZT',
        self::TIER_ADDON              => 'CZTA',
        self::TIER_PROMOTION          => 'CZTP',
        self::PACKAGE_RATE_CARD       => 'CZPRC',
        self::PACKAGE_RATE_CARD_GROUP => 'CZPRCG',
        self::PACKAGE_RATE_CARD_ITEM  => 'CZPRCI',
    ];

    /** @return array<string, string> */
    public static function prefixes(): array
    {
        return self::PREFIXES;
    }

    public static function supports(string $entityType): bool
    {
        return isset(self::PREFIXES[$entityType]);
    }

    public static function prefix(string $entityType): string
    {
        if (!self::supports($entityType)) {
            throw PlatformIdentifierConflict::unsupportedEntityType($entityType);
        }

        return self::PREFIXES[$entityType];
    }

    public static function validate(string $entityType, string $platformId): bool
    {
        if (!self::supports($entityType)) {
            return false;
        }

        $prefix = preg_quote(self::PREFIXES[$entityType], '/');

        return preg_match('/^' . $prefix . '[2-9A-HJKMNP-TV-Z]{' . self::SUFFIX_LENGTH . '}$/D', $platformId) === 1;
    }

    public static function entityTypeFor(string $platformId): ?string
    {
        foreach (self::PREFIXES as $entityType => $prefix) {
            if (self::validate($entityType, $platformId)) {
                return $entityType;
            }
        }

        return null;
    }
}
