<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformSettings;

/**
 * Canonical native references for the two Platform Settings identities.
 *
 * Both records are platform singletons, so their references are constants.
 * They use the same length-prefixed `context:len:value` grammar as
 * PackagePlatformNativeReference so punctuation can never alias two
 * addresses. The Profile reference is qualified by its parent's own scope.
 */
final class PlatformSettingsNativeReference
{
    public const SCOPE   = 'global';
    public const PROFILE = 'profile';

    public static function settings(): string
    {
        return self::composite('platform-settings', [self::SCOPE]);
    }

    public static function profile(): string
    {
        return self::composite('platform-settings-profile', [self::SCOPE, self::PROFILE]);
    }

    /** @param list<string> $segments */
    private static function composite(string $context, array $segments): string
    {
        $encoded = '';
        foreach ($segments as $segment) {
            $encoded .= strlen($segment) . ':' . $segment;
        }

        return $context . ':' . $encoded;
    }
}
