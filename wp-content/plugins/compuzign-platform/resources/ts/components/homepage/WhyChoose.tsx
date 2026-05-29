import { useState, useEffect, useRef } from 'preact/hooks';

const CARDS = [
  {
    num:   '01',
    title: 'Proactive, not reactive',
    copy:  'We catch issues before they become downtime. Our engineers are monitoring your environment while your team is asleep.',
  },
  {
    num:   '02',
    title: 'Human and technical',
    copy:  'Deep expertise, plain language. Your staff is treated like colleagues, not ticket numbers.',
  },
  {
    num:   '03',
    title: 'All-in-one, not bolt-on',
    copy:  'Help desk, cybersecurity, cloud, backup, and strategy under one roof. One bill. One accountable partner.',
  },
  {
    num:   '04',
    title: 'In-house IT economics',
    copy:  'No capital expenditure. No hiring cycles. A predictable monthly cost that scales with your business.',
  },
  {
    num:   '05',
    title: 'Global reach',
    copy:  'Engineers across the US, Canada, Caribbean, Latin America, India, Qatar, Dubai, the Philippines, and Eastern Europe.',
  },
] as const;

export function WhyChoose() {
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1100px)').matches;
  const [focused,   setFocused]   = useState(isDesktop ? 2 : 0);
  const [focusMode, setFocusMode] = useState<'auto' | 'user'>('auto');
  const focusModeRef = useRef<'auto' | 'user'>('auto');
  const gridRef      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.cz-home-why__card'));
    const ratioMap = new Map<number, number>();
    const mq = window.matchMedia('(min-width: 768px)');

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = cards.indexOf(entry.target as HTMLElement);
          if (idx !== -1) ratioMap.set(idx, entry.intersectionRatio);
        });
        if (focusModeRef.current !== 'auto') return;
        // On desktop all cards are simultaneously visible; skip scroll-driven focus
        // so the desktop default (card 2) remains sticky until hover.
        if (mq.matches) return;
        // Highest visibility ratio wins; ties broken by lowest index.
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
    <section class="cz-home-why">
      <div class="cz-container">
        <header class="cz-home-why__header">
          <span class="cz-eyebrow">Why Choose CompuZign</span>
          <h2 class="cz-heading-xl cz-home-why__heading">
            Five reasons clients stay with us for years.
          </h2>
        </header>

        <div
          class="cz-home-why__grid"
          ref={gridRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {CARDS.map((card, i) => (
            <article
              key={i}
              class={`cz-home-why__card${(focusMode === 'auto' && focused === i) ? ' cz-home-why__card--focused' : ''}`}
            >
              <span class="cz-home-why__num">{card.num}</span>
              <h3 class="cz-home-why__title">{card.title}</h3>
              <p class="cz-home-why__copy">{card.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
