import { useState, useEffect } from 'preact/hooks';
import { decodeHtml } from '@/utils/format';
import type { ServiceItem } from '@/api/types/cost-builder';

interface SubcategoryNavProps {
  services: ServiceItem[];
  activeId: number | null;
  onChange: (id: number) => void;
}

export function SubcategoryNav({ services, activeId, onChange }: SubcategoryNavProps) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let lastY = window.pageYOffset;

    const onScroll = () => {
      const y = window.pageYOffset;
      if (y > lastY && y > 100) {
        setIsHidden(true);
      } else if (y < lastY) {
        setIsHidden(false);
      }
      lastY = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (services.length <= 1) return null;

  const handleClick = (id: number) => {
    onChange(id);
    // Scroll to the main content area, clearing the sticky nav.
    // The subnav hides as the user scrolls down, so we only account for the main nav.
    setTimeout(() => {
      const main = document.querySelector<HTMLElement>('.cz-cost-builder__main');
      const nav = document.querySelector<HTMLElement>('.cz-cost-builder__nav');
      if (!main) return;
      const navHeight = nav?.offsetHeight ?? 0;
      const y = main.getBoundingClientRect().top + window.pageYOffset - navHeight;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 120);
  };

  return (
    <nav
      class={['cz-cost-builder__subnav', isHidden && 'is-hidden'].filter(Boolean).join(' ')}
      aria-label="Service subcategories"
    >
      {services.map((s) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={s.id === activeId}
          class={['cz-sub-tab', s.id === activeId && 'is-active'].filter(Boolean).join(' ')}
          onClick={() => handleClick(s.id)}
        >
          {decodeHtml(s.title)}
        </button>
      ))}
    </nav>
  );
}
