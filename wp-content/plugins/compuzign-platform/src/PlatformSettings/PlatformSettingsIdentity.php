<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformSettings;

use CompuZign\Platform\PlatformIdentifier\PlatformIdentifier;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierConflict;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierReservation;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

/**
 * The permanent identity of the Platform Settings root (`CZPS`) and its
 * Profile section (`CZPSP`): first-Save bootstrap, recovery of an interrupted
 * bootstrap, and read-only verification of the stored hierarchy against the
 * shared PlatformIdentifierStation registry.
 *
 * IDs are minted only through PlatformIdentifierStation::ensure(), only by a
 * Save holding the Settings lock, and never again once bound. Reads classify
 * without writing; any disagreement fails closed as an identity conflict.
 *
 * FILE INDEX
 *   SECTION: BOOTSTRAP — Settings → Profile → section link, resumable
 *   SECTION: VERIFICATION — identity state and registry agreement
 */
final class PlatformSettingsIdentity
{
    public const UNASSIGNED = 'unassigned';
    public const INCOMPLETE = 'incomplete';
    public const VERIFIED   = 'verified';

    /** @param \Closure(): int $clock */
    public function __construct(
        private PlatformIdentifierStation $identifiers,
        private PlatformSettingsRepository $repository,
        private \Closure $clock
    ) {
    }

    // =====================================================================
    // SECTION: BOOTSTRAP
    // =====================================================================

    /**
     * Settings → Profile → section link. Each step is idempotent through
     * ensure(), so an interrupted first Save resumes on the next Save without
     * minting a second identity.
     *
     * @return array{0: string, 1: string} [Settings ID, Profile ID]
     */
    public function bootstrap(): array
    {
        // A Profile that already names a parent must find that exact parent:
        // never mint a replacement Settings root underneath an existing child.
        $existingParent = (string) (($this->repository->readProfile() ?? [])['parent_platform_id'] ?? '');
        $existingRoot   = (string) (($this->repository->readSettings() ?? [])['platform_id'] ?? '');
        if ($existingParent !== '' && $existingParent !== $existingRoot) {
            throw PlatformSettingsFailure::identityConflict('the Profile names a Settings parent that is not stored.');
        }

        $settingsId = $this->ensureIdentity(
            PlatformIdentifierPolicy::PLATFORM_SETTINGS,
            PlatformSettingsNativeReference::settings(),
            fn(): mixed => ($this->repository->readSettings() ?? [])['platform_id'] ?? '',
            function (int|string $ref, string $platformId): void {
                $settings = $this->repository->readSettings() ?? PlatformSettingsRepository::emptySettings();
                $now = gmdate('c', ($this->clock)());
                $settings['platform_id'] = $platformId;
                $settings['created_at']  = ($settings['created_at'] ?? '') !== '' ? $settings['created_at'] : $now;
                $settings['updated_at']  = $now;
                $this->repository->writeSettings($settings);
            }
        );

        $profile = $this->repository->readProfile() ?? PlatformSettingsRepository::emptyProfile();
        $storedParent = (string) ($profile['parent_platform_id'] ?? '');
        if ($storedParent !== '' && $storedParent !== $settingsId) {
            throw PlatformSettingsFailure::identityConflict('the Profile names a different Settings parent.');
        }

        $profileId = $this->ensureIdentity(
            PlatformIdentifierPolicy::PLATFORM_SETTINGS_PROFILE,
            PlatformSettingsNativeReference::profile(),
            fn(): mixed => ($this->repository->readProfile() ?? [])['platform_id'] ?? '',
            function (int|string $ref, string $platformId) use ($settingsId): void {
                $profile = $this->repository->readProfile() ?? PlatformSettingsRepository::emptyProfile();
                $profile['platform_id']        = $platformId;
                $profile['parent_platform_id'] = $settingsId;
                $this->repository->writeProfile($profile);
            }
        );

        $profile = $this->repository->readProfile() ?? [];
        if (($profile['parent_platform_id'] ?? '') !== $settingsId) {
            throw PlatformSettingsFailure::identityConflict('the Profile is not linked to its Settings parent.');
        }

        $settings = $this->repository->readSettings() ?? PlatformSettingsRepository::emptySettings();
        $linked   = (string) ($settings['sections']['profile']['platform_id'] ?? '');
        if ($linked === '') {
            $settings['sections']['profile'] = ['platform_id' => $profileId, 'record' => PlatformSettingsRepository::PROFILE_OPTION];
            $settings['updated_at'] = gmdate('c', ($this->clock)());
            $this->repository->writeSettings($settings);
        } elseif ($linked !== $profileId) {
            throw PlatformSettingsFailure::identityConflict('the Settings root links a different Profile.');
        }

        return [$settingsId, $profileId];
    }

