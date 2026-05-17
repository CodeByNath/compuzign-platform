import { Tabs } from '@/components/ui/Tabs';
import type { Category } from '@/api/types/cost-builder';

interface CategoryNavProps {
  categories: Category[];
  activeSlug: string;
  onChange: (slug: string) => void;
}

export function CategoryNav({ categories, activeSlug, onChange }: CategoryNavProps) {
  const items = categories.map((c) => ({ id: c.slug, label: c.name }));
  return (
    <nav class="cz-cost-builder__nav" aria-label="Service categories">
      <Tabs items={items} activeId={activeSlug} onChange={onChange} />
    </nav>
  );
}
