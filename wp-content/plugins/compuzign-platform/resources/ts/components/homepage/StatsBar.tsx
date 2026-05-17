interface Stat {
  value: string;
  label: string;
}

const STATS: Stat[] = [
  { value: '99.9%',  label: 'Guaranteed Uptime' },
  { value: '< 1 hr', label: 'Avg. Response Time' },
  { value: '150+',   label: 'Clients Served' },
  { value: '15+',    label: 'Years in Operation' },
];

export function StatsBar() {
  return (
    <section class="cz-stats">
      <div class="cz-container">
        <dl class="cz-stats__grid">
          {STATS.map((stat) => (
            <div key={stat.label} class="cz-stats__item">
              <dt class="cz-stats__value">{stat.value}</dt>
              <dd class="cz-stats__label">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
