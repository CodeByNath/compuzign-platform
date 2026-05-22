import { useState } from 'preact/hooks';

const STORIES = [
  {
    tab:   'Regional Insurance Broker',
    label: 'Regional Insurance Broker — 120 Employees — Jacksonville, FL',
    title: 'Security incidents eliminated and downtime reduced.',
    body:  'Ageing servers, no backup system, and a ransomware scare. After onboarding with CompuZign: zero security incidents in 18 months and IT downtime cut by over 60%.',
  },
  {
    tab:   'Municipal Government Agency',
    label: 'Municipal Government Agency — Caribbean',
    title: 'Citizen portal uptime improved and support response accelerated.',
    body:  'Legacy systems, no DR plan, and staff stretched thin. After onboarding: citizen portal uptime at 99.9% and staff IT response times reduced from hours to under 15 minutes.',
  },
  {
    tab:   'Regional Credit Union',
    label: 'Regional Credit Union — 8 Branches — US',
    title: 'Audit passed with zero findings and annual IT spend reduced.',
    body:  'BSA and GLBA compliance gaps, no endpoint visibility. After onboarding: passed their next regulatory audit with zero findings and reduced annual IT spend by 22%.',
  },
] as const;

const TESTIMONIALS = [
  {
    quote: '"Working with CompuZign is like having a full internal IT department, except we only pay for what we need. Our team stopped complaining about IT the month after we onboarded."',
    cite:  'Operations Director, Regional Insurance Company',
  },
  {
    quote: '"They migrated our entire Microsoft 365 environment over a weekend. Monday morning, everything worked. Nobody even noticed."',
    cite:  'Office Manager, Professional Services Firm',
  },
] as const;

export function CaseStudies() {
  const [active, setActive] = useState(0);
  const story = STORIES[active];

  return (
    <section class="cz-home-cases" id="case-studies">
      <div class="cz-container">
        <div class="cz-home-cases__wrap">

          <div class="cz-home-cases__left">
            <span class="cz-eyebrow">Client Success Stories</span>
            <h2 class="cz-heading-xl cz-home-cases__heading">
              Real results across three continents.
            </h2>
            <div class="cz-home-cases__tabs" role="tablist" aria-label="Case study selector">
              {STORIES.map((s, i) => (
                <button
                  key={i}
                  class={`cz-home-cases__tab${i === active ? ' cz-home-cases__tab--active' : ''}`}
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => setActive(i)}
                  type="button"
                >
                  {s.tab}
                </button>
              ))}
            </div>
          </div>

          <div class="cz-home-cases__right">
            <div class="cz-home-cases__card" role="tabpanel">
              <p class="cz-home-cases__label">{story.label}</p>
              <h3 class="cz-home-cases__title">{story.title}</h3>
              <p class="cz-home-cases__body">{story.body}</p>
              <p class="cz-home-cases__note">
                All stories are anonymised. Full case studies available on request.
              </p>
            </div>

            <div class="cz-home-cases__testimonials">
              {TESTIMONIALS.map((t, i) => (
                <article key={i} class="cz-home-cases__quote">
                  <blockquote class="cz-home-cases__blockquote">{t.quote}</blockquote>
                  <cite class="cz-home-cases__cite">{t.cite}</cite>
                </article>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
