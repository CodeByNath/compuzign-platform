<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

/**
 * Lightweight Package capability registry and owner-assignment schema.
 *
 * This contract knows which capability keys may be assigned to which proven
 * Package owner types. It deliberately knows nothing about Tier slots,
 * lifecycle, endpoints, drawers, or mutations; those remain with each
 * capability's authority.
 */
final class PackageCapabilityAssignments
{
    public const OWNER_PACKAGE_MANAGER = 'package-manager';
    public const PACKAGE_MANAGER_ID    = 'package-station';

    public const CAPABILITY_TIERS = 'tiers';

    /**
     * Backend availability/owner validation only. Frontend composition metadata
     * (source, template kit, drawer, authority) lives in the Admin Station
     * capability registry and drives the existing surface binding system.
     */
    private const REGISTRY = [
        self::CAPABILITY_TIERS => [
            'supported_owner_types' => [self::OWNER_PACKAGE_MANAGER],
            'order'                 => 10,
            'available'             => true,
        ],
    ];

    /** @return array<int, array{capability_key:string,supported_owner_types:array<int,string>,order:int,available:bool}> */
    public static function registered(): array
    {
        $out = [];
        foreach (self::REGISTRY as $key => $definition) {
            $out[] = [
                'capability_key'       => $key,
                'supported_owner_types' => $definition['supported_owner_types'],
                'order'                => (int) $definition['order'],
                'available'            => (bool) $definition['available'],
            ];
        }
        return $out;
    }

    /** @return array{supported_owner_types:array<int,string>,order:int,available:bool}|null */
    public static function definition(string $capabilityKey): ?array
    {
        return self::REGISTRY[$capabilityKey] ?? null;
    }

    /**
     * Sanitize persisted assignment rows. Unknown capabilities, unsupported
     * owners, malformed identities, and duplicate rows are rejected from the
     * projection. The last valid duplicate wins, matching an idempotent upsert.
     *
     * @return array<int, array{owner_type:string,owner_id:string,capability_key:string,enabled:bool,order:int}>
     */
    public static function sanitize(mixed $assignments): array
    {
        if (!is_array($assignments)) {
            return [];
        }

        $byIdentity = [];
        foreach ($assignments as $assignment) {
            if (!is_array($assignment)) {
                continue;
            }

            $ownerType    = sanitize_key((string) ($assignment['owner_type'] ?? ''));
            $ownerId      = sanitize_text_field((string) ($assignment['owner_id'] ?? ''));
            $capabilityKey = sanitize_key((string) ($assignment['capability_key'] ?? ''));
            $definition   = self::definition($capabilityKey);

            if ($definition === null
                || !$definition['available']
                || !in_array($ownerType, $definition['supported_owner_types'], true)
                || !self::ownerIdentityIsValid($ownerType, $ownerId)
            ) {
                continue;
            }

            $identity = self::identity($ownerType, $ownerId, $capabilityKey);
            $byIdentity[$identity] = [
                'owner_type'    => $ownerType,
                'owner_id'      => $ownerId,
                'capability_key' => $capabilityKey,
                'enabled'       => (bool) ($assignment['enabled'] ?? false),
                // Section order is registration metadata, not an assignment-
                // level override. This keeps one ordering authority.
                'order'         => (int) $definition['order'],
            ];
        }

        $out = array_values($byIdentity);
        usort($out, static fn(array $left, array $right): int =>
            $left['order'] <=> $right['order']
            ?: strcmp(self::identity($left['owner_type'], $left['owner_id'], $left['capability_key']), self::identity($right['owner_type'], $right['owner_id'], $right['capability_key']))
        );
        return $out;
    }

    /**
     * Idempotently assign one registered capability to one supported owner.
     * This returns assignment rows only; callers own the single repository
     * write and no capability data is created here.
     *
     * @return array<int, array{owner_type:string,owner_id:string,capability_key:string,enabled:bool,order:int}>
     */
    public static function upsert(
        array $assignments,
        string $ownerType,
        string $ownerId,
        string $capabilityKey,
        bool $enabled
    ): array {
        $ownerType     = sanitize_key($ownerType);
        $ownerId       = sanitize_text_field($ownerId);
        $capabilityKey = sanitize_key($capabilityKey);
        $definition    = self::definition($capabilityKey);

        if ($definition === null || !$definition['available']) {
            throw new \InvalidArgumentException('Capability is not registered or available.');
        }
        if (!in_array($ownerType, $definition['supported_owner_types'], true)) {
            throw new \InvalidArgumentException('Capability does not support this owner type.');
        }
        if (!self::ownerIdentityIsValid($ownerType, $ownerId)) {
            throw new \InvalidArgumentException('Capability owner identity is invalid.');
        }

        $identity = self::identity($ownerType, $ownerId, $capabilityKey);
        $next = array_values(array_filter(
            self::sanitize($assignments),
            static fn(array $candidate): bool => self::identity(
                $candidate['owner_type'],
                $candidate['owner_id'],
                $candidate['capability_key']
            ) !== $identity
        ));
        $next[] = [
            'owner_type'    => $ownerType,
            'owner_id'      => $ownerId,
            'capability_key' => $capabilityKey,
            'enabled'       => $enabled,
            'order'         => (int) $definition['order'],
        ];

        return self::sanitize($next);
    }

    public static function isEnabled(
        array $assignments,
        string $ownerType,
        string $ownerId,
        string $capabilityKey
    ): bool {
        $identity = self::identity($ownerType, $ownerId, $capabilityKey);
        foreach (self::sanitize($assignments) as $assignment) {
            if (self::identity($assignment['owner_type'], $assignment['owner_id'], $assignment['capability_key']) === $identity) {
                return $assignment['enabled'];
            }
        }
        return false;
    }

    private static function ownerIdentityIsValid(string $ownerType, string $ownerId): bool
    {
        // Only the proven singleton Package Manager is an assignment owner in
        // this phase. Family and Service scopes remain read projections until
        // persistence authority supports independent capability state.
        return $ownerType === self::OWNER_PACKAGE_MANAGER
            && $ownerId === self::PACKAGE_MANAGER_ID;
    }

    private static function identity(string $ownerType, string $ownerId, string $capabilityKey): string
    {
        return $ownerType . '::' . $ownerId . '::' . $capabilityKey;
    }
}
