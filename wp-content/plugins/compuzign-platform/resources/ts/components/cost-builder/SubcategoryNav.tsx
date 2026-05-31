import { useState, useEffect, useRef } from 'preact/hooks';
import { decodeHtml } from '@/utils/format';
import type { ServiceItem } from '@/api/types/cost-builder';

interface SubcategoryNavProps {
  services: ServiceItem[];
  activeId: number | null;
  onChange: (id: number) => void;
}

export function SubcategoryNav({ services, activeId, onChange }: SubcategoryNavProps) {
  const [isHidden, setIsHidden] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const stickyStartRef = useRef<number>(0);

  useEffect(() => {
    const subnav = navRef.current;
    const mainNav = document.querySelector<HTMLElement>('.cz-cost-builder__nav');
    if (!subnav) return;

    // Capture the subnav's document-position threshold once, before it goes sticky.
    // 100px buffer prevents the sticky transition and hide animation from overlapping.
    const navHeight = mainNav?.offsetHeight ?? 0;
    const stickyStart = subnav.getBoundingClientRect().top + window.pageYOffset - navHeight;
    stickyStartRef.current = stickyStart + 100;

    let lastY = window.pageYOffset;

    const onScroll = () => {
      const y = window.pageYOffset;

      if (y < stickyStartRef.current) {
        setIsHidden(false);
        lastY = y;
        return;
      }

      if (y > lastY) {
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
    const mainNav = document.querySelector<HTMLElement>('.cz-cost-builder__nav');
    const subnav = navRef.current;
    const target =
      document.querySelector<HTMLElement>('.cz-card.cz-cost-builder__card') ??
      document.querySelector<HTMLElement>('.cz-cost-builder__main');
    if (!target) return;
    // Offset by nav + subnav combined height plus one spacing token (16px / --cz-space-4).
    const offset = (mainNav?.offsetHeight ?? 0) + (subnav?.offsetHeight ?? 0) + 16;
    const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  return (
    <nav
      ref={navRef}
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
