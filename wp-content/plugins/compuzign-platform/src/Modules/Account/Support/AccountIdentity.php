<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\Account\Support;

use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierConflict;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

/**
 * AccountIdentity — the Account Station → Settings → Tools → Profile
 * singleton identity chain: Account Station → Settings → Tools → Profile.
 *
 * Each node has exactly one instance, ever, addressed by a fixed constant
 * native reference (there is no numeric/string record id to key on — the
 * record IS the singleton). bootstrap() is idempotent through
 * PlatformIdentifierStation::ensure(): a first call mints and binds all four
 * in parent order; an interrupted or repeated call resumes from whichever
 * node is already bound rather than minting a second identity for it.
 */
final class AccountIdentity
{
    public const NATIVE_ACCOUNT_STATION = 'account_station:root';
    public const NATIVE_SETTINGS        = 'account_settings:root';
    public const NATIVE_TOOLS           = 'account_tools:root';
    public const NATIVE_PROFILE         = 'account_profile:root';

    public function __construct(
        private PlatformIdentifierStation $identifiers,
        private AccountRepository $repository
    ) {
    }

    /** @return array{account_station: string, settings: string, tools: string, profile: string} */
    public function bootstrap(): array
    {
        $account  = $this->ensureNode('account_station', PlatformIdentifierPolicy::ACCOUNT_STATION, self::NATIVE_ACCOUNT_STATION, null);
        $settings = $this->ensureNode('settings', PlatformIdentifierPolicy::ACCOUNT_SETTINGS, self::NATIVE_SETTINGS, $account);
        $tools    = $this->ensureNode('tools', PlatformIdentifierPolicy::ACCOUNT_TOOLS, self::NATIVE_TOOLS, $settings);
        $profile  = $this->ensureNode('profile', PlatformIdentifierPolicy::ACCOUNT_PROFILE, self::NATIVE_PROFILE, $tools);

        return [
            'account_station' => $account,
            'settings'        => $settings,
            'tools'           => $tools,
            'profile'         => $profile,
        ];
    }

    private function ensureNode(string $node, string $entityType, string $nativeReference, ?string $expectedParent): string
    {
        $binding = $this->identifiers->ensure(
            $entityType,
            $nativeReference,
            fn (int|string $ref): string => $this->repository->readNodePlatformId($node),
            function (int|string $ref, string $platformId) use ($node, $expectedParent): void {
                $this->repository->writeNode($node, $platformId, $expectedParent);
            }
        );

        // Defensive agreement check: a node that was already bound before this
        // call must still name the exact same parent we are about to chain onto.
        // This can only disagree after a corrupted aggregate write or a changed
        // bootstrap order — never during ordinary idempotent resumption.
        $storedParent = $this->repository->readNodeParentPlatformId($node);
        if ($storedParent !== $expectedParent) {
            throw PlatformIdentifierConflict::registry(
                "Account Station node '{$node}' names a different parent than the current bootstrap order."
            );
        }

        return $binding->platformId();
    }
}
