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
  const isProgrammaticScrollRef = useRef(false);

  useEffect(() => {
    const subnav = navRef.current;
    const mainNav = document.querySelector<HTMLElement>('.cz-cost-builder__nav');
    if (!subnav) return;

    // Capture the subnav's document-position threshold once, before it goes sticky.
    // Add a 100px buffer so hide/show logic only kicks in after the subnav has been
    // sticky for a short distance, preventing the sticky transition and hide animation
    // from fighting each other.
    const navHeight = mainNav?.offsetHeight ?? 0;
    const stickyStart = subnav.getBoundingClientRect().top + window.pageYOffset - navHeight;
    stickyStartRef.current = stickyStart + 100;

    let lastY = window.pageYOffset;

    const onScroll = () => {
      // Suppress scroll-direction logic while a subnav click is driving the scroll,
      // so the programmatic upward scroll cannot re-show the subnav mid-flight.
      if (isProgrammaticScrollRef.current) {
        lastY = window.pageYOffset;
        return;
      }

      const y = window.pageYOffset;

      // While the subnav hasn't reached sticky position yet, always keep it visible.
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
    isProgrammaticScrollRef.current = true;
    setTimeout(() => {
      const main = document.querySelector<HTMLElement>('.cz-cost-builder__main');
      const nav = document.querySelector<HTMLElement>('.cz-cost-builder__nav');
      if (!main) return;
      const navHeight = nav?.offsetHeight ?? 0;
      const y = main.getBoundingClientRect().top + window.pageYOffset - navHeight;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 120);
    setTimeout(() => {
      setIsHidden(true);
      isProgrammaticScrollRef.current = false;
    }, 500);
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
