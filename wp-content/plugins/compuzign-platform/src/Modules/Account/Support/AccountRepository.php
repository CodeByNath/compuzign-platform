<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\Account\Support;

/**
 * AccountRepository — the one non-autoloaded WordPress option backing Account
 * Station's entire singleton tree: the four identity nodes, Brand's canonical
 * and draft fields, and lifecycle state. There is exactly one row for each of
 * these, forever; this is a read-modify-write aggregate, not a collection.
 *
 * FILE INDEX
 *   SECTION: NODES — the four identity-bearing singleton records
 *   SECTION: BRAND — canonical and draft field storage
 *   SECTION: LIFECYCLE — platform_status / module_status
 *   SECTION: INTERNALS — option read/write and defaults
 */
final class AccountRepository
{
    public const OPTION_KEY = 'cz_account_station_v1';
    private const VERSION   = 1;

    /** @var array<string, int> */
    public const NODES = ['account_station' => 0, 'settings' => 1, 'tools' => 2, 'profile' => 3];

    // =====================================================================
    // SECTION: NODES
    // =====================================================================

    public function readNodePlatformId(string $node): string
    {
        $state = $this->read();

        return (string) ($state['nodes'][$node]['platform_id'] ?? '');
    }

    public function readNodeParentPlatformId(string $node): ?string
    {
        $state  = $this->read();
        $parent = $state['nodes'][$node]['parent_platform_id'] ?? null;

        return $parent === null ? null : (string) $parent;
    }

    public function writeNode(string $node, string $platformId, ?string $parentPlatformId): void
    {
        $state = $this->read();
        $state['nodes'][$node] = [
            'platform_id'        => $platformId,
            'parent_platform_id' => $parentPlatformId,
        ];
        $this->write($state);
    }

    /** @return array<string, array{platform_id: string, parent_platform_id: ?string}> */
    public function readNodes(): array
    {
        return $this->read()['nodes'];
    }

    // =====================================================================
    // SECTION: BRAND
    // =====================================================================

    /** @return array{name: string, code: string, logo_attachment_id: ?int, favicon_attachment_id: ?int} */
    public function readBrand(): array
    {
        return $this->read()['brand'];
    }

    /** @return ?array{name: string, code: string, logo_attachment_id: ?int, favicon_attachment_id: ?int} */
    public function readBrandDraft(): ?array
    {
        return $this->read()['brand_draft'];
    }

    public function writeBrandDraft(array $draft): void
    {
        $state = $this->read();
        $state['brand_draft'] = $draft;
        $this->write($state);
    }

    /** Commits the current draft to canonical Brand and clears it. No-op (returns canonical) if there is no draft. */
    public function settleBrandDraft(): array
    {
        $state = $this->read();
        if ($state['brand_draft'] !== null) {
            $state['brand']       = $state['brand_draft'];
            $state['brand_draft'] = null;
            $this->write($state);
        }

        return $state['brand'];
    }

    // =====================================================================
    // SECTION: LIFECYCLE
    // =====================================================================

    /** @return array{platform_status: string, previous_platform_status: string, module_status: array{brand: string}} */
    public function readLifecycle(): array
    {
        $state = $this->read();

        return [
            'platform_status'          => $state['platform_status'],
            'previous_platform_status' => $state['previous_platform_status'],
            'module_status'            => $state['module_status'],
        ];
    }

    public function writeLifecycle(string $platformStatus, string $previousPlatformStatus, array $moduleStatus): void
    {
        $state                            = $this->read();
        $state['platform_status']         = $platformStatus;
        $state['previous_platform_status'] = $previousPlatformStatus;
        $state['module_status']           = $moduleStatus;
        $this->write($state);
    }

    /** The one existence predicate every lifecycle route shares: true only once all four chain nodes are bound, not just the leaf. */
    public function isBootstrapped(): bool
    {
        foreach (array_keys(self::NODES) as $node) {
            if ($this->readNodePlatformId($node) === '') {
                return false;
            }
        }

        return true;
    }

    // =====================================================================
    // SECTION: INTERNALS
    // =====================================================================

    /** @return array<string, mixed> */
    private function read(): array
    {
        $stored = get_option(self::OPTION_KEY, null);
        $state  = is_array($stored) ? $stored : [];

        return array_replace_recursive($this->defaults(), $state);
    }

    private function write(array $state): void
    {
        $state['version'] = self::VERSION;
        update_option(self::OPTION_KEY, $state, false);
    }

    /** @return array<string, mixed> */
    private function defaults(): array
    {
        $emptyNode = ['platform_id' => '', 'parent_platform_id' => null];

        return [
            'version' => self::VERSION,
            'nodes'   => array_fill_keys(array_keys(self::NODES), $emptyNode),
            'brand'   => ['name' => '', 'code' => '', 'logo_attachment_id' => null, 'favicon_attachment_id' => null],
            'brand_draft'               => null,
            'platform_status'          => 'disabled',
            'previous_platform_status' => '',
            'module_status'            => ['brand' => 'not-configured'],
        ];
    }
}