    /**
     * ensure() mints or verifies. Its one recoverable failure is a first Save
     * interrupted inside assign(): the owner record already holds the ID but
     * the registry still shows that same ID as an unbound reservation of this
     * type. Finishing that exact reservation is safe — it was minted for this
     * record — and binds without minting anything new. Any other registry
     * disagreement is inconsistent identity and fails closed.
     *
     * @param callable(): mixed                 $read
     * @param callable(int|string, string): void $write
     */
    private function ensureIdentity(string $entityType, string $nativeReference, callable $read, callable $write): string
    {
        $readStored = static fn(int|string $ref): mixed => $read();

        try {
            return $this->identifiers->ensure($entityType, $nativeReference, $readStored, $write)->platformId();
        } catch (PlatformIdentifierConflict $conflict) {
            $stored = $read();
            if (!is_string($stored) || $stored === '') {
                throw PlatformSettingsFailure::identityConflict($conflict->getMessage());
            }

            try {
                $binding = $this->identifiers->resolve($stored);
                if ($binding === null
                    || $binding->entityType() !== $entityType
                    || $binding->status() !== PlatformIdentifierStation::STATUS_RESERVED
                    || $binding->nativeReference() !== null
                ) {
                    throw PlatformSettingsFailure::identityConflict($conflict->getMessage());
                }

                $reservation = new PlatformIdentifierReservation(new PlatformIdentifier($entityType, $stored));

                return $this->identifiers->assign($reservation, $nativeReference, $readStored, $write)->platformId();
            } catch (PlatformIdentifierConflict $recovery) {
                throw PlatformSettingsFailure::identityConflict($recovery->getMessage());
            }
        }
    }

    // =====================================================================
    // SECTION: VERIFICATION
    // =====================================================================

    /**
     * A requested Platform ID must resolve as a bound identity of the
     * requested type before any stored record is consulted.
     *
     * @throws PlatformSettingsFailure 404 when unknown/unbound/wrong type, 409 on registry conflict
     */
    public function assertBound(string $platformId, string $entityType): void
    {
        try {
            $binding = $this->identifiers->resolve($platformId);
        } catch (PlatformIdentifierConflict) {
            throw PlatformSettingsFailure::identityConflict('the identifier registry is conflicting.');
        }
        if ($binding === null || $binding->entityType() !== $entityType || !$binding->isBound()) {
            throw PlatformSettingsFailure::notFound();
        }
    }

    /**
     * Classify the stored Settings/Profile identity without writing:
     *   unassigned — no Save yet; IDs are null and valid as such
     *   incomplete — a first Save was interrupted in a resumable state
     *   verified   — both IDs bound, linked, and matching their records
     *
     * @param array<string, mixed> $settings
     * @param array<string, mixed> $profile
     * @throws PlatformSettingsFailure inconsistent identity
     */
    public function state(array $settings, array $profile): string
    {
        $settingsId = (string) ($settings['platform_id'] ?? '');
        $profileId  = (string) ($profile['platform_id'] ?? '');
        $parentId   = (string) ($profile['parent_platform_id'] ?? '');
        $linkedId   = (string) ($settings['sections']['profile']['platform_id'] ?? '');

        if ($settingsId === '' && $profileId === '' && $parentId === '' && $linkedId === '') {
            return self::UNASSIGNED;
        }
        if ($settingsId === ''
            || ($parentId !== '' && $parentId !== $settingsId)
            || ($linkedId !== '' && $linkedId !== $profileId)
            || ($profileId !== '' && $parentId === '')
        ) {
            throw PlatformSettingsFailure::identityConflict('the Settings ↔ Profile link is broken.');
        }

        $settingsBound = $this->registryState(
            PlatformIdentifierPolicy::PLATFORM_SETTINGS,
            PlatformSettingsNativeReference::settings(),
            $settingsId
        );
        if ($profileId === '') {
            return self::INCOMPLETE;
        }
        $profileBound = $this->registryState(
            PlatformIdentifierPolicy::PLATFORM_SETTINGS_PROFILE,
            PlatformSettingsNativeReference::profile(),
            $profileId
        );

        return $settingsBound && $profileBound && $linkedId === $profileId ? self::VERIFIED : self::INCOMPLETE;
    }

    /**
     * True when the stored ID is bound forward and reverse to this record.
     * False only for the one resumable state: this exact ID is still an
     * unbound reservation of this type (a first Save stopped inside assign()).
     * Every other registry disagreement throws.
     */
    private function registryState(string $entityType, string $nativeReference, string $storedId): bool
    {
        if (!PlatformIdentifierPolicy::validate($entityType, $storedId)) {
            throw PlatformSettingsFailure::identityConflict("the stored {$entityType} identifier is malformed.");
        }

        try {
            $reverse = $this->identifiers->lookupNative($entityType, $nativeReference);
            if ($reverse !== null) {
                if ($reverse->platformId() !== $storedId || !$reverse->isBound()) {
                    throw PlatformSettingsFailure::identityConflict("the {$entityType} record and registry disagree.");
                }
                return true;
            }
        } catch (PlatformIdentifierConflict) {
            // Forward/reverse disagree: resumable only if the forward record
            // is still this exact unbound reservation (checked below).
        }

        try {
            $forward = $this->identifiers->resolve($storedId);
        } catch (PlatformIdentifierConflict) {
            $forward = null;
        }
        if ($forward !== null
            && $forward->entityType() === $entityType
            && $forward->status() === PlatformIdentifierStation::STATUS_RESERVED
            && $forward->nativeReference() === null
        ) {
            return false;
        }

        throw PlatformSettingsFailure::identityConflict("the {$entityType} record and registry disagree.");
    }
}
