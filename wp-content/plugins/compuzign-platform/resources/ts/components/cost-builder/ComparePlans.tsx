const TIERS = ['Basic', 'Standard', 'Premium', 'Enterprise'] as const;

const FEATURES: Array<{
  label: string;
  basic: string;
  standard: string;
  premium: string;
  enterprise: string;
}> = [
  { label: 'Endpoints Monitored',        basic: 'Up to 10', standard: 'Up to 25',  premium: 'Up to 75',   enterprise: 'Unlimited'      },
  { label: '24/7 Help Desk',             basic: '✓',        standard: '✓',         premium: '✓',          enterprise: '✓'              },
  { label: 'Response Time SLA',          basic: '4 hrs',    standard: '2 hrs',     premium: '1 hr',       enterprise: '30 min'         },
  { label: 'Patch Management',           basic: '✓',        standard: '✓',         premium: '✓',          enterprise: '✓'              },
  { label: 'Threat Detection',           basic: '—',        standard: 'Basic',     premium: 'Advanced',   enterprise: 'Advanced + XDR' },
  { label: 'Backup & Recovery',          basic: '—',        standard: '✓',         premium: '✓',          enterprise: '✓'              },
  { label: 'Dedicated Account Manager',  basic: '—',        standard: '—',         premium: '✓',          enterprise: '✓'              },
  { label: 'On-site Support',            basic: '—',        standard: 'Add-on',    premium: 'Add-on',     enterprise: 'Included'       },
  { label: 'Compliance Reporting',       basic: '—',        standard: '—',         premium: '✓',          enterprise: '✓'              },
  { label: 'Cloud Management',           basic: '—',        standard: '—',         premium: '✓',          enterprise: '✓'              },
];

export function ComparePlans() {
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
              {TIERS.map((t) => (
                <th
                  key={t}
                  class={`cz-cost-builder__compare-th${t === 'Premium' ? ' cz-cost-builder__compare-th--popular' : ''}`}
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((row, i) => (
              <tr key={i} class="cz-cost-builder__compare-row">
                <td class="cz-cost-builder__compare-label">{row.label}</td>
                {(['basic', 'standard', 'premium', 'enterprise'] as const).map((tier) => (
                  <td
                    key={tier}
                    class={[
                      'cz-cost-builder__compare-cell',
                      tier === 'premium' && 'cz-cost-builder__compare-cell--popular',
                      row[tier] === '—' && 'is-empty',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {row[tier]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
