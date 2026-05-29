import { useState, useEffect, useRef } from 'preact/hooks';

const AUTO_MS = 6000;

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
  const [active,     setActive]     = useState(0);
  const [leaving,    setLeaving]    = useState<number | null>(null);
  const [cardFading, setCardFading] = useState(false);
  const [cardKey,    setCardKey]    = useState(0);
  const [hovered,    setHovered]    = useState(false);

  const story = STORIES[active];

  const activeRef        = useRef(0);
  const transitioningRef = useRef(false);
  const hovering         = useRef(false);
  const hoverCountRef    = useRef(0);
  const rightRef         = useRef<HTMLDivElement>(null);
  const ivRef            = useRef<number | null>(null);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Phase 1 (0–200ms): old tab loses accent, card content fades out.
  // Phase 2 (200ms):   active switches; new tab fades accent in; card remounts.
  function transitionTo(next: number) {
    const curr = activeRef.current;
    if (next === curr) return;

    if (reducedMotion) {
      activeRef.current = next;
      setActive(next);
      setCardKey(k => k + 1);
      return;
    }

    if (transitioningRef.current) return;
    transitioningRef.current = true;
    activeRef.current = next;

    setLeaving(curr);
    setCardFading(true);

    setTimeout(() => {
      transitioningRef.current = false;
      setActive(next);
      setLeaving(null);
      setCardFading(false);
      setCardKey(k => k + 1);
    }, 200);
  }

  function startInterval() {
    if (reducedMotion) return;
    if (ivRef.current !== null) clearInterval(ivRef.current);
    ivRef.current = window.setInterval(() => {
      if (hovering.current) return;
      transitionTo((activeRef.current + 1) % STORIES.length);
    }, AUTO_MS);
  }

  useEffect(() => {
    startInterval();
    return () => { if (ivRef.current !== null) clearInterval(ivRef.current); };
  }, []);

  function handleTabClick(i: number) {
    transitionTo(i);
    startInterval();
    if (window.innerWidth <= 1024 && rightRef.current) {
      rightRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Reference-counted hover: tabs and card are independent enter/leave targets.
  // Browser guarantees mouseenter on the next element fires before mouseleave on
  // the previous one, so moving between tabs and card never drops the count to 0.
  function handleEnter() {
    hoverCountRef.current++;
    hovering.current = true;
    setHovered(true);
  }

  function handleLeave() {
    hoverCountRef.current = Math.max(0, hoverCountRef.current - 1);
    if (hoverCountRef.current === 0) {
      hovering.current = false;
      setHovered(false);
      startInterval();
      setCardKey(k => k + 1);
    }
  }

  return (
    <section class="cz-home-cases" id="case-studies">
      <div class="cz-container">
        <div class="cz-home-cases__wrap">

          <div class="cz-home-cases__left">
            <span class="cz-eyebrow">Client Success Stories</span>
            <h2 class="cz-heading-xl cz-home-cases__heading">
              Real results across three continents.
            </h2>
            <div
              class="cz-home-cases__tabs"
              role="tablist"
              aria-label="Case study selector"
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              {STORIES.map((s, i) => (
                <button
                  key={i}
                  class={[
                    'cz-home-cases__tab',
                    i === active  ? 'cz-home-cases__tab--active'  : '',
                    i === leaving ? 'cz-home-cases__tab--leaving' : '',
                  ].filter(Boolean).join(' ')}
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => handleTabClick(i)}
                  type="button"
                >
                  {s.tab}
                </button>
              ))}
            </div>
          </div>

          <div class="cz-home-cases__right" ref={rightRef}>
            <div
              class="cz-home-cases__card"
              role="tabpanel"
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              {/* Ring layer — remounts on cardKey to restart conic sweep */}
              <div
                key={cardKey}
                class={`cz-home-cases__card-ring${hovered ? ' cz-home-cases__card-ring--paused' : ''}`}
                aria-hidden="true"
              />
              {/* Content layer — remounts on active for enter animation;
                  --fading plays the exit animation for 200ms before swap */}
              <div
                key={active}
                class={`cz-home-cases__card-body${cardFading ? ' cz-home-cases__card-body--fading' : ''}`}
              >
                <p class="cz-home-cases__label">{story.label}</p>
                <h3 class="cz-home-cases__title">{story.title}</h3>
                <p class="cz-home-cases__body">{story.body}</p>
                <p class="cz-home-cases__note">
                  All stories are anonymised. Full case studies available on request.
                </p>
              </div>
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
