<?php

declare(strict_types=1);

// Public-projection contract for is_addon (Tier System add-on capability,
// Phase 3): PricingBuilder::normalizePricing defaults every canonical tier to
// is_addon: false, and the private overlayPackage() carries an occupant's own
// is_addon through unchanged, while a disabled occupant is still suppressed
// entirely regardless of is_addon — the existing fail-closed behaviour is
// untouched. overlayPackage is exercised through reflection: its constructor
// dependencies (ServiceRepository/PackageRepository) are unrelated to this
// pure array transform, so newInstanceWithoutConstructor avoids standing up
// unrelated WordPress/db plumbing just to reach a private pure method.

if (!function_exists('sanitize_title')) {
    function sanitize_title(mixed $value): string
    {
        return trim((string) preg_replace('/[^a-z0-9]+/', '-', strtolower((string) $value)), '-');
    }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-07-31 00:00:00'; }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\CostBuilder\Services\PricingBuilder;

function check_public_is_addon(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier public projection is_addon: ' . $message);
    }
}

$builderReflection = new ReflectionClass(PricingBuilder::class);
$builder = $builderReflection->newInstanceWithoutConstructor();

$overlayMethod = $builderReflection->getMethod('overlayPackage');
$overlay = static function (array $payload, array $package) use ($overlayMethod, $builder): array {
    return $overlayMethod->invoke($builder, $payload, $package);
};

function is_addon_tier_data(): array
{
    return ['price' => null, 'billing_cycle' => 'monthly', 'inclusions' => [], 'features' => [], 'is_addon' => false];
}

// ── normalizePricing defaults every canonical tier to is_addon: false ──────

$normalized = $builder->normalizePricing([], 'monthly');
foreach (['basic', 'standard', 'premium', 'enterprise', 'ultimate'] as $tierId) {
    check_public_is_addon($normalized['tiers'][$tierId]['is_addon'] === false, "normalizePricing defaults {$tierId} to is_addon: false with no source data");
}

// ── A normal occupant projects is_addon: false and its other fields intact ──

$normalPayload = ['pricing' => ['tiers' => ['basic' => is_addon_tier_data(), 'standard' => is_addon_tier_data()]]];
$normalPackage = [
    'tiers' => [
        'basic' => [
            'label' => 'Standard', 'price' => 49.0, 'contact' => false, 'billing_cycle' => 'monthly',
            'inclusions_override' => [], 'features' => [], 'enabled' => true, 'is_addon' => false,
        ],
    ],
    'popular_tier' => null, 'popular_label' => '', 'sort_position' => 0, 'promotion_tiers' => [],
    'bundle' => ['title' => '', 'description' => '', 'price' => null],
];
$normalResult = $overlay($normalPayload, $normalPackage);
check_public_is_addon($normalResult['pricing']['tiers']['basic']['is_addon'] === false, 'a normal occupant projects is_addon: false');
check_public_is_addon($normalResult['pricing']['tiers']['basic']['price'] === 49.0, 'price still overlays correctly alongside is_addon');
check_public_is_addon($normalResult['pricing']['tiers']['basic']['label'] === 'Standard', 'label still overlays correctly alongside is_addon');
check_public_is_addon(!isset($normalResult['pricing']['tiers']['standard']['label']), 'an unconfigured tier is still suppressed the same as before (no drift)');
check_public_is_addon(!isset($normalResult['pricing']['tiers']['standard']['price']) || $normalResult['pricing']['tiers']['standard']['price'] === null, 'an unconfigured tier carries no overlaid price');

// ── An add-on occupant projects is_addon: true, same fail-closed rules apply ─

$addonPayload = ['pricing' => ['tiers' => ['premium' => is_addon_tier_data()]]];
$addonPackage = [
    'tiers' => [
        'premium' => [
            'label' => 'Backup & DR Shield', 'price' => 25.0, 'contact' => false, 'billing_cycle' => 'monthly',
            'inclusions_override' => [], 'features' => [], 'enabled' => true, 'is_addon' => true,
        ],
    ],
    'popular_tier' => null, 'popular_label' => '', 'sort_position' => 0, 'promotion_tiers' => [],
    'bundle' => ['title' => '', 'description' => '', 'price' => null],
];
$addonResult = $overlay($addonPayload, $addonPackage);
check_public_is_addon($addonResult['pricing']['tiers']['premium']['is_addon'] === true, 'an add-on occupant projects is_addon: true');
check_public_is_addon($addonResult['pricing']['tiers']['premium']['price'] === 25.0, 'an add-on occupant still projects its real price, not a Rate Sheet row or synthetic value');
check_public_is_addon($addonResult['pricing']['tiers']['premium']['label'] === 'Backup & DR Shield', 'an add-on occupant keeps its own label');

// ── A disabled add-on occupant is not publicly offered at all ──────────────

$disabledAddonPayload = ['pricing' => ['tiers' => ['premium' => is_addon_tier_data()]]];
$disabledAddonPackage = [
    'tiers' => [
        'premium' => [
            'label' => 'Backup & DR Shield', 'price' => 25.0, 'contact' => false, 'billing_cycle' => 'monthly',
            'inclusions_override' => [], 'features' => [], 'enabled' => false, 'is_addon' => true,
        ],
    ],
    'popular_tier' => null, 'popular_label' => '', 'sort_position' => 0, 'promotion_tiers' => [],
    'bundle' => ['title' => '', 'description' => '', 'price' => null],
];
$disabledAddonResult = $overlay($disabledAddonPayload, $disabledAddonPackage);
check_public_is_addon(!isset($disabledAddonResult['pricing']['tiers']['premium']), 'a disabled add-on occupant is removed from the public payload, same as a disabled normal Tier');
check_public_is_addon($disabledAddonResult['availability']['is_available'] === false, 'a Service whose only configured tier is a disabled add-on is unavailable, not silently offered');

// ── Legacy package data with no is_addon key at all defaults to false ──────

$legacyPayload = ['pricing' => ['tiers' => ['basic' => is_addon_tier_data()]]];
$legacyPackage = [
    'tiers' => [
        'basic' => [
            'label' => 'Legacy', 'price' => 10.0, 'contact' => false, 'billing_cycle' => 'monthly',
            'inclusions_override' => [], 'features' => [], 'enabled' => true,
            // is_addon intentionally absent — pre-migration occupant data.
        ],
    ],
    'popular_tier' => null, 'popular_label' => '', 'sort_position' => 0, 'promotion_tiers' => [],
    'bundle' => ['title' => '', 'description' => '', 'price' => null],
];
$legacyResult = $overlay($legacyPayload, $legacyPackage);
check_public_is_addon($legacyResult['pricing']['tiers']['basic']['is_addon'] === false, 'a package tier with no is_addon key defaults to false, never leaving the key unset');

echo "Tier public projection is_addon checks passed.\n";
