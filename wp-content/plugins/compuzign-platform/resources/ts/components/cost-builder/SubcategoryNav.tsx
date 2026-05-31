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

    // Double rAF lets Preact flush its render so the new card is in the DOM.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const main = document.querySelector<HTMLElement>('.cz-cost-builder__main');
        const nav = document.querySelector<HTMLElement>('.cz-cost-builder__nav');
        const card = document.querySelector<HTMLElement>('.cz-card.cz-cost-builder__card');

        if (!card) {
          // No service card in the DOM — release guard, leave subnav visible.
          isProgrammaticScrollRef.current = false;
          return;
        }

        if (main) {
          const navHeight = nav?.offsetHeight ?? 0;
          const y = main.getBoundingClientRect().top + window.pageYOffset - navHeight;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }

        // Hide subnav only once the card clears the sticky nav+subnav area.
        // rootMargin of -120px shrinks the intersection root from the top so the
        // observer only fires when the card is meaningfully below the sticky chrome.
        let observed = false;
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting && !observed) {
              observed = true;
              observer.disconnect();
              setIsHidden(true);
              isProgrammaticScrollRef.current = false;
            }
          },
          { rootMargin: '-120px 0px 0px 0px', threshold: 0.1 },
        );
        observer.observe(card);

        // Safety fallback: if the card never crosses the threshold, release guard
        // without hiding so manual scroll behaviour is not permanently suspended.
        setTimeout(() => {
          if (!observed) {
            observer.disconnect();
            isProgrammaticScrollRef.current = false;
          }
        }, 1500);
      });
    });
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
