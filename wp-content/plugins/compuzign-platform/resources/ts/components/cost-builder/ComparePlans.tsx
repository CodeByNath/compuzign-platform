import type { ServiceItem, Tier } from '@/api/types/cost-builder';

interface ComparePlansProps {
  service: ServiceItem | null;
  tiers: Tier[];
}

export function ComparePlans({ service, tiers }: ComparePlansProps) {
  if (!service || !service.availability.is_available || !service.inclusions.length) {
    return null;
  }

  const { inclusions, pricing, meta } = service;
  // Compare Plans lines up the customer's normal Tier alternatives; an
  // add-on is not a competing plan, so it does not get a column here.
  const comparableTiers = tiers.filter((tier) => !pricing.tiers[tier.id]?.is_addon);

  return (
    <section class="cz-cost-builder__compare">
      <h2 class="cz-cost-builder__compare-heading">Compare Plans</h2>
      <div class="cz-cost-builder__compare-scroll">
        <table class="cz-cost-builder__compare-table">
          <thead>
            <tr>
              <th class="cz-cost-builder__compare-th cz-cost-builder__compare-th--feature">
                Feature
              </th>
              {comparableTiers.map((tier) => (
                <th
                  key={tier.id}
                  class={`cz-cost-builder__compare-th${tier.id === meta.popular_tier ? ' cz-cost-builder__compare-th--popular' : ''}`}
                >
                  {tier.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inclusions.map((inclusion) => (
              <tr key={inclusion.id} class="cz-cost-builder__compare-row">
                <td class="cz-cost-builder__compare-label">{inclusion.label}</td>
                {comparableTiers.map((tier) => {
                  const tierInclusions = pricing.tiers[tier.id]?.inclusions ?? [];
                  const has = tierInclusions.some((inc) => inc.id === inclusion.id);
                  return (
                    <td
                      key={tier.id}
                      class={[
                        'cz-cost-builder__compare-cell',
                        tier.id === meta.popular_tier && 'cz-cost-builder__compare-cell--popular',
                        !has && 'is-empty',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {has ? '✓' : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
