<?php

declare(strict_types=1);

// Public-projection contract for the Package Family filter input (Cost
// Builder frontend filtering system, not a Tier/pricing change): the private
// overlayPackage() carries a Service's own already-resolved Family
// (PackageRepository::resolveFamilyForService()) into the public {id, label,
// sort_order} shape, and the private collectPackageFamilies() dedupes/orders
// that same per-service data into the flat top-level list the frontend's
// Family nav reads — mirroring how `categories` already coexists with
// per-service `categories[]`. Both are exercised through reflection: their
// constructor dependencies (ServiceRepository/PackageRepository) are
// unrelated to these pure array transforms, so newInstanceWithoutConstructor
// avoids standing up unrelated WordPress/db plumbing.

if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-08-10 00:00:00'; }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\CostBuilder\Services\PricingBuilder;

function check_family_projection(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Cost Builder Package Family projection: ' . $message);
    }
}

$builderReflection = new ReflectionClass(PricingBuilder::class);
$builder = $builderReflection->newInstanceWithoutConstructor();

$overlayMethod = $builderReflection->getMethod('overlayPackage');
$overlay = static function (array $payload, array $package) use ($overlayMethod, $builder): array {
    return $overlayMethod->invoke($builder, $payload, $package);
};

$collectMethod = $builderReflection->getMethod('collectPackageFamilies');
$packageMapProperty = $builderReflection->getProperty('packageMap');
$collect = static function (array $packageMap) use ($collectMethod, $packageMapProperty, $builder): array {
    $packageMapProperty->setValue($builder, $packageMap);
    return $collectMethod->invoke($builder);
};

function family_tier_data(): array
{
    return ['price' => null, 'billing_cycle' => 'monthly', 'inclusions' => [], 'features' => [], 'is_addon' => false];
}

function family_base_package(array $tiers): array
{
    return [
        'tiers' => $tiers, 'popular_tier' => null, 'popular_label' => '', 'sort_position' => 0,
        'promotion_tiers' => [], 'bundle' => ['title' => '', 'description' => '', 'price' => null],
    ];
}

// ── overlayPackage() reshapes resolved_family into the public {id, label, sort_order} shape ──

$kairosPackage = family_base_package(['basic' => ['label' => 'Basic', 'price' => 10.0, 'contact' => false, 'billing_cycle' => 'monthly', 'inclusions_override' => [], 'features' => [], 'enabled' => true]]);
$kairosPackage['resolved_family'] = ['group_id' => 'pcg_kairos', 'label' => 'KAIROS', 'sort_order' => 0];
$kairosPayload = $overlay(['pricing' => ['tiers' => ['basic' => family_tier_data()]]], $kairosPackage);
check_family_projection(
    $kairosPayload['family'] === ['id' => 'pcg_kairos', 'label' => 'KAIROS', 'sort_order' => 0],
    'a Service with a resolved Family projects it as {id, label, sort_order}'
);
check_family_projection(
    $kairosPayload['pricing']['tiers']['basic']['price'] === 10.0,
    'Tier pricing overlay is unaffected by the additive family field'
);

// ── overlayPackage() leaves family null when no attribution was resolved ──

$unassignedPackage = family_base_package(['basic' => ['label' => 'Basic', 'price' => 10.0, 'contact' => false, 'billing_cycle' => 'monthly', 'inclusions_override' => [], 'features' => [], 'enabled' => true]]);
// resolved_family intentionally absent — legacy/unassigned package data.
$unassignedPayload = $overlay(['pricing' => ['tiers' => ['basic' => family_tier_data()]]], $unassignedPackage);
check_family_projection($unassignedPayload['family'] === null, 'a Service with no resolved Family projects family: null, never a partial/empty object');

// ── collectPackageFamilies() dedupes and orders by sort_order ──────────────

$packageMap = [
    101 => ['resolved_family' => ['group_id' => 'pcg_aptos', 'label' => 'APTOS', 'sort_order' => 1]],
    102 => ['resolved_family' => ['group_id' => 'pcg_kairos', 'label' => 'KAIROS', 'sort_order' => 0]],
    // Second Service in the same Family — must not duplicate the Family row.
    103 => ['resolved_family' => ['group_id' => 'pcg_kairos', 'label' => 'KAIROS', 'sort_order' => 0]],
    // No package/resolved_family at all — must not produce a null entry.
    104 => ['tiers' => []],
];
$families = $collect($packageMap);
check_family_projection(count($families) === 2, 'collectPackageFamilies dedupes multiple Services in the same Family into one row and skips unassigned Services');
check_family_projection($families[0] === ['id' => 'pcg_kairos', 'label' => 'KAIROS', 'sort_order' => 0], 'KAIROS sorts first by its sort_order');
check_family_projection($families[1] === ['id' => 'pcg_aptos', 'label' => 'APTOS', 'sort_order' => 1], 'APTOS sorts second by its sort_order');

// ── An empty packageMap (no active packages at all) projects no Families ───

check_family_projection($collect([]) === [], 'no active packages means no Package Families are offered, same as no Category has no Services');

echo "Cost Builder Package Family projection checks passed.\n";
