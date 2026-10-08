<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformSettings;

use CompuZign\Platform\PlatformIdentifier\PlatformIdentifier;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierConflict;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierReservation;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

/**
 * Platform Settings — the platform-wide Settings root (`CZPS`) and its
 * parent-linked Profile section (`CZPSP`).
 *
 * This is CompuZign platform authority, not a Station Manager Station and not
 * Service data: it owns the Settings/Profile schema, validation, brand
 * assets, identity bootstrap, and the one-Save commit. Service Station
 * Settings is only where the Profile is presented. Platform IDs are minted by
 * the shared PlatformIdentifierStation only — on the first successful Save,
 * never on read, never again.
 *
 * Save order (each step fails closed and leaves the Profile unchanged):
 *   1. validate fields, decode/convert images, square-check the favicon
 *   2. write new image files (immutable, content-addressed; harmless orphans)
 *   3. claim the save lock, then check the expected revision
 *   4. identity bootstrap: Settings → Profile → section link (resumable)
 *   5. recheck lock ownership and revision, then commit the Profile record
 *   6. sweep unreferenced image files past the grace window, release lock
 *
 * FILE INDEX
 *   SECTION: READS — projections and verified read-by-Platform-ID
 *   SECTION: SAVE — validation, lock, commit, sweep
 *   SECTION: IDENTITY — bootstrap, partial-write recovery, verification
 *   SECTION: VALIDATION — field rules
 */
final class PlatformSettingsStation
{
    public const NAME_MAX_LENGTH = 60;
    public const CODE_PATTERN    = '/^[A-Za-z]{0,6}$/D';

    /** Unreferenced files younger than this may belong to an in-flight Save. */
    private const ASSET_GRACE_SECONDS = 900;

    private const IMAGE_FIELDS = ['logo' => false, 'favicon' => true];

    private \Closure $clock;

    /** @param callable(): int|null $clock Test seam; production uses time(). */
    public function __construct(
        private PlatformIdentifierStation $identifiers,
        private PlatformSettingsRepository $repository,
        private BrandAssetStore $assets,
        private BrandImageProcessor $images,
        ?callable $clock = null
    ) {
        $this->clock = $clock === null ? static fn(): int => time() : \Closure::fromCallable($clock);
    }

    // =====================================================================
    // SECTION: READS
    // =====================================================================

    /** @return array<string, mixed> */
    public function settings(): array
    {
        $settings = $this->repository->readSettings() ?? PlatformSettingsRepository::emptySettings();

        return [
            'platform_id' => self::idOrNull($settings['platform_id'] ?? ''),
            'sections'    => [
                'profile' => ['platform_id' => self::idOrNull($settings['sections']['profile']['platform_id'] ?? '')],
            ],
        ];
    }

    /** @return array<string, mixed> */
    public function profile(): array
    {
        return $this->projectProfile($this->repository->readProfile() ?? PlatformSettingsRepository::emptyProfile());
    }

    /** @return array<string, mixed> */
    public function settingsByPlatformId(string $platformId): array
    {
        $this->assertVerifiedHierarchy($platformId, PlatformIdentifierPolicy::PLATFORM_SETTINGS);

        return $this->settings();
    }

    /** @return array<string, mixed> */
    public function profileByPlatformId(string $platformId): array
    {
        $this->assertVerifiedHierarchy($platformId, PlatformIdentifierPolicy::PLATFORM_SETTINGS_PROFILE);

        return $this->profile();
    }

    /** @param array<string, mixed> $profile */
    private function projectProfile(array $profile): array
    {
        $brand = is_array($profile['brand'] ?? null) ? $profile['brand'] : [];

        return [
            'platform_id'        => self::idOrNull($profile['platform_id'] ?? ''),
            'parent_platform_id' => self::idOrNull($profile['parent_platform_id'] ?? ''),
            'revision'           => (int) ($profile['revision'] ?? 0),
            'brand'              => [
                'name'    => (string) ($brand['name'] ?? ''),
                'code'    => (string) ($brand['code'] ?? ''),
                'logo'    => $this->projectAsset($brand['logo'] ?? null),
                'favicon' => $this->projectAsset($brand['favicon'] ?? null),
            ],
        ];
    }

    /** A stored reference whose file is gone projects as missing, never as absent. */
    private function projectAsset(mixed $asset): ?array
    {
        if (!is_array($asset) || !is_string($asset['key'] ?? null)) {
            return null;
        }
        $url = $this->assets->url($asset['key']);

        return [
            'url'     => $url,
            'mime'    => (string) ($asset['mime'] ?? ''),
            'width'   => (int) ($asset['width'] ?? 0),
            'height'  => (int) ($asset['height'] ?? 0),
            'missing' => $url === null,
        ];
    }

    private static function idOrNull(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? $value : null;
    }

    // =====================================================================
    // SECTION: SAVE
    // =====================================================================

