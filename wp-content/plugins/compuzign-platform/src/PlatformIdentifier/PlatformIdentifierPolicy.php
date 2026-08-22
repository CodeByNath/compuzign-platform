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
    public const TIER_EDITION            = 'tier_edition';
    public const TIER_LEG                = 'tier_leg';
    public const TIER_EDITION_LEG        = 'tier_edition_leg';
    public const TIER_PROMOTION          = 'tier_promotion';
    public const PACKAGE_RATE_CARD        = 'package_rate_card';
    public const PACKAGE_RATE_CARD_GROUP  = 'package_rate_card_group';
    public const PACKAGE_RATE_CARD_ITEM   = 'package_rate_card_item';
    public const PACKAGE_RATE_CARD_ITEM_OPTION = 'package_rate_card_item_option';
    public const PACKAGE_RATE_CARD_BUNDLE      = 'package_rate_card_bundle';
    public const PACKAGE_RATE_CARD_BUNDLE_ITEM = 'package_rate_card_bundle_item';
    public const PACKAGE_RATE_CARD_BUNDLE_ITEM_OPTION = 'package_rate_card_bundle_item_option';
    public const PACKAGE_RATE_CARD_BUNDLE_OPTION      = 'package_rate_card_bundle_option';

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
        self::TIER_EDITION            => 'CZTE',
        // A Commercial Leg — Default or Additional alike, distinguished by
        // native reference, not by a separate prefix (the spec's own
        // vocabulary: "Tier Leg -> CZTLxxxxx" covers both). Longer prefixes
        // sharing a stem with an existing one (CZTL/CZTEL against
        // CZT/CZTA/CZTE/CZTG) are unambiguous for the same reason the
        // CZPRCB family already is: validate()'s anchored regex requires the
        // FULL string to be exactly prefix + SUFFIX_LENGTH chars, so a real
        // CZTEL id (5-char prefix + 5-char suffix = 10 chars) can never
        // satisfy CZTE's own pattern (4-char prefix + 5-char suffix = 9
        // chars) regardless of alphabet overlap.
        self::TIER_LEG                => 'CZTL',
        self::TIER_EDITION_LEG        => 'CZTEL',
        self::TIER_PROMOTION          => 'CZTP',
        self::PACKAGE_RATE_CARD        => 'CZPRC',
        self::PACKAGE_RATE_CARD_GROUP  => 'CZPRCG',
        self::PACKAGE_RATE_CARD_ITEM   => 'CZPRCI',
        self::PACKAGE_RATE_CARD_ITEM_OPTION => 'CZPRCIO',
        // A Rate Sheet Bundle and its own rows. Unambiguous against the four
        // prefixes above without any startsWith reasoning: the suffix alphabet
        // excludes I/L/O/U and every suffix is exactly SUFFIX_LENGTH long, so
        // `CZPRCBI…` can never be read as CZPRCB + suffix, `CZPRCBIO…` never as
        // CZPRCBI + suffix, and none of them as CZPRC/CZPRCI + suffix.
        self::PACKAGE_RATE_CARD_BUNDLE      => 'CZPRCB',
        self::PACKAGE_RATE_CARD_BUNDLE_ITEM => 'CZPRCBI',
        self::PACKAGE_RATE_CARD_BUNDLE_ITEM_OPTION => 'CZPRCBIO',
        // The Bundle's OWN commercial Price Option — a child of the Bundle
        // (CZPRCB), not of one of its rows. 'O' is outside the suffix alphabet,
        // so this can never be read as CZPRCB + suffix.
        self::PACKAGE_RATE_CARD_BUNDLE_OPTION      => 'CZPRCBO',
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
