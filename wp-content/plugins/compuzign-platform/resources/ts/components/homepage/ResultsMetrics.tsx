const METRICS = [
  { value: '60%+',    label: 'Reduction in unplanned downtime within the first 90 days.' },
  { value: '99.9%',   label: 'Uptime across monitored infrastructure.' },
  { value: '<15m',    label: 'Average help desk response time.' },
  { value: '0',       label: 'Successful ransomware breaches across protected client base.' },
  { value: '95%+',    label: 'Multi-year client retention rate.' },
  { value: 'No CapEx',label: 'Predictable monthly costs with no surprise bills or vendor overlap.' },
] as const;

export function ResultsMetrics() {
  return (
    <section class="cz-home-results" id="results">
      <div class="cz-container">
        <div class="cz-home-results__header">
          <span class="cz-eyebrow">Results Clients See</span>
          <h2 class="cz-heading-xl cz-home-results__heading">Numbers that matter.</h2>
        </div>
        <div class="cz-home-results__grid">
          {METRICS.map((m) => (
            <article class="cz-home-results__card">
              <strong class="cz-home-results__value">{m.value}</strong>
              <p class="cz-home-results__label">{m.label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
