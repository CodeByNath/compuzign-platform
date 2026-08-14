<?php

namespace CompuZign\Platform\Modules\CostBuilder\Services;

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;

/** Customer-safe response assembly for directly assigned Package Families. */
final class PackageFamilyPricingBuilder
{
    private const TIERS = [
        ['id' => 'basic',      'title' => 'Basic'],
        ['id' => 'standard',   'title' => 'Standard'],
        ['id' => 'premium',    'title' => 'Premium'],
        ['id' => 'enterprise', 'title' => 'Enterprise'],
        ['id' => 'ultimate',   'title' => 'Ultimate'],
    ];

    public function __construct(private PackageRepository $packages) {}

    /** @return array<string, mixed> */
    public function buildResponse(): array
    {
        $families = array_map(function (array $family): array {
            $tiers = [];
            foreach ($family['tiers'] as $tierId => $tier) {
                $inclusions = is_array($tier['inclusions_override'] ?? null)
                    ? $tier['inclusions_override']
                    : [];
                $tiers[$tierId] = [
                    'tier_occupant_id' => (string) ($tier['occupant_id'] ?? ''),
                    'tier_platform_id' => (string) ($tier['platform_id'] ?? ''),
                    'price'            => $tier['price'] ?? null,
                    'billing_cycle'    => (string) ($tier['billing_cycle'] ?? ''),
                    'inclusions'       => $inclusions,
                    'features'         => array_map(
                        static fn(array $inclusion): string => (string) ($inclusion['label'] ?? ''),
                        $inclusions
                    ),
                    'label'             => (string) ($tier['label'] ?? ''),
                    'ideal_for'         => (string) ($tier['ideal_for'] ?? ''),
                    // An occupant belongs to its Tier Group, not one customer
                    // audience. Defaults to both groups for occupants that
                    // predate this field.
                    'audience_groups'   => is_array($tier['audience_groups'] ?? null)
                        ? array_values(array_map('strval', $tier['audience_groups']))
                        : ['personal_business', 'enterprise'],
                    'is_addon'          => (bool) ($tier['is_addon'] ?? false),
                    'edition_options'   => is_array($tier['edition_options'] ?? null) ? $tier['edition_options'] : [],
                    'minimum_term_value' => $tier['minimum_term_value'] ?? null,
                    'minimum_term_unit'  => $tier['minimum_term_unit'] ?? null,
                ];
            }
            return [
                'family_id'        => $family['family_id'],
                'family_platform_id' => $family['family_platform_id'],
                'title'            => $family['title'],
                'description'      => $family['description'],
                'tier_instance_id' => $family['tier_instance_id'],
                'tier_instance_platform_id' => $family['tier_instance_platform_id'],
                'popular_tier'     => $family['popular_tier'],
                'popular_label'    => $family['popular_label'],
                'included_categories' => is_array($family['included_categories'] ?? null)
                    ? array_values(array_map('strval', $family['included_categories']))
                    : [],
                'pricing'          => ['tiers' => $tiers],
            ];
        }, $this->packages->findAllActiveFamiliesForCostBuilder());

        return ['tiers' => self::TIERS, 'families' => $families];
    }
}
