import type { ServiceCategoryCardItem } from '../../stations/serviceCategory/useServiceCategoryCards';
import type { TemplateKitProps } from '../templateKits';
import { PackagesIcon } from '../../shell/icons';

export function ServiceCategoryCarousel({ items, loading, error }: TemplateKitProps) {
  if (loading) return <p class="cz-station-empty" aria-busy="true">Loading…</p>;
  if (error) return <p class="cz-station-empty" role="alert">{error}</p>;

  const categories = items as ServiceCategoryCardItem[];
  if (categories.length === 0) return <p class="cz-station-empty">No Service Categories yet.</p>;

  return (
    <div class="cz-service-category-carousel" role="region" aria-label="Service Categories carousel" tabIndex={0}>
      <div class="cz-service-category-carousel__track" role="list">
        {categories.map((category) => (
          <article key={category.id} class="cz-service-category-card" role="listitem">
            <span class="cz-service-category-card__cube" aria-hidden="true"><PackagesIcon /></span>
            <span class="cz-service-category-card__label">{category.label}</span>
          </article>
        ))}
      </div>
    </div>
  );
}
