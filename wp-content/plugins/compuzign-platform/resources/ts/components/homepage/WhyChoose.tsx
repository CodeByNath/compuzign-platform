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
  // Card 0 is focused by default on all breakpoints.
  const [focused, setFocused] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // IntersectionObserver-based focus only applies at mobile (single-column).
    // At ≥641px, hover is handled purely in CSS with no JS focus changes.
    if (window.matchMedia('(min-width: 641px)').matches) return;

    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>('.cz-home-why__card'),
    );

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Focus the card when it is at least 60% in the viewport.
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = cards.indexOf(entry.target as HTMLElement);
            if (idx !== -1) setFocused(idx);
          }
        });
      },
      { threshold: [0.6] },
    );

    cards.forEach((card) => obs.observe(card));
    return () => obs.disconnect();
  }, []);

  return (
    <section class="cz-home-why">
      <div class="cz-container">
        <header class="cz-home-why__header">
          <span class="cz-eyebrow">Why Choose CompuZign</span>
          <h2 class="cz-heading-xl cz-home-why__heading">
            Five reasons clients stay with us for years.
          </h2>
        </header>

        <div class="cz-home-why__grid" ref={gridRef}>
          {CARDS.map((card, i) => (
            <article
              key={i}
              class={`cz-home-why__card${focused === i ? ' cz-home-why__card--focused' : ''}`}
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
