import { useRef, useState, useEffect } from 'preact/hooks';
import { Tabs } from '@/components/ui/Tabs';
import { decodeHtml } from '@/utils/format';
import type { Category } from '@/api/types/cost-builder';

interface CategoryNavProps {
  categories: Category[];
  activeSlug: string;
  onChange: (slug: string) => void;
}

export function CategoryNav({ categories, activeSlug, onChange }: CategoryNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const items = categories.map((c) => ({ id: c.slug, label: decodeHtml(c.name) }));

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setIsSticky(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const handleChange = (slug: string) => {
    onChange(slug);
    // Scroll so the subnav and content are in view below the sticky main nav.
    const timer = setTimeout(() => {
      const main = document.querySelector<HTMLElement>('.cz-cost-builder__main');
      if (!main || !navRef.current) return;
      const navHeight = navRef.current.offsetHeight;
      const y = main.getBoundingClientRect().top + window.pageYOffset - navHeight;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 120);
    return () => clearTimeout(timer);
  };

  return (
    <>
      <div ref={sentinelRef} />
      <nav
        ref={navRef}
        class={['cz-cost-builder__nav', isSticky && 'is-sticky'].filter(Boolean).join(' ')}
        aria-label="Service categories"
      >
        <Tabs items={items} activeId={activeSlug} onChange={handleChange} />
      </nav>
    </>
  );
}
