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
                $tiers[$tierId] = $this->presentOccupant($tier);
            }
            $pricing = ['tiers' => $tiers];
            // Phase 1A — the subordinate composable child, presented through
            // the exact same occupant shape as any `tiers[tierId]` entry,
            // but as a sibling key so it can never enter the exclusive
            // "Choose your Tier" selection this response's `tiers` map
            // drives. Absent entirely when the Family has none configured.
            if (is_array($family['composable_offer'] ?? null)) {
                $pricing['composable_offer'] = $this->presentOccupant($family['composable_offer']);
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
                'pricing'          => $pricing,
            ];
        }, $this->packages->findAllActiveFamiliesForCostBuilder());

        return ['tiers' => self::TIERS, 'families' => $families];
    }

    /**
     * Customer-safe shape for one compiled occupant — a `tiers[tierId]`
     * entry or the composable child alike. Extracted so both share exactly
     * one presentation transform.
     *
     * @param array<string, mixed> $tier
     * @return array<string, mixed>
     */
    private function presentOccupant(array $tier): array
    {
        $inclusions = is_array($tier['inclusions_override'] ?? null)
            ? $tier['inclusions_override']
            : [];
        return [
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
            // The occupant's own resolved Default + Additional Leg
            // commercial timeline — see PackageManagerSchema::
            // resolveCommercialLegTimeline(). Additive alongside
            // price above, same as every other field here; carried
            // through whole, like edition_options already is.
            'commercial_legs'   => is_array($tier['commercial_legs'] ?? null) ? $tier['commercial_legs'] : [],
            // Customer-facing Headline pointer — presentation metadata
            // only, already resolved to a real identity (or 'default')
            // by PackageSchema::extractTierForCostBuilder(); matched
            // against commercial_legs[].components[].source on the
            // frontend. Carried through verbatim, same as
            // commercial_legs above.
            'headline_leg_id'   => (string) ($tier['headline_leg_id'] ?? 'default'),
        ];
    }
}
