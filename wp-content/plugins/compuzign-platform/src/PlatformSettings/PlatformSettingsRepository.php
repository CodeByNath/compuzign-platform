<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformSettings;

/**
 * Persistence for the Platform Settings root, its Profile section, and the
 * one save lock that serialises every Settings mutation.
 *
 * Both records are non-autoloaded options. Every write is read back and
 * compared exactly — update_option() also returns false for an unchanged
 * value, so its return alone proves nothing. The lock reuses the platform's
 * proven primitive (RequestRepository): add_option()'s unique option_name for
 * the claim, and compare-and-swap UPDATE/DELETE on the exact observed value
 * for takeover and release, so a caller never touches a lock it no longer
 * holds.
 */
final class PlatformSettingsRepository
{
    public const SETTINGS_OPTION = 'cz_platform_settings';
    public const PROFILE_OPTION  = 'cz_platform_profile';
    public const LOCK_OPTION     = 'cz_platform_settings_lock';
    public const SCHEMA_VERSION  = 1;

    private const LOCK_TTL_SECONDS = 60;

    /** @return array<string, mixed>|null */
    public function readSettings(): ?array
    {
        $value = $this->freshOption(self::SETTINGS_OPTION);

        return is_array($value) ? $value : null;
    }

    /** @return array<string, mixed>|null */
    public function readProfile(): ?array
    {
        $value = $this->freshOption(self::PROFILE_OPTION);

        return is_array($value) ? $value : null;
    }

    /** @param array<string, mixed> $settings */
    public function writeSettings(array $settings): void
    {
        $this->writeExact(self::SETTINGS_OPTION, $settings);
    }

    /** @param array<string, mixed> $profile */
    public function writeProfile(array $profile): void
    {
        $this->writeExact(self::PROFILE_OPTION, $profile);
    }

    /** @return array<string, mixed> */
    public static function emptySettings(): array
    {
        return [
            'schema_version' => self::SCHEMA_VERSION,
            'platform_id'    => '',
            'sections'       => ['profile' => ['platform_id' => '', 'record' => self::PROFILE_OPTION]],
            'created_at'     => '',
            'updated_at'     => '',
        ];
    }

    /** @return array<string, mixed> */
    public static function emptyProfile(): array
    {
        return [
            'schema_version'     => self::SCHEMA_VERSION,
            'platform_id'        => '',
            'parent_platform_id' => '',
            'revision'           => 0,
            'brand'              => ['name' => '', 'code' => '', 'logo' => null, 'favicon' => null],
            'updated_at'         => '',
            'updated_by'         => 0,
        ];
    }

    // ── Save lock ────────────────────────────────────────────────────────────

    /** Claim the lock, taking over only a stale holder. Null when held elsewhere. */
    public function claimLock(): ?string
    {
        $value = $this->newLockValue();
        if (add_option(self::LOCK_OPTION, $value, '', 'no')) {
            return $value;
        }

        $observed = $this->freshOption(self::LOCK_OPTION);
        if (!is_string($observed) || !$this->isStale($observed)) {
            return null;
        }

        global $wpdb;
        $affected = $wpdb->query($wpdb->prepare(
            "UPDATE {$wpdb->options} SET option_value = %s WHERE option_name = %s AND option_value = %s",
            $value,
            self::LOCK_OPTION,
            $observed
        ));
        $this->forgetCached(self::LOCK_OPTION);

        return $affected === 1 ? $value : null;
    }

    public function holdsLock(string $lockValue): bool
    {
        return $this->freshOption(self::LOCK_OPTION) === $lockValue;
    }

    /** No-op when the lock was already taken over by someone else. */
    public function releaseLock(string $lockValue): void
    {
        global $wpdb;
        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s",
            self::LOCK_OPTION,
            $lockValue
        ));
        $this->forgetCached(self::LOCK_OPTION);
    }

    private function isStale(string $lockValue): bool
    {
        $claimedAt = (int) (explode('|', $lockValue, 2)[1] ?? 0);

        return $claimedAt <= 0 || (time() - $claimedAt) > self::LOCK_TTL_SECONDS;
    }

    private function newLockValue(): string
    {
        return bin2hex(random_bytes(16)) . '|' . time();
    }

    // ── Internals ────────────────────────────────────────────────────────────

    /** @param array<string, mixed> $value */
    private function writeExact(string $key, array $value): void
    {
        update_option($key, $value, false);
        if ($this->freshOption($key) !== $value) {
            throw PlatformSettingsFailure::storage("option '{$key}' did not read back exactly.");
        }
    }

    private function freshOption(string $key): mixed
    {
        $this->forgetCached($key);

        return get_option($key, null);
    }

    private function forgetCached(string $key): void
    {
        if (function_exists('wp_cache_delete')) {
            wp_cache_delete($key, 'options');
        }
    }
}
