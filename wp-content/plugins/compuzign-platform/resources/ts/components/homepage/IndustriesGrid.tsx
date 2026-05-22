const INDUSTRIES = [
  {
    num:   '01',
    title: 'Insurance & Fintech',
    copy:  'Banks, credit unions, carriers, and fintech organizations.',
  },
  {
    num:   '02',
    title: 'Healthcare & Life Sciences',
    copy:  'HIPAA-aligned IT for clinics and practices.',
  },
  {
    num:   '03',
    title: 'Government & Public Sector',
    copy:  'Modernizing legacy systems and citizen-facing services.',
  },
  {
    num:   '04',
    title: 'Legal & Professional Services',
    copy:  'Uptime, confidentiality, and document security.',
  },
  {
    num:   '05',
    title: 'Financial Services',
    copy:  'Zero Trust environments for compliance-heavy firms.',
  },
  {
    num:   '06',
    title: 'Small & Mid-Sized Businesses',
    copy:  'Enterprise-grade IT at a cost that makes sense.',
  },
  {
    num:   '07',
    title: 'Enterprise & Multi-Location',
    copy:  'Centralized management across distributed operations.',
  },
] as const;

export function IndustriesGrid() {
  return (
    <section class="cz-home-industries" id="industries">
      <div class="cz-container">
        <header class="cz-home-industries__header">
          <span class="cz-eyebrow">Industries We Serve</span>
          <h2 class="cz-heading-xl cz-home-industries__heading">
            Built for industries where IT failure is not an option.
          </h2>
        </header>

        <div class="cz-home-industries__grid">
          {INDUSTRIES.map((ind) => (
            <article class="cz-home-industries__card">
              <span class="cz-home-industries__number">{ind.num}</span>
              <h3 class="cz-home-industries__title">{ind.title}</h3>
              <p class="cz-home-industries__copy">{ind.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
