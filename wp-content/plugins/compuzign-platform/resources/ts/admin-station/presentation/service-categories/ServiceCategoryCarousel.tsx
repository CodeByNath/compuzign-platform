import type { ServiceCategoryCardItem } from '../../stations/serviceCategory/useServiceCategoryCards';
import type { TemplateKitProps } from '../templateKits';
import { PackagesIcon } from '../../shell/icons';
import { StationStatusPill } from '../StationStatusPill';

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
            <span class="cz-service-category-card__copy">
              <span class="cz-service-category-card__label">{category.label}</span>
            </span>
            <span class="cz-service-category-card__modules">
              {category.modules.map((module) => (
                <span key={module.id} class="cz-service-category-card__module">
                  <span class="cz-service-category-card__module-label">{module.label}</span>
                  {module.id === 'overview'
                    ? <StationStatusPill status={module.status} notes={module.notifications} />
                    : <span class="cz-service-category-card__count">{module.count}</span>}
                </span>
              ))}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