    /**
     * @param array<string, mixed>  $input fields: expected_revision, name, code, clear_logo, clear_favicon
     * @param array<string, string> $files image field => raw selected bytes
     * @return array<string, mixed> committed Profile projection
     * @throws PlatformSettingsFailure
     */
    public function saveProfile(array $input, array $files, int $userId): array
    {
        foreach (['platform_id', 'parent_platform_id', 'platformId', 'parentPlatformId'] as $field) {
            if (array_key_exists($field, $input)) {
                throw PlatformSettingsFailure::immutableIdentity();
            }
        }

        // 1. Everything the request can get wrong is rejected before any write.
        [$expectedRevision, $name, $code] = $this->validateFields($input);
        $images = [];
        foreach (self::IMAGE_FIELDS as $field => $requireSquare) {
            $clear = self::truthy($input['clear_' . $field] ?? false);
            if ($clear && isset($files[$field])) {
                throw PlatformSettingsFailure::invalid([$field => 'Choose a new image or Clear, not both.']);
            }
            if (isset($files[$field])) {
                $images[$field] = $this->images->process($files[$field], $field, $requireSquare);
            } elseif ($clear) {
                $images[$field] = null;
            }
        }

        // 2. New files are content-addressed and immutable, so writing them
        //    early can never disturb the committed Profile's references.
        $newAssets = [];
        foreach ($images as $field => $image) {
            if ($image === null) {
                $newAssets[$field] = null;
                continue;
            }
            try {
                $key = $this->assets->put($image['bytes'], $image['extension']);
            } catch (\Throwable $error) {
                throw PlatformSettingsFailure::storage('brand image could not be written.');
            }
            $newAssets[$field] = [
                'key'         => $key,
                'mime'        => $image['mime'],
                'width'       => $image['width'],
                'height'      => $image['height'],
                'bytes'       => strlen($image['bytes']),
                'source_mime' => $image['source_mime'],
            ];
        }

        // 3. One writer at a time; a stale draft never overwrites newer data.
        $lock = $this->repository->claimLock();
        if ($lock === null) {
            throw PlatformSettingsFailure::busy();
        }

        try {
            $current = $this->repository->readProfile() ?? PlatformSettingsRepository::emptyProfile();
            if ((int) ($current['revision'] ?? 0) !== $expectedRevision) {
                throw PlatformSettingsFailure::revisionConflict();
            }

            // 4. Identity exists before the first field commit and is reused after.
            [$settingsId, $profileId] = $this->bootstrapIdentity();

            // 5. Recheck concurrency at the commit point itself.
            $current = $this->repository->readProfile() ?? PlatformSettingsRepository::emptyProfile();
            if (!$this->repository->holdsLock($lock)) {
                throw PlatformSettingsFailure::busy();
            }
            if ((int) ($current['revision'] ?? 0) !== $expectedRevision
                || ($current['platform_id'] ?? '') !== $profileId
                || ($current['parent_platform_id'] ?? '') !== $settingsId
            ) {
                throw PlatformSettingsFailure::revisionConflict();
            }

            $brand = is_array($current['brand'] ?? null) ? $current['brand'] : PlatformSettingsRepository::emptyProfile()['brand'];
            $next  = [
                'schema_version'     => PlatformSettingsRepository::SCHEMA_VERSION,
                'platform_id'        => $profileId,
                'parent_platform_id' => $settingsId,
                'revision'           => $expectedRevision + 1,
                'brand'              => [
                    'name'    => $name,
                    'code'    => $code,
                    'logo'    => array_key_exists('logo', $newAssets) ? $newAssets['logo'] : ($brand['logo'] ?? null),
                    'favicon' => array_key_exists('favicon', $newAssets) ? $newAssets['favicon'] : ($brand['favicon'] ?? null),
                ],
                'updated_at'         => gmdate('c', ($this->clock)()),
                'updated_by'         => $userId,
            ];
            $this->repository->writeProfile($next);

            // 6. Only after a confirmed commit may unreferenced files go.
            $this->sweepAssets($next);

            return $this->projectProfile($next);
        } finally {
            $this->repository->releaseLock($lock);
        }
    }

    /** @param array<string, mixed> $committed */
    private function sweepAssets(array $committed): void
    {
        $referenced = [];
        foreach (array_keys(self::IMAGE_FIELDS) as $field) {
            $key = $committed['brand'][$field]['key'] ?? null;
            if (is_string($key)) {
                $referenced[$key] = true;
            }
        }

        try {
            $now = ($this->clock)();
            foreach ($this->assets->keys() as $key => $modifiedAt) {
                if (!isset($referenced[$key]) && $now - $modifiedAt > self::ASSET_GRACE_SECONDS) {
                    $this->assets->delete($key);
                }
            }
            $this->assets->sweepTemporary(self::ASSET_GRACE_SECONDS);
        } catch (\Throwable) {
            // The commit already succeeded; an orphan file is retried next Save.
        }
    }

    // =====================================================================
    // SECTION: IDENTITY
    // =====================================================================

