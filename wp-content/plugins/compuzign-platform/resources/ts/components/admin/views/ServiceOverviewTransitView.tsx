// ServiceOverviewTransitView — Transit lifecycle for the Service Overview module.
//
// Catalog lifecycle  → full module card with labelled fields and inline editor (ServiceViewStep)
// Transit lifecycle  → compact summary card with values only and View action (this component)
//
// Both lifecycles share the same status resolver and pill renderer from utils/moduleStatus.

import type { ServiceItem } from '@/api/types/cost-builder';
import { resolveOverviewStatus, renderModuleStatus } from '@/components/admin/utils/moduleStatus';

interface Props {
  service: ServiceItem;
  onView?: () => void;
}

function decodeHtml(s: string): string {
  if (typeof document === 'undefined') return s;
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
}

export function ServiceOverviewTransitView({ service, onView }: Props) {
  const isDisabled  = service.meta?.is_active === false;
  const isPublished = service.meta?.is_active === true;

  const overviewStatus = resolveOverviewStatus(service, { isDisabled, isPublished });

  const title    = service.title.trim()   ? decodeHtml(service.title)   : 'New Service';
  const excerpt  = service.excerpt?.trim() ?? '';
  const category = service.categories.length > 0
    ? service.categories.map((c) => decodeHtml(c.name)).join(', ')
    : 'Not selected';

  const inclCount = (service.inclusions ?? []).length;
  const faqCount  = (service.faqs       ?? []).length;
  const inclLabel = `${inclCount} ${inclCount === 1 ? 'inclusion' : 'inclusions'}`;
  const faqLabel  = `${faqCount} ${faqCount === 1 ? 'Common Question' : 'Common Questions'}`;

  return (
    <div class="cz-req-detail__section cz-sv-section--no-border">
      <div class="cz-sv-module">

        <div class="cz-sv-module-header">
          <p class="cz-req-detail__section-title">Service Summary</p>
          <div>
            <span
              class="cz-sv-overview-block__status"
              style={overviewStatus === 'pending-dim' ? 'opacity:0.45' : undefined}
            >
              {renderModuleStatus(overviewStatus)}
            </span>
          </div>
        </div>

        <div class="cz-sv-module-body cz-so-transit__body">
          <p class="cz-so-transit__title">{title}</p>
          {excerpt && <p class="cz-so-transit__excerpt">{excerpt}</p>}
          <p class="cz-so-transit__category">{category}</p>
          <p class="cz-so-transit__counts">{inclLabel} | {faqLabel}</p>
          <p class="cz-so-transit__summary">
            Service Overview includes a full summary view of {title}.
          </p>
        </div>

        <div class="cz-sv-module-footer">
          <button
            type="button"
            class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
            onClick={onView}
            disabled={!onView}
          >
            View
          </button>
        </div>

      </div>
    </div>
  );
}
