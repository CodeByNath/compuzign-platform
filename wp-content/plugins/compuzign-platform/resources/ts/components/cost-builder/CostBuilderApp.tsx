import { useState } from 'preact/hooks';
import { useCostBuilder } from '@/hooks/useCostBuilder';
import { Spinner } from '@/components/ui/Spinner';
import { CategoryNav } from './CategoryNav';
import { ServiceGrid } from './ServiceGrid';

export function CostBuilderApp() {
  const { data, loading, error } = useCostBuilder();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  if (loading) {
    return (
      <div class="cz-cost-builder cz-cost-builder--loading">
        <Spinner label="Loading services…" />
      </div>
    );
  }

  if (error) {
    return (
      <div class="cz-cost-builder cz-cost-builder--error">
        <p class="cz-muted">Unable to load services. Please try again later.</p>
      </div>
    );
  }

  if (!data || data.categories.length === 0) {
    return (
      <div class="cz-cost-builder cz-cost-builder--empty">
        <p class="cz-muted">No services available.</p>
      </div>
    );
  }

  const currentSlug = activeCategory ?? data.categories[0]?.slug ?? '';
  const categoryGroup = data.services_by_category.find(
    (g) => g.category_slug === currentSlug,
  );

  return (
    <div class="cz-cost-builder">
      <CategoryNav
        categories={data.categories}
        activeSlug={currentSlug}
        onChange={setActiveCategory}
      />
      {categoryGroup && (
        <ServiceGrid services={categoryGroup.services} tiers={data.tiers} />
      )}
    </div>
  );
}