    /**
     * Settings → Profile → section link. Each step is idempotent through
     * ensure(), so an interrupted first Save resumes on the next Save without
     * minting a second identity.
     *
     * @return array{0: string, 1: string} [Settings ID, Profile ID]
     */
    private function bootstrapIdentity(): array
    {
        // A Profile that already names a parent must find that exact parent:
        // never mint a replacement Settings root underneath an existing child.
        $existingParent = (string) (($this->repository->readProfile() ?? [])['parent_platform_id'] ?? '');
        $existingRoot   = (string) (($this->repository->readSettings() ?? [])['platform_id'] ?? '');
        if ($existingParent !== '' && $existingParent !== $existingRoot) {
            throw PlatformSettingsFailure::identityConflict('the Profile names a Settings parent that is not stored.');
        }

        $settingsRef = PlatformSettingsNativeReference::settings();
        $settingsId  = $this->ensureIdentity(
            PlatformIdentifierPolicy::PLATFORM_SETTINGS,
            $settingsRef,
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

    /**
     * A read by Platform ID succeeds only when the whole hierarchy agrees:
     * forward and reverse registry bindings, entity type, native reference,
     * the owner record's stored ID, and the parent ↔ Profile link.
     */
    private function assertVerifiedHierarchy(string $platformId, string $entityType): void
    {
        try {
            $binding = $this->identifiers->resolve($platformId);
        } catch (PlatformIdentifierConflict) {
            throw PlatformSettingsFailure::identityConflict('the identifier registry is conflicting.');
        }
        if ($binding === null || $binding->entityType() !== $entityType || !$binding->isBound()) {
            throw PlatformSettingsFailure::notFound();
        }

        $settings = $this->repository->readSettings() ?? PlatformSettingsRepository::emptySettings();
        $profile  = $this->repository->readProfile() ?? PlatformSettingsRepository::emptyProfile();
        $settingsId = (string) ($settings['platform_id'] ?? '');
        $profileId  = (string) ($profile['platform_id'] ?? '');

        $expected = [PlatformIdentifierPolicy::PLATFORM_SETTINGS => [PlatformSettingsNativeReference::settings(), $settingsId]];
        if ($entityType === PlatformIdentifierPolicy::PLATFORM_SETTINGS_PROFILE) {
            $expected[$entityType] = [PlatformSettingsNativeReference::profile(), $profileId];
        }

        try {
            foreach ($expected as $type => [$nativeReference, $storedId]) {
                $reverse = $this->identifiers->lookupNative($type, $nativeReference);
                if ($storedId === '' || $reverse === null || !$reverse->isBound() || $reverse->platformId() !== $storedId) {
                    throw PlatformSettingsFailure::identityConflict("the {$type} record and registry disagree.");
                }
            }
        } catch (PlatformIdentifierConflict) {
            throw PlatformSettingsFailure::identityConflict('the identifier registry is conflicting.');
        }

        $ownerId = $entityType === PlatformIdentifierPolicy::PLATFORM_SETTINGS ? $settingsId : $profileId;
        if ($binding->nativeReference() !== $expected[$entityType][0] || $ownerId !== $platformId) {
            throw PlatformSettingsFailure::identityConflict('the requested identifier is not the stored record identity.');
        }

        if ($entityType === PlatformIdentifierPolicy::PLATFORM_SETTINGS_PROFILE
            && (($profile['parent_platform_id'] ?? '') !== $settingsId
                || ($settings['sections']['profile']['platform_id'] ?? '') !== $profileId)
        ) {
            throw PlatformSettingsFailure::identityConflict('the Profile and its Settings parent are not linked.');
        }
    }

    // =====================================================================
    // SECTION: VALIDATION
    // =====================================================================

    /**
     * @param array<string, mixed> $input
     * @return array{0: int, 1: string, 2: string}
     */
    private function validateFields(array $input): array
    {
        $errors = [];

        $revision = $input['expected_revision'] ?? null;
        if (is_string($revision) && preg_match('/^\d+$/D', $revision) === 1) {
            $revision = (int) $revision;
        }
        if (!is_int($revision) || $revision < 0) {
            $errors['expected_revision'] = 'The Profile revision being edited is required.';
        }

        $name = $input['name'] ?? null;
        if (!is_string($name)) {
            $errors['name'] = 'Brand name is required (it may be blank).';
        } else {
            $name = function_exists('sanitize_text_field') ? sanitize_text_field($name) : trim(strip_tags($name));
            if (mb_strlen($name) > self::NAME_MAX_LENGTH) {
                $errors['name'] = 'Brand name must be ' . self::NAME_MAX_LENGTH . ' characters or fewer.';
            }
        }

        $code = $input['code'] ?? null;
        if (!is_string($code)) {
            $errors['code'] = 'Brand Code is required (it may be blank).';
        } elseif (preg_match(self::CODE_PATTERN, $code) !== 1) {
            $errors['code'] = 'Brand Code must be up to 6 letters A–Z.';
        }

        if ($errors !== []) {
            throw PlatformSettingsFailure::invalid($errors);
        }

        return [$revision, $name, strtoupper($code)];
    }

    private static function truthy(mixed $value): bool
    {
        return $value === true || $value === 1 || $value === '1' || $value === 'true';
    }
}
