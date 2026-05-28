import { useState, useEffect, useRef } from 'preact/hooks';

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
  const [focused,    setFocused]    = useState(0);
  const [focusMode,  setFocusMode]  = useState<'auto' | 'user'>('auto');
  const focusModeRef = useRef<'auto' | 'user'>('auto');
  const gridRef      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.cz-home-industries__card'));
    const ratioMap = new Map<number, number>();

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = cards.indexOf(entry.target as HTMLElement);
          if (idx !== -1) ratioMap.set(idx, entry.intersectionRatio);
        });
        if (focusModeRef.current !== 'auto') return;
        // Pick the card with the highest visibility ratio; ties broken by lowest index.
        let pick = -1;
        let bestRatio = 0;
        ratioMap.forEach((ratio, idx) => {
          if (ratio > bestRatio || (ratio === bestRatio && (pick === -1 || idx < pick))) {
            bestRatio = ratio;
            pick = idx;
          }
        });
        if (pick !== -1 && bestRatio >= 0.3) setFocused(pick);
      },
      { threshold: [0, 0.3, 0.6, 1] },
    );

    cards.forEach((card) => obs.observe(card));
    return () => obs.disconnect();
  }, []);

  function handleMouseEnter() {
    focusModeRef.current = 'user';
    setFocusMode('user');
  }

  function handleMouseLeave() {
    focusModeRef.current = 'auto';
    setFocusMode('auto');
  }

  return (
    <section class="cz-home-industries" id="industries">
      <div class="cz-container">
        <header class="cz-home-industries__header">
          <span class="cz-eyebrow">Industries We Serve</span>
          <h2 class="cz-heading-xl cz-home-industries__heading">
            Built for industries where IT failure is not an option.
          </h2>
        </header>

        <div
          class="cz-home-industries__grid"
          ref={gridRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {INDUSTRIES.map((ind, i) => (
            <article
              key={i}
              class={`cz-home-industries__card${(focusMode === 'auto' && focused === i) ? ' cz-home-industries__card--focused' : ''}`}
            >
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
