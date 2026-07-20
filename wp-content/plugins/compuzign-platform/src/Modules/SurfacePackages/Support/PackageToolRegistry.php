<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

/**
 * PackageToolRegistry — the Package Family / Group tool catalogue.
 *
 * A "tool" (a.k.a. Tool / Skill) is an optional system a Package Family or
 * Group may activate from its Settings → Tools / Skills surface. This registry
 * is metadata ONLY: it names the valid tool keys and whether each is a real,
 * available system. It carries no business rules, endpoints, lifecycle, or
 * mutation logic — each tool keeps its own authority elsewhere (Tier authority
 * remains `PackageSchema` / `PackageStationController` / `usePackageStation`).
 *
 * Ownership model: a tool assignment is owned by the Package Family / Group
 * (a `package_manager.category_groups` row, stable `group_id`). Activation is
 * persisted on that row as `tools[<key>] = ['enabled' => bool]`. Activation is
 * NOT tool data creation — enabling Tier mints no occupant.
 *
 * Pure, no I/O, no WordPress dependency, so the standalone contract tests can
 * require it directly.
 */
final class PackageToolRegistry
{
    /**
     * toolKey => whether a real runtime authority backs it today.
     *
     * `tier` is the first real owner-activated tool. Promotion, Bundle and
     * Campaign are future tools: they are registry-compatible but have no
     * Family-owned activation authority yet, so they are declared unavailable
     * and can never be enabled. They are NOT fake runtime systems.
     */
    private const TOOLS = [
        'tier'      => ['available' => true],
        'promotion' => ['available' => false],
        'bundle'    => ['available' => false],
        'campaign'  => ['available' => false],
    ];

    /** @return string[] every known tool key */
    public static function keys(): array
    {
        return array_keys(self::TOOLS);
    }

    public static function isKnown(string $toolKey): bool
    {
        return isset(self::TOOLS[$toolKey]);
    }

    /** A known tool whose real authority exists and may therefore be enabled. */
    public static function isAvailable(string $toolKey): bool
    {
        return self::TOOLS[$toolKey]['available'] ?? false;
    }
}
