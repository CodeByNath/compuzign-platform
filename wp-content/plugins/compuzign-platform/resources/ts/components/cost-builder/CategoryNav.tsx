import { useRef } from 'preact/hooks';
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
  const items = categories.map((c) => ({ id: c.slug, label: decodeHtml(c.name) }));

  const handleChange = (slug: string) => {
    onChange(slug);
    // Give the state update a tick to settle, then scroll nav to its sticky top position.
    const timer = setTimeout(() => {
      if (!navRef.current) return;
      const y = navRef.current.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 120);
    return () => clearTimeout(timer);
  };

  return (
    <nav ref={navRef} class="cz-cost-builder__nav" aria-label="Service categories">
      <Tabs items={items} activeId={activeSlug} onChange={handleChange} />
    </nav>
  );
}
