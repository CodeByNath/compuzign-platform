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

    /**
     * Occupant-qualified, not slot-qualified: a Tier Edition's identity must
     * stay attached to the occupant that owns it through slot swap, retarget,
     * or replacement, exactly like tierOccupant() itself never references a
     * slot key.
     */
    public static function tierEdition(string $tierInstanceId, string $occupantId, string $editionId): string
    {
        return self::composite('tier-edition', [$tierInstanceId, $occupantId, $editionId]);
    }

    public static function rateSheet(string $rateSheetId): string
    {
        return self::single('rate-sheet', $rateSheetId);
    }

    public static function rateSheetGroup(string $rateSheetId, string $groupId): string
    {
        return self::composite('rate-sheet-group', [$rateSheetId, $groupId]);
    }

    public static function rateSheetItem(string $rateSheetId, string $itemId): string
    {
        return self::composite('rate-sheet-item', [$rateSheetId, $itemId]);
    }

    /**
     * A Price Option is a further-qualified child of the row it belongs to,
     * not a sibling row of its own — the row's own native reference
     * (rateSheetItem) and Platform ID are untouched by an option's presence.
     */
    public static function rateSheetItemOption(string $rateSheetId, string $itemId, string $optionId): string
    {
        return self::composite('rate-sheet-item-option', [$rateSheetId, $itemId, $optionId]);
    }

    /**
     * A Bundle is a sheet-qualified composition space, so its reference is
     * `(rate_sheet_id, bundle_id)` — the same shape rateSheetGroup() uses, and
     * for the same reason: the Bundle exists only inside the sheet that owns it.
     */
    public static function rateSheetBundle(string $rateSheetId, string $bundleId): string
    {
        return self::composite('rate-sheet-bundle', [$rateSheetId, $bundleId]);
    }

    /**
     * A Bundle's live reference to one supplied Rate Sheet row — the
     * "Bundle-inclusion Platform ID." Qualified by the referenced row's own
     * sheet AND item id as two separate segments (never one joined string),
     * because a Bundle may reference rows on sheets other than its own. This
     * identifies the REFERENCE itself, a child of the Bundle — the referenced
     * row keeps its own `CZPRCI` completely untouched.
     */
    public static function rateSheetBundleInclusion(
        string $rateSheetId,
        string $bundleId,
        string $sourceRateSheetId,
        string $sourceItemId
    ): string {
        return self::composite('rate-sheet-bundle-inclusion', [$rateSheetId, $bundleId, $sourceRateSheetId, $sourceItemId]);
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
